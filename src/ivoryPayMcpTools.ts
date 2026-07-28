

import { CONFIG } from "./config.js";
import { IvoryPayApiError, IvoryPayClient, type CreateTransactionParams } from "./ivoryPayClient.js";
import crypto from "crypto";

export function getIvoryPayClient() {
  return new IvoryPayClient();
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

function toToolError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (err instanceof IvoryPayApiError) {
    return {
      isError: true,
      content: [{ type: "text" as const, text: `IvoryPay error (${err.status}): ${message}` }],
    };
  }

  return {
    isError: true,
    content: [{ type: "text" as const, text: `Unexpected error: ${message}` }],
  };
}

function resolveNgNAmount(args: Record<string, unknown>) {
  const amountNgn = typeof args.amount === "number" ? args.amount : undefined;
  const amountUsd = typeof args.amount_usd === "number" ? args.amount_usd : undefined;
  const exchangeRate = typeof args.exchange_rate === "number"
    ? args.exchange_rate
    : typeof args.exchangeRate === "number"
      ? args.exchangeRate
      : CONFIG.USD_TO_NGN_RATE;

  if (amountNgn !== undefined) {
    if (amountNgn <= 0) {
      throw new Error("Amount must be positive");
    }

    return { amount: amountNgn };
  }

  if (amountUsd !== undefined) {
    if (amountUsd <= 0) {
      throw new Error("Amount must be positive");
    }

    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      throw new Error("Invalid exchange rate");
    }

    return {
      amount: Math.round(amountUsd * exchangeRate),
      amountUsd,
      exchangeRate,
    };
  }

  throw new Error("Provide either amount (NGN) or amount_usd");
}

async function resolveBankCode(args: Record<string, unknown>) {
  const directBankCode = typeof args.bankCode === "string" ? args.bankCode.trim() : "";
  if (directBankCode) {
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
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                mode: "mock",
                balance_usd: 250,
                note: "Mock balance only; set GRAMPAY_MODE=live and IVORYPAY_SECRET_KEY for real balance checks.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const balance = await getIvoryPayClient().getBalance();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(balance, null, 2) }],
    };
  } catch (err) {
    return toToolError(err);
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

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(buildBankLookupResult(query), null, 2),
        },
      ],
    };
  } catch (err) {
    return toToolError(err);
  }
}

export async function cashoutToNGN(args: Record<string, unknown>) {
  try {
    const normalized = resolveNgNAmount(args);
    const firstName = typeof args.firstName === "string" ? args.firstName : "Test";
    const lastName = typeof args.lastName === "string" ? args.lastName : "User";
    const email = typeof args.email === "string" ? args.email : "test@example.com";
    const reference = typeof args.reference === "string" ? args.reference : crypto.randomUUID();

    if (CONFIG.MODE === "mock") {
      return {
        content: [
          {
            type: "text" as const,
            text: `Mock mode: Transaction created and simulated. Reference: ${reference}`,
          },
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                mode: "mock",
                status: "SUCCESS",
                reference,
                amount: normalized.amount,
                currency: "NGN",
                firstName,
                lastName,
                email,
              },
              null,
              2
            ),
          },
        ],
      };
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

    // Step 2: Simulate payment (test mode only)
    await getIvoryPayClient().simulatePayment(txn.reference);

    // Step 3: Verify transaction
    const verified = await getIvoryPayClient().verifyTransaction(txn.reference);

    return {
      content: [
        {
          type: "text" as const,
          text: `Payout initiated successfully. Status: ${verified.status}. Reference: ${verified.reference}`,
        },
        {
          type: "text" as const,
          text: JSON.stringify(verified, null, 2),
        },
      ],
    };
  } catch (err) {
    return toToolError(err);
  }
}

export async function listSupportedBanks() {
  try {
    if (CONFIG.MODE === "mock") {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(
              {
                mode: "mock",
                message: "Supported bank list is only available in live mode.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    const banks = await getIvoryPayClient().listBanks();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({ count: banks.length, banks }, null, 2),
        },
      ],
    };
  } catch (err) {
    return toToolError(err);
  }
}

export async function checkTransferStatus(args: { reference: string }) {
  try {
    const transaction = await getIvoryPayClient().verifyTransaction(args.reference);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(transaction, null, 2) }],
    };
  } catch (err) {
    return toToolError(err);
  }
}
