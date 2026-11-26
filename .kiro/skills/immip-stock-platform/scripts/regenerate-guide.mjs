#!/usr/bin/env node
// Maintainer tool: rebuilds guide/*.md from the app source so the skill stays in sync with the app.
// Every source file is embedded verbatim under a "<!-- file: path -->" marker, which
// build-from-guide.mjs uses to recreate the project.
//
// Usage (from the app repo root): node .kiro/skills/immip-stock-platform/scripts/regenerate-guide.mjs [app-dir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appDir = path.resolve(process.argv[2] || process.cwd());
const guideDir = path.join(skillDir, 'guide');
fs.mkdirSync(guideDir, { recursive: true });

const LANG = { ts: 'typescript', tsx: 'tsx', json: 'json', html: 'html', css: 'css', md: 'markdown' };
const lang = (p) => LANG[p.split('.').pop()] || (p.startsWith('.env') ? 'dotenv' : 'text');

const CHAPTERS = [
  {
    file: '01-project-setup.md',
    title: 'Step 1: Project setup (tooling, config, entry points)',
    intro: `Create an empty folder and add these files. The app is one Node project: \`server.ts\` (Express)
serves the API and, in development, mounts Vite as middleware, so a single \`npm run dev\` (\`tsx server.ts\`)
runs everything on port 3000.

- React 19 + Vite 8 + Tailwind CSS v4 (through \`@tailwindcss/vite\`; \`src/index.css\` only needs \`@import "tailwindcss";\`).
- \`lightweight-charts\` v5 for candles, \`lucide-react\` for icons.
- \`@google/genai\` and \`motion\` are declared but never imported. You may drop them.
- \`.env\`: \`PORT\`, \`UPSTOX_ACCESS_TOKEN\` (optional live data), \`GEMINI_API_KEY\` (unused).

After writing these files run \`npm install\`.`,
    files: ['package.json', 'tsconfig.json', 'vite.config.ts', 'index.html', 'metadata.json', '.env.example', '.gitignore', 'src/main.tsx', 'src/index.css'],
  },
  {
    file: '02-types.md',
    title: 'Step 2: Shared domain types',
    intro: `All shared interfaces live in one file. Write it before anything else in \`src/\`, because
every service, agent and component imports from it.

Main types:
- \`InstrumentConfig\`: a stock (symbol, Upstox key, tick size 0.05, sector, \`base_demo_price\`).
- \`PlatformConfig\`: target rules, risk controls, agent weights, instruments.
- \`Candle\`: \`{time (unix seconds), open, high, low, close, volume}\`.
- Agent outputs: \`TechnicalOutput\`, \`PatternOutput\`, \`SentimentOutput\`, \`FundamentalOutput\`, \`OrchestratorOutput\`. \`AgentRunAudit\` bundles them.
- \`TargetValidationResult\`, \`PaperOrder\` (with intraday and next-day-opening fields), \`FailureAnalysis\`, \`PostMortemReport\`, \`NextSessionForecast\`, \`SystemMonitorEvent\`, \`SessionStatus\`.`,
    files: ['src/types/platform.ts'],
  },
  {
    file: '03-server.md',
    title: 'Step 3: Express server and Upstox proxy',
    intro: `\`server.ts\` has three jobs:

1. **Upstox v2 proxy.** \`/api/upstox/status\` (cached 15 s), \`/api/upstox/quotes\` (cached 3 s, with a
   fallback quote table on HTTP 429) and \`/api/upstox/candles\` (intraday, falling back to historical).
   The token comes from the \`Authorization: Bearer\` header, then \`?token=\`, then \`UPSTOX_ACCESS_TOKEN\`.
2. **Local 30-day candle database** in \`data/candles/<SYM>_1m_30d.json\`: \`GET /api/candles/db-status\`,
   \`GET /api/candles/30d?symbol=\` (reads the file, or downloads it from Upstox and saves it), and
   \`POST /api/candles/collect-30d\` (\`{symbol:'ALL'|SYM, from_date, to_date}\`).
3. **Static or dev serving.** Vite middleware in development, \`dist/\` when \`NODE_ENV=production\`.

Default history dates are hard-coded to 2026-09-19 → 2026-10-19.`,
    files: ['server.ts'],
  },
  {
    file: '04-core-services.md',
    title: 'Step 4: Core services (calendar, validator, market data, Upstox client, candle cache)',
    intro: `- **nseCalendar.ts**: NSE holidays for 2025–26, \`isTradingDay\`, \`getNextTradingDay\`, and \`getSessionWindowStatus\`.
  The last one converts to IST (UTC+5:30) and returns the phase: OFF_MARKET_HOLIDAY_OR_WEEKEND, PRE_OPEN_PREPARATION (<09:15),
  MARKET_OPEN_WARMUP (09:15–09:30), INTRADAY_ACTIVE_ANALYSIS (09:30–15:30, new entries until 15:10),
  EOD_NEXT_OPEN_FORECASTING (15:30–16:00) or POST_MARKET_MAINTENANCE.
- **targetValidator.ts**: \`roundToTick\` and \`validateIntradayTargets\`. Level ordering must be S<E<T for a long and T<E<S for a short.
  |E−P0|, |T−P0| and |T−E| must each be at least ₹3.00, and reward-to-risk at least 1.5.
- **marketData.ts**: the 6-stock universe (RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, SBIN) and the reference prices.
  It also holds a deterministic synthetic candle generator (sine-based pseudo-random, built backwards so the last close
  equals the base price) and mock news and fundamentals.
- **upstoxClient.ts**: browser client for \`/api/upstox/*\`. It stores the token in localStorage and sessionStorage under \`upstox_broker_session_token\`.
- **localCandleDb.ts**: IndexedDB cache (\`IMMIP_LocalMarketDB\` / \`historical_1m_candles\`) in front of \`/api/candles/30d\`, plus CSV and JSON export.`,
    files: ['src/services/nseCalendar.ts', 'src/services/targetValidator.ts', 'src/services/marketData.ts', 'src/services/upstoxClient.ts', 'src/services/localCandleDb.ts'],
  },
  {
    file: '05-agents.md',
    title: 'Step 5: The multi-agent engine',
    intro: `Every simulation step runs each agent for every instrument (see \`runAgentPipelineForStock\` in Step 7).

- **technicalAgent**: SMA20/50/200, EMA9/21, MACD (signal = 0.75×line), 50-period RSI, Bollinger (20, 2), ATR14,
  session VWAP (last 375 bars), 30-day VWAP/high/low/return, OBV. The score is the sum of ±0.25 (macro), ±0.35 (session momentum),
  ±0.25 (MACD + RSI) and ±0.15 (OBV), clamped to ±1. BULLISH at ≥0.2, BEARISH at ≤−0.2.
- **patternAgent**: 30-day Fibonacci levels and swing trend, plus a 25-bar breakout (higher lows) or breakdown (lower highs)
  with 1.1× volume confirmation. Otherwise it returns 30D_MACRO_CONSOLIDATION.
- **sentimentAgent**: 0.75 × verified filings + 0.25 × social, each weighted by relevance. With no items it returns UNCERTAIN_MISSING_DATA.
- **fundamentalAgent**: separate banking (NIM/GNPA/CRAR) and corporate (ROE/margin/D/E) models. Score is 0.55 or −0.2.
- **orchestratorAgent**: composite = 0.40 T + 0.30 P + 0.15 S + 0.15 F. Uses a VWAP deadband, hysteresis on the previous signal,
  ATR-based entry/target/stop levels anchored to the live price, the ₹3 validator, and a logistic success probability.
  **It emits LONG/SHORT only when the probability is ≥ 95%**, and NO_TRADE otherwise.
- **paperTradingAgent**: position sizing (1% risk, ₹2.5L maximum position) and Indian costs (brokerage up to ₹40,
  STT 0.025% on sells, exchange + SEBI 0.0065%, GST 18%, stamp 0.003%). Its candle evaluator handles pending → filled → closed
  with 1-tick slippage. When stop and target are hit in the same bar it books the stop.
- **postMortemAgent**: classifies each closed trade. It proposes new weights only after ≥ 20 closed trades.
- **eodForecaster**: next-open gap = 0.0035×CLV + 0.02×late momentum + 0.0015×sentiment, clamped to ±2.5%, with an 80% interval.
- **walkForwardBacktester**: replays synthetic bars, starting at bar 30, and gives agents only \`candles[0..i]\` so there is no lookahead.
- **systemMonitorAgent**: in-memory telemetry (200 events). It redacts any key containing key, token, secret or password.`,
    files: [
      'src/services/agents/technicalAgent.ts', 'src/services/agents/patternAgent.ts', 'src/services/agents/sentimentAgent.ts',
      'src/services/agents/fundamentalAgent.ts', 'src/services/agents/orchestratorAgent.ts', 'src/services/agents/paperTradingAgent.ts',
      'src/services/agents/postMortemAgent.ts', 'src/services/agents/eodForecaster.ts', 'src/services/agents/walkForwardBacktester.ts',
      'src/services/agents/systemMonitorAgent.ts',
    ],
  },
  {
    file: '06-learning-and-repo-content.md',
    title: 'Step 6: Self-learning store and repo-explorer content',
    intro: `- **learningStore.ts**: \`diagnoseFailureAndFormulateRule\` maps a losing order to one of six categories: FALSE_BREAKOUT,
  COUNTER_TREND_REVERSAL, SLIPPAGE_OR_COST_DRAG, GAP_INVERSION, SAME_BAR_CHOP or PREMATURE_TRIGGER. It writes a "RULE #L-xxx"
  lesson and stores it in localStorage under \`aistudio_self_learning_rules\` (maximum 100, with 4 seed rules).
  \`generateSeedDateBasedPaperOrders\` builds the initial ledger: intraday trades for today plus four past dates (~66% wins),
  2 active trades, and NEXT_DAY_OPENING gap trades.
- **fileRepository.ts**: static content for the "Code & Repo Tree" modal. These are illustrative Python, FastAPI and Docker files;
  they are not part of the running app.`,
    files: ['src/services/learningStore.ts', 'src/services/fileRepository.ts'],
  },
  {
    file: '07-app-shell.md',
    title: 'Step 7: App shell, global state and simulation loop',
    intro: `\`App.tsx\` owns all state and wires every level together:

- \`INITIAL_CONFIG\`: capital ₹10,00,000, 1% risk, 3 simultaneous positions, min R:R 1.5, shorting on, kill switch off,
  weights 0.40/0.30/0.15/0.15, horizon 45 min, signal expiry 15 min.
- Candle assembly per stock, in order: local 30-day DB (plus newer Upstox intraday bars), then Upstox intraday, then 1,500 synthetic bars.
  Then \`stepCount\` continuation bars are appended and the last close is set to the live Upstox price if one exists.
  5m and 15m candles are aggregated from 1m.
- \`handleStepSimulation\`: advances open orders, attaches post-mortems, and opens new orders from ≥95% signals
  (unless the kill switch is on, the symbol already has an order, or 3 positions are active).
  It is blocked when "enforce real market hours" is on and the market is closed.
- Timers: a 1 s IST clock, auto-play every \`streamSpeed\` seconds (default 3; on by default only while the market is open),
  and Upstox quote polling every max(4.5 s, speed).
- Layout: a sticky header (HeaderBanner + six tab buttons), \`main\` at max-w-7xl, the modals, and a footer.`,
    files: ['src/App.tsx'],
  },
  {
    file: '08-ui-header-and-modals.md',
    title: 'Step 8: Header banner and modals',
    intro: `Design language used across the UI: dark slate (page \`#070b12\`, panels slate-900/950, borders slate-800) with a sky-600 accent.
Emerald means profit or long, rose/red means loss or short, amber means warning, purple means learning. Text is dense
(\`text-xs\`, \`text-[10px]\`), headings are uppercase with \`tracking-wider\`, numbers are \`font-mono\`, and prices use the \`₹\` sign with en-IN formatting and IST times.

- **HeaderBanner**: title, IST clock, session phase, next trading day, step counter, play/pause/step/reset, speed selector,
  market-hours lock, kill switch, Upstox status, user guide, repo explorer and feed-info buttons.
- **MarketFeedModal**: explains why prices do not tick by themselves and how to match the broker screen.
- **UpstoxBrokerModal**: enter, verify and clear the token; toggle the feed; live quotes grid.
- **UserGuideModal**: "How to Run & Use the Platform".
- **RepoExplorerModal**: file tree over \`fileRepository.ts\`, with copy and download.
- **FailureLessonModal**: root cause and learned rule for a failed order.
- **DetailedMetricsAuditModal**: drill-down tabs EQUITY, PNL, STATUTORY, CLOSED_TRADES, WIN_RATE and PROFIT_FACTOR.`,
    files: [
      'src/components/HeaderBanner.tsx', 'src/components/MarketFeedModal.tsx', 'src/components/UpstoxBrokerModal.tsx',
      'src/components/UserGuideModal.tsx', 'src/components/RepoExplorerModal.tsx', 'src/components/FailureLessonModal.tsx',
      'src/components/DetailedMetricsAuditModal.tsx',
    ],
  },
  {
    file: '09-ui-level1-level2.md',
    title: 'Step 9: Level 1 (Market Overview) and Level 2 (Stock Detail)',
    intro: `- **Level 1, "Configured NSE Universe & Multi-Agent Signals"**: watchlist with LTP, change against the reference close, VWAP, RSI50,
  ATR, decision, probability, entry/target/stop, R:R and forecast. Portfolio metric cards open the metrics audit modal.
  Also has a date filter, Upstox sync buttons and stream controls.
- **Level 2**: lightweight-charts v5 candlestick + volume chart, 440 px high, background \`#090d16\`, up \`#10b981\`, down \`#ef4444\`,
  LTP price line \`#f59e0b\`. Time axis in IST with a date label on 09:15 bars. Includes 1m/5m/15m, ranges 1D–5Y, a session-date picker,
  a percent-scale toggle, an optional TradingView iframe, the OHLCV bar on hover, base-price calibration, quick Buy/Sell,
  CSV/JSON export, collect-30d, the "NSE INR 3.00 Displacement & Ordering Check" panel and "Active Strategy Setup & Rationale".`,
    files: ['src/components/Level1MarketOverview.tsx', 'src/components/Level2StockDetail.tsx'],
  },
  {
    file: '10-ui-level3-level4.md',
    title: 'Step 10: Level 3 (Agent Inspection) and Level 4 (Paper Trading & Post-Mortem)',
    intro: `- **Level 3, "LangGraph Multi-Agent Execution Audit"**: pipeline steps ingestion → technical → pattern → sentiment → fundamental → orchestrator,
  each expandable, plus "All Specialist Cards Overview".
- **Level 4, "Date-Based Paper Trading & Self-Learning Execution Ledger"**: sections INTRADAY, NEXT_DAY, PREV_VS_NEXT_OPEN
  (gap matrix) and LEARNING_STORE (category filter and search). Outcome filter ALL/SUCCESS/FAILURE/ACTIVE, order audit panel,
  failure diagnosis, and links to FailureLessonModal and DetailedMetricsAuditModal.`,
    files: ['src/components/Level3AgentInspection.tsx', 'src/components/Level4PaperTrading.tsx'],
  },
  {
    file: '11-ui-level5-level6.md',
    title: 'Step 11: Level 5 (Forecasts & Backtest) and Level 6 (Config & System Monitor)',
    intro: `- **Level 5**: "15:30–16:00 IST Next-Session Opening Forecasts vs Naive Baseline" table and
  "Chronological Walk-Forward Backtest (Zero Lookahead Bias)" for the first 4 stocks (70 bars), with a re-run button.
- **Level 6**: inline Upstox token, the 30-day candle DB status with collect-all, universe price calibration (edit, sync to reference, sync to Upstox),
  "Add NSE Stock to Live Universe (Zero Code Changes)", target and risk controls editor with the kill switch, and the system monitor telemetry stream.`,
    files: ['src/components/Level5ForecastsAndBacktest.tsx', 'src/components/Level6ConfigAndMonitor.tsx'],
  },
];

for (const ch of CHAPTERS) {
  let md = `# ${ch.title}\n\n${ch.intro}\n\n## Files\n\n`;
  md += ch.files.map((f) => `- \`${f}\``).join('\n') + '\n';
  for (const f of ch.files) {
    const src = fs.readFileSync(path.join(appDir, f), 'utf8');
    if (src.includes('````')) throw new Error(`${f} contains a 4-backtick run; widen the fence`);
    // "noeol" tells build-from-guide.mjs the original file has no trailing newline
    const marker = src.endsWith('\n') ? f : `${f} noeol`;
    md += `\n### \`${f}\`\n\n<!-- file: ${marker} -->\n\`\`\`\`${lang(f)}\n${src}${src.endsWith('\n') ? '' : '\n'}\`\`\`\`\n`;
  }
  fs.writeFileSync(path.join(guideDir, ch.file), md);
  console.log(`${ch.file}: ${ch.files.length} files, ${Math.round(md.length / 1024)} KB`);
}
