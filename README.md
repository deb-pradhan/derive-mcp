# Derive MCP Server

An MCP server that gives AI assistants access to real-time market data from [Derive.xyz](https://derive.xyz) (formerly Lyra Finance).

## What is this?

This connects AI assistants like Claude to live crypto derivatives data — options, perpetuals, funding rates, liquidations, and more. Once set up, your AI can pull real-time prices, analyze market conditions, and check historical data without you doing anything manually.

All 15 endpoints are public. No API keys needed.

## How it works

```
AI Assistant (Claude, Cursor, etc.)
        ↓
   MCP Protocol
        ↓
   This Server (15 tools)
        ↓
 Derive Public API → Live market data
```

## Available Tools

| Tool | What it does |
|------|-------------|
| `get_all_currencies` | List all available currencies |
| `get_ticker` | Current price, volume, bid/ask for any instrument |
| `get_tickers` | Tickers for all instruments of a given type |
| `get_all_instruments` | List options, perps, and ERC20 tokens |
| `get_spot_feed_history` | Historical spot prices |
| `get_spot_feed_history_candles` | OHLC candlestick data |
| `get_funding_rate_history` | Perpetual funding rate history |
| `get_interest_rate_history` | Borrowing interest rate history |
| `get_option_settlement_history` | Option settlement history |
| `get_latest_signed_feeds` | Current oracle price feeds |
| `get_liquidation_history` | Liquidation events |
| `get_margin` | Margin requirement simulation |
| `get_statistics` | Platform volume and open interest stats |
| `get_currency` | Details for a specific currency |
| `get_instrument` | Details for a specific instrument |

## Setup

```bash
git clone https://github.com/deb-pradhan/derive-mcp.git
cd derive-mcp
npm install
```

### Use with Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "derive": {
      "command": "node",
      "args": ["/path/to/derive-mcp/server.mjs"]
    }
  }
}
```

Restart Claude Desktop. All 15 market data tools will be available.

### Run Tests

```bash
node test-mcp.mjs
```

## API Reference

All tools call the [Derive public REST API](https://docs.derive.xyz/reference/overview). No API keys or authentication needed.

## License

MIT
