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
  ReadResourceRequestSchema,
  type TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
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

const RECEIPT_RESOURCE_URI = "ui://grampay/receipt.html";

const RECEIPT_APP_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  :root { color-scheme: light dark; font-family: ui-sans-serif, system-ui, sans-serif; }
  body { margin: 0; padding: 16px; background: transparent; color: #17221b; }
  @media (prefers-color-scheme: dark) { body { color: #f2f5ef; } .card { background: #14231b; border-color: #2b4b3a; } .muted { color: #a9b8ae; } }
  .card { max-width: 520px; border: 1px solid #d5ded7; border-radius: 16px; padding: 20px; background: #f8fbf8; box-shadow: 0 8px 24px #0e1c1618; }
  .head, .row { display: flex; justify-content: space-between; gap: 16px; }
  .head { align-items: center; margin-bottom: 18px; }
  .brand { font-weight: 800; letter-spacing: -.02em; }
  .status { color: #087a43; font-weight: 700; font-size: 13px; }
  .amount { font-size: 32px; font-weight: 800; margin-bottom: 16px; }
  .row { padding: 10px 0; border-top: 1px solid #d5ded7; font-size: 14px; }
  .muted { color: #627269; } .value { text-align: right; overflow-wrap: anywhere; }
</style>
</head>
<body>
<article class="card" aria-live="polite">
  <div class="head"><div class="brand">GramPay receipt</div><div class="status" id="status">Completed</div></div>
  <div class="amount"><span id="ngn">-</span> NGN</div>
  <div class="row"><span class="muted">USDC debited</span><span class="value" id="usdc">-</span></div>
  <div class="row"><span class="muted">Destination</span><span class="value" id="destination">-</span></div>
  <div class="row"><span class="muted">Transaction</span><span class="value" id="transaction">-</span></div>
  <div class="row"><span class="muted">Time</span><span class="value" id="timestamp">-</span></div>
</article>
<script>
  function show(result) {
    const data = result?.structuredContent || result?.structured_content || result || {};
    document.querySelector('#status').textContent = data.status || 'Completed';
    document.querySelector('#ngn').textContent = Number(data.estimated_ngn || 0).toLocaleString('en-NG');
    document.querySelector('#usdc').textContent = String(data.amount_usdc ?? '-') + ' USDC';
    document.querySelector('#destination').textContent = data.destination || '-';
    document.querySelector('#transaction').textContent = data.transaction_id || data.tx_id || '-';
    document.querySelector('#timestamp').textContent = data.timestamp || '-';
  }
  window.addEventListener('message', event => {
    const message = event.data;
    if (message?.method === 'ui/notifications/tool-result') show(message.params?.result || message.params);
  });
</script>
</body>
</html>`;

export function buildMcpServer(): Server {
  const server = new Server(
    {
      name: "grampay-mcp-server",
      version: "0.1.0",
      icons: [
        {
          src: "https://grampay-mcp-server.onrender.com/iconcraft-1788533688048.png",
          mimeType: "image/png",
          sizes: ["768x768"],
        },
      ],
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // Handle tool list
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: TOOLS.map((tool) =>
        tool.name === "grampay_execute_cashout"
          ? {
              ...tool,
              _meta: {
                ui: { resourceUri: RECEIPT_RESOURCE_URI },
                "ui/resourceUri": RECEIPT_RESOURCE_URI,
              },
            }
          : tool
      ),
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    if (request.params.uri !== RECEIPT_RESOURCE_URI) {
      throw new Error(`Unknown resource: ${request.params.uri}`);
    }

    return {
      contents: [
        {
          uri: RECEIPT_RESOURCE_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: RECEIPT_APP_HTML,
        },
      ],
    };
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
          result = await handlers.handlePrepareCashout({
            amount_usd: args.amount_usd,
            accountNumber:
              typeof args.accountNumber === "string"
                ? args.accountNumber
                : typeof args.account_number === "string"
                  ? args.account_number
                  : undefined,
            bankName:
              typeof args.bankName === "string"
                ? args.bankName
                : typeof args.bank_name === "string"
                  ? args.bank_name
                  : undefined,
            bankCode:
              typeof args.bankCode === "string"
                ? args.bankCode
                : typeof args.bank_code === "string"
                  ? args.bank_code
                  : undefined,
          });
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
          if (CONFIG.MODE === "live") {
            throw new Error(
              "cashout_to_ngn is being migrated to the /fiat-transfer payout endpoint. " +
                "For live payouts use grampay_prepare_cashout then grampay_execute_cashout."
            );
          }
          result = await cashoutToNGN(args as Record<string, unknown>);
          break;
        case "check_transfer_status":
          if (typeof args.reference !== "string") throw new Error("reference must be a string");
          result = await checkTransferStatus({ reference: args.reference });
          break;
        case "create_transaction":
          if (CONFIG.MODE === "live") {
            throw new Error(
              "create_transaction targets IvoryPay's collection endpoint (money IN), not a payout. " +
                "Disabled in live mode; use grampay_prepare_cashout + grampay_execute_cashout for payouts."
            );
          }
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

      // If the result already has a valid MCP content shape, return it directly
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

      // Otherwise wrap the plain object in a text content block
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

  return server;
}
