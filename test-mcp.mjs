#!/usr/bin/env node
/**
 * Test suite for Derive Market Data MCP Server
 * Tests all 15 public tools against the live Derive API.
 *
 * Usage:
 *   node test-mcp.mjs
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

let client;
let passed = 0;
let failed = 0;
const results = [];

async function setup() {
  const transport = new StdioClientTransport({
    command: "node",
    args: ["mcp-server.mjs"],
    env: process.env,
  });
  client = new Client({ name: "test-client", version: "1.0.0" });
  await client.connect(transport);
}

async function callTool(name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content[0]?.text;
  if (result.isError) throw new Error(text);
  return JSON.parse(text);
}

async function test(name, fn) {
  try {
    await fn();
    passed++;
    results.push({ name, status: "PASS" });
    console.log(`  PASS  ${name}`);
  } catch (e) {
    failed++;
    results.push({ name, status: "FAIL", error: e.message });
    console.log(`  FAIL  ${name} — ${e.message}`);
  }
}

// Helper: timestamps for last 24h in seconds
const now = Math.floor(Date.now() / 1000);
const oneDayAgo = now - 86400;

async function runTests() {
  console.log("\nDerive Market Data MCP — Test Suite\n");

  // 1. List tools
  await test("tools/list returns 15 tools", async () => {
    const { tools } = await client.listTools();
    if (tools.length !== 15) throw new Error(`Expected 15 tools, got ${tools.length}`);
  });

  // 2. get_all_currencies
  await test("get_all_currencies returns currencies", async () => {
    const result = await callTool("get_all_currencies");
    if (!result || (!Array.isArray(result) && !result.currencies)) throw new Error("No currencies returned");
  });

  // 3. get_currency
  await test("get_currency returns ETH details", async () => {
    const result = await callTool("get_currency", { currency: "ETH" });
    if (!result) throw new Error("Empty result");
  });

  // 4. get_all_instruments
  await test("get_all_instruments returns perp instruments", async () => {
    const result = await callTool("get_all_instruments", {
      expired: false,
      instrument_type: "perp",
    });
    if (!result) throw new Error("Empty result");
  });

  // 5. get_instrument
  await test("get_instrument returns ETH-PERP details", async () => {
    const result = await callTool("get_instrument", { instrument_name: "ETH-PERP" });
    if (!result) throw new Error("Empty result");
  });

  // 6. get_ticker
  await test("get_ticker returns ETH-PERP ticker", async () => {
    const result = await callTool("get_ticker", { instrument_name: "ETH-PERP" });
    if (!result) throw new Error("Empty result");
  });

  // 7. get_tickers
  await test("get_tickers returns perp tickers", async () => {
    const result = await callTool("get_tickers", { instrument_type: "perp" });
    if (!result) throw new Error("Empty result");
  });

  // 8. get_spot_feed_history
  await test("get_spot_feed_history returns ETH spot data", async () => {
    const result = await callTool("get_spot_feed_history", {
      currency: "ETH",
      start_timestamp: oneDayAgo,
      end_timestamp: now,
      period: 3600,
    });
    if (!result) throw new Error("Empty result");
  });

  // 9. get_spot_feed_history_candles
  await test("get_spot_feed_history_candles returns ETH candles", async () => {
    const result = await callTool("get_spot_feed_history_candles", {
      currency: "ETH",
      start_timestamp: oneDayAgo,
      end_timestamp: now,
      period: 3600,
    });
    if (!result) throw new Error("Empty result");
  });

  // 10. get_funding_rate_history
  await test("get_funding_rate_history returns ETH-PERP rates", async () => {
    const result = await callTool("get_funding_rate_history", {
      instrument_name: "ETH-PERP",
    });
    if (!result) throw new Error("Empty result");
  });

  // 11. get_interest_rate_history
  await test("get_interest_rate_history returns data", async () => {
    const result = await callTool("get_interest_rate_history", {
      from_timestamp_sec: oneDayAgo,
      to_timestamp_sec: now,
    });
    if (!result) throw new Error("Empty result");
  });

  // 12. get_option_settlement_history
  await test("get_option_settlement_history returns data", async () => {
    const result = await callTool("get_option_settlement_history", { page_size: 5 });
    if (!result) throw new Error("Empty result");
  });

  // 13. get_latest_signed_feeds
  await test("get_latest_signed_feeds returns oracle feeds", async () => {
    const result = await callTool("get_latest_signed_feeds", { currency: "ETH" });
    if (!result) throw new Error("Empty result");
  });

  // 14. get_liquidation_history
  await test("get_liquidation_history returns data", async () => {
    const result = await callTool("get_liquidation_history", { page_size: 5 });
    if (!result) throw new Error("Empty result");
  });

  // 15. get_margin
  await test("get_margin simulates margin requirements", async () => {
    const result = await callTool("get_margin", {
      margin_type: "SM",
      simulated_collaterals: [{ amount: "10000", asset_name: "USDC" }],
      simulated_positions: [{ amount: "1", instrument_name: "ETH-PERP" }],
    });
    if (!result) throw new Error("Empty result");
  });

  // 16. get_statistics
  await test("get_statistics returns platform stats", async () => {
    const result = await callTool("get_statistics", { instrument_name: "ALL" });
    if (!result) throw new Error("Empty result");
  });
}

try {
  await setup();
  await runTests();
} catch (e) {
  console.error(`\nSetup failed: ${e.message}`);
  process.exit(1);
} finally {
  console.log(`\n${"─".repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed > 0) {
    console.log("\nFailed tests:");
    results.filter((r) => r.status === "FAIL").forEach((r) => console.log(`  - ${r.name}: ${r.error}`));
  }
  console.log();
  await client?.close();
  process.exit(failed > 0 ? 1 : 0);
}
