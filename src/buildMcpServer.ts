/**
 * buildMcpServer.ts
 *
 * Shared factory that creates a configured MCP Server instance with all
 * request handlers registered. Used by both:
 *   - src/index.ts        (stdio transport — Claude Desktop / local use)
 *   - src/httpServer.ts   (Streamable HTTP transport — Claude Connectors)
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type TextContent,
} from "@modelcontextprotocol/sdk/types.js";
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
import { formatErrorReceipt, formatStatusReceipt } from "./formatReceipt.js";
import type { CreateTransactionParams } from "./ivoryPayClient.js";

export function buildMcpServer(): Server {
  const server = new Server(
    {
      name: "grampay-mcp-server",
      version: "1.0.0",
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
          result = await checkBalance();
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
        case "create_transaction": {
          const params: CreateTransactionParams = {
            amount: Number(args.amount),
            email: String(args.email ?? ""),
            firstName: String(args.firstName ?? ""),
            lastName: String(args.lastName ?? ""),
            reference: String(args.reference ?? ""),
            baseFiat: (args.baseFiat as any) ?? "NGN",
          };
          const txn = await getIvoryPayClient().createTransaction(params);
          result = formatStatusReceipt({
            reference: txn.reference,
            status: txn.status ?? "CREATED",
            amount: txn.amount,
          });
          break;
        }
        case "simulate_payment": {
          if (typeof args.reference !== "string") throw new Error("reference must be a string");
          const sim = await getIvoryPayClient().simulatePayment(args.reference);
          result = formatStatusReceipt({
            reference: args.reference,
            status: sim.status ?? "SIMULATED",
          });
          break;
        }
        case "verify_transaction": {
          if (typeof args.reference !== "string") throw new Error("reference must be a string");
          const v = await getIvoryPayClient().verifyTransaction(args.reference);
          result = formatStatusReceipt({
            reference: v.reference ?? args.reference,
            status: v.status ?? "VERIFIED",
            amount: v.amount,
            currency: v.currency,
          });
          break;
        }
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
      return formatErrorReceipt(name, error);
    }
  });

  return server;
}

