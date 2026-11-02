const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Multi-Tenant Payment Gateway...");

  // 1. Seed Projects
  const projects = [
    {
      name: "Learnify E-Learning",
      slug: "learnify",
      apiKey: "pay_sec_learnify_2026",
      webhookUrl: "https://learnify.josapratama.com/api/webhooks/payment",
      webhookSecret: "whsec_learnify_super_secret_2026",
    },
    {
      name: "Mini VPS Cloud Panel",
      slug: "vps",
      apiKey: "pay_sec_vps_2026",
      webhookUrl: "https://vps.josapratama.com/api/webhooks/billing",
      webhookSecret: "whsec_vps_super_secret_2026",
    },
    {
      name: "WABridge WhatsApp Gateway",
      slug: "wabridge",
      apiKey: "pay_sec_wabridge_2026",
      webhookUrl: "https://wa.josapratama.com/api/webhooks/subscription",
      webhookSecret: "whsec_wabridge_super_secret_2026",
    },
  ];

  for (const p of projects) {
    await prisma.project.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }
  console.log("✅ Seeded 3 Projects (Learnify, VPS, WABridge)");

  // 2. Seed Payment Accounts
  const accounts = [
    {
      type: "BANK_TRANSFER",
      provider: "BCA",
      accountName: "Josa Pratama",
      accountNumber: "8455123456",
      instructions: "Transfer ke BCA melalui ATM, KlikBCA, atau BCA Mobile. Masukkan nominal PERSIS hingga 3 digit terakhir.",
      isDefault: true,
    },
    {
      type: "BANK_TRANSFER",
      provider: "MANDIRI",
      accountName: "Josa Pratama",
      accountNumber: "1370019876543",
      instructions: "Transfer ke Bank Mandiri via Livin' by Mandiri atau ATM. Masukkan nominal PERSIS hingga 3 digit terakhir.",
      isDefault: false,
    },
    {
      type: "BANK_TRANSFER",
      provider: "BRI",
      accountName: "Josa Pratama",
      accountNumber: "012301098765501",
      instructions: "Transfer ke BRI melalui BRImo atau ATM BRI. Masukkan nominal PERSIS hingga 3 digit terakhir.",
      isDefault: false,
    },
    {
      type: "EWALLET",
      provider: "DANA",
      accountName: "Josa Pratama",
      accountNumber: "081234567890",
      instructions: "Buka aplikasi DANA -> Kirim -> Masukkan nomor DANA di atas -> Transfer dengan nominal PERSIS.",
      isDefault: true,
    },
    {
      type: "EWALLET",
      provider: "GOPAY",
      accountName: "Josa Pratama",
      accountNumber: "081234567890",
      instructions: "Buka aplikasi Gojek / GoPay -> Bayar / Kirim -> Masukkan nomor GoPay di atas -> Transfer dengan nominal PERSIS.",
      isDefault: false,
    },
    {
      type: "QRIS",
      provider: "QRIS",
      accountName: "Josa Pratama Store",
      accountNumber: "ID1020021345678",
      qrisContent: "00020101021126590014ID.LINKAJA.WWW01189360091100223344550215ID10200213456780303UMI51440014ID.CO.QRIS.WWW0215ID10200213456780303UMI5204541153033605802ID5918Josa Pratama Store6007Bandung61054011562070703A0163047B8C",
      instructions: "Scan QR Code QRIS menggunakan BCA, Mandiri, BRI, DANA, GoPay, OVO, ShopeePay, atau Bank apa saja. Nominal sudah otomatis terkunci.",
      isDefault: true,
    },
  ];

  for (const acc of accounts) {
    const existing = await prisma.paymentAccount.findFirst({
      where: { provider: acc.provider, accountNumber: acc.accountNumber },
    });
    if (!existing) {
      await prisma.paymentAccount.create({ data: acc });
    }
  }
  console.log("✅ Seeded 6 Payment Accounts (BCA, Mandiri, BRI, DANA, GoPay, QRIS)");

  console.log("✨ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
