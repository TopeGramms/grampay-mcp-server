import { CONFIG } from "../config.js";

// Mock state (in-memory for Phase 0)
const mockState = {
  balance_usd: 250.0, // Mock USDC balance
  pending_tokens: new Map<string, any>(),
  completed_txs: new Map<string, any>(),
};

export async function handleGetConfig() {
  return {
    mode: CONFIG.MODE,
    opay_account: "****" + CONFIG.OPAY_ACCOUNT.slice(-4), // Masked
    max_cashout_usd: CONFIG.MAX_CASHOUT_USD,
    rate_usd_to_ngn: 1640, // Mock rate
  };
}

export async function handleGetBalance() {
  if (CONFIG.MODE === "mock") {
    return {
      balance_usd: mockState.balance_usd,
      message: "[MOCK] This is simulated balance",
    };
  }
  // Phase 1: Real Solana RPC call here
  throw new Error("Live mode not implemented yet");
}

export async function handleGetQuote(amountUsd: number) {
  if (amountUsd <= 0) {
    throw new Error("Amount must be positive");
  }

  const rateUsdToNgn = 1640; // Mock rate
  const amountNgn = amountUsd * rateUsdToNgn;

  return {
    amount_usd: amountUsd,
    amount_ngn: amountNgn,
    rate: rateUsdToNgn,
    message: "[MOCK] Quote valid for 60 seconds",
  };
}

export async function handlePrepareCashout(amountUsd: number) {
  // Validate amount
  if (amountUsd <= 0) {
    throw new Error("Amount must be positive");
  }

  if (amountUsd > CONFIG.MAX_CASHOUT_USD) {
    throw new Error(
      `Amount exceeds limit of $${CONFIG.MAX_CASHOUT_USD} per transaction`
    );
  }

  if (amountUsd > mockState.balance_usd) {
    throw new Error(`Insufficient balance. Have $${mockState.balance_usd}`);
  }

  // Generate one-time token
  const token = `prep_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Store preparation details
  mockState.pending_tokens.set(token, {
    amount_usd: amountUsd,
    amount_ngn: amountUsd * 1640,
    opay_account: CONFIG.OPAY_ACCOUNT,
    timestamp: new Date().toISOString(),
    expires_at: new Date(Date.now() + 300000).toISOString(), // 5 min expiry
  });

  return {
    prepare_token: token,
    summary: {
      amount_usd: amountUsd,
      amount_ngn: amountUsd * 1640,
      rate: 1640,
      destination: "Opay ****" + CONFIG.OPAY_ACCOUNT.slice(-4),
      status: "READY_FOR_CONFIRMATION",
    },
    message: "[MOCK] Preparation successful. Use token to execute.",
  };
}

export async function handleExecuteCashout(prepareToken: string) {
  const prep = mockState.pending_tokens.get(prepareToken);

  if (!prep) {
    throw new Error("Invalid or expired preparation token");
  }

  // Check expiry
  if (new Date(prep.expires_at) < new Date()) {
    mockState.pending_tokens.delete(prepareToken);
    throw new Error("Preparation token expired");
  }

  // Execute (mock)
  const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  mockState.completed_txs.set(txId, {
    amount_usd: prep.amount_usd,
    amount_ngn: prep.amount_ngn,
    destination: prep.opay_account,
    timestamp: new Date().toISOString(),
    status: "COMPLETED",
  });

  // Clean up token
  mockState.pending_tokens.delete(prepareToken);

  // Simulate balance deduction
  mockState.balance_usd -= prep.amount_usd;

  return {
    tx_id: txId,
    status: "COMPLETED",
    details: {
      amount_usd: prep.amount_usd,
      amount_ngn: prep.amount_ngn,
      destination: "Opay ****" + CONFIG.OPAY_ACCOUNT.slice(-4),
      timestamp: new Date().toISOString(),
    },
    message: "[MOCK] ✅ Cash-out simulated successfully",
  };
}

export async function handleGetStatus(txId: string) {
  const tx = mockState.completed_txs.get(txId);

  if (!tx) {
    return {
      tx_id: txId,
      status: "NOT_FOUND",
      message: "Transaction not found",
    };
  }

  return {
    tx_id: txId,
    status: tx.status,
    details: tx,
  };
}