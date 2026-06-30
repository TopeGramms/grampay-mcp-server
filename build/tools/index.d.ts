export declare const TOOLS: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            amount_usd?: never;
            prepare_token?: never;
            tx_id?: never;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            amount_usd: {
                type: string;
                description: string;
            };
            prepare_token?: never;
            tx_id?: never;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            prepare_token: {
                type: string;
                description: string;
            };
            amount_usd?: never;
            tx_id?: never;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            tx_id: {
                type: string;
                description: string;
            };
            amount_usd?: never;
            prepare_token?: never;
        };
        required: string[];
    };
})[];
//# sourceMappingURL=index.d.ts.map