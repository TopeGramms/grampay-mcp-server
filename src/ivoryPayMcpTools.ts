

import { CONFIG } from "./config.js";
import { IvoryPayApiError, IvoryPayClient, type CreateTransactionParams } from "./ivoryPayClient.js";
import crypto from "crypto";
import {
  formatBalanceReceipt,
  formatBankListReceipt,
  formatErrorReceipt,
  formatPayoutReceipt,
  formatStatusReceipt,
} from "./formatReceipt.js";

let clientInstance: IvoryPayClient | null = null;

export function getIvoryPayClient() {
  if (!clientInstance) {
    clientInstance = new IvoryPayClient();
  }
  return clientInstance;
}

type BankDirectoryEntry = {
  name: string;
  code: string;
  aliases: string[];
};

const BANK_DIRECTORY: BankDirectoryEntry[] = [
  { name: "Access Bank", code: "044", aliases: ["access", "access bank"] },
  { name: "First Bank of Nigeria", code: "011", aliases: ["first bank", "first bank of nigeria"] },
  { name: "United Bank for Africa", code: "033", aliases: ["uba", "united bank for africa"] },
  { name: "Guaranty Trust Bank", code: "058", aliases: ["gtbank", "gtb", "guaranty trust bank"] },
  { name: "Zenith Bank", code: "057", aliases: ["zenith", "zenith bank"] },
  { name: "Fidelity Bank", code: "070", aliases: ["fidelity", "fidelity bank"] },
  { name: "FCMB", code: "214", aliases: ["fcmb", "first city monument bank"] },
  { name: "Wema Bank", code: "035", aliases: ["wema", "wema bank"] },
  { name: "Sterling Bank", code: "232", aliases: ["sterling", "sterling bank"] },
  { name: "Union Bank", code: "032", aliases: ["union", "union bank"] },
  { name: "Polaris Bank", code: "076", aliases: ["polaris", "polaris bank"] },
  { name: "Ecobank", code: "050", aliases: ["ecobank", "eco bank"] },
  { name: "Stanbic IBTC Bank", code: "221", aliases: ["stanbic", "stanbic ibtc", "stanbic ibtc bank"] },
  { name: "Keystone Bank", code: "082", aliases: ["keystone", "keystone bank"] },
  { name: "Unity Bank", code: "215", aliases: ["unity", "unity bank"] },
  { name: "Jaiz Bank", code: "301", aliases: ["jaiz", "jaiz bank"] },
  { name: "Providus Bank", code: "101", aliases: ["providus", "providus bank"] },
  { name: "SunTrust Bank", code: "100", aliases: ["suntrust", "suntrust bank"] },
  { name: "Lota", code: "100017", aliases: ["lota"] },
];

const WALLET_PROVIDERS = new Set([
  "opay",
  "opay digital services",
  "palmpay",
  "palm pay",
  "moniepoint",
  "kuda",
  "klasha",
  "piggyvest",
]);

function normalize(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function isWalletProvider(name: string) {
  const normalized = normalize(name);
  return Array.from(WALLET_PROVIDERS).some((provider) => normalized.includes(provider));
}

function findBank(query: string) {
  const normalized = normalize(query);
  return BANK_DIRECTORY.find((bank) =>
    normalize(bank.name) === normalized ||
    bank.code === normalized ||
    bank.aliases.some((alias) => normalize(alias) === normalized || normalize(alias).includes(normalized) || normalized.includes(normalize(alias)))
  );
}

function toToolError(toolName: string, err: unknown) {
  return formatErrorReceipt(toolName, err);
}

function resolveNgNAmount(args: Record<string, unknown>) {
  const amountNgn = typeof args.amount === "number" ? args.amount : undefined;
  const amountUsd = typeof args.amount_usd === "number" ? args.amount_usd : undefined;
  const exchangeRate = typeof args.exchange_rate === "number"
    ? args.exchange_rate
    : typeof args.exchangeRate === "number"
      ? args.exchangeRate
      : CONFIG.USD_TO_NGN_RATE;

  let computedUsd: number;
  let computedNgn: number;

  if (amountNgn !== undefined) {
    if (amountNgn <= 0) {
      throw new Error("Amount must be positive");
    }
    computedNgn = amountNgn;
    computedUsd = amountNgn / exchangeRate;
  } else if (amountUsd !== undefined) {
    if (amountUsd <= 0) {
      throw new Error("Amount must be positive");
    }
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error("Invalid exchange rate");
    }
    computedUsd = amountUsd;
    computedNgn = Math.round(amountUsd * exchangeRate);
  } else {
    throw new Error("Provide either amount (NGN) or amount_usd");
  }

  if (computedUsd > CONFIG.MAX_CASHOUT_USD) {
    throw new Error(`Amount exceeds maximum allowable cashout limit of $${CONFIG.MAX_CASHOUT_USD} USD`);
  }

  return {
    amount: computedNgn,
    amountUsd: computedUsd,
    exchangeRate,
  };
}

async function resolveBankCode(args: Record<string, unknown>) {
  const directBankCode = typeof args.bankCode === "string" ? args.bankCode.trim() : "";
  if (directBankCode) {
    const matchedByCode = BANK_DIRECTORY.find((b) => b.code === directBankCode);
    if (matchedByCode && isWalletProvider(matchedByCode.name)) {
      throw new Error(`Bank code "${directBankCode}" (${matchedByCode.name}) belongs to a wallet provider. Please use a traditional bank like Access Bank.`);
    }
    return directBankCode;
  }

  const bankName = typeof args.bankName === "string"
    ? args.bankName
    : typeof args.bank_name === "string"
      ? args.bank_name
      : "";

  if (!bankName) {
    throw new Error("Provide bankCode or bankName");
  }

  const matchedBank = findBank(bankName);

  if (!matchedBank) {
    throw new Error(`Bank not found: ${bankName}`);
  }

  if (isWalletProvider(matchedBank.name) || isWalletProvider(bankName)) {
    throw new Error(`"${matchedBank.name}" is not a real bank. Please use a traditional bank like Access Bank.`);
  }

  return matchedBank.code;
}

function buildBankLookupResult(query?: string) {
  const normalizedQuery = typeof query === "string" ? normalize(query) : "";
  const banks = BANK_DIRECTORY.filter((bank) => {
    if (!normalizedQuery) {
      return true;
    }

    return (
      normalize(bank.name).includes(normalizedQuery) ||
      bank.code.includes(normalizedQuery) ||
      bank.aliases.some((alias) => normalize(alias).includes(normalizedQuery))
    );
  }).map((bank) => ({
    name: bank.name,
    code: bank.code,
  }));

  return {
    query: query ?? null,
    count: banks.length,
    banks,
  };
}

export async function checkBalance() {
  try {
    if (CONFIG.MODE === "mock") {
      return formatBalanceReceipt({
        balanceUsd: 250,
        mode: "mock",
        note: "Mock balance only; set GRAMPAY_MODE=live and IVORYPAY_SECRET_KEY for real balance checks.",
      });
    }

    const balance = await getIvoryPayClient().getBalance();
    const usdEquiv = balance.usdEquivalent ?? balance.totalAvailableBalance ?? 0;
    return formatBalanceReceipt({
      balanceUsd: usdEquiv,
      mode: "live",
      breakdown: balance.breakDown,
    });
  } catch (err) {
    return toToolError("checkBalance", err);
  }
}

export async function lookupBank(args: Record<string, unknown>) {
  try {
    const query = typeof args.query === "string"
      ? args.query
      : typeof args.bankName === "string"
        ? args.bankName
        : typeof args.bankCode === "string"
          ? args.bankCode
          : undefined;

    const res = buildBankLookupResult(query);
    return formatBankListReceipt(res);
  } catch (err) {
    return toToolError("lookupBank", err);
  }
}

export async function cashoutToNGN(args: Record<string, unknown>) {
  try {
    const normalized = resolveNgNAmount(args);

    if (typeof args.firstName !== "string" || !args.firstName.trim()) {
      throw new Error("firstName is required");
    }
    if (typeof args.lastName !== "string" || !args.lastName.trim()) {
      throw new Error("lastName is required");
    }
    if (typeof args.email !== "string" || !args.email.trim()) {
      throw new Error("email is required");
    }

    const firstName = args.firstName.trim();
    const lastName = args.lastName.trim();
    const email = args.email.trim();
    const recipientName = typeof args.recipientName === "string" && args.recipientName.trim()
      ? args.recipientName.trim()
      : `${firstName} ${lastName}`;

    const accountNumber = typeof args.accountNumber === "string" ? args.accountNumber.trim() : undefined;
    const bankName = typeof args.bankName === "string"
      ? args.bankName.trim()
      : typeof args.bank_name === "string"
        ? args.bank_name.trim()
        : undefined;
    const bankCode = typeof args.bankCode === "string" ? args.bankCode.trim() : undefined;

    const reference = typeof args.reference === "string" ? args.reference : `gp_${crypto.randomUUID().slice(0, 8)}`;

    if (CONFIG.MODE === "mock") {
      return formatPayoutReceipt({
        reference,
        status: "SUCCESS",
        amountNgn: normalized.amount,
        amountUsd: normalized.amountUsd,
        exchangeRate: normalized.exchangeRate,
        bankName: bankName ?? (bankCode ? `Code ${bankCode}` : CONFIG.DEFAULT_BANK_NAME),
        accountNumber: accountNumber ?? CONFIG.DEFAULT_BANK_ACCOUNT,
        recipientName,
        email,
        mode: "mock",
      });
    }

    // Step 1: Create transaction
    const txn = await getIvoryPayClient().createTransaction({
      amount: normalized.amountUsd ?? normalized.amount,
      email,
      firstName,
      lastName,
      baseFiat: "NGN",
      reference,
    } as CreateTransactionParams);

    // Step 2: Simulate payment (test environment only)
    if (CONFIG.IVORYPAY_ENV === "test") {
      await getIvoryPayClient().simulatePayment(txn.reference);
    }

    // Step 3: Verify transaction
    const verified = await getIvoryPayClient().verifyTransaction(txn.reference);

    return formatPayoutReceipt({
      reference: verified.reference ?? reference,
      status: verified.status ?? "SUCCESS",
      amountNgn: normalized.amount,
      amountUsd: normalized.amountUsd,
      exchangeRate: normalized.exchangeRate,
      bankName: bankName ?? (bankCode ? `Code ${bankCode}` : CONFIG.DEFAULT_BANK_NAME),
      accountNumber: accountNumber ?? CONFIG.DEFAULT_BANK_ACCOUNT,
      recipientName,
      email,
      mode: "live",
    });
  } catch (err) {
    return toToolError("cashoutToNGN", err);
  }
}

export async function listSupportedBanks() {
  try {
    if (CONFIG.MODE === "mock") {
      const res = buildBankLookupResult();
      return formatBankListReceipt(res);
    }

    const banks = await getIvoryPayClient().listBanks();
    return formatBankListReceipt({
      count: banks.length,
      banks: banks.map((b) => ({ name: b.name, code: b.code })),
    });
  } catch (err) {
    return toToolError("listSupportedBanks", err);
  }
}

export async function checkTransferStatus(args: { reference: string }) {
  try {
    const transaction = await getIvoryPayClient().verifyTransaction(args.reference);
    return formatStatusReceipt({
      reference: transaction.reference ?? args.reference,
      status: transaction.status ?? "UNKNOWN",
      amount: transaction.amount,
      currency: transaction.currency,
    });
  } catch (err) {
    return toToolError("checkTransferStatus", err);
  }
}

