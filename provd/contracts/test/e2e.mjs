// End to end (run from contracts/test: npm install && npm test): compile the Provd verifier + example escrow, deploy on Ganache, sign with Provd's Python code,
// cross-check with ethers.js, and exercise every contract rule.
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const solc = require("solc");
const ganache = require("ganache");
const { ethers } = require("ethers");

const CONTRACTS = process.env.CONTRACTS ?? "..";
process.env.PY ??= "../../backend/.venv/bin/python";
process.env.PYTHONPATH ??= "../../backend";
process.env.SECRET_KEY ??= "contracts-e2e-test-secret-key-0123456789";
const sources = {
  "ProvdReleaseVerifier.sol": { content: readFileSync(`${CONTRACTS}/ProvdReleaseVerifier.sol`, "utf8") },
  "ExampleEscrow.sol": { content: readFileSync(`${CONTRACTS}/ExampleEscrow.sol`, "utf8") },
  "MockToken.sol": { content: readFileSync("MockToken.sol", "utf8") },
};
const out = JSON.parse(solc.compile(JSON.stringify({ language: "Solidity", sources, settings: { optimizer: { enabled: true, runs: 200 }, outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } } } })));
const errors = (out.errors || []).filter((e) => e.severity === "error");
if (errors.length) { console.error(errors.map((e) => e.formattedMessage).join("\n")); process.exit(1); }
const warnings = (out.errors || []).filter((e) => e.severity === "warning").length;
console.log(`compiled with solc ${solc.version()}: 0 errors, ${warnings} warnings`);

const provider = new ethers.BrowserProvider(ganache.provider({ logging: { quiet: true }, chain: { chainId: 1337 } }));
const [deployer, seller, buyer, attacker] = await Promise.all([0, 1, 2, 3].map((i) => provider.getSigner(i)));
const deploy = async (file, name, ...args) => {
  const c = out.contracts[file][name];
  const f = new ethers.ContractFactory(c.abi, c.evm.bytecode.object, deployer);
  const d = await f.deploy(...args); await d.waitForDeployment(); return d;
};

// A throwaway signing key, generated fresh for every run: no key is ever stored in the repository.
const PROVD_KEY = ethers.Wallet.createRandom().privateKey.slice(2);
const probe = JSON.parse(execFileSync(process.env.PY, [ "sign.py", PROVD_KEY, "1", ethers.ZeroAddress, ethers.ZeroAddress, "1", "1", "00".repeat(32), "x" ], { env: { ...process.env } }).toString());
const token = await deploy("MockToken.sol", "MockToken");
const escrow = await deploy("ExampleEscrow.sol", "ExampleEscrow", await token.getAddress(), probe.signer);
const escrowAddr = await escrow.getAddress();
const chainId = Number((await provider.getNetwork()).chainId);

const amount = 500_000_000n;
await (await token.mint(await seller.getAddress(), amount)).wait();
await (await token.connect(seller).approve(escrowAddr, amount)).wait();
const intentId = "trade-77";
const tradeId = ethers.keccak256(ethers.toUtf8Bytes(intentId));
const now = (await provider.getBlock("latest")).timestamp;
await (await escrow.connect(seller).lock(tradeId, await buyer.getAddress(), amount, now + 86400)).wait();

const recordHash = "ab".repeat(32);
const sign = (contract, amt, expires, key = PROVD_KEY) => JSON.parse(execFileSync(process.env.PY, ["sign.py", key, String(chainId), contract, process.env.BUYER ?? "", String(amt), String(expires), recordHash, intentId], { env: { ...process.env } }).toString());
process.env.BUYER = await buyer.getAddress();
const expires = now + 600;
const a = sign(escrowAddr, amount, expires);

// 1. ethers.js, independently, recovers the same signer from the typed data
const { EIP712Domain, ...types } = Object.fromEntries(Object.entries(a.typed.types).map(([k, v]) => [k, v]));
const recovered = ethers.verifyTypedData(a.typed.domain, types, a.typed.message, a.signature);
console.log("ethers.js recovers Provd signer:", recovered === a.signer, "| digest matches ethers:", ethers.TypedDataEncoder.hash(a.typed.domain, types, a.typed.message) === a.digest);
// 2. the contract computes the same digest
console.log("contract digest matches:", (await escrow.attestationDigest(tradeId, ethers.zeroPadValue(process.env.BUYER, 32), amount, expires, "0x" + recordHash)) === a.digest);

// Simulate first (eth_call) to read the exact custom error, then confirm the transaction itself reverts.
const expectRevert = async (label, contract, args, name) => {
  let decoded = "no revert";
  try { await contract.release.staticCall(...args); }
  catch (e) {
    const data = e?.data ?? e?.info?.error?.data?.data ?? e?.info?.error?.data;
    try { decoded = contract.interface.parseError(typeof data === "string" ? data : data?.data)?.name ?? "unknown"; } catch { decoded = "undecodable"; }
  }
  let sent = "mined";
  try { await (await contract.release(...args)).wait(); } catch { sent = "reverted"; }
  console.log(`${label}: ${sent}, error ${decoded}${decoded === name ? " (expected)" : " (EXPECTED " + name + ")"}`);
};
// 3. rules
const rh = "0x" + recordHash;
console.log("valid attestation accepted by isAttested:", await escrow.isAttested(tradeId, process.env.BUYER, amount, expires, rh, a.v, a.r, a.s));
console.log("tampered amount rejected:", !(await escrow.isAttested(tradeId, process.env.BUYER, amount + 1n, expires, rh, a.v, a.r, a.s)));
console.log("tampered recipient rejected:", !(await escrow.isAttested(tradeId, await attacker.getAddress(), amount, expires, rh, a.v, a.r, a.s)));
console.log("tampered expiry rejected:", !(await escrow.isAttested(tradeId, process.env.BUYER, amount, expires + 3600, rh, a.v, a.r, a.s)));
const other = await deploy("ExampleEscrow.sol", "ExampleEscrow", await token.getAddress(), probe.signer);
const forOther = sign(await other.getAddress(), amount, expires);
await expectRevert("attestation for a different escrow", escrow, [tradeId, expires, "0x" + recordHash, forOther.v, forOther.r, forOther.s], "InvalidAttestationSignature");
const wrongKey = sign(escrowAddr, amount, expires, "11".repeat(32));
await expectRevert("signed by the wrong key", escrow, [tradeId, expires, "0x" + recordHash, wrongKey.v, wrongKey.r, wrongKey.s], "InvalidAttestationSignature");
const highS = "0x" + (BigInt("0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141") - BigInt(a.s)).toString(16).padStart(64, "0");
await expectRevert("malleable (high-s) copy", escrow, [tradeId, expires, "0x" + recordHash, a.v === 27 ? 28 : 27, a.r, highS], "InvalidAttestationSignature");

const before = await token.balanceOf(process.env.BUYER);
await (await escrow.connect(attacker).release(tradeId, expires, "0x" + recordHash, a.v, a.r, a.s)).wait(); // anyone may submit; funds only go to the buyer
console.log("valid attestation releases to the buyer:", (await token.balanceOf(process.env.BUYER)) - before === amount);
await expectRevert("replay", escrow, [tradeId, expires, "0x" + recordHash, a.v, a.r, a.s], "AlreadySettled");

// expiry, on a fresh trade
const trade2 = "trade-78"; const id2 = ethers.keccak256(ethers.toUtf8Bytes(trade2));
await (await token.mint(await seller.getAddress(), amount)).wait();
await (await token.connect(seller).approve(escrowAddr, amount)).wait();
await (await escrow.connect(seller).lock(id2, await buyer.getAddress(), amount, now + 86400)).wait();
const short = JSON.parse(execFileSync(process.env.PY, ["sign.py", PROVD_KEY, String(chainId), escrowAddr, process.env.BUYER, String(amount), String(now + 60), recordHash, trade2], { env: { ...process.env } }).toString());
await provider.send("evm_increaseTime", [3600]); await provider.send("evm_mine", []);
await expectRevert("expired", escrow, [id2, now + 60, "0x" + recordHash, short.v, short.r, short.s], "AttestationExpired");
process.exit(0);
