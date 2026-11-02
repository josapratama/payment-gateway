# 💳 PayGateway Hub — Multi-Tenant Direct Payment Engine

Self-Hosted Payment Gateway mandiri untuk menerima pembayaran langsung ke **Rekening Bank (BCA, Mandiri, BRI, BNI)**, **E-Wallet (DANA, GoPay)**, dan **QRIS Dinamis Otomatis** tanpa pihak ketiga (Midtrans/Xendit/Duitku) dan **0% Biaya Transaksi**.

Dibangun khusus untuk melayani ekosistem aplikasi Anda:
- 🎓 **Learnify** (Pembelian kursus & langganan)
- ☁️ **Mini VPS** (Billing cloud & perpanjangan server)
- 💬 **WABridge** (Langganan WhatsApp API Gateway)
- 🚀 Project-project masa depan lainnya

---

## 🌟 Fitur Utama

1. **EMVCo QRIS Dinamis Otomatis**
   - Mengubah QRIS Statis standar (dari DANA Bisnis, Nobu, BCA, dll.) menjadi **QRIS Dinamis** dengan nominal terkunci otomatis menggunakan kalkulasi checksum **CRC-16 CCITT**.
   - Pelanggan tinggal scan dari aplikasi m-Banking atau e-wallet apa saja (DANA, GoPay, OVO, ShopeePay, BCA, Livin Mandiri, BRImo, dll.) tanpa perlu mengetik nominal lagi.

2. **Smart 3-Digit Unique Code Generator (Anti-Collision)**
   - Menghasilkan kode unik 3 digit (misal `Rp 150.342`) yang dijamin **tidak akan bentrok** dengan invoice pending lain pada rentang harga yang sama dalam window 3 jam.

3. **Multi-Tenant Project API Keys**
   - Setiap aplikasi memiliki API Key dan Webhook URL tersendiri:
     - `pay_sec_learnify_2026` -> Webhook ke Learnify
     - `pay_sec_vps_2026` -> Webhook ke Mini VPS
     - `pay_sec_wabridge_2026` -> Webhook ke WABridge

4. **Instant Auto-Match & Webhook Dispatcher**
   - Ketika ada uang masuk (dari scraper bank, Android forwarder, atau simulasi admin), sistem langsung mencocokkan nominal dengan order pending.
   - Status order berubah menjadi `SETTLED` dan webhook ber-tanda tangan HMAC-SHA256 (`x-payment-signature`) langsung dikirimkan ke aplikasi pemanggil dalam hitungan detik.

5. **Hosted Invoice / Checkout UI Modern**
   - Halaman invoice cantik di `/pay/[id]` lengkap dengan countdown timer, tombol copy nominal, display QRIS, dan **auto-redirect live** saat pembayaran terkonfirmasi.

6. **Web Admin Dashboard & Simulation Panel**
   - Dashboard lengkap di `/dashboard` untuk memantau pendapatan, transaksi aktif, riwayat mutasi bank, dan form simulasi uang masuk instan.

---

## 🚀 Menjalankan Project

### 1. Development Mode
```bash
cd "d:\coding\raspberry pi\project\payment-gateway"
npm install
node prisma/seed.js
npm run dev
```
Akses Dashboard di: `http://localhost:3005/dashboard`

### 2. Production (Docker)
```bash
docker compose up -d --build
```

---

## 💻 Contoh Integrasi (Learnify / VPS / WABridge)

### Membuat Invoice Pembayaran:
```typescript
import { PayGatewayClient } from "@/lib/pay-gateway";

const gateway = new PayGatewayClient({
  baseUrl: process.env.PAYMENT_GATEWAY_URL || "http://localhost:3005",
  apiKey: "pay_sec_learnify_2026",
});

const trx = await gateway.createTransaction({
  orderId: "ORDER-LEARNIFY-889",
  amount: 150000,
  paymentMethod: "QRIS", // atau "BCA", "MANDIRI", "DANA", "GOPAY"
  customerName: "Ahmad Siswa",
  customerEmail: "ahmad@gmail.com",
  description: "Kursus Laravel Fullstack Masterclass",
});

// Redirect siswa ke URL checkout:
console.log(trx.checkoutUrl); // http://localhost:3005/pay/TRX-...
```

---

## 🛡️ Webhook Payload yang Diterima Aplikasi Anda

Begitu siswa membayar dan mutasi terdeteksi, PayGateway akan mengirimkan `POST` ke Webhook URL aplikasi Anda:

```json
{
  "event": "payment.settled",
  "data": {
    "id": "TRX-M6XX-XXXX",
    "orderId": "ORDER-LEARNIFY-889",
    "amount": 150000,
    "uniqueCode": 342,
    "totalAmount": 150342,
    "paymentMethod": "QRIS",
    "status": "SETTLED",
    "customerName": "Ahmad Siswa",
    "customerEmail": "ahmad@gmail.com",
    "settledAt": "2026-11-02T10:15:30.000Z"
  }
}
```
Header Verifikasi:
- `x-payment-signature`: HMAC-SHA256 signature payload
- `x-payment-event`: `payment.settled`
