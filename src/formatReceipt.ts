/**
 * src/formatReceipt.ts
 *
 * Formatter utilities for GramPay MCP tool responses.
 * Replaces raw JSON dumps with human-readable, PayBox-style markdown receipts.
 */

export interface PayoutReceiptData {
  reference: string;
  status: "SUCCESS" | "PENDING" | "FAILED" | string;
  amountNgn: number;
  amountUsd?: number;
  exchangeRate?: number;
  bankName?: string;
  bankCode?: string;
  accountNumber?: string;
  recipientName?: string;
  email?: string;
  mode?: "mock" | "live" | string;
  errorMessage?: string;
  timestamp?: string;
}

export interface QuoteReceiptData {
  amountUsd: number;
  amountNgn: number;
  rate: number;
  validSeconds?: number;
  mode?: string;
}

export interface PrepareReceiptData {
  prepareToken: string;
  amountUsd: number;
  amountNgn: number;
  rate: number;
  destination: string;
  status: string;
  mode?: string;
}

export interface BalanceReceiptData {
  balanceUsd: number;
  mode?: string;
  breakdown?: Array<{ currency: string; balance: number; status: string }>;
  note?: string;
}

export interface ConfigReceiptData {
  mode: string;
  defaultBankName: string;
  defaultBankAccount: string;
  maxCashoutUsd: number;
  rateUsdToNgn: number;
}

export interface BankListReceiptData {
  query?: string | null;
  count: number;
  banks: Array<{ name: string; code: string }>;
}

function formatCurrencyNgn(amount: number): string {
  return "₦ " + amount.toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatCurrencyUsd(amount: number): string {
  return "$ " + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function getStatusBadge(status: string): string {
  const upper = status.toUpperCase();
  if (upper === "SUCCESS" || upper === "COMPLETED" || upper === "SUCCESSFUL") {
    return "✅ SUCCESS";
  }
  if (upper === "PENDING" || upper === "READY_FOR_CONFIRMATION" || upper === "PROCESSING") {
    return "⏳ PENDING";
  }
  return `❌ ${upper}`;
}

export function toMcpTextResponse(text: string, isError = false) {
  return {
    content: [{ type: "text" as const, text }],
    isError,
  };
}

export function formatPayoutReceipt(data: PayoutReceiptData) {
  const isSuccess = ["SUCCESS", "COMPLETED", "SUCCESSFUL"].includes(data.status.toUpperCase());
  const isPending = ["PENDING", "READY_FOR_CONFIRMATION", "PROCESSING"].includes(data.status.toUpperCase());
  const icon = isSuccess ? "✅" : isPending ? "⏳" : "❌";
  const title = isSuccess ? "Payout Complete" : isPending ? "Payout Initiated" : "Payout Failed";
  const modeTag = data.mode === "mock" ? " [MOCK]" : "";

  const lines: string[] = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `  ${icon}  GramPay · ${title}${modeTag}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ];

  if (data.recipientName || (data.email)) {
    const recipientInfo = [data.recipientName, data.email ? `<${data.email}>` : ""].filter(Boolean).join(" ");
    lines.push(`  Recipient     ${recipientInfo}`);
  }

  if (data.bankName || data.accountNumber || data.bankCode) {
    const bankStr = [
      data.bankName ?? (data.bankCode ? `Code ${data.bankCode}` : ""),
      data.accountNumber ? `****${data.accountNumber.slice(-4)}` : "",
    ].filter(Boolean).join(" ");
    lines.push(`  Bank          ${bankStr}`);
  }

  lines.push(`  Amount NGN    ${formatCurrencyNgn(data.amountNgn)}`);

  if (data.amountUsd !== undefined) {
    lines.push(`  Amount USD    ${formatCurrencyUsd(data.amountUsd)}`);
  }

  if (data.exchangeRate !== undefined) {
    lines.push(`  Rate          1 USD = ₦ ${data.exchangeRate.toLocaleString()}`);
  }

  lines.push(`  Reference     ${data.reference}`);

  const timeStr = data.timestamp ?? new Date().toISOString().replace("T", " ").slice(0, 19) + " UTC";
  lines.push(`  Time          ${timeStr}`);
  lines.push(`  Status        ${getStatusBadge(data.status)}`);

  if (data.errorMessage) {
    lines.push(`  Error         ${data.errorMessage}`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  lines.push("  GramPay · Crypto → Naira");
  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return toMcpTextResponse(lines.join("\n"), !isSuccess && !isPending);
}

export function formatPrepareReceipt(data: PrepareReceiptData) {
  const lines: string[] = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "  📝  GramPay · Cashout Prepared",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `  Amount USD    ${formatCurrencyUsd(data.amountUsd)}`,
    `  Amount NGN    ${formatCurrencyNgn(data.amountNgn)}`,
    `  Rate          1 USD = ₦ ${data.rate.toLocaleString()}`,
    `  Destination   ${data.destination}`,
    `  Status        ${getStatusBadge(data.status)}`,
    "────────────────────────────────",
    `  Prepare Token (Valid 5 mins):`,
    `  ${data.prepareToken}`,
    "────────────────────────────────",
    "  💡 Call grampay_execute_cashout with this token to complete.",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ];

  return toMcpTextResponse(lines.join("\n"));
}

export function formatQuoteReceipt(data: QuoteReceiptData) {
  const lines: string[] = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "  💱  GramPay · Exchange Quote",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `  Input USD     ${formatCurrencyUsd(data.amountUsd)}`,
    `  Output NGN    ${formatCurrencyNgn(data.amountNgn)}`,
    `  Rate          1 USD = ₦ ${data.rate.toLocaleString()}`,
    `  Valid For     ${data.validSeconds ?? 60} seconds`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ];

  return toMcpTextResponse(lines.join("\n"));
}

export function formatBalanceReceipt(data: BalanceReceiptData) {
  const modeTag = data.mode === "mock" ? " [MOCK]" : "";
  const lines: string[] = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `  💼  GramPay · Wallet Balance${modeTag}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `  Total USD     ${formatCurrencyUsd(data.balanceUsd)}`,
  ];

  if (data.breakdown && data.breakdown.length > 0) {
    lines.push("  Breakdown:");
    for (const item of data.breakdown) {
      lines.push(`    - ${item.currency}: ${item.balance.toLocaleString()} (${item.status})`);
    }
  }

  if (data.note) {
    lines.push(`  Note          ${data.note}`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return toMcpTextResponse(lines.join("\n"));
}

export function formatConfigReceipt(data: ConfigReceiptData) {
  const lines: string[] = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "  ⚙️   GramPay · Server Configuration",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `  Mode          ${data.mode.toUpperCase()}`,
    `  Max Cashout   ${formatCurrencyUsd(data.maxCashoutUsd)}`,
    `  FX Rate       1 USD = ₦ ${data.rateUsdToNgn.toLocaleString()}`,
  ];

  if (data.defaultBankName) {
    lines.push(`  Default Bank  ${data.defaultBankName} (${data.defaultBankAccount})`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return toMcpTextResponse(lines.join("\n"));
}

export function formatBankListReceipt(data: BankListReceiptData) {
  const lines: string[] = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `  🏦  GramPay · Bank Directory (${data.count} found)`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ];

  if (data.query) {
    lines.push(`  Query         "${data.query}"`);
    lines.push("────────────────────────────────");
  }

  for (const b of data.banks.slice(0, 20)) {
    lines.push(`  [${b.code.padStart(4, " ")}] ${b.name}`);
  }

  if (data.banks.length > 20) {
    lines.push(`  ... and ${data.banks.length - 20} more banks.`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return toMcpTextResponse(lines.join("\n"));
}

export function formatStatusReceipt(data: { reference: string; status: string; amount?: number; currency?: string; details?: unknown }) {
  const lines: string[] = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "  🔍  GramPay · Transfer Status",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `  Reference     ${data.reference}`,
    `  Status        ${getStatusBadge(data.status)}`,
  ];

  if (data.amount !== undefined) {
    const curr = data.currency ?? "NGN";
    const amtStr = curr === "NGN" ? formatCurrencyNgn(data.amount) : `${data.amount} ${curr}`;
    lines.push(`  Amount        ${amtStr}`);
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  return toMcpTextResponse(lines.join("\n"));
}

export function formatErrorReceipt(toolName: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const lines: string[] = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "  ❌  GramPay · Error",
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `  Tool          ${toolName}`,
    `  Error         ${message}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
  ];

  return toMcpTextResponse(lines.join("\n"), true);
}
