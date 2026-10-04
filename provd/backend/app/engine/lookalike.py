"""Lookalike-address detection (address poisoning). Pure functions, no I/O.

Address poisoning: after a real payment, a bot creates an address that shares the first and last characters
of the payee and sends the payer a tiny "dust" transfer from it, so the lookalike sits in the payer's history.
The next time someone copies an address from that history, funds go to the attacker.

Two independent tests:
1. **Lookalike of a known counterparty:** the destination shares at least `min_affix` leading and trailing
   characters with an address the payer has used, without being it. A random base58 address matches a given
   address on 3+3 characters about 1 in 3.8e10 times (58^6), and 4+4 about 1 in 1.3e14 (58^8): a match is deliberate.
2. **Dust-sender behaviour:** the destination's own history shows it sending tiny amounts to others and never
   receiving real value, which is what poisoning addresses do.
"""
from dataclasses import dataclass
from decimal import Decimal

# Characters every address on a chain shares at the start (not evidence of imitation).
FIXED_PREFIX = {"tron": 1}  # Tron addresses all start with "T"
STABLE_DUST = Decimal("0.01")  # stablecoin transfers below this are dust
NATIVE_DUST = {"SOL": Decimal("0.001"), "TRX": Decimal("1")}
REAL_VALUE = Decimal("1")  # an inflow of at least this much stablecoin is real value


@dataclass(frozen=True)
class Lookalike:
	known: str  # the address being imitated
	prefix: int  # matching leading characters (after any fixed chain prefix)
	suffix: int  # matching trailing characters

	@property
	def strength(self) -> str:
		return "strong" if self.prefix >= 4 and self.suffix >= 4 else "likely"


def affix(a: str, b: str, skip: int = 0) -> tuple[int, int]:
	"""Number of matching leading characters (after `skip`) and trailing characters of two addresses."""
	pre = 0
	while skip + pre < min(len(a), len(b)) and a[skip + pre] == b[skip + pre]:
		pre += 1
	suf = 0
	while suf < min(len(a), len(b)) - skip and a[-1 - suf] == b[-1 - suf]:
		suf += 1
	return pre, suf


def find_lookalikes(destination: str, known: set[str] | list[str], chain: str = "", min_affix: int = 3) -> list[Lookalike]:
	"""Known counterparties the destination imitates, strongest first. An exact match is not a lookalike."""
	skip = FIXED_PREFIX.get(chain, 0)
	found = []
	for address in set(known):
		if not address or address == destination or len(address) != len(destination):
			continue
		pre, suf = affix(destination, address, skip)
		if pre >= min_affix and suf >= min_affix:
			found.append(Lookalike(address, pre, suf))
	return sorted(found, key=lambda m: (m.prefix + m.suffix), reverse=True)


@dataclass(frozen=True)
class DustProfile:
	dust_sent: int  # tiny outgoing transfers
	recipients: int  # distinct wallets that received them
	real_inflows: int  # incoming transfers of real value

	@property
	def looks_like_poisoner(self) -> bool:
		return self.dust_sent >= 2 and self.recipients >= 2 and self.real_inflows == 0


def dust_profile(address: str, transfers: list) -> DustProfile:
	"""Summarise an address's own transfers (objects with from_address, to_address, asset, amount)."""
	dust_sent, recipients, real_in = 0, set(), 0
	for t in transfers:
		native_threshold = NATIVE_DUST.get(t.asset)
		dust = t.amount < (native_threshold if native_threshold is not None else STABLE_DUST)
		if t.from_address == address and dust:
			dust_sent += 1
			recipients.add(t.to_address)
		elif t.to_address == address and native_threshold is None and t.amount >= REAL_VALUE:
			real_in += 1
	return DustProfile(dust_sent, len(recipients), real_in)


def short(address: str) -> str:
	return f"{address[:6]}…{address[-4:]}" if len(address) > 12 else address
