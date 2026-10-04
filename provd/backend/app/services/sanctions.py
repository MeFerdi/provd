"""US Treasury OFAC sanctions screening: digital currency addresses on the SDN list.

Source: the official SDN list (XML), https://sanctionslistservice.ofac.treas.gov. Entries carry ids such as
"Digital Currency Address - TRX" / "- USDT" / "- SOL" / "- ETH". We classify each address by its format
(an USDT entry can be a Tron, Ethereum or Solana address) and keep the chains Provd scores plus EVM for later.

Scope and limits: OFAC SDN digital currency addresses only. Other lists (UN, EU, UK OFSI) aren't included yet.
A match is a strong risk signal for the platform's own compliance process, not a legal determination.
"""
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass

import httpx

SOURCE = "ofac_sdn"
SDN_URL = "https://sanctionslistservice.ofac.treas.gov/api/PublicationPreview/exports/SDN.XML"

_TRON = re.compile(r"^T[1-9A-HJ-NP-Za-km-z]{33}$")
_BASE58 = re.compile(r"^[1-9A-HJ-NP-Za-km-z]{32,44}$")
_EVM = re.compile(r"^0x[0-9a-fA-F]{40}$")
_SOLANA_TYPES = {"SOL", "USDC", "USDT"}


@dataclass(frozen=True)
class SanctionedAddress:
	chain: str
	address: str
	uid: str
	name: str
	currency: str

	@property
	def reference(self) -> str:
		return f"SDN {self.uid}: {self.name}"[:120]


def classify(currency: str, address: str) -> str | None:
	"""The chain an address belongs to, from its format; None if we don't track it."""
	address = address.strip()
	if _TRON.match(address):
		return "tron"
	if _EVM.match(address):
		return "evm"
	if currency in _SOLANA_TYPES and _BASE58.match(address):
		try:
			from app.adapters.solana import validate_solana_address

			validate_solana_address(address)
			return "solana"
		except ValueError:
			return None
	return None


def parse_sdn(xml_bytes: bytes) -> tuple[str | None, list[SanctionedAddress]]:
	"""(publish date, sanctioned addresses) from the SDN XML."""
	root = ET.fromstring(xml_bytes)
	ns = root.tag.split("}")[0] + "}" if root.tag.startswith("{") else ""
	publish = root.findtext(f"{ns}publshInformation/{ns}Publish_Date")
	found: dict[tuple[str, str], SanctionedAddress] = {}
	for entry in root.iter(f"{ns}sdnEntry"):
		ids = entry.find(f"{ns}idList")
		if ids is None:
			continue
		name = " ".join(filter(None, [entry.findtext(f"{ns}firstName"), entry.findtext(f"{ns}lastName")])).strip()
		uid = entry.findtext(f"{ns}uid") or ""
		for item in ids.iter(f"{ns}id"):
			id_type = item.findtext(f"{ns}idType") or ""
			if not id_type.startswith("Digital Currency Address - "):
				continue
			currency = id_type.rsplit("- ", 1)[1].strip()
			address = (item.findtext(f"{ns}idNumber") or "").strip()
			chain = classify(currency, address)
			if chain:
				# EVM addresses are case-insensitive; store lowercase so lookups match
				key = (chain, address.lower() if chain == "evm" else address)
				found.setdefault(key, SanctionedAddress(chain, key[1], uid, name or "unnamed entity", currency))
	return publish, sorted(found.values(), key=lambda s: (s.chain, s.address))


async def fetch_sdn(timeout: float = 120.0) -> bytes:
	async with httpx.AsyncClient(timeout=timeout, follow_redirects=True, headers={"user-agent": "Provd sanctions sync"}) as http:
		response = await http.get(SDN_URL)
		response.raise_for_status()
		return response.content
