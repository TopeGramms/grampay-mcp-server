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
export declare function handleGetConfig(): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
}>;
export declare function handleGetQuote(amountUsd: number): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
}>;
export declare function handlePrepareCashout(amountUsd: number): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
}>;
export declare function handleExecuteCashout(prepareToken: string): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
}>;
export declare function handleGetStatus(txId: string): Promise<{
    content: {
        type: "text";
        text: string;
    }[];
    isError: boolean;
}>;
//# sourceMappingURL=handlers.d.ts.map