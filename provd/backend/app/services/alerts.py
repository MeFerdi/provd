"""Deliver posture-change alerts to the configured webhook and/or Telegram chat."""
import logging

import httpx

from app.config import get_settings
from app.models.posture import Protocol
from app.schemas.posture import ChangeEvent

logger = logging.getLogger("provd.alerts")

_ICONS = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "⚪️", "info": "🔵"}


def format_alert(protocol: Protocol, events: list[ChangeEvent], site_url: str) -> str:
	lines = [f"Provd: {protocol.name} configuration changed"]
	lines += [f"{_ICONS.get(e.severity, '•')} [{e.severity}] {e.summary}" for e in events]
	lines.append(f"{site_url.rstrip('/')}/ratings/{protocol.slug}")
	return "\n".join(lines)


async def send_alerts(protocol: Protocol, events: list[ChangeEvent]) -> None:
	settings = get_settings()
	text = format_alert(protocol, events, settings.public_site_url)
	logger.warning("posture.alert slug=%s changes=%d", protocol.slug, len(events))
	async with httpx.AsyncClient(timeout=10) as http:
		if settings.alert_webhook_url:
			payload = {
				"protocol": protocol.slug,
				"contract": protocol.contract,
				"chain": protocol.chain,
				"text": text,
				"events": [e.model_dump(mode="json") for e in events],
			}
			try:
				(await http.post(settings.alert_webhook_url, json=payload)).raise_for_status()
			except httpx.HTTPError as exc:
				logger.error("alerts.webhook_failed error=%s", type(exc).__name__)
		if settings.telegram_bot_token and settings.telegram_alert_chat_id:
			try:
				response = await http.post(
					f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage",
					json={"chat_id": settings.telegram_alert_chat_id, "text": text, "disable_web_page_preview": True},
				)
				response.raise_for_status()
			except httpx.HTTPError as exc:
				# Never log the URL: it contains the bot token.
				logger.error("alerts.telegram_failed error=%s", type(exc).__name__)
