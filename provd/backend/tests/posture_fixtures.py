from datetime import datetime, timezone

from app.schemas.posture import AdminAccount, Pathway, UlnSide, Verifier

LZ_LABS = Verifier(address="0x589dedbd617e0cbcb916a9223f4d1300c294236b", name="LayerZero Labs")
NETHERMIND = Verifier(address="0xa59ba433ac34d2927232918ef5b2eaafcf130ba5", name="Nethermind")
CHECKED_AT = datetime(2026, 10, 1, tzinfo=timezone.utc)


def side(*dvns: Verifier, optional: tuple[Verifier, ...] = (), threshold: int = 0, confirmations: int = 64, default: bool = False) -> UlnSide:
	return UlnSide(
		library="0xc02ab410f0734efa3f14628780e6e695156024c2",
		is_default_library=default,
		confirmations=confirmations,
		required_dvns=list(dvns),
		optional_dvns=list(optional),
		optional_threshold=threshold,
		effective_verifiers=len(dvns) + threshold,
	)


def route(eid: int, *dvns: Verifier, name: str | None = None, **kwargs) -> Pathway:
	s = side(*dvns, **kwargs)
	return Pathway(eid=eid, chain_name=name or f"chain-{eid}", peer="0x" + "11" * 32, receive=s, send=s)


def safe(threshold: int = 3, owners: int = 5, address: str = "0x" + "aa" * 20) -> AdminAccount:
	return AdminAccount(address=address, type="safe", threshold=threshold, owners=owners)


def eoa(address: str = "0x" + "bb" * 20) -> AdminAccount:
	return AdminAccount(address=address, type="eoa")


def raw(pathways, owner=None, delegate=None, defaults=None) -> dict:
	return {
		"chain": "ethereum",
		"contract": "0x" + "cc" * 20,
		"owner": owner or safe(),
		"delegate": delegate or safe(),
		"pathways": pathways,
		"default_confirmations": defaults or {},
		"checked_at": CHECKED_AT,
	}
