# GramPay MCP Server

A robust Model Context Protocol (MCP) server for converting fiat payouts (crypto/USDC liquidity to Nigerian Naira) using IvoryPay APIs. 

## Overview

GramPay acts as a specialized AI payment agent via Claude, Cursor, or ChatGPT using built-in MCP tools. It allows conversational AI models to handle bank lookups, prepare payout limits, execute transactions via IvoryPay, and check live bank transfer statuses.

The project is currently successfully integrated with **IvoryPay API** and handles the rigorous valid-UUID and standard strict verification constraints cleanly.

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

### Configuration

Create a `.env` file in the root directory:

```bash
GRAMPAY_MODE=mock                        # System mode (mock vs live)
GRAMPAY_DEFAULT_BANK_NAME=Access Bank    # Fallback bank Name
GRAMPAY_DEFAULT_BANK_ACCOUNT=0785351096  # Fallback Bank Account
GRAMPAY_MAX_CASHOUT_USD=1000             # Safety thresholds
USD_TO_NGN_RATE=1650                     # Central exchange rate

# IvoryPay Settings
IVORYPAY_SECRET_KEY=YOUR_IVORYPAY_API_KEY
IVORYPAY_ENV=test
```

### Running the Server

```bash
npm run dev
```

The server starts in stdio mode, ready to be mounted locally on an MCP client like Claude Desktop, Cursor, or Cline.

## MCP Tools

| Tool | Description |
|------|-------------|
| `grampay_get_config` | Get current mode, limits, and default bank details |
| `grampay_get_balance` | Check IvoryPay Merchant balance |
| `grampay_lookup_bank` | Search supported real banks from the IvoryPay catalog |
| `list_supported_banks`| List all valid IvoryPay support Bank IDs |
| `cashout_to_ngn` | Initiate a bank payout in NGN to a real bank account using `amount` or `amount_usd` |
| `create_transaction` | Step 1/3 explicit checkout creation (Strict IvoryPay /transactions integration) |
| `simulate_payment` | Step 2/3 Simulate completion of a created transaction in `test` environment |
| `verify_transaction` | Step 3/3 Verify the transaction status precisely by fetching standard JSON |
| `check_transfer_status` | Fast wrapper to check the status of a crypto-to-NGN reference ID |

## Example Usage

In Claude/Cursor chat:

```text
Please create an IvoryPay checkout for a hardekhalu@gmail.com for 5000 NGN.
```

The AI will intelligently choose `create_transaction`, properly generate a UUID reference, formulate the Strict Mode payload requirement, and process your request!

## Security Notes

1. **Credentials Management:** The `IVORYPAY_SECRET_KEY` holds absolute authority over funds. It should **never** be committed to version control (`.env` is in `.gitignore`).
2. **API Type Validations**: The index router drops incorrect types *before* hitting APIs to prevent injection attacks and cascading script failures.

## Next Target

- Integrate into an independent conversational WhatsApp bot Gateway.
- Implement production caching to optimize IvoryPay API rate limits on larger workloads.
