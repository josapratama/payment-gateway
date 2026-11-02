import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        paymentAccount: true,
        project: {
          select: { name: true, slug: true },
        },
      },
    });

    if (!transaction) {
      return NextResponse.json(
        { success: false, message: "Transaction not found" },
        { status: 404 }
      );
    }

    // Auto-check expired status
    if (
      transaction.status === "PENDING" &&
      new Date() > new Date(transaction.expiresAt)
    ) {
      await prisma.transaction.update({
        where: { id },
        data: { status: "EXPIRED" },
      });
      transaction.status = "EXPIRED";
    }

    return NextResponse.json({
      success: true,
      data: {
        id: transaction.id,
        project: transaction.project,
        orderId: transaction.orderId,
        amount: transaction.amount,
        uniqueCode: transaction.uniqueCode,
        totalAmount: transaction.totalAmount,
        paymentMethod: transaction.paymentMethod,
        paymentAccount: transaction.paymentAccount
          ? {
              provider: transaction.paymentAccount.provider,
              accountName: transaction.paymentAccount.accountName,
              accountNumber: transaction.paymentAccount.accountNumber,
              instructions: transaction.paymentAccount.instructions,
            }
          : null,
        qrisImage: transaction.qrisImage,
        status: transaction.status,
        customerName: transaction.customerName,
        customerEmail: transaction.customerEmail,
        description: transaction.description,
        metadata: transaction.metadata ? JSON.parse(transaction.metadata) : null,
        createdAt: transaction.createdAt,
        expiresAt: transaction.expiresAt,
        settledAt: transaction.settledAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}

