import uuid
import random
import json
import asyncio
from datetime import timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Invoice, InvoiceStatus, MerchantSetting, utc_now
from app.services.emvco import convert_to_dynamic_qris
from app.services.qrcode_gen import generate_qr_png_base64
from app.services.mutation_matcher import register_sse_listener, unregister_sse_listener, broadcast_invoice_update
from app.core.config import settings

router = APIRouter(prefix="/api/invoices", tags=["Invoices / Kasir POS"])


class CreateInvoiceRequest(BaseModel):
    amount: int = Field(..., gt=0, description="Nominal dasar tagihan (misal: 50000)")
    customer_name: Optional[str] = Field(None, description="Nama pelanggan")
    customer_contact: Optional[str] = Field(None, description="No. WhatsApp / Email")
    memo: Optional[str] = Field(None, description="Catatan pesanan / deskripsi")
    callback_url: Optional[str] = Field(None, description="URL webhook callback khusus invoice ini")
    use_unique_code: Optional[bool] = Field(True, description="Tambahkan kode unik 3 digit untuk verifikasi otomatis")
    static_qris_override: Optional[str] = Field(None, description="Gunakan payload QRIS statis tertentu jika tidak ingin pakai default")


@router.post("")
async def create_invoice(req: CreateInvoiceRequest, db: AsyncSession = Depends(get_db)):
    """Membuat invoice baru dengan QRIS Dinamis ber-nominal unik dan batas waktu kedaluwarsa."""
    # 1. Dapatkan base QRIS statis
    static_qris = req.static_qris_override or settings.DEFAULT_STATIC_QRIS
    if not static_qris:
        # Cek di database merchant_settings
        res_setting = await db.execute(select(MerchantSetting).where(MerchantSetting.key == "base_static_qris"))
        s_obj = res_setting.scalar_one_or_none()
        if s_obj and s_obj.value:
            static_qris = s_obj.value

    if not static_qris:
        raise HTTPException(
            status_code=400,
            detail="Master Static QRIS belum dikonfigurasi. Harap atur base QRIS statis di Pengaturan terlebih dahulu."
        )

    # 2. Hitung kode unik jika aktif
    unique_code = 0
    if req.use_unique_code:
        # Generate 3-digit random code
        unique_code = random.randint(settings.UNIQUE_CODE_MIN, settings.UNIQUE_CODE_MAX)

    total_amount = req.amount + unique_code

    # 3. Generate ID invoice
    short_uuid = uuid.uuid4().hex[:6].upper()
    now = utc_now()
    inv_id = f"INV-{now.strftime('%y%m%d')}-{short_uuid}"

    # 4. Generate Dynamic QRIS
    try:
        dynamic_payload, _ = convert_to_dynamic_qris(
            static_payload=static_qris,
            amount=total_amount,
            invoice_ref=inv_id,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gagal mengonversi QRIS: {str(exc)}")

    # 5. Hitung batas kedaluwarsa
    expires_at = now + timedelta(minutes=settings.INVOICE_EXPIRY_MINUTES)

    # 6. Simpan ke database
    invoice = Invoice(
        id=inv_id,
        base_amount=req.amount,
        unique_code=unique_code,
        total_amount=total_amount,
        status=InvoiceStatus.PENDING,
        customer_name=req.customer_name,
        customer_contact=req.customer_contact,
        memo=req.memo,
        dynamic_qris_payload=dynamic_payload,
        created_at=now,
        expires_at=expires_at,
        callback_url=req.callback_url,
    )
    db.add(invoice)
    await db.commit()
    await db.refresh(invoice)

    qr_image = generate_qr_png_base64(dynamic_payload)
    data = invoice.to_dict()
    data["qr_image_base64"] = qr_image

    return {"success": True, "invoice": data}


@router.get("")
async def list_invoices(
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Mengambil daftar riwayat invoice."""
    stmt = select(Invoice).order_by(desc(Invoice.created_at)).limit(limit)
    if status:
        stmt = stmt.where(Invoice.status == status.upper())
    res = await db.execute(stmt)
    invoices = res.scalars().all()
    return {"success": True, "invoices": [inv.to_dict() for inv in invoices]}


@router.get("/{invoice_id}")
async def get_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    """Mengambil detail satu invoice beserta image QRIS."""
    res = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")

    data = inv.to_dict()
    data["qr_image_base64"] = generate_qr_png_base64(inv.dynamic_qris_payload)
    return {"success": True, "invoice": data}


@router.get("/{invoice_id}/stream")
async def invoice_sse_stream(invoice_id: str, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Server-Sent Events (SSE) endpoint:
    Browser client mendengarkan status invoice secara real-time.
    Begitu terbayar, stream langsung mengirim event 'paid' dan memutar audio lunas.
    """
    res = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")

    q = register_sse_listener(invoice_id)

    async def event_generator():
        try:
            # Kirim status inisial
            initial_data = json.dumps(inv.to_dict())
            yield f"data: {initial_data}\n\n"

            # Jika sudah lunas, langsung selesai
            if inv.status in (InvoiceStatus.PAID, InvoiceStatus.EXPIRED, InvoiceStatus.CANCELLED):
                return

            while True:
                # Cek jika koneksi client terputus
                if await request.is_disconnected():
                    break
                try:
                    # Tunggu update berikutnya dengan timeout 20 detik (sebagai heartbeat)
                    update_data = await asyncio.wait_for(q.get(), timeout=20.0)
                    yield f"data: {json.dumps(update_data)}\n\n"
                    if update_data.get("status") in ("PAID", "EXPIRED", "CANCELLED"):
                        break
                except asyncio.TimeoutError:
                    # Heartbeat comment untuk menjaga koneksi tetap hidup
                    yield ": ping\n\n"
        finally:
            unregister_sse_listener(invoice_id, q)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )


@router.post("/{invoice_id}/cancel")
async def cancel_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    """Membatalkan invoice yang masih berstatus PENDING."""
    res = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")

    if inv.status != InvoiceStatus.PENDING:
        raise HTTPException(status_code=400, detail=f"Invoice berstatus {inv.status.value} tidak dapat dibatalkan")

    inv.status = InvoiceStatus.CANCELLED
    await db.commit()
    await broadcast_invoice_update(inv)
    return {"success": True, "message": "Invoice berhasil dibatalkan", "invoice": inv.to_dict()}


@router.post("/{invoice_id}/manual-pay")
async def manual_pay_invoice(invoice_id: str, db: AsyncSession = Depends(get_db)):
    """Tandai invoice lunas secara manual oleh admin kasir."""
    res = await db.execute(select(Invoice).where(Invoice.id == invoice_id))
    inv = res.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice tidak ditemukan")

    if inv.status == InvoiceStatus.PAID:
        return {"success": True, "message": "Invoice sudah berstatus LUNAS", "invoice": inv.to_dict()}

    inv.status = InvoiceStatus.PAID
    inv.paid_at = utc_now()
    await db.commit()
    await broadcast_invoice_update(inv)
    return {"success": True, "message": "Invoice berhasil ditandai LUNAS secara manual", "invoice": inv.to_dict()}

