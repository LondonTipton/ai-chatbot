import axios from "axios";
import CryptoJS from "crypto-js";

const PESEPAY_BASE_URL = "https://api.pesepay.com/api/payments-engine/v1";

interface PesepayConfig {
  integrationKey: string;
  encryptionKey: string;
}

interface InitiateTransactionRequest {
  amountDetails: {
    amount: number;
    currencyCode: string;
  };
  reasonForPayment: string;
  resultUrl: string;
  returnUrl: string;
}

interface MakePaymentRequest extends InitiateTransactionRequest {
  merchantReference: string;
  paymentMethodCode: string;
  customer: {
    phoneNumber: string;
    email?: string;
    name?: string;
  };
  paymentMethodRequiredFields: {
    phoneNumber: string;
  };
}

export class PesepayDirectClient {
  private config: PesepayConfig;

  constructor(integrationKey: string, encryptionKey: string) {
    this.config = {
      integrationKey,
      encryptionKey,
    };
  }

  private encrypt(data: any): string {
    const jsonString = JSON.stringify(data);
    const encrypted = CryptoJS.AES.encrypt(
      jsonString,
      this.config.encryptionKey
    ).toString();
    return encrypted;
  }

  private getHeaders() {
    return {
      "Content-Type": "application/json",
      "Integration-Key": this.config.integrationKey,
    };
  }

  async getActiveCurrencies() {
    try {
      const response = await axios.get(
        `${PESEPAY_BASE_URL}/currencies/get-active`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching currencies:", error.response?.data);
      throw error;
    }
  }

  async getPaymentMethodsByCurrency(currencyCode: string) {
    try {
      const response = await axios.get(
        `${PESEPAY_BASE_URL}/payment-methods/get-by-currency/${currencyCode}`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error fetching payment methods:", error.response?.data);
      throw error;
    }
  }

  async initiateTransaction(request: InitiateTransactionRequest) {
    try {
      const encryptedPayload = this.encrypt(request);
      const response = await axios.post(
        `${PESEPAY_BASE_URL}/payments/initiate`,
        { payload: encryptedPayload },
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error initiating transaction:", error.response?.data);
      throw error;
    }
  }

  async makeSeamlessPayment(request: MakePaymentRequest) {
    try {
      const encryptedPayload = this.encrypt(request);
      const response = await axios.post(
        `${PESEPAY_BASE_URL}/payments/make-payment`,
        { payload: encryptedPayload },
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error making payment:", error.response?.data);
      throw error;
    }
  }

  async checkPaymentStatus(referenceNumber: string) {
    try {
      const response = await axios.get(
        `${PESEPAY_BASE_URL}/payments/check-payment/${referenceNumber}`,
        {
          headers: this.getHeaders(),
        }
      );
      return response.data;
    } catch (error: any) {
      console.error("Error checking payment status:", error.response?.data);
      throw error;
    }
  }
}
