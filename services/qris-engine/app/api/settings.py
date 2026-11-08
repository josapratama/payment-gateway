from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import MerchantSetting
from app.services.emvco import inspect_qris
from app.core.config import settings

router = APIRouter(prefix="/api/settings", tags=["Merchant Settings"])

# Default QRIS Statis Contoh (BCA / Nobu Standard Format)
SAMPLE_STATIC_QRIS = (
    "00020101021126610014ID.LINKAJA.WWW0118936009110021234567021012345678900303UMI"
    "51440014ID.CO.QRIS.WWW0215ID10200212345670303UMI5204541153033605802ID"
    "5916MINIHOST STORE ID6007JAKARTA61051234062070703A016304"
)

class UpdateSettingsRequest(BaseModel):
    base_static_qris: Optional[str] = Field(None, description="Payload string QRIS Statis milik toko Anda")
    merchant_webhook_url: Optional[str] = Field(None, description="URL callback merchant saat pembayaran lunas")
    webhook_secret: Optional[str] = Field(None, description="Secret token untuk verifikasi signature webhook")
    invoice_expiry_minutes: Optional[int] = Field(15, ge=1, le=1440)


@router.get("")
async def get_settings(db: AsyncSession = Depends(get_db)):
    """Mengambil konfigurasi merchant aktif saat ini."""
    stmt = select(MerchantSetting)
    res = await db.execute(stmt)
    records = res.scalars().all()
    kv = {r.key: r.value for r in records}

    base_qris = kv.get("base_static_qris", settings.DEFAULT_STATIC_QRIS) or SAMPLE_STATIC_QRIS
    
    # Inspeksi informasi merchant dari base QRIS jika ada
    merchant_info = None
    try:
        merchant_info = inspect_qris(base_qris)
    except Exception:
        pass

    return {
        "success": True,
        "base_static_qris": base_qris,
        "merchant_webhook_url": kv.get("merchant_webhook_url", settings.MERCHANT_WEBHOOK_URL),
        "webhook_secret": kv.get("webhook_secret", settings.WEBHOOK_SECRET_KEY),
        "invoice_expiry_minutes": int(kv.get("invoice_expiry_minutes", settings.INVOICE_EXPIRY_MINUTES)),
        "merchant_info": merchant_info,
        "sample_static_qris": SAMPLE_STATIC_QRIS,
    }


@router.post("")
async def save_settings(req: UpdateSettingsRequest, db: AsyncSession = Depends(get_db)):
    """Menyimpan konfigurasi base static QRIS dan webhook merchant."""
    if req.base_static_qris:
        clean_qris = req.base_static_qris.strip()
        # Validasi payload QRIS
        try:
            inspect_qris(clean_qris)
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Payload QRIS tidak valid: {str(exc)}")
        await _upsert_setting(db, "base_static_qris", clean_qris)

    if req.merchant_webhook_url is not None:
        await _upsert_setting(db, "merchant_webhook_url", req.merchant_webhook_url.strip())

    if req.webhook_secret is not None:
        await _upsert_setting(db, "webhook_secret", req.webhook_secret.strip())

    if req.invoice_expiry_minutes:
        await _upsert_setting(db, "invoice_expiry_minutes", str(req.invoice_expiry_minutes))

    await db.commit()
    return {"success": True, "message": "Konfigurasi merchant berhasil disimpan"}


async def _upsert_setting(db: AsyncSession, key: str, value: str):
    res = await db.execute(select(MerchantSetting).where(MerchantSetting.key == key))
    obj = res.scalar_one_or_none()
    if obj:
        obj.value = value
    else:
        db.add(MerchantSetting(key=key, value=value))

