import dotenv from "dotenv";

dotenv.config();

const IVORYPAY_BASE_URL = "https://api.ivorypay.io/api/v1";

interface IvoryPayErrorResponse {
  success?: false;
  message?: string;
  error?: string;
  errors?: Array<{ message?: string }>;
}

interface IvoryPaySuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export class IvoryPayApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "IvoryPayApiError";
    this.status = status;
  }
}

function loadSecretKey(): string {
  const key = process.env.IVORYPAY_SECRET_KEY;
  if (!key) {
    throw new Error("Missing IVORYPAY_SECRET_KEY. Set it in your .env file.");
  }
  return key;
}

export class IvoryPayClient {
  private secretKey: string;
  private env: string;

  constructor(secretKey?: string, env?: string) {
    this.secretKey = secretKey ?? loadSecretKey();
    this.env = env ?? process.env.IVORYPAY_ENV ?? "test";
  }

  private headers(): HeadersInit {
    return {
      Authorization: this.secretKey,
      "Content-Type": "application/json",
      ...(this.env ? { "x-env": this.env } : {}),
    };
  }

  private async request<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${IVORYPAY_BASE_URL}${path}`, {
      method,
      headers: this.headers(),
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    const contentType = res.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await res.json() : await res.text();

    if (!res.ok) {
      const message = typeof payload === "string"
        ? payload
        : (payload as IvoryPayErrorResponse).message || (payload as IvoryPayErrorResponse).error || "IvoryPay request failed";
      throw new IvoryPayApiError(res.status, message);
    }

    if (typeof payload === "object" && payload && "success" in payload && payload.success === false) {
      throw new IvoryPayApiError(res.status, (payload as IvoryPayErrorResponse).message || "IvoryPay request failed");
    }

    return (payload as IvoryPaySuccessResponse<T>).data ?? (payload as T);
  }

  async getBalance() {
    return this.request<BalanceResponse>("GET", "/fiat-transfer/banks");
  }

  async listBanks() {
    return this.request<BankListEntry[]>("GET", "/fiat-transfer/banks");
  }

  async resolveBankAccount(accountNumber: string, bankCode: string, currency: "NGN" | "KES" | "GHS" | "ZAR" | "USD" = "NGN") {
    return this.request<AccountResolution>("POST", "/fiat-transfer/account-resolution", {
      accountNumber,
      bankCode,
      currency,
    });
  }

  async initiateNGNTransfer(params: InitiateNGNTransferParams) {
    return this.request<TransferResponse>("POST", "/fiat-transfer", {
      amount: params.amount,
      token: "USDT",
      fiatCurrency: params.currency ?? "NGN",
      payoutMethod: "BANK_TRANSFER",
      accountNumber: params.accountNumber,
      bankCode: params.bankCode,
      reference: params.reference,
    });
  }

  async getTransaction(reference: string) {
    return this.request<TransactionDetail>("GET", `/fiat-transfer/${encodeURIComponent(reference)}`);
  }
}

export interface BalanceResponse {
  balance?: number;
  currency?: string;
  available?: boolean;
}

export interface BankListEntry {
  id: string;
  name: string;
  code: string;
  country: string;
  currency: string;
}

export interface AccountResolution {
  accountName?: string;
  accountNumber?: string;
  bankCode?: string;
}

export interface InitiateNGNTransferParams {
  amount: number;
  currency?: "NGN";
  recipientName: string;
  accountNumber: string;
  bankCode: string;
  reference: string;
  narration?: string;
}

export interface TransferResponse {
  reference: string;
  status: string;
  amount: number;
  currency: string;
}

export interface TransactionDetail {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  recipient?: {
    name?: string;
    account_number?: string;
    bank_code?: string;
  };
}
