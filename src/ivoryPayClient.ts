import { CONFIG } from "./config.js";

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

function loadSecretKey(): string | undefined {
  return CONFIG.IVORYPAY_SECRET_KEY;
}

export class IvoryPayClient {
  private secretKey?: string | undefined;
  private env: string;

  constructor(secretKey?: string, env?: string) {
    this.secretKey = secretKey ?? loadSecretKey();
    this.env = env ?? CONFIG.IVORYPAY_ENV ?? "test";
  }

  private headers(): HeadersInit {
    if (!this.secretKey) {
      throw new Error("Missing IVORYPAY_SECRET_KEY. Set it in your .env file.");
    }

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
      signal: AbortSignal.timeout(15000),
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

  async createTransaction(params: CreateTransactionParams): Promise<TransactionResponse> {
    return this.request<TransactionResponse>("POST", "/transactions", {
      amount: params.amount,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      type: "FIAT",
      baseFiat: params.baseFiat ?? "NGN",
      reference: params.reference,
      mode: "API",
      crypto: "USDC",
    });
  }

  async simulatePayment(reference: string): Promise<{ status: string }> {
    return this.request<{ status: string }>("POST", "/fiat-transfer/simulate", {
      reference,
    });
  }

  async verifyTransaction(reference: string): Promise<TransactionVerifyResponse> {
    return this.request<TransactionVerifyResponse>("GET", `/business/transactions/${encodeURIComponent(reference)}/verify`);
  }

  async getBalance(fiatCurrency: "USD" | "NGN" | "KES" | "GHS" | "ZAR" = "NGN"): Promise<BalanceResponse> {
    return this.request<BalanceResponse>(
      "GET",
      `/balance?fiatCurrency=${fiatCurrency}`
    );
  }

  async listBanks() {
    return this.request<BankListEntry[]>("GET", "/fiat-transfer/banks");
  }

  /**
   * Initiate a real fiat PAYOUT (money out) to a bank account — POST /fiat-transfer.
   *
   * This is the DISBURSEMENT endpoint. Do NOT confuse it with createTransaction()
   * (POST /transactions), which is the COLLECTION endpoint (money in). The old
   * cashout path used the wrong one. See docs/IVORYPAY_NOTES.md.
   *
   * ⚠️ Field names are from IvoryPay's public docs — confirm against a live
   * IVORYPAY_ENV=test response before enabling live payouts.
   */
  async createFiatTransfer(params: CreateFiatTransferParams): Promise<FiatTransferResponse> {
    // In test mode, IvoryPay sandbox might fail on dummy real-world bank codes/accounts.
    // Return a mock successful payout for the default test account to allow workflow testing.
    if (this.env === "test" && params.accountNumber === "0123456789") {
      return {
        id: `mock_fiat_${crypto.randomUUID()}`,
        reference: params.reference,
        status: "SUCCESS",
        amount: params.amount,
        token: params.token ?? "USDC",
        fiatCurrency: params.fiatCurrency ?? "NGN"
      };
    }

    return this.request<FiatTransferResponse>("POST", "/fiat-transfer", {
      amount: params.amount,
      token: params.token ?? "USDC",
      fiatCurrency: params.fiatCurrency ?? "NGN",
      payoutMethod: params.payoutMethod ?? "BANK_TRANSFER",
      accountNumber: params.accountNumber,
      bankCode: params.bankCode,
      reference: params.reference,
    });
  }

  /**
   * Resolve/verify a bank account name BEFORE paying out — POST /fiat-transfer/account-resolution.
   * Use this to confirm the destination belongs to the intended recipient.
   *
   * ⚠️ This endpoint names the fiat field `currency`, whereas /fiat-transfer names
   * it `fiatCurrency`. See docs/IVORYPAY_NOTES.md.
   */
  async resolveAccount(params: AccountResolutionParams): Promise<AccountResolutionResponse> {
    // In test mode, IvoryPay cannot resolve dummy account numbers.
    // We return a mock response for the default test account to allow the workflow to proceed.
    if (this.env === "test" && params.accountNumber === "0123456789") {
      return {
        accountName: "GramPay Test Account",
        accountNumber: params.accountNumber,
        bankCode: params.bankCode
      };
    }

    return this.request<AccountResolutionResponse>("POST", "/fiat-transfer/account-resolution", {
      accountNumber: params.accountNumber,
      bankCode: params.bankCode,
      currency: params.currency ?? "NGN",
    });
  }
}

export interface CreateTransactionParams {
  amount: number;
  email: string;
  firstName: string;
  lastName: string;
  baseFiat?: "NGN" | "USD" | "KES" | "GHS" | "ZAR";
  reference: string;
}

export interface TransactionResponse {
  reference: string;
  amount: number;
  type: string;
  status?: string;
  message?: string;
}

export interface TransactionVerifyResponse {
  reference: string;
  status: string;
  amount: number;
  currency: string;
  type?: string;
}

export interface BalanceResponse {
  totalAvailableBalance: number;
  usdEquivalent: number;
  breakDown: Array<{
    currency: string;
    balance: number;
    status: string;
  }>;
}

export interface BankListEntry {
  id: string;
  name: string;
  code: string;
  country: string;
  currency: string;
}

export type PayoutMethod = "BANK_TRANSFER" | "MOBILE_MONEY";

export interface CreateFiatTransferParams {
  /** Amount denominated in the crypto token (not fiat). Must be positive. */
  amount: number;
  token?: "USDC" | "USDT";
  /** Target fiat for the recipient, e.g. "NGN". */
  fiatCurrency?: string;
  payoutMethod?: PayoutMethod;
  accountNumber: string;
  /** Bank code (> 3 chars) — resolve from a bank name via the bank directory. */
  bankCode: string;
  /** Unique per transfer. IvoryPay uses this as the idempotency key. */
  reference: string;
}

export interface FiatTransferResponse {
  id: string;
  reference: string;
  /** Lifecycle: PENDING → PROCESSING → SUCCESS ↘ FAILED */
  status: string;
  amount?: number;
  token?: string;
  fiatCurrency?: string;
}

export interface AccountResolutionParams {
  accountNumber: string;
  bankCode: string;
  /** ⚠️ Named `currency` on this endpoint, not `fiatCurrency`. Defaults to "NGN". */
  currency?: string;
}

export interface AccountResolutionResponse {
  accountName: string;
  accountNumber: string;
  bankCode: string;
}
