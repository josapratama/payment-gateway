/**
 * PayGateway Client SDK
 * Drop-in helper for Learnify, Mini VPS, and WABridge
 */

export interface CreatePaymentParams {
  orderId: string;
  amount: number;
  paymentMethod?: "QRIS" | "BCA" | "MANDIRI" | "BRI" | "BNI" | "DANA" | "GOPAY" | string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  amount: number;
  uniqueCode: number;
  totalAmount: number;
  paymentMethod: string;
  paymentAccount?: {
    provider: string;
    accountName: string;
    accountNumber: string;
    instructions?: string;
  };
  qrisPayload?: string;
  qrisImage?: string;
  checkoutUrl: string;
  expiresAt: string;
  status: string;
}

export class PayGatewayClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(options: { baseUrl?: string; apiKey: string }) {
    this.baseUrl = options.baseUrl || "http://localhost:3005";
    this.apiKey = options.apiKey;
  }

  async createTransaction(params: CreatePaymentParams): Promise<PaymentResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/transactions/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(params),
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Failed to create payment transaction");
    }

    return json.data;
  }

  async getTransaction(id: string): Promise<PaymentResponse> {
    const res = await fetch(`${this.baseUrl}/api/v1/transactions/${id}`);
    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || "Transaction not found");
    }
    return json.data;
  }
}

