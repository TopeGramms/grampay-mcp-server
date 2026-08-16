import { CONFIG } from "../config.js";
import { signPrepareToken, verifyPrepareToken } from "../tokenStore.js";
import {
  formatConfigReceipt,
  formatPayoutReceipt,
  formatPrepareReceipt,
  formatQuoteReceipt,
  formatStatusReceipt,
} from "../formatReceipt.js";

export interface PendingToken {
  amount_usd: number;
  amount_ngn: number;
  bank_name: string;
  bank_account: string;
  timestamp: string;
}

export interface CompletedTx {
  amount_usd: number;
  amount_ngn: number;
  destination: string;
  timestamp: string;
  status: string;
}

const mockState = {
  balance_usd: 250.0,
  completed_txs: new Map<string, CompletedTx>(),
};

export async function handleGetConfig() {
  return formatConfigReceipt({
    mode: CONFIG.MODE,
    defaultBankName: CONFIG.DEFAULT_BANK_NAME,
    defaultBankAccount: CONFIG.DEFAULT_BANK_ACCOUNT ? "****" + CONFIG.DEFAULT_BANK_ACCOUNT.slice(-4) : "",
    maxCashoutUsd: CONFIG.MAX_CASHOUT_USD,
    rateUsdToNgn: CONFIG.USD_TO_NGN_RATE,
  });
}

export async function handleGetQuote(amountUsd: number) {
  if (amountUsd <= 0) {
    throw new Error("Amount must be positive");
  }

  const rateUsdToNgn = CONFIG.USD_TO_NGN_RATE;
  const amountNgn = amountUsd * rateUsdToNgn;

  return formatQuoteReceipt({
    amountUsd,
    amountNgn,
    rate: rateUsdToNgn,
    validSeconds: 60,
    mode: CONFIG.MODE,
  });
}

export async function handlePrepareCashout(amountUsd: number) {
  if (amountUsd <= 0) {
    throw new Error("Amount must be positive");
  }

  if (amountUsd > CONFIG.MAX_CASHOUT_USD) {
    throw new Error(`Amount exceeds limit of $${CONFIG.MAX_CASHOUT_USD} per transaction`);
  }

  if (CONFIG.MODE === "mock" && amountUsd > mockState.balance_usd) {
    throw new Error(`Insufficient mock balance. Have $${mockState.balance_usd}`);
  }

  const token = signPrepareToken({
    amount_usd: amountUsd,
    amount_ngn: amountUsd * CONFIG.USD_TO_NGN_RATE,
    bank_name: CONFIG.DEFAULT_BANK_NAME,
    bank_account: CONFIG.DEFAULT_BANK_ACCOUNT,
    timestamp: new Date().toISOString(),
  });

  return formatPrepareReceipt({
    prepareToken: token,
    amountUsd,
    amountNgn: amountUsd * CONFIG.USD_TO_NGN_RATE,
    rate: CONFIG.USD_TO_NGN_RATE,
    destination: `${CONFIG.DEFAULT_BANK_NAME || "Default Bank"} ****${CONFIG.DEFAULT_BANK_ACCOUNT.slice(-4)}`,
    status: "READY_FOR_CONFIRMATION",
    mode: CONFIG.MODE,
  });
}

export async function handleExecuteCashout(prepareToken: string) {
  const prep = verifyPrepareToken(prepareToken);

  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  mockState.completed_txs.set(txId, {
    amount_usd: prep.amount_usd,
    amount_ngn: prep.amount_ngn,
    destination: `${prep.bank_name} ****${String(prep.bank_account).slice(-4)}`,
    timestamp: new Date().toISOString(),
    status: "COMPLETED",
  });

  if (CONFIG.MODE === "mock") {
    mockState.balance_usd -= prep.amount_usd;
  }

  return formatPayoutReceipt({
    reference: txId,
    status: "SUCCESS",
    amountNgn: prep.amount_ngn,
    amountUsd: prep.amount_usd,
    exchangeRate: CONFIG.USD_TO_NGN_RATE,
    bankName: prep.bank_name,
    accountNumber: prep.bank_account,
    mode: CONFIG.MODE,
  });
}

export async function handleGetStatus(txId: string) {
  const tx = mockState.completed_txs.get(txId);

  if (!tx) {
    return formatStatusReceipt({
      reference: txId,
      status: "NOT_FOUND",
    });
  }

  return formatStatusReceipt({
    reference: txId,
    status: tx.status,
    amount: tx.amount_ngn,
    currency: "NGN",
    details: tx,
  });
}

