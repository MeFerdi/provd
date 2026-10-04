# Contracts

On-chain verification of Provd release attestations, for non-custodial escrows.

| File | What it is |
|---|---|
| `ProvdReleaseVerifier.sol` | Abstract contract: rebuilds the EIP-712 digest, checks Provd's signature (`ecrecover`, low-s), expiry, recipient and amount, and marks each attestation used. Works on EVM chains and Tron (TVM). |
| `ExampleEscrow.sol` | Minimal P2P escrow using it: the seller locks tokens; they go to the buyer only with a Provd attestation, or back to the seller after a timeout. Illustration only, not audited. |
| `test/` | End-to-end test: compiles both with solc 0.8.24, deploys on Ganache, signs attestations with Provd's Python code, cross-checks with ethers.js, and checks every rule. |

```bash
cd contracts/test && npm install && npm test
```

Get an attestation from `POST /v1/decisions/{intent_id}/attestation` (see `frontend/src/content/docs/non-custodial.mdx`);
the signer address to pass to the constructor is `attestation_signer.address` from `GET /v1/proof/keys`.
