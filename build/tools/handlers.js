import { CONFIG } from "../config.js";
import { signPrepareToken, verifyPrepareToken } from "../tokenStore.js";
// Mock state (in-memory for Phase 0 / mock mode)
// Note: balance_usd and completed_txs are only used in mock mode and will reset on restart.
// prepare_tokens are now stateless JWTs — no Map needed.
const mockState = {
    balance_usd: 250.0,
    completed_txs: new Map(),
};
export async function handleGetConfig() {
    return {
        mode: CONFIG.MODE,
        default_bank_name: CONFIG.DEFAULT_BANK_NAME,
        default_bank_account: "****" + CONFIG.DEFAULT_BANK_ACCOUNT.slice(-4), // Masked
        max_cashout_usd: CONFIG.MAX_CASHOUT_USD,
        rate_usd_to_ngn: CONFIG.USD_TO_NGN_RATE,
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
export async function handleGetQuote(amountUsd) {
    if (amountUsd <= 0) {
        throw new Error("Amount must be positive");
    }
    const rateUsdToNgn = CONFIG.USD_TO_NGN_RATE; // Using central rate
    const amountNgn = amountUsd * rateUsdToNgn;
    return {
        amount_usd: amountUsd,
        amount_ngn: amountNgn,
        rate: rateUsdToNgn,
        message: "[MOCK] Quote valid for 60 seconds",
    };
}
export async function handlePrepareCashout(amountUsd) {
    // Validate amount
    if (amountUsd <= 0) {
        throw new Error("Amount must be positive");
    }
    if (amountUsd > CONFIG.MAX_CASHOUT_USD) {
        throw new Error(`Amount exceeds limit of $${CONFIG.MAX_CASHOUT_USD} per transaction`);
    }
    if (amountUsd > mockState.balance_usd) {
        throw new Error(`Insufficient balance. Have $${mockState.balance_usd}`);
    }
    // Issue a stateless JWT prepare-token (5-minute expiry baked in)
    const token = signPrepareToken({
        amount_usd: amountUsd,
        amount_ngn: amountUsd * CONFIG.USD_TO_NGN_RATE,
        bank_name: CONFIG.DEFAULT_BANK_NAME,
        bank_account: CONFIG.DEFAULT_BANK_ACCOUNT,
        timestamp: new Date().toISOString(),
    });
    return {
        prepare_token: token,
        summary: {
            amount_usd: amountUsd,
            amount_ngn: amountUsd * CONFIG.USD_TO_NGN_RATE,
            rate: CONFIG.USD_TO_NGN_RATE,
            destination: `${CONFIG.DEFAULT_BANK_NAME} ****${CONFIG.DEFAULT_BANK_ACCOUNT.slice(-4)}`,
            status: "READY_FOR_CONFIRMATION",
        },
        message: "[MOCK] Preparation successful. Use token to execute.",
    };
}
export async function handleExecuteCashout(prepareToken) {
    // Verify and decode the JWT — throws if expired or tampered
    const prep = verifyPrepareToken(prepareToken);
    // Execute (mock)
    const txId = `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    mockState.completed_txs.set(txId, {
        amount_usd: prep.amount_usd,
        amount_ngn: prep.amount_ngn,
        destination: `${prep.bank_name} ****${String(prep.bank_account).slice(-4)}`,
        timestamp: new Date().toISOString(),
        status: "COMPLETED",
    });
    // Simulate balance deduction
    mockState.balance_usd -= prep.amount_usd;
    return {
        tx_id: txId,
        status: "COMPLETED",
        details: {
            amount_usd: prep.amount_usd,
            amount_ngn: prep.amount_ngn,
            destination: `${prep.bank_name} ****${String(prep.bank_account).slice(-4)}`,
            timestamp: new Date().toISOString(),
        },
        message: "[MOCK] ✅ Cash-out simulated successfully",
    };
}
export async function handleGetStatus(txId) {
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
//# sourceMappingURL=handlers.js.map