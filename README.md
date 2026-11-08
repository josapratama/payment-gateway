# 💳 Payment Gateway & QRIS Suite (Unified Monorepo)

A self-hosted, independent Indonesian Payment Gateway & Dynamic QRIS mutation verification ecosystem.

---

## 🏗️ Architecture Overview

The ecosystem comprises 3 integrated components:

```
payment-gateway/
├── src/                          # Next.js Merchant & Checkout Web Portal
├── services/qris-engine/         # FastAPI Dynamic QRIS EMVCo Engine & Webhook Broadcaster
├── apps/mobile-forwarder/        # Flutter Android Bank SMS & Notification Forwarder
└── docker-compose.yml            # Unified orchestration
```

1. **Merchant Web Portal & Checkout API (`/src`)**:
   - Built with Next.js 14, Tailwind CSS, and Prisma ORM.
   - Provides merchant dashboard, API key management, invoice checkout pages, and webhook dispatching.

2. **Independent Dynamic QRIS Engine (`/services/qris-engine`)**:
   - Built with Python FastAPI, aiosqlite, and pure-code SVG/PNG QR renderer.
   - Parses EMVCo TLV payload, modifies Tag 54 (Amount) and Tag 58 (Country), and recomputes CRC16-CCITT checksum on the fly.
   - Real-time mutation verification with Server-Sent Events (SSE).

3. **Mobile Notification Forwarder (`/apps/mobile-forwarder`)**:
   - Built with Flutter / Dart for Android.
   - Captures incoming SMS and notification popups from Indonesian mobile banking apps (BCA, Mandiri, BRI, BNI, Dana, GoPay, OVO) and securely forwards them to the verification webhook.

---

## 🚀 Quick Start

### Start Gateway & QRIS Engine with Docker Compose
```bash
docker compose up -d --build
```
- **Payment Portal**: `http://localhost:17550`
- **QRIS Engine & Mutation Dashboard**: `http://localhost:8082`

---

## 📄 License
MIT
