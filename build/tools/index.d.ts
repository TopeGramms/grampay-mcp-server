export declare const TOOLS: ({
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            query?: never;
            country?: never;
            amount_usd?: never;
            accountNumber?: never;
            bankName?: never;
            bankCode?: never;
            prepare_token?: never;
            tx_id?: never;
            amount?: never;
            exchange_rate?: never;
            firstName?: never;
            lastName?: never;
            email?: never;
            recipientName?: never;
            reference?: never;
            narration?: never;
            type?: never;
            baseFiat?: never;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            query: {
                type: string;
                description: string;
            };
            country?: never;
            amount_usd?: never;
            accountNumber?: never;
            bankName?: never;
            bankCode?: never;
            prepare_token?: never;
            tx_id?: never;
            amount?: never;
            exchange_rate?: never;
            firstName?: never;
            lastName?: never;
            email?: never;
            recipientName?: never;
            reference?: never;
            narration?: never;
            type?: never;
            baseFiat?: never;
        };
        required: never[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            country: {
                type: string;
                description: string;
            };
            query?: never;
            amount_usd?: never;
            accountNumber?: never;
            bankName?: never;
            bankCode?: never;
            prepare_token?: never;
            tx_id?: never;
            amount?: never;
            exchange_rate?: never;
            firstName?: never;
            lastName?: never;
            email?: never;
            recipientName?: never;
            reference?: never;
            narration?: never;
            type?: never;
            baseFiat?: never;
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
            query?: never;
            country?: never;
            accountNumber?: never;
            bankName?: never;
            bankCode?: never;
            prepare_token?: never;
            tx_id?: never;
            amount?: never;
            exchange_rate?: never;
            firstName?: never;
            lastName?: never;
            email?: never;
            recipientName?: never;
            reference?: never;
            narration?: never;
            type?: never;
            baseFiat?: never;
        };
        required: string[];
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
            accountNumber: {
                type: string;
                description: string;
            };
            bankName: {
                type: string;
                description: string;
            };
            bankCode: {
                type: string;
                description: string;
            };
            query?: never;
            country?: never;
            prepare_token?: never;
            tx_id?: never;
            amount?: never;
            exchange_rate?: never;
            firstName?: never;
            lastName?: never;
            email?: never;
            recipientName?: never;
            reference?: never;
            narration?: never;
            type?: never;
            baseFiat?: never;
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
            query?: never;
            country?: never;
            amount_usd?: never;
            accountNumber?: never;
            bankName?: never;
            bankCode?: never;
            tx_id?: never;
            amount?: never;
            exchange_rate?: never;
            firstName?: never;
            lastName?: never;
            email?: never;
            recipientName?: never;
            reference?: never;
            narration?: never;
            type?: never;
            baseFiat?: never;
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
            query?: never;
            country?: never;
            amount_usd?: never;
            accountNumber?: never;
            bankName?: never;
            bankCode?: never;
            prepare_token?: never;
            amount?: never;
            exchange_rate?: never;
            firstName?: never;
            lastName?: never;
            email?: never;
            recipientName?: never;
            reference?: never;
            narration?: never;
            type?: never;
            baseFiat?: never;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            amount: {
                type: string;
                description: string;
            };
            amount_usd: {
                type: string;
                description: string;
            };
            exchange_rate: {
                type: string;
                description: string;
            };
            firstName: {
                type: string;
                description: string;
            };
            lastName: {
                type: string;
                description: string;
            };
            email: {
                type: string;
                description: string;
            };
            recipientName: {
                type: string;
                description: string;
            };
            accountNumber: {
                type: string;
                description: string;
            };
            bankCode: {
                type: string;
                description: string;
            };
            bankName: {
                type: string;
                description: string;
            };
            reference: {
                type: string;
                description: string;
            };
            narration: {
                type: string;
                description: string;
            };
            query?: never;
            country?: never;
            prepare_token?: never;
            tx_id?: never;
            type?: never;
            baseFiat?: never;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            reference: {
                type: string;
                description: string;
            };
            query?: never;
            country?: never;
            amount_usd?: never;
            accountNumber?: never;
            bankName?: never;
            bankCode?: never;
            prepare_token?: never;
            tx_id?: never;
            amount?: never;
            exchange_rate?: never;
            firstName?: never;
            lastName?: never;
            email?: never;
            recipientName?: never;
            narration?: never;
            type?: never;
            baseFiat?: never;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            amount: {
                type: string;
                description?: never;
            };
            email: {
                type: string;
                description?: never;
            };
            firstName: {
                type: string;
                description?: never;
            };
            lastName: {
                type: string;
                description?: never;
            };
            type: {
                type: string;
            };
            baseFiat: {
                type: string;
            };
            reference: {
                type: string;
                description?: never;
            };
            query?: never;
            country?: never;
            amount_usd?: never;
            accountNumber?: never;
            bankName?: never;
            bankCode?: never;
            prepare_token?: never;
            tx_id?: never;
            exchange_rate?: never;
            recipientName?: never;
            narration?: never;
        };
        required: string[];
    };
} | {
    name: string;
    description: string;
    inputSchema: {
        type: string;
        properties: {
            reference: {
                type: string;
                description?: never;
            };
            query?: never;
            country?: never;
            amount_usd?: never;
            accountNumber?: never;
            bankName?: never;
            bankCode?: never;
            prepare_token?: never;
            tx_id?: never;
            amount?: never;
            exchange_rate?: never;
            firstName?: never;
            lastName?: never;
            email?: never;
            recipientName?: never;
            narration?: never;
            type?: never;
            baseFiat?: never;
        };
        required: string[];
    };
})[];
//# sourceMappingURL=index.d.ts.map