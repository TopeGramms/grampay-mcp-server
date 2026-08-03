/**
 * src/httpServer.ts — HTTP entry point for Claude Connectors
 *
 * Exposes the MCP server over Streamable HTTP (the current MCP spec standard)
 * so it can be added as a connector via Claude → Settings → Connectors.
 *
 * Transport: POST /mcp  — client sends JSON-RPC requests
 *            GET  /mcp  — server sends SSE events (streaming responses)
 *            DELETE /mcp — session teardown
 *
 * Auth: Static Bearer token validated against MCP_AUTH_TOKEN env var.
 *       When adding the connector in Claude, set:
 *         Header: Authorization
 *         Value:  Bearer <your MCP_AUTH_TOKEN>
 */

import express, { type Request, type Response, type NextFunction } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "crypto";
import dotenv from "dotenv";
import { CONFIG } from "./config.js";
import { buildMcpServer } from "./buildMcpServer.js";

dotenv.config();

// ---------------------------------------------------------------------------
// Validation — fail fast if required env vars are missing
// ---------------------------------------------------------------------------

const MCP_AUTH_TOKEN = process.env.MCP_AUTH_TOKEN;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error(
    "FATAL: JWT_SECRET is not set. " +
    "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\" " +
    "and add it to your .env file."
  );
  process.exit(1);
}

if (!MCP_AUTH_TOKEN) {
  console.warn(
    "WARNING: MCP_AUTH_TOKEN is not set. " +
    "The /mcp endpoint is UNAUTHENTICATED — anyone who finds the URL can invoke your tools. " +
    "Set MCP_AUTH_TOKEN in your .env file for production."
  );
}

// ---------------------------------------------------------------------------
// Express app
// ---------------------------------------------------------------------------

const app = express();
app.use(express.json());

// ---------------------------------------------------------------------------
// Auth middleware
// ---------------------------------------------------------------------------

function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!MCP_AUTH_TOKEN) {
    // Auth disabled — warn was already logged at startup
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      error: "Unauthorized",
      message:
        "Missing Authorization header. " +
        "Add 'Authorization: Bearer <your MCP_AUTH_TOKEN>' when registering this connector.",
    });
    return;
  }

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || token !== MCP_AUTH_TOKEN) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid Bearer token.",
    });
    return;
  }

  next();
}

// ---------------------------------------------------------------------------
// Session registry
// Session lifetime matches a single Claude conversation turn — in-memory is fine.
// Sessions are short-lived; the transport closes when the SSE stream ends.
// ---------------------------------------------------------------------------

const sessions = new Map<string, StreamableHTTPServerTransport>();

function cleanupSession(sessionId: string): void {
  sessions.delete(sessionId);
  console.error(`[session] closed: ${sessionId} (${sessions.size} active)`);
}

// ---------------------------------------------------------------------------
// MCP endpoint
// ---------------------------------------------------------------------------

app.post("/mcp", authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  try {
    let transport: StreamableHTTPServerTransport;

    if (sessionId && sessions.has(sessionId)) {
      // Existing session — reuse transport
      transport = sessions.get(sessionId)!;
    } else {
      // New session — create server + transport
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          sessions.set(id, transport);
          console.error(`[session] opened: ${id} (${sessions.size} active)`);
        },
      });

      // Each session gets its own MCP Server instance so tool state is isolated
      const server = buildMcpServer();

      // Assign onclose BEFORE connect so it's definitely set (exactOptionalPropertyTypes)
      transport.onclose = () => {
        const sid = (transport as { sessionId?: string }).sessionId;
        if (sid) cleanupSession(sid);
      };

      await server.connect(transport as Parameters<typeof server.connect>[0]);
    }

    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    console.error("[mcp] POST error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.get("/mcp", authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).json({
      error: "Bad Request",
      message: "Missing or unknown mcp-session-id. Start a session with POST /mcp first.",
    });
    return;
  }

  try {
    const transport = sessions.get(sessionId)!;
    await transport.handleRequest(req, res);
  } catch (err) {
    console.error("[mcp] GET error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    }
  }
});

app.delete("/mcp", authMiddleware, async (req: Request, res: Response) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  if (sessionId && sessions.has(sessionId)) {
    const transport = sessions.get(sessionId)!;
    try {
      await transport.handleRequest(req, res);
    } catch {
      // best-effort teardown
    } finally {
      cleanupSession(sessionId);
    }
  } else {
    res.status(200).json({ ok: true });
  }
});

// ---------------------------------------------------------------------------
// Health check — required by hosting platforms and Claude's connector ping
// ---------------------------------------------------------------------------

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    mode: CONFIG.MODE,
    sessions: sessions.size,
    timestamp: new Date().toISOString(),
  });
});

import path from "path";
import fs from "fs";

// ---------------------------------------------------------------------------
// Root — landing page HTML or JSON metadata fallback
// ---------------------------------------------------------------------------

app.get("/", (_req: Request, res: Response) => {
  const landingPath = path.join(process.cwd(), "grampay-landing.html");
  if (fs.existsSync(landingPath)) {
    res.sendFile(landingPath);
  } else {
    res.json({
      name: "GramPay MCP Server",
      version: "0.1.0",
      transport: "Streamable HTTP",
      endpoint: "/mcp",
      health: "/health",
      auth: MCP_AUTH_TOKEN ? "Bearer token required" : "UNAUTHENTICATED (set MCP_AUTH_TOKEN)",
      docs: "https://github.com/TopeGramms/grampay-mcp-server",
    });
  }
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

const PORT = Number(process.env.PORT ?? 3000);

app.listen(PORT, () => {
  console.error(`GramPay HTTP MCP Server listening on port ${PORT}`);
  console.error(`  Mode:      ${CONFIG.MODE}`);
  console.error(`  Auth:      ${MCP_AUTH_TOKEN ? "Bearer token enabled" : "DISABLED (set MCP_AUTH_TOKEN)"}`);
  console.error(`  Endpoint:  http://localhost:${PORT}/mcp`);
  console.error(`  Health:    http://localhost:${PORT}/health`);
});
