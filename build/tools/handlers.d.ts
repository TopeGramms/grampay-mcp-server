export interface CompletedTx {
    reference: string;
    amount_usdc: number;
    estimated_ngn: number;
    destination: string;
    account_name: string;
    timestamp: string;
    status: string;
}
export declare function handleGetConfig(): Promise<{
    mode: string;
    default_bank_name: string | null;
    default_bank_account: string | null;
    max_cashout_usd: number;
    estimate_rate_usd_to_ngn: number;
    rate_note: string;
}>;
export declare function handleGetQuote(amountUsd: number): Promise<{
    debit_usdc: number;
    estimated_ngn: number;
    estimate_rate: number;
    note: string;
}>;
/**
 * Step 1 of the canonical cash-out flow.
 *
 * Validates the amount + destination, verifies the recipient's account name
 * (live mode), and locks everything — including a server-generated idempotency
 * `reference` — into a signed 5-minute JWT. Execute reuses that reference, so a
 * retried execute cannot double-pay.
 */
export declare function handlePrepareCashout(params: {
    amount_usd: number;
    accountNumber?: string | undefined;
    bankName?: string | undefined;
    bankCode?: string | undefined;
}): Promise<{
    prepare_token: string;
    summary: {
        debit_usdc: number;
        estimated_ngn: number;
        estimate_rate: number;
        destination: {
            account_number: string;
            bank_code: string;
            account_name: string;
        };
        status: string;
        expires_in: string;
        note: string;
    };
    message: string;
}>;
/**
 * Step 2 of the canonical cash-out flow.
 *
 * Consumes the prepare token and issues the payout. Idempotent by construction:
 * the `reference` was fixed at prepare time, so calling execute twice with the
 * same token sends the same reference and IvoryPay dedupes it.
 */
export declare function handleExecuteCashout(prepareToken: string): Promise<{
    tx_id: string;
    reference: string;
    status: string;
    details: {
        debit_usdc: number;
        estimated_ngn: number;
        destination: string;
        timestamp: string;
        account_name?: never;
    };
    message: string;
} | {
    tx_id: string;
    reference: string;
    status: string;
    details: {
        debit_usdc: number;
        account_name: string;
        destination: string;
        estimated_ngn?: never;
        timestamp?: never;
    };
    message: string;
}>;
export declare function handleGetStatus(txId: string): Promise<{
    tx_id: string;
    status: string;
    details: CompletedTx;
    message?: never;
} | {
    tx_id: string;
    status: string;
    message: string;
    details?: never;
}>;
//# sourceMappingURL=handlers.d.ts.map