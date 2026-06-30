import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, type TextContent } from "@modelcontextprotocol/sdk/types.js";
import { CONFIG } from "./config.js";
import { TOOLS } from "./tools/index.js";
import * as handlers from "./tools/handlers.js";

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
        result = await handlers.handleGetQuote(args.amount_usd as number);
        break;
      case "grampay_prepare_cashout":
        result = await handlers.handlePrepareCashout(args.amount_usd as number);
        break;
      case "grampay_execute_cashout":
        result = await handlers.handleExecuteCashout(
          args.prepare_token as string
        );
        break;
      case "grampay_get_status":
        result = await handlers.handleGetStatus(args.tx_id as string);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
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