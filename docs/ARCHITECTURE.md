# GramPay Architecture & Security Specification

This document details the architectural design, trust boundaries, provider selection rationale, and production security roadmap for the GramPay Model Context Protocol (MCP) server.

---

## 1. System Architecture & Component Flow

GramPay acts as an operational agent translation layer between LLMs (using standard MCP protocols) and African licensed fiat payment gateways (IvoryPay).

```
┌─────────────────┐       MCP Protocol       ┌────────────────────────┐
│  AI Agent Host  │ ───────────────────────> │  GramPay MCP Server   │
│ (Claude / GPT)  │ <─────────────────────── │ (Node.js / TypeScript) │
└─────────────────┘       JSON-RPC 2.0       └───────────┬────────────┘
                                                         │
                                                         │ REST API (HTTPS)
                                                         ▼
                                             ┌────────────────────────┐
                                             │  IvoryPay Gateway API  │
                                             └───────────┬────────────┘
                                                         │
                                                         │ Interbank NIP Settlement
                                                         ▼
                                             ┌────────────────────────┐
                                             │ Nigerian Bank Account  │
                                             └────────────────────────┘
```

---

## 2. On-Ramp / Off-Ramp Provider Evaluation Rationale

During initial evaluation, three primary African crypto payout gateway providers were analyzed for integration:

| Provider | Fee Structure | Verification & KYB Requirements | Onboarding Status |
| :--- | :--- | :--- | :--- |
| **Breet** | 0.5% transaction fee | Corporate KYB (CAC incorporation, UBO disclosure) | Requires incorporated entity |
| **Quidax Ramp** | ₦200 flat fee per payout | Full business entity registration & corporate bank account | Requires incorporated entity |
| **IvoryPay** | 1.0% per transaction | Tier-1 Personal KYC (Individual founder identification) | **Active Integration** |

**Strategic Decision:** To enable immediate pre-incorporation testing and grant validation without operational delay, GramPay integrated directly with **IvoryPay**. Transition to Breet/Quidax will occur post-incorporation to optimize per-transaction fee overhead.

---

## 3. Trust Boundaries & Security Model

```
┌─────────────────────────────────────────────────────────────┐
│  TRUST BOUNDARY 1: AI Agent Host                            │
│  - Executes prompt parsing and tool selection              │
│  - Receives safety response payloads                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
               Requires Explicit Field Declarations
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  TRUST BOUNDARY 2: GramPay MCP Server Environment           │
│  - Enforces MAX_CASHOUT_USD bounds ($1,000 max per call)    │
│  - Enforces mandatory user identity parameters              │
│  - Restricts simulate_payment to test mode                  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                Authenticated via API Key Header
                               │
┌──────────────────────────────▼──────────────────────────────┐
│  TRUST BOUNDARY 3: IvoryPay Gateway & Financial Settlement │
└─────────────────────────────────────────────────────────────┘
```

### Risk Controls Implemented
1. **No Fallback Credentials:** All transactions explicitly require valid recipient identity data (`firstName`, `lastName`, `email`).
2. **Hard Limit Enforcement:** Any payout exceeding `$MAX_CASHOUT_USD` is blocked at the MCP routing level prior to network dispatch.
3. **Environment Isolation:** Payment simulation tools return hard errors when invoked outside test environments (`IVORYPAY_ENV=test`).

---

## 4. Production Security & Technical Roadmap

To move from single-operator deployment to multi-tenant production readiness, the following architectural enhancements are scheduled:

```
[Phase 1: Present] ───> [Phase 2: Grant Execution] ───> [Phase 3: Production Release]
• Stdio local MCP        • Streamable HTTP/SSE          • Webhook Handler Endpoint
• IvoryPay Testnet       • Dedicated Auth Tokens        • OAuth 2.0 Multi-User Auth
• Explicit Tool Guard    • Live Balance Verification    • Quidax/Breet Provider Routing
```
