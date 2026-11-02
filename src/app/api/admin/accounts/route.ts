import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const accounts = await prisma.paymentAccount.findMany({
      orderBy: [{ isDefault: "desc" }, { provider: "asc" }],
    });
    return NextResponse.json({ success: true, data: accounts });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, provider, type, accountName, accountNumber, instructions, qrisContent, isActive } = body;

    if (id) {
      // Update existing
      const updated = await prisma.paymentAccount.update({
        where: { id },
        data: {
          accountName,
          accountNumber,
          instructions,
          qrisContent,
          isActive: isActive !== undefined ? isActive : true,
        },
      });
      return NextResponse.json({ success: true, data: updated });
    } else {
      // Create new
      const created = await prisma.paymentAccount.create({
        data: {
          provider: provider.toUpperCase(),
          type,
          accountName,
          accountNumber,
          instructions,
          qrisContent,
          isActive: true,
        },
      });
      return NextResponse.json({ success: true, data: created });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}

