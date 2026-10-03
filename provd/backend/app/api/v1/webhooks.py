"""Inbound webhooks from payment providers. Authenticated by signature, not API key."""
import logging

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session
from app.models.rails import CreditPurchase
from app.services import paystack

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/paystack", summary="Paystack events (charge.success credits a card top-up)", include_in_schema=False)
async def paystack_webhook(
	request: Request,
	db: AsyncSession = Depends(get_db_session),
	x_paystack_signature: str | None = Header(default=None),
) -> dict:
	raw = await request.body()
	if not paystack.signature_valid(raw, x_paystack_signature):
		raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
	event = await request.json()
	if event.get("event") != "charge.success":
		return {"received": True}
	tx = paystack.transaction_from(event.get("data") or {})
	purchase = await db.get(CreditPurchase, tx.reference) if tx.reference else None
	if purchase is None or purchase.method != "card":
		logger.warning("paystack.webhook.unknown_reference %s", tx.reference)
		return {"received": True}
	result = paystack.settle(purchase, tx)
	await db.commit()
	logger.info("paystack.webhook purchase=%s status=%s", purchase.id, result)
	return {"received": True}
