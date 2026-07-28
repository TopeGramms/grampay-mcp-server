import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, type TextContent } from "@modelcontextprotocol/sdk/types.js";
import { CONFIG } from "./config.js";
import { TOOLS } from "./tools/index.js";
import * as handlers from "./tools/handlers.js";
import {
  cashoutToNGN,
  checkBalance,
  checkTransferStatus,
  lookupBank,
  listSupportedBanks,
  getIvoryPayClient,
} from "./ivoryPayMcpTools.js";

const server = new Server(
  {
    name: "grampay-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle tool list
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error("Request arguments missing");
  }

  console.error(`[${CONFIG.MODE}] Calling tool: ${name}`);

  try {
    let result;

    switch (name) {
      case "grampay_get_config":
        result = await handlers.handleGetConfig();
        break;
      case "grampay_get_balance":
        result = await handlers.handleGetBalance();
        break;
      case "grampay_get_quote":
        if (typeof args.amount_usd !== "number") throw new Error("amount_usd must be a number");
        result = await handlers.handleGetQuote(args.amount_usd);
        break;
      case "grampay_prepare_cashout":
        if (typeof args.amount_usd !== "number") throw new Error("amount_usd must be a number");
        result = await handlers.handlePrepareCashout(args.amount_usd);
        break;
      case "grampay_execute_cashout":
        if (typeof args.prepare_token !== "string") throw new Error("prepare_token must be a string");
        result = await handlers.handleExecuteCashout(args.prepare_token);
        break;
      case "grampay_get_status":
        if (typeof args.tx_id !== "string") throw new Error("tx_id must be a string");
        result = await handlers.handleGetStatus(args.tx_id);
        break;
      case "grampay_lookup_bank":
        result = await lookupBank(args as Record<string, unknown>);
        break;
      case "list_supported_banks":
        result = await listSupportedBanks();
        break;
      case "cashout_to_ngn":
        result = await cashoutToNGN(args as Record<string, unknown>);
        break;
      case "check_transfer_status":
        if (typeof args.reference !== "string") throw new Error("reference must be a string");
        result = await checkTransferStatus({ reference: args.reference });
        break;
      case "create_transaction":
        result = await getIvoryPayClient().createTransaction(args as any);
        break;
      case "simulate_payment":
        if (typeof args.reference !== "string") throw new Error("reference must be a string");
        result = await getIvoryPayClient().simulatePayment(args.reference);
        break;
      case "verify_transaction":
        if (typeof args.reference !== "string") throw new Error("reference must be a string");
        result = await getIvoryPayClient().verifyTransaction(args.reference);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    if (
      result &&
      typeof result === "object" &&
      "content" in result &&
      Array.isArray((result as { content?: unknown }).content)
    ) {
      return result as {
        content: TextContent[];
        isError?: boolean;
      };
    }

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        } as TextContent,
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        } as TextContent,
      ],
      isError: true,
    };
  }
});

console.error(`GramPay MCP Server starting in ${CONFIG.MODE} mode...`);

const transport = new StdioServerTransport();
await server.connect(transport);

console.error("GramPay MCP Server connected and ready");
