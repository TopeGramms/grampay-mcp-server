# GramPay MCP Server

A Model Context Protocol (MCP) server for bank payouts from USDC to Nigerian Naira.

## Overview

GramPay is a personal AI payment agent that converts USDC to Nigerian Naira via Claude, Cursor, or ChatGPT using MCP tools. Users ask their AI assistant to cash out, and the assistant handles bank lookup, validation, and payout preparation.

**Current Phase:** Phase 0 (Mock mode)

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone <your-repo-url>
cd grampay-mcp-server
npm install
npm run build
```

### Running the Server

```bash
npm run dev
```

The server starts in stdio mode, ready for MCP clients like Claude Desktop or VS Code.

### VS Code Setup

Add to `.vscode/settings.json`:

```json
{
  "chat.mcp.serverSampling": {
    "grampay": {
      "command": "node",
      "args": ["<full-path-to>/build/index.js"],
      "env": {
        "GRAMPAY_MODE": "mock"
      }
    }
  }
}
```

Restart VS Code, then ask Claude in chat:

> "Call grampay_get_config"

## MCP Tools

| Tool | Purpose |
|------|---------|
| `grampay_get_config` | Get current mode, limits, and default bank details |
| `grampay_get_balance` | Check USDC balance in wallet |
| `grampay_lookup_bank` | Search supported real banks and get their codes |
| `grampay_get_quote` | Get live USDC -> NGN conversion rate |
| `grampay_prepare_cashout` | Validate amount, return confirmation token |
| `grampay_execute_cashout` | Execute cash-out (requires prepare token) |
| `grampay_get_status` | Check transaction status |
| `cashout_to_ngn` | Prepare a bank payout to a real Nigerian bank account |
| `check_transfer_status` | Check the status of a crypto-to-NGN transfer |

## Example Usage

In Claude/Cursor chat:

```text
Cash out 20000 NGN to Access Bank account 0785351096
```

Claude will:

1. Call `grampay_lookup_bank` to resolve Access Bank
2. Call `cashout_to_ngn` to validate and prepare the payout
3. Return a receipt with the NGN amount and destination bank account

## Configuration

Environment variables (in `.env`):

```bash
GRAMPAY_MODE=mock
GRAMPAY_DEFAULT_BANK_NAME=Access Bank
GRAMPAY_DEFAULT_BANK_ACCOUNT=0785351096
GRAMPAY_MAX_CASHOUT_USD=1000
USD_TO_NGN_RATE=1650
IVORYPAY_SECRET_KEY=
IVORYPAY_ENV=test
```

## Security Notes

- **Phase 0 (mock):** No real keys, no real money. Safe to experiment.
- **Phase 1+:** Private keys will be stored locally. Never commit `.env` to repo.
- **Limits:** Hardcoded max $100/tx in mock. Will add daily caps in Phase 1.

## Development

```bash
npm run build
npm run dev
```

## Next Steps

- [ ] Push to GitHub (private repo)
- [ ] Phase 1: Integrate IvoryPay API in live mode
- [ ] Phase 1: Connect real Solana wallet
- [ ] Phase 1: Test with small amounts

