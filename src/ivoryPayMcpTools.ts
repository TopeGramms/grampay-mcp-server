import dotenv from "dotenv";

dotenv.config();

import { IvoryPayApiError, IvoryPayClient, type InitiateNGNTransferParams } from "./ivoryPayClient.js";

const ivoryPay = new IvoryPayClient();

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
      : Number(process.env.USD_TO_NGN_RATE ?? "1650");

  if (amountNgn !== undefined) {
    return { amount: amountNgn };
  }

  if (amountUsd !== undefined) {
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

export async function checkBalance() {
  try {
    const balance = await ivoryPay.getBalance();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(balance, null, 2) }],
    };
  } catch (err) {
    return toToolError(err);
  }
}

export async function cashoutToNGN(args: Record<string, unknown>) {
  try {
    const normalized = resolveNgNAmount(args);
    const recipientName = typeof args.recipientName === "string" ? args.recipientName : "Recipient";
    const accountNumber = typeof args.accountNumber === "string" ? args.accountNumber : "";
    const bankCode = typeof args.bankCode === "string" ? args.bankCode : "";

    if (!accountNumber || !bankCode) {
      throw new Error("accountNumber and bankCode are required");
    }

    const transfer = await ivoryPay.initiateNGNTransfer({
      amount: normalized.amount,
      currency: "NGN",
      recipientName,
      accountNumber,
      bankCode,
      reference: typeof args.reference === "string" ? args.reference : `cashout-${Date.now()}`,
      narration: typeof args.narration === "string" ? args.narration : "Cashout",
    } satisfies InitiateNGNTransferParams);

    return {
      content: [
        {
          type: "text" as const,
          text: `Transfer initiated successfully. Reference: ${transfer.reference}`,
        },
        { type: "text" as const, text: JSON.stringify(transfer, null, 2) },
      ],
    };
  } catch (err) {
    return toToolError(err);
  }
}

export async function checkTransferStatus(args: { reference: string }) {
  try {
    const transaction = await ivoryPay.getTransaction(args.reference);
    return {
      content: [{ type: "text" as const, text: JSON.stringify(transaction, null, 2) }],
    };
  } catch (err) {
    return toToolError(err);
  }
}
