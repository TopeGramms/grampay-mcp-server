export declare function handleGetConfig(): Promise<{
    mode: string;
    opay_account: string;
    max_cashout_usd: number;
    rate_usd_to_ngn: number;
}>;
export declare function handleGetBalance(): Promise<{
    balance_usd: number;
    message: string;
}>;
export declare function handleGetQuote(amountUsd: number): Promise<{
    amount_usd: number;
    amount_ngn: number;
    rate: number;
    message: string;
}>;
export declare function handlePrepareCashout(amountUsd: number): Promise<{
    prepare_token: string;
    summary: {
        amount_usd: number;
        amount_ngn: number;
        rate: number;
        destination: string;
        status: string;
    };
    message: string;
}>;
export declare function handleExecuteCashout(prepareToken: string): Promise<{
    tx_id: string;
    status: string;
    details: {
        amount_usd: any;
        amount_ngn: any;
        destination: string;
        timestamp: string;
    };
    message: string;
}>;
export declare function handleGetStatus(txId: string): Promise<{
    tx_id: string;
    status: string;
    message: string;
    details?: never;
} | {
    tx_id: string;
    status: any;
    details: any;
    message?: never;
}>;
//# sourceMappingURL=handlers.d.ts.map