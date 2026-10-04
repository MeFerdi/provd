// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ProvdReleaseVerifier
/// @notice Lets an escrow require a Provd release attestation (EIP-712) before it releases funds.
///         Works on EVM chains and on Tron (TVM), which runs the same contracts and `ecrecover`.
/// @dev Get an attestation from `POST /v1/decisions/{intent_id}/attestation` with target "evm",
///      this contract's address as `verifying_contract` and the chain id it runs on. Each attestation
///      can be used once, before `expiresAt`, for exactly the attested recipient and amount.
abstract contract ProvdReleaseVerifier {
    bytes32 private constant DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");
    bytes32 private constant RELEASE_TYPEHASH = keccak256(
        "ReleaseAttestation(bytes32 intentId,bytes32 recipient,uint256 amount,uint64 expiresAt,bytes32 recordHash)"
    );
    bytes32 private constant NAME_HASH = keccak256("Provd Release Attestation");
    bytes32 private constant VERSION_HASH = keccak256("1");
    // secp256k1n / 2: signatures with a higher s are malleable copies and are rejected.
    uint256 private constant HALF_ORDER = 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0;

    /// @notice The Provd attestation signer (`attestation_signer.address` from GET /v1/proof/keys).
    address public provdSigner;
    /// @notice Attestations already used, by intent id.
    mapping(bytes32 => bool) public attestationUsed;

    event ProvdSignerChanged(address indexed previous, address indexed current);
    event ReleaseAttested(bytes32 indexed intentId, address indexed recipient, uint256 amount, bytes32 recordHash);

    error AttestationExpired();
    error AttestationAlreadyUsed();
    error InvalidAttestationSignature();
    error ZeroSigner();

    constructor(address signer) {
        _setProvdSigner(signer);
    }

    /// @notice The EIP-712 digest Provd signs for this contract and chain.
    function attestationDigest(bytes32 intentId, bytes32 recipient, uint256 amount, uint64 expiresAt, bytes32 recordHash)
        public
        view
        returns (bytes32)
    {
        bytes32 domainSeparator =
            keccak256(abi.encode(DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, block.chainid, address(this)));
        bytes32 structHash = keccak256(abi.encode(RELEASE_TYPEHASH, intentId, recipient, amount, expiresAt, recordHash));
        return keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
    }

    /// @notice True if Provd signed exactly this release (does not check expiry or reuse).
    function isAttested(
        bytes32 intentId,
        address recipient,
        uint256 amount,
        uint64 expiresAt,
        bytes32 recordHash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public view returns (bool) {
        if (uint256(s) > HALF_ORDER || (v != 27 && v != 28)) return false;
        bytes32 digest = attestationDigest(intentId, bytes32(uint256(uint160(recipient))), amount, expiresAt, recordHash);
        address signer = ecrecover(digest, v, r, s);
        return signer != address(0) && signer == provdSigner;
    }

    /// @dev Call before releasing: reverts unless the attestation is valid, unexpired and unused, then marks it used.
    function _consumeAttestation(
        bytes32 intentId,
        address recipient,
        uint256 amount,
        uint64 expiresAt,
        bytes32 recordHash,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal {
        if (block.timestamp > expiresAt) revert AttestationExpired();
        if (attestationUsed[intentId]) revert AttestationAlreadyUsed();
        if (!isAttested(intentId, recipient, amount, expiresAt, recordHash, v, r, s)) revert InvalidAttestationSignature();
        attestationUsed[intentId] = true;
        emit ReleaseAttested(intentId, recipient, amount, recordHash);
    }

    /// @dev Expose behind your own access control to rotate the Provd signer.
    function _setProvdSigner(address signer) internal {
        if (signer == address(0)) revert ZeroSigner();
        emit ProvdSignerChanged(provdSigner, signer);
        provdSigner = signer;
    }
}
