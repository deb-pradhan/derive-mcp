# Derive MCP Server

An MCP (Model Context Protocol) server that provides market data from [Derive.xyz](https://derive.xyz) (formerly Lyra Finance). All endpoints are public — no authentication required.

## Tools

| Tool | Description |
|------|-------------|
| `get_all_currencies` | List all available currencies |
| `get_currency` | Details for a specific currency |
| `get_all_instruments` | List instruments (options, perps, ERC20) |
| `get_instrument` | Details for a specific instrument |
| `get_ticker` | Current price, volume, bid/ask for an instrument |
| `get_tickers` | Tickers for all instruments of a given type |
| `get_spot_feed_history` | Historical spot prices |
| `get_spot_feed_history_candles` | OHLC candlestick data |
| `get_funding_rate_history` | Perpetual funding rate history |
| `get_interest_rate_history` | Borrowing interest rate history |
| `get_option_settlement_history` | Option settlement history |
| `get_latest_signed_feeds` | Current oracle price feeds |
| `get_liquidation_history` | Liquidation events |
| `get_margin` | Margin requirement simulation |
| `get_statistics` | Platform volume and open interest stats |

## Setup

```bash
git clone https://github.com/aadarshvelu/derive-mcp.git
cd derive-mcp
npm install
```

## Usage

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "derive": {
      "command": "node",
      "args": ["/path/to/derive-mcp/mcp-server.mjs"]
    }
  }
}
```

Restart Claude Desktop. The 15 market data tools will be available.

### Claude Code

Add to your project's `.mcp.json`:

```json
{
  "mcpServers": {
    "derive": {
      "command": "node",
      "args": ["/path/to/derive-mcp/mcp-server.mjs"]
    }
  }
}
```

Or run directly:

```bash
claude mcp add derive node /path/to/derive-mcp/mcp-server.mjs
```

### MCP Inspector (debugging)

```bash
npx @modelcontextprotocol/inspector node mcp-server.mjs
```

## Tests

```bash
node test-mcp.mjs
```

Runs 16 tests against the live Derive API (15 tool calls + tool listing).

## API Reference

All tools call the [Derive public REST API](https://docs.derive.xyz/reference/overview) at `https://api.lyra.finance`. No API keys or authentication needed.
