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
    name: "grampay_lookup_bank",
    description: "Search the supported real-bank directory and return matching bank names and codes",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Bank name or code to search for, such as Access Bank or 044",
        },
      },
      required: [],
    },
  },
  {
    name: "list_supported_banks",
    description: "List IvoryPay-supported banks and codes for live NGN payouts",
    inputSchema: {
      type: "object",
      properties: {
        country: {
          type: "string",
          description: "Optional country code, e.g. NG",
        },
      },
      required: [],
    },
  },
  {
    name: "grampay_get_quote",
    description: "Get live USDC -> NGN rate quote",
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
    name: "cashout_to_ngn",
    description: "Initiate a bank payout in NGN to a real bank account. Accepts amount (NGN) or amount_usd for automatic USD -> NGN conversion.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number", description: "Amount in NGN" },
        amount_usd: { type: "number", description: "Amount in USD to convert to NGN" },
        exchange_rate: { type: "number", description: "Optional USD -> NGN rate, defaults to env value" },
        firstName: { type: "string", description: "Recipient first name" },
        lastName: { type: "string", description: "Recipient last name" },
        email: { type: "string", description: "Recipient email address" },
        recipientName: { type: "string", description: "Bank account holder name" },
        accountNumber: { type: "string", description: "Bank account number" },
        bankCode: { type: "string", description: "Bank code (optional if bankName is provided)" },
        bankName: { type: "string", description: "Bank name such as Access Bank or First Bank" },
        reference: { type: "string", description: "Unique transaction reference" },
        narration: { type: "string", description: "Optional payment description" },
      },
      required: ["accountNumber", "reference", "firstName", "lastName", "email"],
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
  {
    name: "create_transaction",
    description: "Create a fiat payout transaction on IvoryPay.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "number" },
        email: { type: "string" },
        firstName: { type: "string" },
        lastName: { type: "string" },
        type: { type: "string" },
        baseFiat: { type: "string" },
        reference: { type: "string" },
      },
      required: ["amount", "email", "firstName", "lastName", "reference"],
    },
  },
  {
    name: "simulate_payment",
    description: "Simulate payment completion for a transaction (Test Mode only)",
    inputSchema: {
      type: "object",
      properties: {
        reference: { type: "string" },
      },
      required: ["reference"],
    },
  },
  {
    name: "verify_transaction",
    description: "Verify the status of a transaction",
    inputSchema: {
      type: "object",
      properties: {
        reference: { type: "string" },
      },
      required: ["reference"],
    },
  },
];
