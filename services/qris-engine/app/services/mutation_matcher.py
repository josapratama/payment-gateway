"""
Real-Time Mutation Matcher & Webhook Dispatcher
Mencocokkan mutasi bank/e-wallet masuk dengan invoice aktif berdasarkan nominal eksak & jendela kedaluwarsa.
"""

import asyncio
import logging
import httpx
from datetime import datetime, timezone
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Invoice, InvoiceStatus, Mutation, MutationType, utc_now
from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory SSE subscriber queues for real-time checkout updates
# Dict of invoice_id -> List[asyncio.Queue]
_sse_subscribers: dict[str, list[asyncio.Queue]] = {}


def register_sse_listener(invoice_id: str) -> asyncio.Queue:
    """Mendaftarkan listener SSE untuk satu invoice."""
    q = asyncio.Queue()
    if invoice_id not in _sse_subscribers:
        _sse_subscribers[invoice_id] = []
    _sse_subscribers[invoice_id].append(q)
    return q


def unregister_sse_listener(invoice_id: str, q: asyncio.Queue):
    """Menghapus listener SSE."""
    if invoice_id in _sse_subscribers:
        if q in _sse_subscribers[invoice_id]:
            _sse_subscribers[invoice_id].remove(q)
        if not _sse_subscribers[invoice_id]:
            del _sse_subscribers[invoice_id]


async def broadcast_invoice_update(invoice: Invoice):
    """Kirim notifikasi SSE ke client browser yang sedang memantau invoice ini."""
    invoice_id = invoice.id
    if invoice_id in _sse_subscribers:
        data = invoice.to_dict()
        for q in list(_sse_subscribers[invoice_id]):
            try:
                await q.put(data)
            except Exception:
                pass


async def match_mutation_with_invoices(db: AsyncSession, mutation: Mutation) -> tuple[bool, Invoice | None]:
    """
    Cari invoice PENDING yang nominalnya cocok eksak dengan mutasi credit.
    """
    if mutation.type != MutationType.CR:
        return False, None

    now = utc_now()
    target_amount = int(round(mutation.amount))

    # Cari invoice PENDING dengan total_amount sama dan belum kedaluwarsa
    stmt = (
        select(Invoice)
        .where(
            and_(
                Invoice.status == InvoiceStatus.PENDING,
                Invoice.total_amount == target_amount,
                Invoice.expires_at >= now
            )
        )
        .order_by(Invoice.created_at.asc())
    )
    result = await db.execute(stmt)
    invoice = result.scalars().first()

    if not invoice:
        logger.info(f"[Matcher] Mutasi {mutation.bank} Rp {target_amount:,} tidak cocok dengan invoice pending manapun.")
        return False, None

    # Update Invoice & Mutation
    invoice.status = InvoiceStatus.PAID
    invoice.paid_at = now
    invoice.matched_mutation_id = mutation.id

    mutation.is_matched = True
    mutation.matched_invoice_id = invoice.id

    await db.commit()
    await db.refresh(invoice)

    logger.info(f"✅ [Matcher] Pembayaran Berhasil! Invoice {invoice.id} lunas via {mutation.bank} (Rp {target_amount:,})")

    # Broadcast ke browser pembeli via SSE
    await broadcast_invoice_update(invoice)

    # Kirim Webhook callback jika ada
    target_webhook = invoice.callback_url or settings.MERCHANT_WEBHOOK_URL
    if target_webhook:
        asyncio.create_task(dispatch_webhook(target_webhook, invoice, mutation))

    return True, invoice


async def dispatch_webhook(url: str, invoice: Invoice, mutation: Mutation):
    """Kirim HTTP POST callback ke sistem merchant."""
    payload = {
        "event": "payment.success",
        "timestamp": utc_now().isoformat(),
        "invoice": invoice.to_dict(),
        "payment": {
            "bank": mutation.bank,
            "amount": mutation.amount,
            "description": mutation.description,
            "sender_name": mutation.sender_name,
        }
    }
    headers = {
        "Content-Type": "application/json",
        "X-QRIS-Engine-Event": "payment.success",
        "X-QRIS-Engine-Secret": settings.WEBHOOK_SECRET_KEY,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            logger.info(f"[Webhook] Callback sent to {url} -> HTTP {resp.status_code}")
    except Exception as exc:
        logger.error(f"[Webhook] Failed sending callback to {url}: {exc}")


async def expire_old_invoices(db: AsyncSession):
    """Menandai invoice yang telah melewati batas waktu kedaluwarsa."""
    now = utc_now()
    stmt = (
        select(Invoice)
        .where(
            and_(
                Invoice.status == InvoiceStatus.PENDING,
                Invoice.expires_at < now
            )
        )
    )
    result = await db.execute(stmt)
    expired_list = result.scalars().all()

    for inv in expired_list:
        inv.status = InvoiceStatus.EXPIRED
        await broadcast_invoice_update(inv)

    if expired_list:
        await db.commit()
        logger.info(f"[Cleaner] Menandai {len(expired_list)} invoice sebagai EXPIRED.")

