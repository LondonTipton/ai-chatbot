import { PesePayClient } from "pesepay-js";
import { PesepayDirectClient } from "./pesepay-direct";

export interface SeamlessTransactionData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  currency: string;
  description: string;
  referenceNumber: string;
  paymentMethodCode: string;
}

export interface TransactionStatusResponse {
  transactionStatus: string;
  referenceNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  pollUrl?: string;
}

export class PesepayService {
  private client: PesepayDirectClient;

  constructor() {
    const integrationKey = process.env.PESEPAY_INTEGRATION_KEY;
    const encryptionKey = process.env.PESEPAY_ENCRYPTION_KEY;

    if (!integrationKey || !encryptionKey) {
      console.warn(
        "Pesepay credentials missing - payment features will be disabled"
      );
      // Create a dummy client that will fail at runtime if used
      this.client = null as any;
      return;
    }

    console.log("Initializing Pesepay direct client with credentials");
    this.client = new PesepayDirectClient(integrationKey, encryptionKey);
  }

  async getActiveCurrencies() {
    try {
      console.log("Fetching active currencies from Pesepay...");
      const result = await this.client.getActiveCurrencies();
      console.log("Currencies fetched successfully:", result);
      return result;
    } catch (error: any) {
      console.error("Error fetching currencies:", error);
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }
      throw new Error("Failed to fetch active currencies");
    }
  }

  async getPaymentMethodsByCurrency(currency: string) {
    try {
      return await this.client.getPaymentMethodsByCurrency(currency);
    } catch (error) {
      console.error("Error fetching payment methods:", error);
      throw new Error("Failed to fetch payment methods");
    }
  }

  async initiateSeamlessTransaction(data: SeamlessTransactionData) {
    try {
      console.log("Making seamless payment request to Pesepay...");
      const requestData = {
        amountDetails: {
          amount: data.amount,
          currencyCode: data.currency,
        },
        customer: {
          name: data.customerName,
          email: data.customerEmail,
          phoneNumber: data.customerPhone,
        },
        merchantReference: data.referenceNumber,
        reasonForPayment: data.description,
        resultUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`,
        returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/payment/success`,
        paymentMethodCode: data.paymentMethodCode,
        paymentMethodRequiredFields: {
          phoneNumber: data.customerPhone,
        },
      };

      console.log("Request data:", JSON.stringify(requestData, null, 2));

      const response = await this.client.makeSeamlessPayment(requestData);

      console.log("Pesepay response received:", response);
      return response;
    } catch (error: any) {
      console.error("Error initiating seamless transaction:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
      // Log axios error details
      if (error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
        console.error("Response headers:", error.response.headers);
      }
      if (error.config) {
        console.error("Request URL:", error.config.url);
        console.error("Request method:", error.config.method);
      }
      throw error;
    }
  }

  async checkTransactionStatus(
    referenceNumber: string
  ): Promise<TransactionStatusResponse> {
    try {
      const response = await this.client.checkPaymentStatus(referenceNumber);
      return {
        transactionStatus: response.transactionStatus || "PENDING",
        referenceNumber: response.referenceNumber || referenceNumber,
        amount: response.amountDetails?.amount || 0,
        currency: response.amountDetails?.currencyCode || "USD",
        paymentMethod:
          response.paymentMethodDetails?.paymentMethodName || "ecocash",
        pollUrl: response.pollUrl,
      };
    } catch (error) {
      console.error("Error checking transaction status:", error);
      throw new Error("Failed to check transaction status");
    }
  }
}

// Lazy initialization to avoid build-time errors when env vars are missing
let pesepayServiceInstance: PesepayService | null = null;

function getPesepayService(): PesepayService {
  if (!pesepayServiceInstance) {
    pesepayServiceInstance = new PesepayService();
  }
  return pesepayServiceInstance;
}

export const pesepayService = {
  getActiveCurrencies() {
    return getPesepayService().getActiveCurrencies();
  },
  getPaymentMethodsByCurrency(currency: string) {
    return getPesepayService().getPaymentMethodsByCurrency(currency);
  },
  initiateSeamlessTransaction(data: SeamlessTransactionData) {
    return getPesepayService().initiateSeamlessTransaction(data);
  },
  checkTransactionStatus(referenceNumber: string) {
    return getPesepayService().checkTransactionStatus(referenceNumber);
  },
};
