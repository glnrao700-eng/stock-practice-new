# IMMIP: Full Architecture and Behaviour Reference

Source: https://github.com/glnrao700-eng/stock-practice-new (commit `d43b83a`).
The exact source of every file is embedded in `../guide/*.md`. This document explains how the
app works, so it can be rebuilt, extended or debugged without reading all ~700 KB of code.

## 1. Stack

| Layer | Choice |
|---|---|
| Runtime | Node + `tsx` (runs `server.ts` directly, no compile step) |
| Server | Express 4, `dotenv`. In dev it mounts Vite as middleware (`middlewareMode: true`, `appType: 'spa'`); in production (`NODE_ENV=production`) it serves `dist/` |
| Front end | React 19, Vite 8, `@vitejs/plugin-react`, Tailwind CSS v4 via `@tailwindcss/vite` (`@import "tailwindcss";` in `src/index.css`) |
| Charts | `lightweight-charts` v5 (`createChart`, `chart.addSeries(CandlestickSeries/HistogramSeries)`) |
| Icons | `lucide-react` |
| Other deps | `motion`, `@google/genai` (declared but not used anywhere in code) |
| TS | `tsconfig.json`: ES2022, `moduleResolution: bundler`, `jsx: react-jsx`, `noEmit`, alias `@/* -> ./*` |
| Port | `PORT` env, default 3000, binds `0.0.0.0` |

Scripts: `dev`/`start` = `tsx server.ts`, `build` = `vite build`, `lint` = `tsc --noEmit`.
Env (`.env.example`): `PORT`, `UPSTOX_ACCESS_TOKEN`, `GEMINI_API_KEY`.

## 2. File map

```
server.ts                      Express API + Vite middleware
index.html                     Title/meta "Indian Market Multi-Agent Intelligence Platform (IMMIP)"
metadata.json                  AI Studio metadata
data/candles/<SYM>_1m_30d.json 30-day 1-minute candle DB (6 symbols, 7,500 bars each = 20 days x 375)
                               The skill generates these with scripts/generate-candles.mjs
public/assets/aistudio/*.png   Screenshots in the original repo. No code references them; the skill omits them
src/main.tsx                   createRoot(...).render(<App/>)
src/index.css                  Tailwind import + .no-scrollbar utility
src/App.tsx                    All global state, agent pipeline, simulation loop, layout
src/types/platform.ts          All shared TypeScript interfaces
src/services/
  marketData.ts                Instruments, reference prices, synthetic candle generator, mock news/fundamentals
  nseCalendar.ts               NSE holidays 2025-26, trading-day logic, IST session phase
  targetValidator.ts           roundToTick + deterministic ₹3 / R:R validator
  upstoxClient.ts              Browser client for /api/upstox/* with token in local/sessionStorage
  localCandleDb.ts             IndexedDB cache of 30-day candles + CSV/JSON export
  learningStore.ts             Failure diagnosis, learned rules (localStorage), seed paper orders
  fileRepository.ts            Static "virtual repo" files shown in RepoExplorerModal (Python/FastAPI/Docker samples)
  agents/
    technicalAgent.ts          Indicators + technical score
    patternAgent.ts            Breakout/breakdown patterns + 30-day Fibonacci framework
    sentimentAgent.ts          Filing vs social sentiment blend
    fundamentalAgent.ts        Banking vs corporate scoring
    orchestratorAgent.ts       Weighted composite, hysteresis, levels, 95% probability gate
    paperTradingAgent.ts       Position sizing, Indian costs, candle-by-candle fill/exit engine
    postMortemAgent.ts         Post-trade classification + gated weight proposal
    eodForecaster.ts           Next-session opening gap forecast
    walkForwardBacktester.ts   Zero-lookahead walk-forward backtest
    systemMonitorAgent.ts      In-memory telemetry (200 events, redacts key/token/secret/password)
src/components/
  HeaderBanner.tsx             Top bar: title, IST clock, phase, step/auto-play/reset, speed, kill switch, Upstox, guide, repo
  Level1MarketOverview.tsx     Watchlist + portfolio metrics + signals
  Level2StockDetail.tsx        Candlestick chart, OHLCV hover, ranges, quick trade, validator panel
  Level3AgentInspection.tsx    Pipeline step audit ("LangGraph Multi-Agent Execution Audit")
  Level4PaperTrading.tsx       Date-based ledger, gap matrix, order audit, learning store
  Level5ForecastsAndBacktest.tsx  Opening forecasts table + walk-forward backtest
  Level6ConfigAndMonitor.tsx   Upstox token, candle DB, universe & price calibration, add stock, risk config, telemetry
  DetailedMetricsAuditModal.tsx   Metric drill-down tabs: EQUITY, PNL, STATUTORY, CLOSED_TRADES, WIN_RATE, PROFIT_FACTOR
  FailureLessonModal.tsx       Root cause + learned rule for a failed order
  MarketFeedModal.tsx          Explains data/pricing architecture
  UpstoxBrokerModal.tsx        Token entry/verify, feed toggle, live quotes
  UserGuideModal.tsx           "How to Run & Use the Platform"
  RepoExplorerModal.tsx        "Repository File Tree & Code Explorer" over fileRepository.ts
```

## 3. Server API (`server.ts`)

Token resolution order: `Authorization: Bearer <t>` header, then `?token=`, then `UPSTOX_ACCESS_TOKEN`.

| Route | Behaviour |
|---|---|
| `GET /api/upstox/status` | No token: `{connected:false, hasServerToken}`. Else pings `v2/market-quote/ltp` for RELIANCE, returns latency. 429 is treated as connected + `rate_limited`. Cached 15 s |
| `GET /api/upstox/quotes?instrument_keys=a,b` | Proxies `v2/market-quote/quotes`. Cached 3 s. On 429 returns cache or hardcoded fallback LTPs |
| `GET /api/upstox/candles?instrument_key&interval` | Proxies `v2/historical-candle/intraday/{key}/{interval}`; if empty, falls back to historical 2026-09-19..2026-10-19. Normalises to `{time(sec),open,high,low,close,volume}` sorted ascending |
| `GET /api/candles/db-status` | Lists `data/candles/*_1m_30d.json` with bars, dates, size KB |
| `GET /api/candles/30d?symbol=` | Returns local file (`source: LOCAL_DISK_DB`); otherwise downloads from Upstox 1minute historical, saves, returns `UPSTOX_FETCHED_AND_SAVED` |
| `POST /api/candles/collect-30d` body `{symbol|'ALL', from_date, to_date}` | Downloads and writes files; 800 ms sleep between symbols |

Candle file format: `{symbol, instrument_key, interval:'1minute', from_date, to_date, total_bars, last_updated, candles:[...]}`.

## 4. Instrument universe (`marketData.ts`)

| Symbol | Company | Upstox key | Kite token | Sector | Base price |
|---|---|---|---|---|---|
| RELIANCE | Reliance Industries Limited | NSE_EQ\|INE002A01018 | 738561 | ENERGY_CONGLOMERATE | 1202.0 |
| TCS | Tata Consultancy Services Limited | NSE_EQ\|INE467B01029 | 2953217 | IT_SERVICES | 2460.9 |
| HDFCBANK | HDFC Bank Limited | NSE_EQ\|INE040A01034 | 341249 | BANKING | 712.0 |
| INFY | Infosys Limited | NSE_EQ\|INE009A01021 | 408065 | IT_SERVICES | 1130.7 |
| ICICIBANK | ICICI Bank Limited | NSE_EQ\|INE090A01021 | 1270529 | BANKING | 1381.0 |
| SBIN | State Bank of India | NSE_EQ\|INE062A01020 | 779521 | BANKING | 973.7 |

All: exchange NSE, INR, tick 0.05, lot 1, `tradingview_symbol: NSE:<SYM>`, coverage from 2018-01-01.
`LATEST_MARKET_REFERENCE_PRICES` = same base prices (used as "previous close" for % change).

Synthetic candles (`generateHistoricalCandles`): deterministic `pseudoRandom(seed,i)=frac(sin(seed*997+i*101.37)*10000)`, seed = sum of symbol char codes. Built backwards from a terminal price so the last close equals the base price; bounded to ±2.5% of base; per-bar vol `max(2*tick, base*0.00075*tfMult)` (tfMult 1/2.1/3.6 for 1m/5m/15m). When market is closed the last bar is anchored at 15:29 IST of the session date.

Mock news: one NSE filing (TIER_1, ±0.68/-0.58, relevance 0.92) and one social item (TIER_3); bullish if seed is odd.
Mock fundamentals: BANKING model (NIM, GNPA, NNPA, CRAR, CASA; HDFCBANK/ICICIBANK are top tier) or corporate (ROE, op margin, D/E, PE), fiscal period Q2-FY2026.

## 5. NSE calendar (`nseCalendar.ts`)

IST = UTC+5:30. Weekends and listed 2025/2026 holidays are non-trading. Phases:
`OFF_MARKET_HOLIDAY_OR_WEEKEND`, `PRE_OPEN_PREPARATION` (<09:15), `MARKET_OPEN_WARMUP` (09:15–09:30),
`INTRADAY_ACTIVE_ANALYSIS` (09:30–15:30; new entries allowed until 15:10), `EOD_NEXT_OPEN_FORECASTING` (15:30–16:00),
`POST_MARKET_MAINTENANCE`. `is_market_open` = trading day and 09:15–15:30.

## 6. Agent pipeline (run for every instrument on every step, in `App.tsx` `runAgentPipelineForStock`)

Data: 1m candles = local 30-day DB (+ newer Upstox intraday bars) → else Upstox intraday → else 1,500 synthetic bars.
Then `stepCount` continuation bars are appended (random walk from the last close). If a real Upstox LTP exists the last bar's close is set to it. 5m/15m are aggregated from 1m by time buckets.

1. **Technical** (needs ≥30 bars): SMA20/50/200, EMA9/21, MACD (EMA12−EMA26, signal = 0.75×line), RSI over 50 periods, Bollinger(20,2), ATR14 (min 1.25), session VWAP (last 375 bars), 30-day VWAP/high/low/return, OBV 5-bar delta, 20-bar support/resistance. Score: ±0.25 macro (price vs 30D VWAP and SMA200), ±0.35 session momentum (EMA9 vs EMA21 and price vs VWAP ± max(0.15, 0.15×ATR)), ±0.25 MACD hist + RSI band (50–74 bull, 25–48 bear), ±0.15 OBV confirmation. Clamp ±1; bias BULLISH ≥0.2, BEARISH ≤−0.2.
2. **Pattern** (needs ≥25 bars): 30-day high/low, Fib 38.2/50/61.8, swing trend from first half vs second half. Last 25 bars: bullish breakout if close ≥ priorHigh×0.999 and higher lows (score 0.85 aligned / 0.70 / 0.45 developing); bearish mirror; else `30D_MACRO_CONSOLIDATION` score 0. Volume confirmation = volume ≥ 1.1× average.
3. **Sentiment**: dedupe headlines; weighted = score×relevance; combined = 0.75×verified + 0.25×social (or 0.4×social if no verified). BULLISH ≥0.2, BEARISH ≤−0.2. Empty → `UNCERTAIN_MISSING_DATA`, score null.
4. **Fundamental**: banking strong if NIM≥3.5, GNPA≤2, CRAR≥15 → 0.55 else −0.2; corporate strong if ROE≥14, op margin≥15, D/E≤0.6 → 0.55 else −0.2. Earnings-within-2-days flag.
5. **Orchestrator**: composite = 0.40 T + 0.30 P + 0.15 S + 0.15 F (renormalised without S if null). VWAP deadband = max(6×tick, 0.2×ATR). Long conviction: composite ≥0.12, or confirmed bullish pattern, or composite ≥0.04 and price > VWAP+deadband (short mirror, only if shorting allowed). Hysteresis keeps prior LONG/SHORT unless the stop is crossed or composite flips past ∓0.08. Levels from live price: entryOffset = max(₹3, round(max(1.5×ATR, 20×tick))), rewardOffset = max(₹3, 1.8×entryOffset), stopOffset = max(10×tick, reward/1.75). Then `validateIntradayTargets`. Then `computeSuccessProbability` (logistic over composite×4.2, VWAP clearance, RSI, pattern, macro trend, R:R, sentiment, fundamentals; clamped 0.12–0.992). **Only probability ≥ 0.95 emits LONG/SHORT**, otherwise NO_TRADE with explanation. Trigger types `BUY_STOP_BREAKOUT` / `SELL_STOP_BREAKDOWN`.
6. **Target validator**: rounds P0/E/T/S to tick; requires S<E<T (long) or T<E<S (short); |E−P0|, |T−P0|, |T−E| each ≥ ₹3.00; R:R ≥ 1.5.
7. **EOD forecaster**: CLV = ((C−L)−(H−C))/range; gap% = 0.0035×CLV + 0.02×late15mMomentum + 0.0015×sentiment, clamped ±2.5%; 80% interval = ±1.28×max(0.45% of close, ₹3.5). <20 bars → provisional fallback.
8. **System monitor**: records each node with latency and correlation id.

## 7. Paper trading engine (`paperTradingAgent.ts`, `App.tsx handleStepSimulation`)

- Sizing: risk budget = capital × 1% ; qty = min(risk/|E−S|, min(max position ₹2.5L, capital)/E), at least 1.
- Costs: brokerage min(₹40, 0.06% turnover), STT 0.025% sell side, exchange+SEBI 0.0065%, GST 18% on (brokerage+exchange), stamp 0.003% buy side.
- PENDING → expires at `expiry_time`; triggers when high ≥ entry (long) / low ≤ entry (short); fill with 1 tick slippage; same-bar stop on entry → `SAME_BAR_ENTRY_CONSERVATIVE_STOP`.
- FILLED → tracks MFE/MAE; stop and target in the same bar → `AMBIGUOUS_SAME_BAR_CONSERVATIVE_STOP`; else `STOP_LOSS_HIT` / `TAKE_PROFIT_HIT`. Stop exits add 1 tick slippage.
- Losing closes get `failure_analysis` from `diagnoseFailureAndFormulateRule` (categories FALSE_BREAKOUT, COUNTER_TREND_REVERSAL, SLIPPAGE_OR_COST_DRAG, GAP_INVERSION, SAME_BAR_CHOP, PREMATURE_TRIGGER), saved to localStorage key `aistudio_self_learning_rules` (max 100; 4 seed rules L-101..L-104).
- Closed orders get a post-mortem; weight proposal only when closed count ≥ 20 (`post_mortem_min_sample_size`).
- New orders per step: only if kill switch off, no active order on that symbol, and active count < `max_simultaneous_positions` (3).
- Initial ledger: `generateSeedDateBasedPaperOrders` builds intraday trades for today + 2026-10-19/16/15/14 (~66% wins), 2 active trades (RELIANCE long, INFY short), and NEXT_DAY_OPENING gap trades with prev close / predicted open / actual open / gap error.
- Quick trade (Level 2 Buy/Sell): instant FILLED order, target ±₹3, stop ∓₹1.5, cost 0.03% notional.

## 8. Default PlatformConfig (`App.tsx INITIAL_CONFIG`)

version 1.0.0, strategy `strat-v1.4.0`, model `ridge-open-v1.2`.
target_rules: min displacements ₹3.00 ×3, horizon 45 min, signal expiry 15 min.
risk_controls: capital ₹10,00,000; risk 1%; max position ₹2,50,000; 3 simultaneous; per-stock ₹2,50,000; sector ₹5,00,000; daily loss ₹25,000; 10 trades/day; min R:R 1.5; slippage 15 bps; cooldown after 3 losses; shorting on; kill switch off; auto-promote off; post-mortem sample 20.
agent_weights: technical 0.40, pattern 0.30, sentiment 0.15, fundamental 0.15.

## 9. App state and timers (`App.tsx`)

- `activeLevel` 1–6, `selectedSymbol` (default RELIANCE; changing resets `stepCount`), `timeframe` 1m/5m/15m.
- Clock refresh 1 s. `enforceRealMarketHours` default true: stepping is blocked when the market is closed.
- Auto-play default = market open; interval = `streamSpeed` seconds (default 3) calling the latest step handler via ref.
- Upstox: status check on mount; when connected, quotes poll every max(4.5 s, speed); quotes update instruments' `base_demo_price`; intraday candles fetched per symbol/timeframe (15m → `30minute`).
- 30-day DB candles preloaded for all symbols on mount (IndexedDB `IMMIP_LocalMarketDB` / store `historical_1m_candles`, then server).
- Reset: `stepCount=1`, regenerate seed orders, clear telemetry.

## 10. UI design system

- Dark theme: page `bg-[#070b12] text-slate-100`, header `bg-slate-950` sticky with `border-slate-800/80`, cards on slate-900/950 with slate-800 borders, accent `sky-600` (active tab `bg-sky-600 ring-1 ring-sky-400/50`). Green `emerald`, red `rose`/`red`, amber for warnings, purple for learning.
- Typography: small dense UI (`text-xs`, `text-[10px]`, `text-[11px]`), section headings `text-xs/sm font-bold uppercase tracking-wider`, numbers in `font-mono`. Rupee formatting with `₹` and `en-IN` locale; times shown in IST.
- Layout: sticky header (HeaderBanner + horizontal scrolling tab nav with lucide icons LayoutDashboard, LineChart, Workflow, Receipt [order count badge], TrendingUp, Settings), `main` `max-w-7xl mx-auto p-4 md:p-6`, footer "Indian Market Multi-Agent Intelligence Platform • National Stock Exchange of India (NSE)" + strategy/model version.
- Tabs: "Level 1: Market Overview", "Level 2: Stock Detail (SYM)", "Level 3: Agent Inspection (SYM)", "Level 4: Paper Trading & Post-Mortem", "Level 5: Forecasts & Backtest", "Level 6: Config & System Monitor".
- Chart (Level 2): 440 px high, background `#090d16`, text `#94a3b8`, grid `rgba(30,41,59,0.45)`, up `#10b981`, down `#ef4444`, LTP price line `#f59e0b` titled "LTP", volume histogram overlay (scale margin top 0.78) coloured by candle direction at 35% alpha, `₹` price formatter, IST time formatter with date label at 09:15 bars, percent-scale toggle, ranges 1D/5D/1M/3M/6M/1Y/5Y, session-date picker, optional TradingView iframe widget, CSV/JSON export, collect-30d button.

## 11. Screen contents

- **Level 1**: "Configured NSE Universe & Multi-Agent Signals" watchlist (LTP, change vs reference close, VWAP, RSI50, ATR, decision, probability, entry/target/stop, R:R, score, forecast), portfolio metric cards opening `DetailedMetricsAuditModal`, date filter, Upstox sync buttons, play/pause/step/speed controls, navigation to other levels.
- **Level 2**: chart + hover OHLCV bar, inline base price editing, live tick direction, quick Buy/Sell with qty, "NSE INR 3.00 Displacement & Ordering Check", "Active Strategy Setup & Rationale".
- **Level 3**: "LangGraph Multi-Agent Execution Audit — SYM", pipeline steps ingestion → technical → pattern → sentiment → fundamental → orchestrator with expand/collapse, "All Specialist Cards Overview" (four numbered agent cards).
- **Level 4**: "Date-Based Paper Trading & Self-Learning Execution Ledger" with sections INTRADAY, NEXT_DAY, PREV_VS_NEXT_OPEN ("Previous Day Close ➔ Next Day Open Discrepancy & Gap Matrix"), LEARNING_STORE ("Self-Learning Failure Memory Store & Quantitative Knowledge Base", category filter + search); outcome filter ALL/SUCCESS/FAILURE/ACTIVE; "Order Audit & Verification" panel; "Failure Root-Cause Diagnosis & Self-Learning Lesson"; `FailureLessonModal`.
- **Level 5**: "15:30–16:00 IST Next-Session Opening Forecasts vs Naive Baseline" and "Chronological Walk-Forward Backtest (Zero Lookahead Bias)" (75 synthetic bars per stock, starts at bar 30).
- **Level 6**: "Upstox Broker Live Feed API v2" (inline token, verify), "Local 30-Day 1m Candle Database" (status, collect all), "Active Universe & Live Price Calibration" (edit prices, sync to reference/Upstox), "Add NSE Stock to Live Universe (Zero Code Changes)", "Target Displacement & Risk Controls" (edit config, kill switch), "8. System Monitor Agent — Structured Telemetry Stream".
- **Modals**: Upstox broker, market feed explainer ("Why wasn't the price changing during market hours?", "How to Match App Prices With Your Trading Screen"), user guide, repo explorer, metrics audit, failure lesson.

## 12. Known quirks to preserve (or fix deliberately)

- Historical date ranges are hard-coded to 2026-09-19 → 2026-10-19 in `server.ts`.
- `@google/genai` and `GEMINI_API_KEY` are declared but unused.
- Upstox token is stored in browser `localStorage`/`sessionStorage` and sent to the local proxy.
- `public/assets/aistudio/*.png` are not referenced by any code.
- The original candle files appear to have been collected from Upstox (their metadata matches the server's collect format). The skill's generator writes the same format and dates and
  ends each stock on its reference close, but the intraday price path differs. Agent signals on any given step
  can therefore differ from the original until real data is collected with `POST /api/candles/collect-30d`.
- The repo explorer shows illustrative Python/FastAPI/Docker files that are not part of the running app.
