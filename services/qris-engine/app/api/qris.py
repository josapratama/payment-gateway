from fastapi import APIRouter, HTTPException, Query, Response
from pydantic import BaseModel, Field
from typing import Optional

from app.services.emvco import inspect_qris, convert_to_dynamic_qris
from app.services.qrcode_gen import generate_qr_svg, generate_qr_png_base64, generate_qr_png_bytes

router = APIRouter(prefix="/api/qris", tags=["QRIS Engine"])


class InspectRequest(BaseModel):
    payload: str = Field(..., description="String payload QRIS lengkap")


class ConvertRequest(BaseModel):
    static_payload: str = Field(..., description="String payload QRIS statis")
    amount: float = Field(..., gt=0, description="Nominal transaksi yang ingin dikunci")
    invoice_ref: Optional[str] = Field(None, description="Nomor invoice / referensi unik (opsional)")
    terminal_id: Optional[str] = Field(None, description="Terminal ID (opsional)")


@router.post("/inspect")
async def inspect_qris_endpoint(req: InspectRequest):
    """Menganalisis payload QRIS dan membedah seluruh komponen tag TLV EMVCo."""
    try:
        data = inspect_qris(req.payload)
        return {"success": True, "data": data}
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gagal mengurai payload QRIS: {str(exc)}")


@router.post("/convert")
async def convert_qris_endpoint(req: ConvertRequest):
    """Mengonversi QRIS Statis menjadi QRIS Dinamis ber-nominal."""
    try:
        dynamic_payload, info = convert_to_dynamic_qris(
            static_payload=req.static_payload,
            amount=req.amount,
            invoice_ref=req.invoice_ref,
            terminal_id=req.terminal_id,
        )
        qr_base64 = generate_qr_png_base64(dynamic_payload)
        return {
            "success": True,
            "dynamic_payload": dynamic_payload,
            "info": info,
            "qr_image_base64": qr_base64,
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gagal konversi QRIS: {str(exc)}")


@router.get("/qr.png")
async def get_qr_png(
    data: str = Query(..., description="Payload data yang ingin dijadikan QR"),
    size: int = Query(10, ge=4, le=30, description="Ukuran kotak QR")
):
    """Mengembalikan output image PNG langsung untuk QR code."""
    try:
        png_bytes = generate_qr_png_bytes(data, box_size=size)
        return Response(content=png_bytes, media_type="image/png")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gagal generate QR image: {str(exc)}")


@router.get("/qr.svg")
async def get_qr_svg(
    data: str = Query(..., description="Payload data yang ingin dijadikan QR")
):
    """Mengembalikan output SVG murni untuk QR code."""
    try:
        svg_content = generate_qr_svg(data)
        return Response(content=svg_content, media_type="image/svg+xml")
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Gagal generate QR SVG: {str(exc)}")

