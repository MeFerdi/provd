from __future__ import annotations

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any

import pandas as pd

from ml.data.features import build_features
from ml.models.ensemble import TrustScoreModel, score_to_risk_level


def _build_signals(payload: dict[str, Any], score: float) -> list[dict[str, Any]]:
    amount = float(payload.get("amount", 0.0) or 0.0)
    context = payload.get("context") or {}
    rail = str(context.get("rail", "unknown"))
    side = str(context.get("side", "buy"))
    entity_id = str(payload.get("entity_id", "unknown_entity"))

    amount_pressure = min(amount / 20000.0, 1.0)
    rail_pressure = 0.18 if rail == "otc" else 0.12 if rail == "p2p" else 0.08
    side_pressure = 0.05 if side == "sell" else 0.02
    entity_pressure = 0.28 if "watchlist" in entity_id else 0.18 if "flagged" in entity_id else 0.08

    return [
        {"name": "amount_pressure", "value": round(amount_pressure, 4), "weight": 0.35},
        {"name": "rail_pressure", "value": round(rail_pressure, 4), "weight": 0.2},
        {"name": "side_pressure", "value": round(side_pressure, 4), "weight": 0.1},
        {"name": "entity_hint_pressure", "value": round(entity_pressure, 4), "weight": 0.35},
        {"name": "model_confidence", "value": round(score, 4), "weight": 0.0},
    ]


def predict_payload(model: TrustScoreModel, payload: dict[str, Any]) -> dict[str, Any]:
    frame = pd.DataFrame([payload])
    features = build_features(frame)
    score = float(model.predict_scores(features).iloc[0])
    return {
        "entity_id": str(payload.get("entity_id", "unknown_entity")),
        "score": score,
        "risk_level": score_to_risk_level(score),
        "signals": _build_signals(payload, score),
        "cached": False,
    }


class InferenceHandler(BaseHTTPRequestHandler):
    model: TrustScoreModel | None = None

    def _send_json(self, status_code: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send_json(
                200,
                {
                    "status": "ok",
                    "model_loaded": self.model is not None,
                },
            )
            return

        self._send_json(404, {"detail": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/predict":
            self._send_json(404, {"detail": "Not found"})
            return

        content_length = int(self.headers.get("Content-Length", "0"))
        raw_body = self.rfile.read(content_length).decode("utf-8") if content_length else "{}"

        try:
            payload = json.loads(raw_body)
        except json.JSONDecodeError:
            self._send_json(400, {"detail": "Invalid JSON body"})
            return

        if self.model is None:
            self._send_json(503, {"detail": "Model is not loaded"})
            return

        try:
            response = predict_payload(self.model, payload)
        except Exception as exc:  # pragma: no cover - defensive
            self._send_json(400, {"detail": f"Unable to score payload: {exc}"})
            return

        self._send_json(200, response)

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        return


def load_model(path: str | Path) -> TrustScoreModel:
    requested = Path(path)
    if requested.exists():
        return TrustScoreModel.load(requested)

    cwd = Path.cwd()
    candidates = [
        cwd / requested,
        cwd / "ml" / requested,
        cwd / "ml" / "artifacts" / requested.name,
        Path(__file__).resolve().parent / "artifacts" / requested.name,
    ]

    for candidate in candidates:
        if candidate.exists():
            return TrustScoreModel.load(candidate)

    raise FileNotFoundError(
        f"Model artifact not found: {requested}. "
        "If you are running from the project root, use --model ml/artifacts/trust_score_model.pkl"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the Provd trust-score model")
    parser.add_argument("--model", type=str, default="ml/artifacts/trust_score_model.pkl", help="Path to the trained model artifact")
    parser.add_argument("--host", type=str, default="127.0.0.1", help="Host to bind")
    parser.add_argument("--port", type=int, default=8085, help="Port to bind")
    args = parser.parse_args()

    InferenceHandler.model = load_model(args.model)
    server = ThreadingHTTPServer((args.host, args.port), InferenceHandler)
    print(f"Provd ML inference service listening on http://{args.host}:{args.port}")
    print(f"Loaded model artifact: {args.model}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
