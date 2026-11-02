import { prisma } from "./prisma";
import { dispatchWebhook } from "./webhook";

export interface IngestMutationParams {
  provider: string; // BCA, MANDIRI, BRI, BNI, DANA, GOPAY, QRIS
  accountNumber?: string;
  type: "CR" | "DB";
  amount: number;
  description: string;
  balance?: number;
  transactionDate?: Date;
  rawPayload?: string;
}

/**
 * Ingest a bank / e-wallet mutation and automatically match with pending transactions
 */
export async function ingestMutation(params: IngestMutationParams) {
  // Only Credit (Uang Masuk) can settle transactions
  const isCredit = params.type === "CR";

  // Create mutation record
  const mutation = await prisma.bankMutation.create({
    data: {
      provider: params.provider.toUpperCase(),
      accountNumber: params.accountNumber,
      type: params.type,
      amount: params.amount,
      description: params.description,
      balance: params.balance,
      transactionDate: params.transactionDate || new Date(),
      rawPayload: params.rawPayload,
      isMatched: false,
    },
  });

  if (!isCredit) {
    return { matched: false, mutation };
  }

  // Look for active pending transaction with exact totalAmount (within past 24 hours)
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const matchedTx = await prisma.transaction.findFirst({
    where: {
      status: "PENDING",
      totalAmount: params.amount,
      createdAt: { gte: twentyFourHoursAgo },
    },
    orderBy: { createdAt: "desc" },
  });

  if (matchedTx) {
    const now = new Date();

    // Settle transaction
    await prisma.transaction.update({
      where: { id: matchedTx.id },
      data: {
        status: "SETTLED",
        settledAt: now,
        matchedMutationId: mutation.id,
      },
    });

    // Mark mutation as matched
    await prisma.bankMutation.update({
      where: { id: mutation.id },
      data: {
        isMatched: true,
        matchedTxId: matchedTx.id,
      },
    });

    // Dispatch webhook to client application (Learnify, Wabridge, VPS)
    dispatchWebhook(matchedTx.id, "payment.settled").catch(console.error);

    return {
      matched: true,
      transaction: matchedTx,
      mutation,
    };
  }

  return {
    matched: false,
    mutation,
  };
}

