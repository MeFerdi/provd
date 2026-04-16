import { getMockBaseUrl as getSharedMockBaseUrl, getSandboxApiKey as getSharedSandboxApiKey } from "@/lib/env";

export type TradeSide = "buy" | "sell";

export type ScoreRequest = {
  entity_id: string;
  amount: number;
  currency: string;
  context: {
    rail: string;
    fiat_currency: string;
    asset: string;
    side: TradeSide;
    channel?: string;
    [key: string]: string | number | boolean | null | undefined;
  };
};

export type TrustSignal = {
  name: string;
  value: number;
  weight: number;
};

export type TrustResponse = {
  entity_id: string;
  score: number;
  risk_level: "low" | "medium" | "high";
  signals: TrustSignal[];
  cached: boolean;
};

export type LiveTrustPayload = Partial<TrustResponse> & {
  entity_id?: unknown;
  score?: unknown;
  risk_level?: unknown;
  signals?: unknown;
  cached?: unknown;
};

export type ValidationErrors = Partial<Record<"entity_id" | "amount" | "currency" | "rail" | "fiat_currency" | "asset" | "side", string>>;

export type PlaygroundPreset = {
  label: string;
  description: string;
  payload: ScoreRequest;
};

export const SCORE_PATH = "/api/v1/trust/score";

export const DEFAULT_REQUEST: ScoreRequest = {
  entity_id: "",
  amount: 100,
  currency: "USDT",
  context: {
    rail: "p2p",
    fiat_currency: "NGN",
    asset: "USDT",
    side: "buy",
    channel: "playground",
  },
};

export const PLAYGROUND_PRESETS: PlaygroundPreset[] = [
  {
    label: "Low risk trade",
    description: "Expected approve path",
    payload: {
      entity_id: "counterparty-clean-001",
      amount: 420,
      currency: "USDT",
      context: { rail: "p2p", fiat_currency: "NGN", asset: "USDT", side: "buy", channel: "playground" },
    },
  },
  {
    label: "Flagged counterparty",
    description: "Medium risk with review",
    payload: {
      entity_id: "counterparty-flagged-08b1",
      amount: 1600,
      currency: "USDC",
      context: { rail: "otc", fiat_currency: "KES", asset: "USDC", side: "sell", channel: "playground" },
    },
  },
  {
    label: "High value review",
    description: "Large amount triggers manual check",
    payload: {
      entity_id: "counterparty-high-value-775",
      amount: 7500,
      currency: "USDT",
      context: { rail: "exchange", fiat_currency: "GHS", asset: "USDT", side: "buy", channel: "playground" },
    },
  },
  {
    label: "Blocked wallet",
    description: "High risk with block action",
    payload: {
      entity_id: "counterparty-watchlist-ffff",
      amount: 12000,
      currency: "USDT",
      context: { rail: "p2p", fiat_currency: "NGN", asset: "USDT", side: "sell", channel: "playground" },
    },
  },
];

export function getSandboxApiKey(): string {
  return getSharedSandboxApiKey();
}

export function getMockBaseUrl(): string {
  return getSharedMockBaseUrl();
}

export function validateScoreRequest(request: ScoreRequest): ValidationErrors {
  const errors: ValidationErrors = {};
  if (!request.entity_id.trim()) errors.entity_id = "entity_id is required";
  if (Number.isNaN(request.amount) || request.amount < 0) errors.amount = "amount must be 0 or greater";
  if (!request.currency.trim()) errors.currency = "currency is required";
  if (!request.context.rail.trim()) errors.rail = "rail is required";
  if (!request.context.fiat_currency.trim()) errors.fiat_currency = "fiat_currency is required";
  if (!request.context.asset.trim()) errors.asset = "asset is required";
  if (!request.context.side.trim()) errors.side = "side is required";
  return errors;
}

export function runMockScore(request: ScoreRequest): TrustResponse {
  const entity = request.entity_id.toLowerCase();
  const { amount } = request;
  const { rail } = request.context;

  if (entity.includes("watchlist") || entity.includes("ffff") || amount >= 10000) {
    return {
      entity_id: request.entity_id,
      score: 19,
      risk_level: "high",
function buildMockTrustResponse(
  request: ScoreRequest,
  response: Pick<TrustResponse, "score" | "risk_level" | "recommended_action" | "scenario"> & { flags: string[] },
): TrustResponse {
  return {
    entity_id: request.wallet_address,
    score: response.score,
    risk_level: response.risk_level,
    signals: response.flags,
    flags: response.flags,
    recommended_action: response.recommended_action,
    scenario: response.scenario,
    cached: false,
  };
}

export function runMockScore(request: ScoreRequest): TrustResponse {
  const wallet = request.wallet_address.toLowerCase();
  const hash = request.phone_hash.toLowerCase();
  const { amount, rail } = request.context;

  if (wallet.includes("watchlist") || hash.startsWith("ffff") || amount >= 10000) {
    return buildMockTrustResponse(request, {
      score: 19,
      risk_level: "high",
      flags: ["wallet_watchlist_match", "linked_chargeback_cluster", "velocity_spike_detected"],
      recommended_action: "block",
      scenario: "blocked_wallet",
    });
  }

  if (amount > 5000 || rail === "otc") {
    return buildMockTrustResponse(request, {
      score: 58,
      risk_level: "medium",
      flags: ["high_value_trade", "counterparty_needs_manual_review"],
      recommended_action: "review",
      scenario: "high_value_review",
    });
  }

  if (wallet.includes("08b1") || hash.endsWith("b3dd")) {
    return buildMockTrustResponse(request, {
      score: 67,
      risk_level: "medium",
      flags: ["minor_dispute_history", "cross-rail_activity"],
      recommended_action: "review",
      scenario: "flagged_counterparty",
    });
  }

  return buildMockTrustResponse(request, {
    score: 86,
    risk_level: "low",
    flags: ["stable_trade_pattern"],
    recommended_action: "approve",
    scenario: "low_risk_trade",
  });
}

export function normalizeTrustResponse(payload: LiveTrustPayload): TrustResponse {
  const normalizedRiskLevel: TrustResponse["risk_level"] =
    payload.risk_level === "low" || payload.risk_level === "medium" || payload.risk_level === "high"
      ? payload.risk_level
      : "medium";

  const normalizedSignals: TrustSignal[] = Array.isArray(payload.signals)
    ? payload.signals
        .map((signal) => {
          if (typeof signal !== "object" || signal === null) {
            return null;
          }

          const obj = signal as Record<string, unknown>;
          return {
            name: typeof obj.name === "string" ? obj.name : "unknown_signal",
            value: typeof obj.value === "number" ? obj.value : 0,
            weight: typeof obj.weight === "number" ? obj.weight : 0,
          } satisfies TrustSignal;
        })
        .filter((signal): signal is TrustSignal => signal !== null)
    : [];

  return {
    entity_id: typeof payload.entity_id === "string" && payload.entity_id.trim() ? payload.entity_id : "unknown_entity",
    score: typeof payload.score === "number" && Number.isFinite(payload.score) ? payload.score : 0,
    risk_level: normalizedRiskLevel,
    signals: normalizedSignals,
    cached: typeof payload.cached === "boolean" ? payload.cached : false,
  };
}

export function getRecommendedAction(riskLevel?: TrustResponse["risk_level"]): "approve" | "review" | "block" {
  if (riskLevel === "high") return "block";
  if (riskLevel === "medium") return "review";
  return "approve";
}
