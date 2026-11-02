import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateUniqueCode } from "@/lib/unique-code";
import { generateDynamicQRIS, generateQRImage } from "@/lib/qris";

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get("x-api-key");
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "Missing x-api-key header" },
        { status: 401 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { apiKey },
    });

    if (!project || !project.isActive) {
      return NextResponse.json(
        { success: false, message: "Invalid or inactive project API key" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      orderId,
      amount,
      paymentMethod = "QRIS",
      customerName,
      customerEmail,
      customerPhone,
      description,
      metadata,
    } = body;

    if (!orderId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, message: "orderId and valid amount are required" },
        { status: 400 }
      );
    }

    // 1. Generate unique 3-digit code
    const { uniqueCode, totalAmount } = await generateUniqueCode(Number(amount));

    // 2. Find matching payment account
    const methodUpper = paymentMethod.toUpperCase();
    let paymentAccount = await prisma.paymentAccount.findFirst({
      where: { provider: methodUpper, isActive: true },
    });

    if (!paymentAccount) {
      // Fallback to default QRIS or first active account
      paymentAccount = await prisma.paymentAccount.findFirst({
        where: { isActive: true },
        orderBy: { isDefault: "desc" },
      });
    }

    // 3. Generate QRIS dynamic if applicable
    let qrisPayload: string | null = null;
    let qrisImage: string | null = null;

    if (paymentAccount && paymentAccount.type === "QRIS" && paymentAccount.qrisContent) {
      qrisPayload = generateDynamicQRIS(paymentAccount.qrisContent, totalAmount);
      qrisImage = await generateQRImage(qrisPayload);
    }

    // 4. Create Transaction
    const txId = `TRX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours

    const transaction = await prisma.transaction.create({
      data: {
        id: txId,
        projectId: project.id,
        orderId: String(orderId),
        amount: Number(amount),
        uniqueCode,
        totalAmount,
        paymentMethod: paymentAccount?.provider || methodUpper,
        paymentAccountId: paymentAccount?.id,
        customerName,
        customerEmail,
        customerPhone,
        description,
        qrisPayload,
        qrisImage,
        expiresAt,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        paymentAccount: true,
      },
    });

    const appUrl = process.env.APP_URL || "http://localhost:3005";
    const checkoutUrl = `${appUrl}/pay/${transaction.id}`;

    return NextResponse.json({
      success: true,
      data: {
        id: transaction.id,
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
        qrisPayload: transaction.qrisPayload,
        qrisImage: transaction.qrisImage,
        checkoutUrl,
        expiresAt: transaction.expiresAt,
        status: transaction.status,
      },
    });
  } catch (error: any) {
    console.error("Create Transaction Error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
