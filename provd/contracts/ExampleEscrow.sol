// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ProvdReleaseVerifier} from "./ProvdReleaseVerifier.sol";

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}

/// @title ExampleEscrow
/// @notice A minimal P2P escrow: the seller locks tokens for a trade; they're released to the buyer only with a
///         Provd release attestation for that trade, or refunded to the seller after a timeout.
/// @dev Illustration only, not audited. `tradeId` is the attestation's `intentId`: keccak256 of the Provd
///      intent id string, returned by the attestation API as `typed_data.message.intentId`.
contract ExampleEscrow is ProvdReleaseVerifier {
    struct Trade {
        address seller;
        address buyer;
        uint256 amount;
        uint64 refundableAfter;
        bool settled;
    }

    IERC20 public immutable token;
    address public immutable owner;
    mapping(bytes32 => Trade) public trades;

    error NotOwner();
    error TradeExists();
    error UnknownTrade();
    error AlreadySettled();
    error NotRefundableYet();
    error TransferFailed();

    constructor(IERC20 token_, address provdSigner_) ProvdReleaseVerifier(provdSigner_) {
        token = token_;
        owner = msg.sender;
    }

    function lock(bytes32 tradeId, address buyer, uint256 amount, uint64 refundableAfter) external {
        if (trades[tradeId].seller != address(0)) revert TradeExists();
        trades[tradeId] = Trade(msg.sender, buyer, amount, refundableAfter, false);
        if (!token.transferFrom(msg.sender, address(this), amount)) revert TransferFailed();
    }

    /// @notice Anyone may submit the release once Provd has attested it; funds can only go to the buyer.
    function release(bytes32 tradeId, uint64 expiresAt, bytes32 recordHash, uint8 v, bytes32 r, bytes32 s) external {
        Trade storage t = trades[tradeId];
        if (t.seller == address(0)) revert UnknownTrade();
        if (t.settled) revert AlreadySettled();
        _consumeAttestation(tradeId, t.buyer, t.amount, expiresAt, recordHash, v, r, s);
        t.settled = true;
        if (!token.transfer(t.buyer, t.amount)) revert TransferFailed();
    }

    function refund(bytes32 tradeId) external {
        Trade storage t = trades[tradeId];
        if (t.seller == address(0)) revert UnknownTrade();
        if (t.settled) revert AlreadySettled();
        if (block.timestamp < t.refundableAfter) revert NotRefundableYet();
        t.settled = true;
        if (!token.transfer(t.seller, t.amount)) revert TransferFailed();
    }

    function setProvdSigner(address signer) external {
        if (msg.sender != owner) revert NotOwner();
        _setProvdSigner(signer);
    }
}
