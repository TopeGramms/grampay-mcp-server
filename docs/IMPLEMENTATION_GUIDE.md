# GramPay — Developer & Coding Assistant Implementation Guide

> **Target Audience:** Secondary coding assistants (e.g., Sonnet / Cursor / Codex) or contributing engineers implementing future system components.
> **Scope:** Detailed specification for adding Streamable HTTP/SSE transport, Webhooks, Rate-Limiting, and Provider Abstraction to GramPay.

---

## Task 1: Add Streamable HTTP / SSE Transport

### Objective
Expose the MCP server over HTTP using Server-Sent Events (SSE) and HTTP POST endpoints, enabling GramPay to function as a remote MCP server connector (e.g. for ChatGPT/Claude remote agent integrations).

### File to Create
`src/httpServer.ts`

### Specifications
1. Use standard Node `http` or `express`.
2. Import `SSEServerTransport` from `@modelcontextprotocol/sdk/server/sse.js`.
3. Expose two routes:
   - `GET /sse`: Creates an SSE connection and returns the session transport.
   - `POST /messages`: Receives JSON-RPC messages for active sessions.
4. Add environment variables to `.env.example` & `src/config.ts`:
   - `PORT=3000`
   - `GRAMPAY_TRANSPORT=stdio` (supports `stdio` | `http`)

### Code Blueprint
```typescript
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";

export function startHttpServer(server: Server, port: number) {
  const app = express();
  let transport: SSEServerTransport | null = null;

  app.get("/sse", async (req, res) => {
    transport = new SSEServerTransport("/messages", res);
    await server.connect(transport);
  });

  app.post("/messages", async (req, res) => {
    if (!transport) {
      res.status(400).send("No active SSE session");
      return;
    }
    await transport.handlePostMessage(req, res);
  });

  app.listen(port, () => {
    console.error(`GramPay MCP HTTP Server listening on port ${port}`);
  });
}
```

---

## Task 2: Implement Webhook Listener for Production Payouts

### Objective
Receive payment completion webhooks from IvoryPay when transactions complete in production mode (`IVORYPAY_ENV=live`).

### File to Create
`src/webhookHandler.ts`

### Specifications
1. Express endpoint: `POST /webhooks/ivorypay`
2. Verify signature header (`x-ivorypay-signature`) using HMAC-SHA256 with `IVORYPAY_SECRET_KEY`.
3. Handle webhook event payload:
   - Event: `transaction.success`
   - Extract `reference`, `amount`, `currency`, `status`.
4. Update local transaction registry/log with final settlement state.

---

## Task 3: Abstract Multi-Provider Ramp Architecture

### Objective
Create a unified `RampProvider` interface so GramPay can route payouts dynamically between IvoryPay, Breet, and Quidax based on fees and availability.

### File to Create
`src/providers/types.ts`

### Interface Specification
```typescript
export interface PayoutRequest {
  reference: string;
  amountUsd: number;
  bankCode: string;
  accountNumber: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface PayoutResult {
  reference: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  providerTxId: string;
  feeAmount: number;
}

export interface RampProvider {
  name: string;
  getQuote(amountUsd: number): Promise<{ rate: number; feeUsd: number }>;
  initiatePayout(req: PayoutRequest): Promise<PayoutResult>;
  verifyPayout(reference: string): Promise<PayoutResult>;
}
```

---

## Task 4: Bank Caching Layer

### Objective
Cache `/fiat-transfer/banks` responses for 24 hours to reduce unnecessary external HTTP requests and prevent rate-limiting.

### File to Modify
`src/ivoryPayClient.ts`

### Specifications
1. Add an in-memory cache structure:
```typescript
private bankCache: { data: BankListEntry[]; timestamp: number } | null = null;
```
2. Check `bankCache` before executing `request("GET", "/fiat-transfer/banks")`.
3. Invalidate if cache age exceeds `86400000` ms (24 hours).
