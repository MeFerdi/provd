ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def encode(raw: bytes) -> str:
	n = int.from_bytes(raw, "big")
	out = ""
	while n:
		n, r = divmod(n, 58)
		out = ALPHABET[r] + out
	return "1" * (len(raw) - len(raw.lstrip(b"\0"))) + out
