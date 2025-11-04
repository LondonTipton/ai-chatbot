import { createLogger } from "@/lib/logger";

const logger = createLogger("payment/pesepay-service");

const { Pesepay } = require("pesepay");

export type SeamlessTransactionData = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  currency: string;
  description: string;
  referenceNumber: string;
  paymentMethodCode: string;
};

export type TransactionStatusResponse = {
  transactionStatus: string;
  referenceNumber: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  pollUrl?: string;
};

export class PesepayService {
  private readonly pesepay: any;

  constructor() {
    const integrationKey = process.env.PESEPAY_INTEGRATION_KEY;
    const encryptionKey = process.env.PESEPAY_ENCRYPTION_KEY;

    if (!integrationKey || !encryptionKey) {
      throw new Error(
        "Pesepay credentials not configured. Please set PESEPAY_INTEGRATION_KEY and PESEPAY_ENCRYPTION_KEY"
      );
    }

    logger.log("[PesepayService] Initializing with official package");
    this.pesepay = new Pesepay(integrationKey, encryptionKey);
    this.pesepay.resultUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payment/callback`;
    this.pesepay.returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/payment/status`;
  }

  async getActiveCurrencies() {
    try {
      const axios = require("axios");
      const response = await axios.get(
        "https://api.pesepay.com/api/payments-engine/v1/currencies/active",
        {
          headers: {
            key: process.env.PESEPAY_INTEGRATION_KEY,
            "Content-Type": "application/json",
          },
          insecureHTTPParser: true,
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error(
        "[PesepayService] Error fetching currencies:",
        error.message
      );
      throw new Error("Failed to fetch active currencies");
    }
  }

  async getPaymentMethodsByCurrency(currency: string) {
    try {
      const axios = require("axios");
      const response = await axios.get(
        `https://api.pesepay.com/api/payments-engine/v1/payment-methods/for-currency?currencyCode=${currency}`,
        {
          headers: {
            key: process.env.PESEPAY_INTEGRATION_KEY,
            "Content-Type": "application/json",
          },
          insecureHTTPParser: true,
        }
      );
      return response.data;
    } catch (error: any) {
      logger.error(
        "[PesepayService] Error fetching payment methods:",
        error.message
      );
      throw new Error("Failed to fetch payment methods");
    }
  }

  async initiateSeamlessTransaction(data: SeamlessTransactionData) {
    try {
      // Create payment using the package's API
      const payment = this.pesepay.createPayment(
        data.currency,
        data.paymentMethodCode,
        data.customerEmail,
        data.customerPhone,
        data.customerName
      );

      logger.log("[PesepayService] Payment object created:", {
        currencyCode: payment.currencyCode,
        paymentMethodCode: payment.paymentMethodCode,
        customer: payment.customer,
        returnUrl: this.pesepay.returnUrl,
        resultUrl: this.pesepay.resultUrl,
      });

      logger.log(
        "[PesepayService] Initiating seamless payment:",
        data.referenceNumber
      );

      // Prepare required fields based on payment method
      const requiredFields: Record<string, string> = {};

      // For Ecocash (PZW211), add customerPhoneNumber
      if (data.paymentMethodCode === "PZW211") {
        requiredFields.customerPhoneNumber = data.customerPhone;
      }

      logger.log("[PesepayService] Payment details:", {
        amount: data.amount,
        description: data.description,
        referenceNumber: data.referenceNumber,
        requiredFields,
      });

      // Make seamless payment
      const response = await this.pesepay.makeSeamlessPayment(
        payment,
        data.description,
        data.amount,
        requiredFields
      );

      logger.log("[PesepayService] Seamless payment response:", {
        success: response.success,
        referenceNumber: response.referenceNumber,
        pollUrl: response.pollUrl,
        redirectUrl: response.redirectUrl,
        paid: response.paid,
        message: response.message,
      });

      if (!response.success) {
        throw new Error(
          response.message ||
            "Payment initiation failed - check Pesepay credentials and API status"
        );
      }

      return {
        success: response.success,
        referenceNumber: response.referenceNumber || data.referenceNumber,
        pollUrl: response.pollUrl,
        redirectUrl: response.redirectUrl,
        message: response.message,
      };
    } catch (error: any) {
      logger.error(
        "[PesepayService] Error initiating transaction:",
        error.message
      );
      logger.error("[PesepayService] Full error:", error);
      throw error;
    }
  }

  async initiateRedirectTransaction(data: SeamlessTransactionData) {
    try {
      // Create transaction for redirect flow
      const transaction = this.pesepay.createTransaction(
        data.amount,
        data.currency,
        data.description
      );

      logger.log(
        "[PesepayService] Initiating redirect payment:",
        data.referenceNumber
      );

      const response = await this.pesepay.initiateTransaction(transaction);

      return {
        success: true,
        referenceNumber: response.referenceNumber,
        redirectUrl: response.redirectUrl,
        message: response.message,
      };
    } catch (error: any) {
      logger.error(
        "[PesepayService] Error initiating redirect transaction:",
        error.message
      );
      throw error;
    }
  }

  async checkTransactionStatus(
    referenceNumber: string
  ): Promise<TransactionStatusResponse> {
    try {
      const response = await this.pesepay.checkPayment(referenceNumber);

      logger.log("[PesepayService] Payment status response:", response);

      return {
        transactionStatus: response.paid ? "PAID" : "PENDING",
        referenceNumber: response.referenceNumber || referenceNumber,
        amount: response.amount || 0,
        currency: response.currencyCode || "USD",
        paymentMethod: response.paymentMethodName || "ecocash",
        pollUrl: response.pollUrl,
      };
    } catch (error: any) {
      logger.error("[PesepayService] Error checking status:", error.message);
      throw new Error("Failed to check transaction status");
    }
  }

  processCallback(encryptedData: string) {
    try {
      return this.pesepay.payloadDecrypt(encryptedData);
    } catch (error: any) {
      logger.error(
        "[PesepayService] Error processing callback:",
        error.message
      );
      throw new Error("Failed to process payment callback");
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
  initiateRedirectTransaction(data: SeamlessTransactionData) {
    return getPesepayService().initiateRedirectTransaction(data);
  },
  checkTransactionStatus(referenceNumber: string) {
    return getPesepayService().checkTransactionStatus(referenceNumber);
  },
  processCallback(encryptedData: string) {
    return getPesepayService().processCallback(encryptedData);
  },
};
