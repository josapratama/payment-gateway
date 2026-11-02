import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const methods = await prisma.paymentAccount.findMany({
      where: { isActive: true },
      select: {
        id: true,
        type: true,
        provider: true,
        accountName: true,
        accountNumber: true,
        instructions: true,
        isDefault: true,
      },
      orderBy: [{ isDefault: "desc" }, { provider: "asc" }],
    });

    return NextResponse.json({ success: true, data: methods });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

