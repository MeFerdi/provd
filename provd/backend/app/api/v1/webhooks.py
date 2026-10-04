"""Inbound webhooks from payment providers. Authenticated by signature, not API key."""
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.dependencies import get_db_session
from app.models.rails import CreditPurchase
from app.services import paystack
from app.services.rate_limit import client_ip, webhook_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"], dependencies=[Depends(webhook_limit)])


@router.post("/paystack", summary="Paystack events (charge.success credits a card top-up)", include_in_schema=False)
async def paystack_webhook(
	request: Request,
	db: AsyncSession = Depends(get_db_session),
	x_paystack_signature: str | None = Header(default=None),
) -> dict:
	allowed = get_settings().paystack_webhook_ips
	if allowed and client_ip(request) not in allowed:
		logger.warning("paystack.webhook.ip_rejected ip=%s", client_ip(request))
		raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
	raw = await request.body()
	if not paystack.signature_valid(raw, x_paystack_signature):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
	event = await request.json()
	if event.get("event") != "charge.success":
		return {"received": True}
	tx = paystack.transaction_from(event.get("data") or {})
	purchase = await db.get(CreditPurchase, tx.reference) if tx.reference else None
	if purchase is None or not paystack.handles(purchase):
		logger.warning("paystack.webhook.unknown_reference %s", tx.reference)
		return {"received": True}
	result = paystack.settle(purchase, tx)
	await db.commit()
	logger.info("paystack.webhook purchase=%s status=%s", purchase.id, result)
	return {"received": True}
