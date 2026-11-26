#!/usr/bin/env node
// Generates the 30-day 1-minute candle database used by the IMMIP app:
//   data/candles/<SYMBOL>_1m_30d.json  (6 symbols x 20 trading days x 375 bars = 7,500 bars each)
// Output format and dates match the original files. Prices are a deterministic random walk that
// stays inside each stock's original 30-day close range and ends exactly on the reference close,
// so the app's "previous close" and "LTP" line up. Real data can replace these files later via
// POST /api/candles/collect-30d with an Upstox token.
//
// Usage: node generate-candles.mjs <app-dir>
import fs from 'node:fs';
import path from 'node:path';

const appDir = process.argv[2] || '.';
const outDir = path.resolve(appDir, 'data', 'candles');
fs.mkdirSync(outDir, { recursive: true });

// symbol, Upstox instrument key, last close (= reference price), original min/max close, avg 1m volume
const STOCKS = [
  ['RELIANCE', 'NSE_EQ|INE002A01018', 1202.0, 1152.8, 1252.4, 60000],
  ['TCS', 'NSE_EQ|INE467B01029', 2460.9, 2032.4, 2494.6, 18000],
  ['HDFCBANK', 'NSE_EQ|INE040A01034', 712.0, 690.85, 749.2, 90000],
  ['INFY', 'NSE_EQ|INE009A01021', 1130.7, 980.8, 1165.45, 45000],
  ['ICICIBANK', 'NSE_EQ|INE090A01021', 1381.0, 1291.4, 1408.9, 50000],
  ['SBIN', 'NSE_EQ|INE062A01020', 973.7, 937.7, 998.4, 70000],
];

// NSE trading days between 2026-09-19 and 2026-10-19 (weekends and 2026-10-02 Gandhi Jayanti excluded)
const HOLIDAYS = new Set(['2026-10-02']);
const DAYS = [];
for (let t = Date.UTC(2026, 8, 19); t <= Date.UTC(2026, 9, 19); t += 86400000) {
  const d = new Date(t);
  const iso = d.toISOString().slice(0, 10);
  if (d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !HOLIDAYS.has(iso)) DAYS.push(iso);
}

const TICK = 0.05;
const round = (p) => Number((Math.round(p / TICK) * TICK).toFixed(2));

// Small deterministic PRNG (mulberry32) so every run produces the same files
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

for (const [symbol, key, lastClose, minC, maxC, avgVol] of STOCKS) {
  const rand = rng([...symbol].reduce((a, c) => a + c.charCodeAt(0), 0) * 7919);
  const bars = DAYS.length * 375;
  const mid = (minC + maxC) / 2;
  const half = (maxC - minC) / 2;

  // Build a close path backwards from lastClose: mean-reverting walk bounded to [minC, maxC]
  const closes = new Array(bars);
  closes[bars - 1] = lastClose;
  const sigma = lastClose * 0.0006;
  let p = lastClose;
  for (let i = bars - 2; i >= 0; i--) {
    const wave = Math.sin(i / 900) * half * 0.0009;
    const pull = (mid - p) * 0.0008;
    p = p + (rand() - 0.5) * 2 * sigma + wave + pull;
    if (p > maxC) p = maxC - rand() * sigma;
    if (p < minC) p = minC + rand() * sigma;
    closes[i] = p;
  }

  const candles = [];
  let i = 0;
  for (const day of DAYS) {
    const [y, m, d] = day.split('-').map(Number);
    const openEpoch = Date.UTC(y, m - 1, d, 3, 45) / 1000; // 09:15 IST = 03:45 UTC
    for (let k = 0; k < 375; k++, i++) {
      const close = round(closes[i]);
      const open = round(k === 0 ? closes[i] + (rand() - 0.5) * sigma * 4 : closes[i - 1]);
      const wick = sigma * (0.3 + rand());
      const high = round(Math.max(open, close) + wick * rand());
      const low = round(Math.min(open, close) - wick * rand());
      // U-shaped intraday volume: heavier at open and close
      const u = 1 + 1.8 * Math.pow((k - 187) / 187, 2);
      const volume = Math.floor(avgVol * u * (0.4 + rand() * 1.2));
      candles.push({ time: openEpoch + k * 60, open, high, low, close, volume });
    }
  }

  const payload = {
    symbol,
    instrument_key: key,
    interval: '1minute',
    from_date: '2026-09-19',
    to_date: '2026-10-19',
    total_bars: candles.length,
    last_updated: new Date().toISOString(),
    candles,
  };
  const file = path.join(outDir, `${symbol}_1m_30d.json`);
  fs.writeFileSync(file, JSON.stringify(payload));
  console.log(`${symbol}: ${candles.length} bars, last close ${candles.at(-1).close} -> ${file}`);
}
