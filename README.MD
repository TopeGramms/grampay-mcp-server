# GramPay MCP Server

[![Superteam Nigeria](https://img.shields.io/badge/Superteam-Nigeria-emerald)](https://superteam.fun)
[![MCP Protocol](https://img.shields.io/badge/Protocol-MCP%20v1.2-purple)](https://modelcontextprotocol.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An open-source **Model Context Protocol (MCP)** server enabling AI Agents (Claude, ChatGPT, Cursor, Autonomous Workers) to execute real-time crypto liquidity cashouts directly into Nigerian Bank Accounts (NGN).

GramPay serves as the payment execution bridge between LLM function calling and licensed African payment infrastructure via **IvoryPay**.

---

## 🌟 Grant Reviewer Summary

### Key Value Proposition
African creators and developers routinely earn in global digital assets (USDC, USDT, SOL), but face significant friction converting liquidity to spendable local currency (NGN). GramPay empowers AI Agents to perform compliant, automated bank payouts on behalf of users in a single conversational prompt.

### Current Implementation Status
* **Provider Integration:** Direct integration with **IvoryPay API** (supporting standard NGN fiat payouts).
* **Testnet Ready:** Confirmed end-to-end execution flow (Transaction Creation → Payment Simulation → Status Verification).
* **Security Guardrails:** Safety limits (`MAX_CASHOUT_USD`), parameter enforcement, and environment isolation.
* **Bank Directory Matching:** Built-in resolution catalog mapping friendly bank names (e.g., "Access Bank", "GTB") to official CBN bank codes, with anti-wallet filter protections.

---

## 🛠️ MCP Tools Reference

The server exposes 9 specialized tools to MCP clients:

| Tool | Purpose | Required Inputs |
| :--- | :--- | :--- |
| `cashout_to_ngn` | Core tool to execute payout in NGN from USD/NGN amounts | `accountNumber`, `reference`, `firstName`, `lastName`, `email` |
| `check_transfer_status` | Query live status of a pending/completed payout | `reference` |
| `grampay_lookup_bank` | Local directory search for Nigerian banks & codes | *Optional:* `query` |
| `list_supported_banks` | Fetch live supported settlement banks from IvoryPay | None |
| `grampay_get_balance` | Check current merchant treasury liquidity balance | None |
| `grampay_get_config` | Retrieve server runtime configuration and limits | None |
| `create_transaction` | Step 1/3: Low-level transaction creation | `amount`, `email`, `firstName`, `lastName`, `reference` |
| `simulate_payment` | Step 2/3: Test-mode payment simulation trigger | `reference` |
| `verify_transaction` | Step 3/3: Direct status lookup from IvoryPay endpoint | `reference` |

---

## ⚡ Quick Start

### 1. Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher

### 2. Installation & Build

```bash
git clone https://github.com/TopeGramms/grampay-mcp-server.git
cd grampay-mcp-server
npm install
npm run build
```

### 3. Environment Configuration

Copy the sample configuration file and add your credentials:

```bash
cp .env.example .env
```

Configure `.env`:

```env
IVORYPAY_SECRET_KEY=sk_test_your_key_here
IVORYPAY_PUBLIC_KEY=pk_test_your_key_here
IVORYPAY_ENV=test

GRAMPAY_MODE=live
GRAMPAY_MAX_CASHOUT_USD=1000
USD_TO_NGN_RATE=1650
```

### 4. Mounting to Claude Desktop / Cursor

Add GramPay to your MCP settings file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "grampay": {
      "command": "node",
      "args": ["c:/path/to/grampay-mcp-server/build/index.js"],
      "env": {
        "IVORYPAY_SECRET_KEY": "sk_test_your_key_here",
        "IVORYPAY_ENV": "test",
        "GRAMPAY_MODE": "live"
      }
    }
  }
}
```

---

## 🧪 Testing the Integration

Run the bundled MCP client test script to perform a full execution loop:

```bash
node scripts/call-ivorypay-tool.mjs
```

---

## 🔒 Security & Architecture

* **Strict Input Validation:** All API calls enforce UUID reference structures, positive numerical bounds, and required identity fields.
* **Environment Safeguards:** Payment simulation (`simulate_payment`) is strictly restricted to test environments (`IVORYPAY_ENV=test`).
* **Zero Secret Leakage:** API credentials are strictly read from environment variables; zero hardcoded fallback accounts exist in the codebase.

For full architectural breakdown and roadmap, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
