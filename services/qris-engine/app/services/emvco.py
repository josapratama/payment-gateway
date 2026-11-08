"""
EMVCo QRIS TLV (Tag-Length-Value) Parser, Inspector & Dynamic Injector.
Mendukung QRIS Bank Indonesia (ASPI / EMVCo Standard).
"""

from typing import Dict, List, Optional, Tuple, Any
from app.core.crc16 import calculate_crc16, verify_crc16


# Deskripsi Tag Standar EMVCo QR Code
TAG_DEFINITIONS: Dict[str, str] = {
    "00": "Payload Format Indicator",
    "01": "Point of Initiation Method (11: Static, 12: Dynamic)",
    "02": "Visa Merchant Account",
    "03": "Visa Merchant Account",
    "04": "Mastercard Merchant Account",
    "05": "Mastercard Merchant Account",
    "26": "Merchant Account Information (National Domestic)",
    "51": "Merchant Account Information (ID.CO.QRIS.WWW)",
    "52": "Merchant Category Code (MCC)",
    "53": "Transaction Currency (360 = IDR)",
    "54": "Transaction Amount (Nominal)",
    "55": "Tip or Convenience Indicator",
    "56": "Value of Convenience Fee Fixed",
    "57": "Value of Convenience Fee Percentage",
    "58": "Country Code (ID)",
    "59": "Merchant Name",
    "60": "Merchant City",
    "61": "Postal Code",
    "62": "Additional Data Field Template (Bill/Ref/Terminal)",
    "63": "CRC (Cyclic Redundancy Check 16)",
}


class EMVCoTag:
    def __init__(self, tag: str, length: int, value: str, sub_tags: Optional[Dict[str, "EMVCoTag"]] = None):
        self.tag = tag
        self.length = length
        self.value = value
        self.name = TAG_DEFINITIONS.get(tag, f"Tag {tag}")
        self.sub_tags = sub_tags or {}

    def to_dict(self) -> Dict[str, Any]:
        res = {
            "tag": self.tag,
            "name": self.name,
            "length": self.length,
            "value": self.value,
        }
        if self.sub_tags:
            res["sub_tags"] = {k: v.to_dict() for k, v in self.sub_tags.items()}
        return res


def parse_tlv(payload: str) -> Dict[str, EMVCoTag]:
    """Mengurai string QRIS menjadi kumpulan objek EMVCoTag."""
    tags: Dict[str, EMVCoTag] = {}
    i = 0
    clean = payload.strip()
    n = len(clean)

    while i < n:
        if i + 4 > n:
            break
        tag = clean[i:i+2]
        try:
            length = int(clean[i+2:i+4])
        except ValueError:
            break

        val_start = i + 4
        val_end = val_start + length
        if val_end > n:
            value = clean[val_start:]
        else:
            value = clean[val_start:val_end]

        # Parsing sub-tags jika ada (misal Tag 26, 51, atau 62)
        sub_tags = {}
        if tag in ("26", "51", "62") and len(value) >= 4:
            try:
                sub_tags = parse_tlv(value)
            except Exception:
                sub_tags = {}

        tags[tag] = EMVCoTag(tag, length, value, sub_tags)
        i = val_end

    return tags


def inspect_qris(payload: str) -> Dict[str, Any]:
    """Mengekstrak informasi ringkas dan terstruktur dari payload QRIS."""
    clean = payload.strip()
    is_valid_crc = verify_crc16(clean)
    tags = parse_tlv(clean)

    # Identifikasi tipe
    point_of_init = tags.get("01")
    is_dynamic = point_of_init.value == "12" if point_of_init else False
    is_static = point_of_init.value == "11" if point_of_init else False

    # Nama Merchant & Kota
    merchant_name = tags.get("59").value if tags.get("59") else "Unknown Merchant"
    merchant_city = tags.get("60").value if tags.get("60") else ""
    currency_code = tags.get("53").value if tags.get("53") else "360"
    currency_name = "IDR (Rupiah)" if currency_code == "360" else currency_code

    # Nominal jika sudah dynamic
    amount = None
    if tags.get("54"):
        try:
            amount = float(tags.get("54").value)
        except ValueError:
            amount = tags.get("54").value

    # Merchant Acquirer / Provider
    acquirer = "QRIS Standar Nasional"
    mpan = ""
    if "51" in tags:
        sub = tags["51"].sub_tags
        if "02" in sub:
            mpan = sub["02"].value
    if "26" in tags:
        sub = tags["26"].sub_tags
        if "01" in sub:
            acquirer = sub["01"].value

    return {
        "valid_crc": is_valid_crc,
        "is_dynamic": is_dynamic,
        "is_static": is_static,
        "merchant_name": merchant_name,
        "merchant_city": merchant_city,
        "postal_code": tags.get("61").value if tags.get("61") else "",
        "currency": currency_name,
        "currency_code": currency_code,
        "amount": amount,
        "acquirer": acquirer,
        "mpan": mpan,
        "tags_count": len(tags),
        "tags_tree": {k: v.to_dict() for k, v in tags.items()},
        "raw_payload": clean,
    }


def convert_to_dynamic_qris(
    static_payload: str,
    amount: int | float,
    invoice_ref: Optional[str] = None,
    terminal_id: Optional[str] = None
) -> Tuple[str, Dict[str, Any]]:
    """
    Mengubah payload QRIS statis menjadi Dynamic QRIS dengan nominal yang terkunci.
    - Mengubah Tag 01 menjadi '12' (Dynamic)
    - Menyuntikkan Tag 54 (Nominal)
    - Menyuntikkan/Memperbarui Tag 62 (Invoice / Reference Label)
    - Menghitung ulang CRC16 pada Tag 63
    """
    clean = static_payload.strip()
    if not clean:
        raise ValueError("Payload QRIS statis tidak boleh kosong")

    # Format nominal: angka bulat tanpa desimal atau dengan desimal jika ada
    amount_str = f"{amount:.0f}" if isinstance(amount, (int, float)) and amount == int(amount) else f"{amount:.2f}"

    # Cari posisi tag 58 (Country code) atau 53 (Currency) sebagai titik referensi
    # Cara paling akurat adalah merekonstruksi dari TLV map
    tags = parse_tlv(clean)

    # 1. Ubah Tag 01 jadi '12'
    tags["01"] = EMVCoTag("01", 2, "12")

    # 2. Pasang Tag 54 (Amount)
    tags["54"] = EMVCoTag("54", len(amount_str), amount_str)

    # 3. Opsional: Update Tag 62 (Additional Data)
    if invoice_ref or terminal_id:
        existing_sub = tags.get("62").sub_tags if tags.get("62") else {}
        if invoice_ref:
            # Sub-tag 01: Bill Number / Reference Number
            ref_clean = invoice_ref[:25]
            existing_sub["01"] = EMVCoTag("01", len(ref_clean), ref_clean)
            existing_sub["05"] = EMVCoTag("05", len(ref_clean), ref_clean)
        if terminal_id:
            # Sub-tag 07: Terminal Label
            term_clean = terminal_id[:16]
            existing_sub["07"] = EMVCoTag("07", len(term_clean), term_clean)

        # Susun string sub-tag 62
        sub_str = ""
        for sk, sv in sorted(existing_sub.items()):
            sub_str += f"{sk}{sv.length:02d}{sv.value}"
        tags["62"] = EMVCoTag("62", len(sub_str), sub_str, existing_sub)

    # 4. Rekonstruksi string TLV terurut standar EMVCo tanpa Tag 63
    # Urutan tag standar EMVCo
    ordered_keys = [
        "00", "01", "02", "03", "04", "05", "26", "27", "28", "29", "30",
        "51", "52", "53", "54", "55", "56", "57", "58", "59", "60", "61", "62"
    ]
    # Tambahkan tag lain yang mungkin ada tapi tidak di list
    for k in sorted(tags.keys()):
        if k not in ordered_keys and k != "63":
            ordered_keys.append(k)

    assembled = ""
    for k in ordered_keys:
        if k in tags and k != "63":
            t_obj = tags[k]
            assembled += f"{t_obj.tag}{t_obj.length:02d}{t_obj.value}"

    # 5. Pasang '6304' dan hitung CRC16 baru
    assembled += "6304"
    crc = calculate_crc16(assembled)
    dynamic_payload = assembled + crc

    info = inspect_qris(dynamic_payload)
    return dynamic_payload, info

