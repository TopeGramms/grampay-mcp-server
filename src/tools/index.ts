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
];