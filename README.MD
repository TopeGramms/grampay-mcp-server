Good. So you have a private repo with the working code.

Now document it. Create a `README.md` in the root of the repo:

```markdown
# GramPay MCP Server

A Model Context Protocol (MCP) server for AI-powered crypto-to-Naira cash-outs on Solana.

## Overview

GramPay is a personal AI payment agent that converts USDC to Nigerian Naira via Claude/Cursor/ChatGPT using MCP tools. Users ask their AI assistant to cash out, and the AI handles the swap + off-ramp automatically.

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

The server starts in stdio mode (ready for MCP clients like Claude Desktop or VS Code).

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
| `grampay_get_config` | Get current mode, limits, Opay account (masked) |
| `grampay_get_balance` | Check USDC balance in wallet |
| `grampay_get_quote` | Get live USDC → NGN conversion rate |
| `grampay_prepare_cashout` | Validate amount, return confirmation token |
| `grampay_execute_cashout` | Execute cash-out (requires prepare token) |
| `grampay_get_status` | Check transaction status |

## Example Usage

In Claude/Cursor chat:
```
"Cash out $50 USDC to my Opay account"
```

Claude will:
1. Call `grampay_get_quote` → Get rate
2. Call `grampay_prepare_cashout` → Validate & prepare
3. Call `grampay_execute_cashout` → Execute (with your confirmation)
4. Return receipt with NGN amount and Opay destination

## Architecture

```
Claude/Cursor Chat
    ↓
MCP Server (stdio)
    ↓
Mock handlers (Phase 0) / Real handlers (Phase 1+)
    ↓
Mock state (Phase 0) / Jupiter + Bitnob API (Phase 1+)
```

## Project Phases

- **Phase 0** (Current): Mock mode, flow validation ✅
- **Phase 1**: Bitnob sandbox + real Solana wallet
- **Phase 2**: Live testing ($5-10 amounts)
- **Phase 3**: Compliance + pre-seed prep
- **Phase 4**: Funding + scale

## Configuration

Environment variables (in `.env`):
```
GRAMPAY_MODE=mock          # mock or live
BITNOB_API_KEY=            # Phase 1+
SOLANA_PRIVATE_KEY=        # Phase 1+
JUPITER_API_KEY=           # Phase 1+
```

## Security Notes

- **Phase 0 (mock):** No real keys, no real money. Safe to experiment.
- **Phase 1+:** Private keys will be stored locally. Never commit `.env` to repo.
- **Limits:** Hardcoded max $100/tx in mock. Will add daily caps in Phase 1.

## Development

```bash
npm run build    # Compile TypeScript
npm run dev      # Build + run
```

## License

Private (personal project)

## Next Steps

- [ ] Push to GitHub (private repo)
- [ ] Document this README ✅
- [ ] Phase 1: Integrate Bitnob API (sandbox)
- [ ] Phase 1: Connect real Solana wallet
- [ ] Phase 1: Test with small amounts ($5)

---

Built with MCP, Solana, and Claude.
```

---
