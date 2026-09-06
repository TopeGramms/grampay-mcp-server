import crypto from "crypto";
import { CONFIG } from "../config.js";
import { signPrepareToken, verifyPrepareToken } from "../tokenStore.js";
import { resolveBankCode, getIvoryPayClient } from "../ivoryPayMcpTools.js";
// Mock-only in-memory record so grampay_get_status works in a demo.
// The durable ledger (survives restarts, dedupes by reference) is Phase 3;
// this Map resets on restart and is never used in live mode.
const mockState = {
    completed_txs: new Map(),
};
export async function handleGetConfig() {
    return {
        mode: CONFIG.MODE,
        default_bank_name: CONFIG.DEFAULT_BANK_NAME || null,
        default_bank_account: CONFIG.DEFAULT_BANK_ACCOUNT
            ? "****" + CONFIG.DEFAULT_BANK_ACCOUNT.slice(-4)
            : null,
        max_cashout_usd: CONFIG.MAX_CASHOUT_USD,
        estimate_rate_usd_to_ngn: CONFIG.USD_TO_NGN_RATE,
        rate_note: "USD→NGN is a display estimate only; IvoryPay sets the live settlement rate at payout.",
    };
}
export async function handleGetQuote(amountUsd) {
    if (amountUsd <= 0) {
        throw new Error("Amount must be positive");
    }
    const rate = CONFIG.USD_TO_NGN_RATE;
    return {
        debit_usdc: amountUsd,
        estimated_ngn: Math.round(amountUsd * rate),
        estimate_rate: rate,
        note: "Estimate only. You send USDC; IvoryPay converts to NGN at its live rate on payout.",
    };
}
/**
 * Step 1 of the canonical cash-out flow.
 *
 * Validates the amount + destination, verifies the recipient's account name
 * (live mode), and locks everything — including a server-generated idempotency
 * `reference` — into a signed 5-minute JWT. Execute reuses that reference, so a
 * retried execute cannot double-pay.
 */
export async function handlePrepareCashout(params) {
    const amountUsd = params.amount_usd;
    if (amountUsd <= 0) {
        throw new Error("Amount must be positive");
    }
    if (amountUsd > CONFIG.MAX_CASHOUT_USD) {
        throw new Error(`Amount exceeds limit of $${CONFIG.MAX_CASHOUT_USD} per transaction`);
    }
    // Destination: explicit accountNumber, else the server-configured default account.
    const accountNumber = (params.accountNumber?.trim() || CONFIG.DEFAULT_BANK_ACCOUNT || "").trim();
    if (!/^\d{10}$/.test(accountNumber)) {
        throw new Error("A valid 10-digit Nigerian bank account number is required " +
            "(pass accountNumber, or configure DEFAULT_BANK_ACCOUNT).");
    }
    // Resolve + validate the bank; throws for wallet providers (OPay, Kuda, …).
    const bankCode = await resolveBankCode({
        bankCode: params.bankCode,
        bankName: params.bankName ?? CONFIG.DEFAULT_BANK_NAME,
    });
    // Verify the destination NAME before issuing a token (live only — needs the API).
    let accountName = "";
    if (CONFIG.MODE === "live") {
        const resolved = await getIvoryPayClient().resolveAccount({
            accountNumber,
            bankCode,
            currency: "NGN",
        });
        accountName = resolved.accountName;
    }
    const rate = CONFIG.USD_TO_NGN_RATE; // display estimate only
    const estimatedNgn = Math.round(amountUsd * rate);
    const reference = `grampay_${crypto.randomUUID()}`;
    const prepareToken = signPrepareToken({
        reference,
        amount_usdc: amountUsd, // caller specifies USDC to debit (≈ USD)
        estimated_ngn: estimatedNgn,
        rate_usd_ngn: rate,
        token: "USDC",
        account_number: accountNumber,
        bank_code: bankCode,
        bank_name: params.bankName ?? CONFIG.DEFAULT_BANK_NAME ?? "",
        account_name: accountName,
        timestamp: new Date().toISOString(),
    });
    return {
        prepare_token: prepareToken,
        summary: {
            debit_usdc: amountUsd,
            estimated_ngn: estimatedNgn,
            estimate_rate: rate,
            destination: {
                account_number: `****${accountNumber.slice(-4)}`,
                bank_code: bankCode,
                account_name: accountName || "(not verified in mock mode)",
            },
            status: "READY_FOR_CONFIRMATION",
            expires_in: "5 minutes",
            note: "estimated_ngn is indicative; IvoryPay's live conversion sets the final NGN.",
        },
        message: CONFIG.MODE === "live"
            ? "Prepared. Confirm the resolved account_name with the user, then call grampay_execute_cashout with this token."
            : "[MOCK] Prepared — account name NOT verified in mock mode and no funds will move. Use the token to execute.",
    };
}
/**
 * Step 2 of the canonical cash-out flow.
 *
 * Consumes the prepare token and issues the payout. Idempotent by construction:
 * the `reference` was fixed at prepare time, so calling execute twice with the
 * same token sends the same reference and IvoryPay dedupes it.
 */
export async function handleExecuteCashout(prepareToken) {
    const prep = verifyPrepareToken(prepareToken);
    const destination = `${prep.bank_name || prep.bank_code} ****${prep.account_number.slice(-4)}`;
    if (CONFIG.MODE === "mock") {
        mockState.completed_txs.set(prep.reference, {
            reference: prep.reference,
            amount_usdc: prep.amount_usdc,
            estimated_ngn: prep.estimated_ngn,
            destination,
            account_name: prep.account_name,
            timestamp: new Date().toISOString(),
            status: "COMPLETED",
        });
        return {
            tx_id: prep.reference,
            reference: prep.reference,
            status: "COMPLETED",
            details: {
                debit_usdc: prep.amount_usdc,
                estimated_ngn: prep.estimated_ngn,
                destination,
                timestamp: new Date().toISOString(),
            },
            message: "[MOCK] ✅ Cash-out simulated — no real funds moved.",
        };
    }
    // LIVE payout via POST /fiat-transfer (money OUT). See docs/IVORYPAY_NOTES.md.
    const payout = await getIvoryPayClient().createFiatTransfer({
        amount: prep.amount_usdc,
        token: prep.token,
        fiatCurrency: "NGN",
        payoutMethod: "BANK_TRANSFER",
        accountNumber: prep.account_number,
        bankCode: prep.bank_code,
        reference: prep.reference,
    });
    return {
        tx_id: payout.id ?? prep.reference,
        reference: prep.reference,
        status: payout.status,
        details: {
            debit_usdc: prep.amount_usdc,
            account_name: prep.account_name,
            destination,
        },
        message: `Payout initiated (${payout.status}). Final settlement is confirmed via IvoryPay webhook.`,
    };
}
export async function handleGetStatus(txId) {
    const tx = mockState.completed_txs.get(txId);
    if (tx) {
        return { tx_id: txId, status: tx.status, details: tx };
    }
    if (CONFIG.MODE === "live") {
        return {
            tx_id: txId,
            status: "UNKNOWN",
            message: "Live payout status is delivered via IvoryPay webhooks; durable status lookup lands with the Phase 3 ledger.",
        };
    }
    return { tx_id: txId, status: "NOT_FOUND", message: "Transaction not found" };
}
//# sourceMappingURL=handlers.js.map