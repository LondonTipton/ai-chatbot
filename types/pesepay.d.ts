declare module "pesepay" {
  export interface AmountDetails {
    amount: number;
    currencyCode: string;
  }

  export interface CustomerDetails {
    customerName: string;
    customerEmail: string;
    customerPhoneNumber: string;
  }

  export interface TransactionDetails {
    referenceNumber: string;
    description: string;
  }

  export interface Transaction {
    amountDetails: AmountDetails;
    customerDetails: CustomerDetails;
    transactionDetails: TransactionDetails;
    paymentMethodCode: string;
  }

  export interface Currency {
    code: string;
    name: string;
    symbol: string;
  }

  export interface PaymentMethod {
    code: string;
    name: string;
    description: string;
    currencies: string[];
  }

  export interface PaymentMethodDetails {
    paymentMethodName: string;
    paymentMethodCode: string;
  }

  export interface TransactionResponse {
    success: boolean;
    referenceNumber: string;
    pollUrl?: string;
    redirectUrl?: string;
    message?: string;
  }

  export interface PaymentStatusResponse {
    transactionStatus: string;
    referenceNumber: string;
    amountDetails?: AmountDetails;
    paymentMethodDetails?: PaymentMethodDetails;
    pollUrl?: string;
  }

  export default class Pesepay {
    constructor(integrationKey: string, encryptionKey: string);

    getActiveCurrencies(): Promise<Currency[]>;
    getPaymentMethodsByCurrency(currencyCode: string): Promise<PaymentMethod[]>;
    initiateTransaction(transaction: Transaction): Promise<TransactionResponse>;
    checkPayment(referenceNumber: string): Promise<PaymentStatusResponse>;
    processCallback(encryptedData: string): Promise<any>;
  }
}
