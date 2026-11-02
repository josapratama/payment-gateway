import crypto from "crypto";
import { prisma } from "./prisma";

export interface WebhookPayload {
  event: "payment.settled" | "payment.expired" | "payment.cancelled";
  data: {
    id: string;
    orderId: string;
    amount: number;
    uniqueCode: number;
    totalAmount: number;
    paymentMethod: string;
    status: string;
    customerName?: string | null;
    customerEmail?: string | null;
    settledAt?: Date | null;
    metadata?: any;
  };
}

/**
 * Generate HMAC-SHA256 Signature for Webhook Verification
 */
export function generateWebhookSignature(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Dispatch webhook to project webhookUrl with automatic retry
 */
export async function dispatchWebhook(
  transactionId: string,
  event: "payment.settled" | "payment.expired" | "payment.cancelled",
  maxRetries = 3
) {
  const trx = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { project: true },
  });

  if (!trx || !trx.project.webhookUrl) return;

  const payload: WebhookPayload = {
    event,
    data: {
      id: trx.id,
      orderId: trx.orderId,
      amount: trx.amount,
      uniqueCode: trx.uniqueCode,
      totalAmount: trx.totalAmount,
      paymentMethod: trx.paymentMethod,
      status: trx.status,
      customerName: trx.customerName,
      customerEmail: trx.customerEmail,
      settledAt: trx.settledAt,
      metadata: trx.metadata ? JSON.parse(trx.metadata) : null,
    },
  };

  const payloadString = JSON.stringify(payload);
  const signature = generateWebhookSignature(payloadString, trx.project.webhookSecret);

  let attempts = 0;
  let isSuccess = false;
  let responseStatus = 500;
  let responseBody = "";

  while (attempts < maxRetries && !isSuccess) {
    attempts++;
    try {
      const res = await fetch(trx.project.webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-payment-signature": signature,
          "x-payment-event": event,
        },
        body: payloadString,
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      responseStatus = res.status;
      responseBody = await res.text();
      if (res.ok) {
        isSuccess = true;
      } else if (attempts < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch (err: any) {
      responseStatus = 500;
      responseBody = err.message || "Connection failed";
      if (attempts < maxRetries) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
  }

  await prisma.webhookLog.create({
    data: {
      projectId: trx.projectId,
      transactionId: trx.id,
      event,
      url: trx.project.webhookUrl,
      payload: payloadString,
      responseStatus,
      responseBody: responseBody.slice(0, 1000),
      isSuccess,
      attempts,
    },
  });
}

