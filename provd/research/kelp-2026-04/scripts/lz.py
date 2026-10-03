from rpc import rpc
from eth_utils import keccak
from eth_abi import decode, encode
EP = "0x1a44076050125825900e736c501f859c50fe728c"; OAPP = "0x85d456b2dff1fd8245387c0bfb64dfb700e98ef3"
LIB = "0xc02ab410f0734efa3f14628780e6e695156024c2"; EID = 30320
ULN = "(uint64,uint8,uint8,uint8,address[],address[])"
def call(to, sig, types, args, block="latest"):
    data = "0x" + keccak(text=sig)[:4].hex() + encode(types, args).hex()
    return rpc("eth_call", [{"to": to, "data": data}, block])
def uln_config(block="latest", eid=EID, oapp=OAPP):
    raw = call(EP, "getConfig(address,address,uint32,uint32)", ["address","address","uint32","uint32"], [oapp, LIB, eid, 2], block)
    (blob,) = decode(["bytes"], bytes.fromhex(raw[2:]))
    (c,) = decode([ULN], blob)
    return {"confirmations": c[0], "required": c[1], "optional": c[2], "threshold": c[3], "requiredDVNs": list(c[4]), "optionalDVNs": list(c[5])}
