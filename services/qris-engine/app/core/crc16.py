"""
EMVCo CRC16-CCITT Checksum Calculator
Polynomial: 0x1021, Init: 0xFFFF, No reflection, Final XOR: 0x0000
Digunakan untuk menghitung tag 63 pada payload standar QRIS EMVCo.
"""

def calculate_crc16(payload_without_crc: str) -> str:
    """
    Hitung 4 karakter HEX CRC16-CCITT untuk payload QRIS string.
    Payload harus berakhir dengan '6304'.
    """
    if not payload_without_crc.endswith("6304"):
        if "6304" in payload_without_crc:
            payload_without_crc = payload_without_crc[:payload_without_crc.rfind("6304") + 4]
        else:
            payload_without_crc += "6304"

    crc = 0xFFFF
    for byte in payload_without_crc.encode("utf-8"):
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF

    return f"{crc:04X}"


def verify_crc16(full_qris_payload: str) -> bool:
    """Validasi apakah CRC16 pada payload QRIS cocok."""
    clean = full_qris_payload.strip()
    if len(clean) < 8 or not clean[-8:-4] == "6304":
        return False
    expected_crc = clean[-4:].upper()
    data_to_calc = clean[:-4]
    return calculate_crc16(data_to_calc) == expected_crc

