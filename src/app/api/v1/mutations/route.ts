import { NextRequest, NextResponse } from "next/server";
import { ingestMutation } from "@/lib/matcher";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const adminKey = req.headers.get("x-admin-key");
    const expectedKey = process.env.ADMIN_KEY || "pay-admin-secret-2026";

    if (adminKey !== expectedKey) {
      return NextResponse.json(
        { success: false, message: "Unauthorized admin key" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { provider, accountNumber, type = "CR", amount, description = "Transfer Masuk", rawPayload } = body;

    if (!provider || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "provider and valid amount are required" },
        { status: 400 }
      );
    }

    const result = await ingestMutation({
      provider,
      accountNumber,
      type,
      amount: Number(amount),
      description,
      rawPayload,
    });

    return NextResponse.json({
      success: true,
      message: result.matched
        ? `Mutation ingested and matched with Transaction ${result.transaction?.id}`
        : "Mutation ingested (no matching pending transaction found)",
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
