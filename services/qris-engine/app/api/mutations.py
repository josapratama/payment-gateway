import re
import json
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.db.models import Mutation, MutationType, utc_now
from app.services.mutation_matcher import match_mutation_with_invoices

router = APIRouter(prefix="/api/mutations", tags=["Mutations & Webhook Inbound"])


class InboundMutationRequest(BaseModel):
    bank: str = Field(..., description="Nama Bank / E-Wallet (misal: BCA, MANDIRI, BRI, GOPAY, OVO, DANA, SHOPEEPAY)")
    amount: float = Field(..., gt=0, description="Nominal mutasi masuk")
    type: Optional[str] = Field("CR", description="CR (Credit/Masuk) atau DB (Debit/Keluar)")
    description: Optional[str] = Field("", description="Berita transfer / keterangan mutasi")
    sender_name: Optional[str] = Field(None, description="Nama pengirim (jika ada)")
    raw_payload: Optional[str] = Field(None, description="Payload mentah dari forwarder")


class NotificationParseRequest(BaseModel):
    bank: str = Field("NOTIFICATION", description="Sumber aplikasi notifikasi")
    message: str = Field(..., description="Teks pesan notifikasi SMS/Push dari m-Banking")


def extract_amount_from_text(text: str) -> Optional[float]:
    """Ekstraksi nominal uang dari teks notifikasi SMS atau push notification bank."""
    # Format misal: Rp 50.231 atau Rp. 50,231.00 atau Rp50231
    match = re.search(r"Rp\.?\s*([0-9.,]+)", text, re.IGNORECASE)
    if match:
        raw_num = match.group(1).replace(".", "").replace(",", ".")
        try:
            return float(raw_num)
        except ValueError:
            pass
    # Format angka langsung: 50231
    match_plain = re.search(r"\b([1-9][0-9]{3,8})\b", text)
    if match_plain:
        try:
            return float(match_plain.group(1))
        except ValueError:
            pass
    return None


@router.post("/webhook")
async def receive_mutation_webhook(req: InboundMutationRequest, db: AsyncSession = Depends(get_db)):
    """
    Webhook Inbound untuk menerima notifikasi mutasi kredit dari listener bank / e-wallet.
    Otomatis mencocokkan nominal dengan invoice aktif dan memicu pembayaran lunas.
    """
    m_type = MutationType.CR if req.type.upper() == "CR" else MutationType.DB

    mutation = Mutation(
        bank=req.bank.upper(),
        type=m_type,
        amount=req.amount,
        description=req.description or "Mutasi Masuk Webhook",
        sender_name=req.sender_name,
        raw_payload=req.raw_payload or json.dumps(req.model_dump()),
        created_at=utc_now(),
    )
    db.add(mutation)
    await db.commit()
    await db.refresh(mutation)

    matched, matched_inv = await match_mutation_with_invoices(db, mutation)

    return {
        "success": True,
        "mutation_id": mutation.id,
        "matched": matched,
        "invoice_id": matched_inv.id if matched_inv else None,
        "message": f"Mutasi Rp {mutation.amount:,.0f} diterima ({'Cocok dengan invoice ' + matched_inv.id if matched else 'Belum cocok'})"
    }


@router.post("/parse-notification")
async def parse_and_record_notification(req: NotificationParseRequest, db: AsyncSession = Depends(get_db)):
    """
    Menerima teks notifikasi SMS/Push (misal dari MacroDroid / Tasker di HP merchant)
    dan mengekstrak nominal secara cerdas untuk memverifikasi pembayaran.
    """
    extracted_amount = extract_amount_from_text(req.message)
    if not extracted_amount:
        raise HTTPException(status_code=400, detail="Tidak dapat menemukan nominal uang dari teks notifikasi")

    mutation = Mutation(
        bank=req.bank.upper(),
        type=MutationType.CR,
        amount=extracted_amount,
        description=req.message[:250],
        raw_payload=req.message,
        created_at=utc_now(),
    )
    db.add(mutation)
    await db.commit()
    await db.refresh(mutation)

    matched, matched_inv = await match_mutation_with_invoices(db, mutation)

    return {
        "success": True,
        "extracted_amount": extracted_amount,
        "mutation_id": mutation.id,
        "matched": matched,
        "invoice_id": matched_inv.id if matched_inv else None,
    }


@router.post("/simulate")
async def simulate_incoming_payment(amount: float, bank: str = "SIMULATOR_BCA", db: AsyncSession = Depends(get_db)):
    """Simulasi pembayaran masuk untuk pengujian langsung tanpa perlu transfer uang beneran."""
    mutation = Mutation(
        bank=bank.upper(),
        type=MutationType.CR,
        amount=amount,
        description=f"Simulasi transfer QRIS {bank}",
        sender_name="Pengguna Uji Coba",
        created_at=utc_now(),
    )
    db.add(mutation)
    await db.commit()
    await db.refresh(mutation)

    matched, matched_inv = await match_mutation_with_invoices(db, mutation)

    return {
        "success": True,
        "simulated": True,
        "mutation": mutation.to_dict(),
        "matched": matched,
        "matched_invoice": matched_inv.to_dict() if matched_inv else None,
    }


@router.get("")
async def list_mutations(limit: int = Query(50, ge=1, le=200), db: AsyncSession = Depends(get_db)):
    """Daftar riwayat mutasi rekening yang masuk."""
    res = await db.execute(select(Mutation).order_by(desc(Mutation.created_at)).limit(limit))
    mutations = res.scalars().all()
    return {"success": True, "mutations": [m.to_dict() for m in mutations]}

