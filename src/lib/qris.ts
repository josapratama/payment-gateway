import QRCode from "qrcode";

/**
 * Calculate CRC16 CCITT (Polynomial 0x1021, Initial Value 0xFFFF)
 * Used by EMVCo / ASPI QRIS Indonesia Specification
 */
export function calculateCRC16(str: string): string {
  let crc = 0xffff;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    crc ^= code << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Convert any Static QRIS string to Dynamic QRIS with custom Amount
 */
export function generateDynamicQRIS(staticQRIS: string, amount: number): string {
  if (!staticQRIS) return "";
  let qris = staticQRIS.trim();

  // Strip existing CRC (Tag 63) if present at end: "6304XXXX"
  if (qris.includes("6304")) {
    const idx = qris.lastIndexOf("6304");
    qris = qris.slice(0, idx);
  }

  // Tag 01 (Point of Initiation Method):
  // "010211" is Static -> Change to "010212" (Dynamic)
  if (qris.includes("010211")) {
    qris = qris.replace("010211", "010212");
  }

  // Remove existing Tag 54 (Transaction Amount) if any
  // Tag 54 format: 54{length}{amount}
  qris = qris.replace(/54\d{2}\d+/, "");

  // Format new Tag 54: 54 + length(2 digits) + amount string
  const amountStr = Math.round(amount).toString();
  const amountLen = amountStr.length.toString().padStart(2, "0");
  const tag54 = `54${amountLen}${amountStr}`;

  // Tag 58 (Country Code '5802ID') is typically followed by Tag 59 (Merchant Name)
  // Standard position for Tag 54 is right before Tag 58
  if (qris.includes("5802ID")) {
    qris = qris.replace("5802ID", `${tag54}5802ID`);
  } else {
    qris = `${qris}${tag54}`;
  }

  // Append Tag 63 prefix for CRC
  const payloadBeforeCRC = `${qris}6304`;
  const crc = calculateCRC16(payloadBeforeCRC);

  return `${payloadBeforeCRC}${crc}`;
}

/**
 * Generate Base64 Data URL for QR Code
 */
export async function generateQRImage(qrisString: string): Promise<string> {
  return await QRCode.toDataURL(qrisString, {
    errorCorrectionLevel: "M",
    margin: 2,
    scale: 8,
    color: {
      dark: "#0f172a",
      light: "#ffffff",
    },
  });
}

