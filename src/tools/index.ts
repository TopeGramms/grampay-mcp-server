export const TOOLS = [
  {
    name: "grampay_get_config",
    description: "Get GramPay configuration, limits, and current mode (mock/live)",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "grampay_get_balance",
    description: "Check USDC balance in GramPay wallet",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "grampay_get_quote",
    description: "Get live USDC → NGN rate quote",
    inputSchema: {
      type: "object",
      properties: {
        amount_usd: {
          type: "number",
          description: "Amount in USD to convert",
        },
      },
      required: ["amount_usd"],
    },
  },
  {
    name: "grampay_prepare_cashout",
    description: "Prepare a cash-out transaction (validates limits, returns summary + token)",
    inputSchema: {
      type: "object",
      properties: {
        amount_usd: {
          type: "number",
          description: "Amount in USD to cash out",
        },
      },
      required: ["amount_usd"],
    },
  },
  {
    name: "grampay_execute_cashout",
    description: "Execute cash-out (requires prepare token from previous step)",
    inputSchema: {
      type: "object",
      properties: {
        prepare_token: {
          type: "string",
          description: "One-time token from grampay_prepare_cashout",
        },
      },
      required: ["prepare_token"],
    },
  },
  {
    name: "grampay_get_status",
    description: "Check status of pending or completed cash-out",
    inputSchema: {
      type: "object",
      properties: {
        tx_id: {
          type: "string",
          description: "Transaction ID from execute response",
        },
      },
      required: ["tx_id"],
    },
  },
  {
    name: "check_balance",
    description: "Check available balance across all currencies (NGN, KES, etc.)",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  {
    name: "cashout_to_ngn",
    description: "Initiate a bank payout in NGN. Accepts amount (NGN) or amount_usd for automatic USD→NGN conversion.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount in NGN" },
        amount_usd: { type: "number", description: "Amount in USD to convert to NGN" },
        exchange_rate: { type: "number", description: "Optional USD→NGN rate, defaults to env value" },
        recipientName: { type: "string", description: "Bank account holder name" },
        accountNumber: { type: "string", description: "Bank account number" },
        bankCode: { type: "string", description: "Bank code (e.g. 007 for GTBank)" },
        reference: { type: "string", description: "Unique transaction reference" },
        narration: { type: "string", description: "Optional payment description" },
      },
      required: ["recipientName", "accountNumber", "bankCode", "reference"],
    },
  },
  {
    name: "check_transfer_status",
    description: "Check the status of a crypto-to-NGN transfer",
    inputSchema: {
      type: "object",
      properties: {
        reference: { type: "string", description: "Transaction reference from cashout_to_ngn" },
      },
      required: ["reference"],
    },
  },
];