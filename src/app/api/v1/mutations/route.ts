import { NextRequest, NextResponse } from "next/server";
import { ingestMutation } from "@/lib/matcher";
import { prisma } from "@/lib/prisma";

function parseNotificationText(text: string, title?: string, appName?: string) {
  const combined = `${appName || ""} ${title || ""} ${text || ""}`;

  let provider = "DANA";
  if (/gopay|gojek/i.test(combined)) provider = "GOPAY";
  else if (/bca|klikbca/i.test(combined)) provider = "BCA";
  else if (/mandiri|livin/i.test(combined)) provider = "MANDIRI";
  else if (/bri|brimo/i.test(combined)) provider = "BRI";
  else if (/dana/i.test(combined)) provider = "DANA";

  // Extract nominal like "Rp 149.998", "Rp149.998", or formatted digits "149.998"
  const match =
    combined.match(/(?:Rp|IDR)\s*([0-9\.,]+)/i) ||
    combined.match(/([0-9]{1,3}(?:\.[0-9]{3})+)/);

  if (match) {
    const cleanNum = match[1].replace(/[^0-9]/g, "");
    const amount = parseInt(cleanNum, 10);
    if (!isNaN(amount) && amount > 0) {
      return { provider, amount, description: text.slice(0, 200) };
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const queryKey = url.searchParams.get("key");
    const headerKey = req.headers.get("x-admin-key");
    const expectedKey = process.env.ADMIN_KEY || "pay-admin-secret-2026";

    if (headerKey !== expectedKey && queryKey !== expectedKey) {
      return NextResponse.json(
        { success: false, message: "Unauthorized admin key. Gunakan header 'x-admin-key' atau parameter '?key=pay-admin-secret-2026'" },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    let {
      provider,
      accountNumber,
      type = "CR",
      amount,
      description = "Transfer Masuk",
      text,
      title,
      appName,
      rawPayload,
    } = body;

    // Smart auto-parse from MacroDroid notification text if amount is not directly specified
    if ((!amount || Number(amount) <= 0) && (text || rawPayload)) {
      const parsed = parseNotificationText(text || rawPayload || "", title, appName);
      if (parsed) {
        if (!provider) provider = parsed.provider;
        amount = parsed.amount;
        description = parsed.description;
      }
    }

    if (!provider || !amount || Number(amount) <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "provider and valid amount are required (atau kirimkan 'text' notifikasi)",
        },
        { status: 400 }
      );
    }

    const result = await ingestMutation({
      provider,
      accountNumber,
      type,
      amount: Number(amount),
      description,
      rawPayload: rawPayload || text,
    });

    return NextResponse.json({
      success: true,
      message: result.matched
        ? `Mutasi Rp ${Number(amount).toLocaleString("id-ID")} cocok dengan Transaksi ${result.transaction?.id}`
        : `Mutasi Rp ${Number(amount).toLocaleString("id-ID")} tersimpan (tidak ada transaksi pending yang cocok)`,
      data: result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const mutations = await prisma.bankMutation.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ success: true, data: mutations });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

