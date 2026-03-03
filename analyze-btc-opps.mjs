import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import fs from "fs";

const transport = new StdioClientTransport({
  command: "node",
  args: ["server.mjs"],
  env: process.env,
});

const client = new Client({ name: "btc-quant", version: "1.0.0" });

async function call(name, args = {}) {
  const r = await client.callTool({ name, arguments: args });
  if (r.isError) throw new Error(r.content?.[0]?.text || "MCP error");
  return JSON.parse(r.content?.[0]?.text || "null");
}

function parseYesProb(market) {
  try {
    const outcomes = JSON.parse(market.outcomes || "[]");
    const prices = JSON.parse(market.outcomePrices || "[]").map(Number);
    const idx = outcomes.findIndex((o) => String(o).toLowerCase() === "yes");
    if (idx < 0 || !Number.isFinite(prices[idx])) return null;
    return prices[idx];
  } catch {
    return null;
  }
}

function parseThreshold(question) {
  const text = String(question || "").replace(/,/g, "");
  const patterns = [
    /(?:bitcoin|\bbtc\b).*?(?:above|over|at least|greater than)\s*\$?(\d+(?:\.\d+)?)/i,
    /(?:bitcoin|\bbtc\b).*?(?:below|under|less than)\s*\$?(\d+(?:\.\d+)?)/i,
    /\$?(\d+(?:\.\d+)?)\s*(?:or more|or higher).*?(?:bitcoin|\bbtc\b)/i,
    /\$?(\d+(?:\.\d+)?)\s*(?:or less|or lower).*?(?:bitcoin|\bbtc\b)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return Number(m[1]);
  }
  return null;
}

function parseDirection(question) {
  const s = String(question || "").toLowerCase();
  if (/(above|over|at least|greater than|or more|or higher)/.test(s)) return "above";
  if (/(below|under|less than|or less|or lower)/.test(s)) return "below";
  return null;
}

function toYmd(dateString) {
  const dt = new Date(dateString);
  if (Number.isNaN(dt.getTime())) return null;
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function nearestExpiry(targetYmd, expiries) {
  if (!targetYmd) return null;
  const future = expiries.filter((e) => e >= targetYmd).sort();
  if (future.length) return future[0];
  return expiries.slice().sort().at(-1) || null;
}

function getStrikeFromName(name) {
  const p = String(name).split("-");
  return Number(p[2]);
}

function summarizeTop(top, n = 10) {
  return top.slice(0, n).map((x) => ({
    question: x.question,
    edgeProb: x.edgeProb,
    yesProb: x.yesProb,
    deriveProbITM: x.deriveProbITM,
    instrument: x.deriveInstrument,
    deriveMark: x.deriveMark,
    deriveBid: x.deriveBid,
    deriveAsk: x.deriveAsk,
    deriveIv: x.deriveIv,
    polyLiquidity: x.polyLiquidity,
    polyVolume24h: x.volume24hr,
  }));
}

async function main() {
  await client.connect(transport);
  const nowSec = Math.floor(Date.now() / 1000);
  const start30 = nowSec - 30 * 86400;

  const [instrumentsData, feedData, candlesData] = await Promise.all([
    call("get_all_instruments", {
      expired: false,
      instrument_type: "option",
      currency: "BTC",
      page: 1,
      page_size: 1000,
    }),
    call("get_latest_signed_feeds", { currency: "BTC" }),
    call("get_spot_feed_history_candles", {
      currency: "BTC",
      start_timestamp: start30,
      end_timestamp: nowSec,
      period: 86400,
    }),
  ]);

  const instruments = instrumentsData.instruments || instrumentsData || [];
  const expiries = [
    ...new Set(
      instruments
        .map((i) => String(i.instrument_name || "").match(/^BTC-(\d{8})-/)?.[1])
        .filter(Boolean)
    ),
  ].sort();

  const tickerByName = {};
  for (const expiry of expiries) {
    const tk = await call("get_tickers", {
      instrument_type: "option",
      currency: "BTC",
      expiry_date: expiry,
    });
    const all = tk.tickers || {};
    for (const [name, val] of Object.entries(all)) tickerByName[name] = val;
  }

  const btcSpot = Number(
    feedData?.spot_data?.BTC?.spot_price ??
      feedData?.spot_data?.BTC?.price ??
      feedData?.spot_data?.BTC?.f ??
      0
  );

  const candles = candlesData.spot_feed_history || candlesData || [];
  let rv30 = null;
  if (candles.length > 2) {
    const closes = candles.map((x) => Number(x.price)).filter(Number.isFinite);
    const returns = [];
    for (let i = 1; i < closes.length; i++) {
      if (closes[i - 1] > 0 && closes[i] > 0) {
        returns.push(Math.log(closes[i] / closes[i - 1]));
      }
    }
    if (returns.length > 1) {
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance =
        returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
      rv30 = Math.sqrt(variance * 365);
    }
  }

  const polyRaw = await fetch(
    "https://gamma-api.polymarket.com/markets?active=true&closed=false&limit=2000&offset=0"
  ).then((r) => r.json());

  const btcMarkets = (Array.isArray(polyRaw) ? polyRaw : []).filter((m) =>
    /(bitcoin|\bbtc\b)/i.test(`${m.question || ""} ${m.description || ""}`)
  );

  const matched = [];

  for (const m of btcMarkets) {
    const yesProb = parseYesProb(m);
    const direction = parseDirection(m.question);
    const threshold = parseThreshold(m.question);
    const endYmd = toYmd(m.endDate);
    if (!Number.isFinite(yesProb) || !direction || !Number.isFinite(threshold) || !endYmd) {
      continue;
    }

    const deriveExpiry = nearestExpiry(endYmd, expiries);
    if (!deriveExpiry) continue;

    const optionType = direction === "above" ? "C" : "P";
    const sameExpiry = Object.keys(tickerByName).filter(
      (name) => name.startsWith(`BTC-${deriveExpiry}-`) && name.endsWith(`-${optionType}`)
    );
    if (!sameExpiry.length) continue;

    let bestName = null;
    let bestDiff = Infinity;
    for (const name of sameExpiry) {
      const strike = getStrikeFromName(name);
      const diff = Math.abs(strike - threshold);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestName = name;
      }
    }
    if (!bestName) continue;

    const ticker = tickerByName[bestName] || {};
    const pr = ticker.option_pricing || {};
    const delta = Number(pr.d);
    const derivedProb = optionType === "C" ? delta : -delta;
    if (!Number.isFinite(derivedProb)) continue;

    matched.push({
      polymarketId: m.id,
      slug: m.slug,
      question: m.question,
      endDate: m.endDate,
      yesProb,
      direction,
      threshold,
      deriveExpiry,
      deriveInstrument: bestName,
      deriveType: optionType,
      deriveStrike: getStrikeFromName(bestName),
      deriveDelta: delta,
      deriveProbITM: derivedProb,
      edgeProb: yesProb - derivedProb,
      deriveIv: Number(pr.i),
      deriveMark: Number(pr.m),
      deriveBid: Number(ticker.B),
      deriveAsk: Number(ticker.A),
      polyLiquidity: Number(m.liquidityNum ?? m.liquidity ?? 0),
      volume24hr: Number(m.volume24hr ?? 0),
    });
  }

  const ranked = matched
    .filter((x) => Number.isFinite(x.edgeProb))
    .sort((a, b) => Math.abs(b.edgeProb) - Math.abs(a.edgeProb));

  const output = {
    timestamp: new Date().toISOString(),
    spot: {
      btcSpot,
      realizedVol30d: rv30,
    },
    derive: {
      btcOptionInstruments: instruments.length,
      expiries: expiries.length,
      tickerCount: Object.keys(tickerByName).length,
    },
    polymarket: {
      btcMarketsFound: btcMarkets.length,
      matchedPriceThresholdMarkets: matched.length,
    },
    topOpportunities: summarizeTop(ranked, 30),
    allMatches: ranked,
  };

  fs.writeFileSync("quant-opportunities.json", JSON.stringify(output, null, 2));
  console.log("Wrote quant-opportunities.json");
  console.log(
    JSON.stringify(
      {
        spot: output.spot,
        derive: output.derive,
        polymarket: output.polymarket,
        topCount: output.topOpportunities.length,
      },
      null,
      2
    )
  );
}

main()
  .catch((e) => {
    console.error("ERROR", e);
    process.exit(1);
  })
  .finally(async () => {
    await client.close();
  });
