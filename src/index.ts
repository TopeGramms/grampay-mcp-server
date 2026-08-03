/**
 * src/index.ts — stdio entry point
 *
 * Used by Claude Desktop and other local MCP clients that spawn this
 * process and communicate over stdin/stdout.
 *
 * For the HTTP connector (Claude → Settings → Connectors), use
 * src/httpServer.ts instead.
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CONFIG } from "./config.js";
import { buildMcpServer } from "./buildMcpServer.js";

console.error(`GramPay MCP Server starting in ${CONFIG.MODE} mode (stdio)...`);

const server = buildMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);

console.error("GramPay MCP Server connected and ready");
