export type Chain = "solana" | "celo" | "ethereum";
export type TradeSide = "buy" | "sell";

export type ScoreRequest = {
  wallet_address: string;
  phone_hash: string;
  chain: Chain;
  context: {
    rail: string;
    fiat_currency: string;
    asset: string;
    amount: number;
    side: TradeSide;
  };
};

export type TrustSignal = {
  name: string;
  value: string | number | boolean | null;
};

export type TrustResponse = {
  entity_id: string;
  score: number;
  risk_level: "low" | "medium" | "high";
  signals: TrustSignal[];
  cached: boolean;
};

export type ValidationErrors = Partial<Record<"wallet_address" | "phone_hash" | "rail" | "fiat_currency" | "asset" | "amount", string>>;

export type PlaygroundPreset = {
  label: string;
  description: string;
  payload: ScoreRequest;
};

export const SCORE_PATH = "/v1/counterparties/score";

export const CHAIN_OPTIONS: Chain[] = ["solana", "celo", "ethereum"];

export const DEFAULT_REQUEST: ScoreRequest = {
  wallet_address: "",
  phone_hash: "",
  chain: "solana",
  context: {
    rail: "p2p",
    fiat_currency: "NGN",
    asset: "USDT",
    amount: 100,
    side: "buy",
  },
};

export const PLAYGROUND_PRESETS: PlaygroundPreset[] = [
  {
    label: "Low risk trade",
    description: "Expected approve path",
    payload: {
      wallet_address: "SOLANA_DEMO_WALLET_01",
      phone_hash: "2f6f0c0c70f92f7f9e74f4b978f7ecf7dfd4e6b0b8df94f4ed7ecbc9f6db7b31",
      chain: "solana",
      context: { rail: "p2p", fiat_currency: "NGN", asset: "USDT", amount: 420, side: "buy" },
    },
  },
  {
    label: "Flagged counterparty",
    description: "Medium risk with review",
    payload: {
      wallet_address: "ETH_DEMO_WALLET_08B1",
      phone_hash: "cf0f9079f912aa95fbef8f04fa3354f6ebd4d2ff7f4f9028e9bd3bce1098b3dd",
      chain: "ethereum",
      context: { rail: "otc", fiat_currency: "KES", asset: "USDC", amount: 1600, side: "sell" },
    },
  },
  {
    label: "High value review",
    description: "Large amount triggers manual check",
    payload: {
      wallet_address: "CELO_DEMO_WALLET_HIGH_VALUE",
      phone_hash: "cfa9f139e0d4318de882f0f8bbf14f7a9f2a30250c1e7722b76f31d9fa1b8c22",
      chain: "celo",
      context: { rail: "exchange", fiat_currency: "GHS", asset: "USDT", amount: 7500, side: "buy" },
    },
  },
  {
    label: "Blocked wallet",
    description: "High risk with block action",
    payload: {
      wallet_address: "WALLET_WATCHLIST_DEMO",
      phone_hash: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      chain: "ethereum",
      context: { rail: "p2p", fiat_currency: "NGN", asset: "USDT", amount: 12000, side: "sell" },
    },
  },
];

const SHA256_REGEX = /^[a-f0-9]{64}$/i;

export function getSandboxApiKey(): string {
  return process.env.NEXT_PUBLIC_PROVD_SANDBOX_API_KEY ?? "";
}

export function getMockBaseUrl(): string {
  return process.env.NEXT_PUBLIC_PROVD_MOCK_BASE_URL ?? "https://sandbox.provd.network/mock";
}

export function validateScoreRequest(request: ScoreRequest): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!request.wallet_address.trim()) errors.wallet_address = "wallet_address is required";
  if (!SHA256_REGEX.test(request.phone_hash.trim())) errors.phone_hash = "phone_hash must be a 64-char sha256 hex";
  if (!request.context.rail.trim()) errors.rail = "rail is required";
  if (!request.context.fiat_currency.trim()) errors.fiat_currency = "fiat_currency is required";
  if (!request.context.asset.trim()) errors.asset = "asset is required";
  if (Number.isNaN(request.context.amount) || request.context.amount <= 0) errors.amount = "amount must be greater than 0";
  return errors;
}

export function runMockScore(request: ScoreRequest): TrustResponse {
  const wallet = request.wallet_address.toLowerCase();
  const hash = request.phone_hash.toLowerCase();
  const { amount, rail } = request.context;

  if (wallet.includes("watchlist") || hash.startsWith("ffff") || amount >= 10000) {
    return {
      score: 19,
      risk_level: "high",
      flags: ["wallet_watchlist_match", "linked_chargeback_cluster", "velocity_spike_detected"],
      recommended_action: "block",
      scenario: "blocked_wallet",
    };
  }

  if (amount > 5000 || rail === "otc") {
    return {
      score: 58,
      risk_level: "medium",
      flags: ["high_value_trade", "counterparty_needs_manual_review"],
      recommended_action: "review",
      scenario: "high_value_review",
    };
  }

  if (wallet.includes("08b1") || hash.endsWith("b3dd")) {
    return {
      score: 67,
      risk_level: "medium",
      flags: ["minor_dispute_history", "cross-rail_activity"],
      recommended_action: "review",
      scenario: "flagged_counterparty",
    };
  }

  return {
    score: 86,
    risk_level: "low",
    flags: ["stable_trade_pattern"],
    recommended_action: "approve",
    scenario: "low_risk_trade",
  };
}
