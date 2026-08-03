# GramPay MCP Server

[![Superteam Nigeria](https://img.shields.io/badge/Superteam-Nigeria-emerald)](https://superteam.fun)
[![MCP Protocol](https://img.shields.io/badge/Protocol-MCP%20v1.2-purple)](https://modelcontextprotocol.io)
[![Transport](https://img.shields.io/badge/Transport-Streamable%20HTTP%20%7C%20stdio-blue)](#-deployment--transports)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

An open-source **Model Context Protocol (MCP)** server enabling AI Agents (Claude, ChatGPT, Cursor, Autonomous Workers) to execute real-time crypto liquidity cashouts directly into Nigerian Bank Accounts (NGN) via **IvoryPay**.

GramPay serves as the payment execution bridge between LLM function calling and licensed African payment infrastructure.

---

## 🌐 Live Landing Page & Architecture

GramPay includes a built-in interactive landing page served at the root URL (`/`), explaining how to use GramPay directly inside conversational AI interfaces.

- **Landing Page**: `https://<your-deployed-domain>.com/`
- **MCP HTTP Endpoint**: `https://<your-deployed-domain>.com/mcp`
- **Health Check**: `https://<your-deployed-domain>.com/health`

---

## ⚡ Quick Start: Adding as a Claude Connector (Settings → Connectors)

You can add GramPay directly to **Claude** (Web & Desktop) via **Settings → Connectors**.

### 1. Cloud Deployment (Render / Railway)
Deploy the server as a **Web Service** on Render or Railway:
* **Build Command**: `npm install && npm run build`
* **Start Command**: `node build/httpServer.js`

### 2. Environment Variables Configuration
Set the following environment variables in your deployment dashboard:

```env
PORT=3000
MCP_AUTH_TOKEN=d5775a3eebb61cc45108d8e55f5adc481dc2927384b9d1012b7d9aa48ea9a249
JWT_SECRET=78b8be3a554ac5c884fb27891965dd49d78b50dd7b1319e16a1dcbd850d73af5

IVORYPAY_SECRET_KEY=sk_test_your_key_here
IVORYPAY_PUBLIC_KEY=pk_test_your_key_here
IVORYPAY_ENV=test

GRAMPAY_MODE=live
GRAMPAY_MAX_CASHOUT_USD=1000
USD_TO_NGN_RATE=1650
```

### 3. Registering Connector inside Claude
1. Go to **Claude** → **Settings** → **Connectors** (or **Customize → Connectors**).
2. Click **Add custom connector**.
3. Fill in the fields:
   - **Name**: `GramPay`
   - **Remote Server URL**: `https://your-app-name.onrender.com/mcp?token=YOUR_MCP_AUTH_TOKEN`
   - **Advanced Settings (OAuth)**: *Leave blank / empty*
4. Click **Save / Connect**. Claude will automatically discover all tools!

---

## 💻 Local Desktop Setup (stdio Transport for Claude Desktop / Cursor)

To run GramPay locally via `stdio` child process with Claude Desktop or Cursor:

### 1. Build project
```bash
git clone https://github.com/TopeGramms/grampay-mcp-server.git
cd grampay-mcp-server
npm install
npm run build
```

### 2. Configure `claude_desktop_config.json`
Add GramPay to your local configuration:

```json
{
  "mcpServers": {
    "grampay": {
      "command": "node",
      "args": ["/path/to/grampay-mcp-server/build/index.js"],
      "env": {
        "IVORYPAY_SECRET_KEY": "sk_test_your_key_here",
        "IVORYPAY_ENV": "test",
        "GRAMPAY_MODE": "live",
        "JWT_SECRET": "your_jwt_secret_here"
      }
    }
  }
}
```

---

## 🛠️ Exposed MCP Tools Reference

GramPay exposes 13 specialized tools to MCP clients:

| Tool Name | Purpose | Key Inputs |
| :--- | :--- | :--- |
| `cashout_to_ngn` | Execute direct NGN bank payout from USD/NGN amounts | `accountNumber`, `bankName`, `firstName`, `lastName`, `email` |
| `check_transfer_status` | Query live status of a pending/completed payout | `reference` |
| `grampay_prepare_cashout` | Step 1/2: Validate limits and generate stateless signed JWT token | `amount_usd` |
| `grampay_execute_cashout` | Step 2/2: Execute cashout using prepare JWT token | `prepare_token` |
| `grampay_get_quote` | Get live USDC -> NGN conversion rates | `amount_usd` |
| `grampay_lookup_bank` | Local directory search for Nigerian banks & codes | `query` |
| `list_supported_banks` | Fetch live supported settlement banks from IvoryPay | None |
| `grampay_get_balance` | Check current merchant liquidity balance | None |
| `grampay_get_config` | Retrieve server runtime configuration and limits | None |
| `grampay_get_status` | Check status of transaction by ID | `tx_id` |
| `create_transaction` | Low-level transaction creation on IvoryPay API | `amount`, `email`, `firstName`, `lastName`, `reference` |
| `simulate_payment` | Trigger payment simulation (Test Mode only) | `reference` |
| `verify_transaction` | Query direct status verification from IvoryPay | `reference` |

---

## 🔒 Security & Architecture Features

* **Dual Transport Architecture**: Supports both `Streamable HTTP` for remote cloud connectors and `stdio` for local process spawning.
* **Stateless JWT Prepare Tokens**: `grampay_prepare_cashout` issues a cryptographically signed JWT token with a 5-minute expiry. Prepared transactions survive server restarts and scale horizontally without needing Redis.
* **Flexible Authentication**: Authentication accepts `Authorization: Bearer <token>` headers or `?token=<token>` URL query parameters to support Claude's connector UI natively.
* **Strict Parameter Safeguards**: Max cashout bounds enforcement (`GRAMPAY_MAX_CASHOUT_USD`), parameter validation, and anti-wallet provider filtering for real bank payouts.

---

## 📄 License

MIT © [Superteam Nigeria](https://superteam.fun)
