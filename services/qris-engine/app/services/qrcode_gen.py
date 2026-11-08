"""
QR Code Image & SVG Generator.
Menghasilkan QR code beresolusi tinggi, baik dalam format SVG maupun Base64 PNG.
"""

import io
import base64
import qrcode
from qrcode.image.svg import SvgPathImage

def generate_qr_svg(data: str) -> str:
    """Menghasilkan representasi string SVG murni yang dapat di-embed langsung ke HTML."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=2,
        image_factory=SvgPathImage
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image()
    stream = io.BytesIO()
    img.save(stream)
    return stream.getvalue().decode("utf-8")


def generate_qr_png_base64(data: str, box_size: int = 10, border: int = 2) -> str:
    """Menghasilkan Data URL base64 image/png (data:image/png;base64,...)."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def generate_qr_png_bytes(data: str, box_size: int = 10, border: int = 2) -> bytes:
    """Menghasilkan raw bytes PNG untuk endpoint download image."""
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=box_size,
        border=border,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()

