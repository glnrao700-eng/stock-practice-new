---
name: immip-stock-platform
description: Recreate the "Indian Market Multi-Agent Intelligence Platform (IMMIP)" stock practice app (NSE intraday multi-agent signals, ₹3 target validator, 95% probability gate, virtual paper trading with Indian costs, self-learning failure store, next-day opening gap forecasts, walk-forward backtest, Upstox v2 live feed, 30-day 1m candle DB) with the same UI, features and behaviour. Use when the user asks to generate, clone, rebuild, scaffold or extend this stock trading / paper trading app.
---

# IMMIP Stock Practice Platform

This skill rebuilds the app from https://github.com/glnrao700-eng/stock-practice-new
(commit `d43b83a`). The complete original source, including the 30-day candle data, is in
`template/`, so the result is identical in UI, features and behaviour.

## Contents

- `template/`: exact copy of every file in the original repo (68 files).
- `scripts/scaffold.sh`: copies the template into a new folder, creates `.env`, runs `npm install`.
- `reference/ARCHITECTURE.md`: what every file does, the server API, all agent formulas and
  thresholds, default config, state and timers, design tokens, and screen-by-screen contents.
  Read it before changing or extending behaviour.

## Generate the same app

1. Pick an empty target folder inside the workspace (for example `/projects/sandbox/my-immip`).
2. Run:
   ```bash
   bash .kiro/skills/immip-stock-platform/scripts/scaffold.sh <target-dir>
   ```
   Pass `--no-install` to skip `npm install`.
3. Optional: put an Upstox v2 access token in `<target-dir>/.env` as `UPSTOX_ACCESS_TOKEN=...`.
   Without it the app runs on the bundled 30-day candle files plus deterministic synthetic bars.
4. Verify:
   ```bash
   cd <target-dir>
   npm run lint                 # tsc --noEmit
   npm run build                # vite build
   npm run dev                  # Express + Vite on http://localhost:3000 (long-running; run in background)
   curl -s localhost:3000/api/candles/db-status   # should list 6 symbols
   ```
5. If the user wants it on GitHub, `git init`, commit, and push to the repo they name.

Do not hand-rewrite the files from memory. Copying `template/` is what guarantees the same UI.
Only regenerate a file by hand if the user asks for a change, and then follow
`reference/ARCHITECTURE.md` so formulas, thresholds, colours and labels stay consistent.

## Feature checklist (what "same app" means)

- Sticky header with IST clock, NSE session phase, step / auto-play / reset, stream speed,
  market-hours enforcement, kill switch, Upstox status, user guide and repo explorer buttons.
- Six tabs: Market Overview, Stock Detail (lightweight-charts candles + volume, 1m/5m/15m,
  ranges, quick Buy/Sell, CSV/JSON export), Agent Inspection, Paper Trading & Post-Mortem,
  Forecasts & Backtest, Config & System Monitor.
- Agents: technical, pattern, sentiment, fundamental, orchestrator (weights 0.40/0.30/0.15/0.15,
  hysteresis, ₹3 displacement validator, R:R ≥ 1.5, signals only at probability ≥ 95%),
  paper trading engine, post-mortem, EOD opening forecaster, walk-forward backtester, system monitor.
- Data: `data/candles/<SYM>_1m_30d.json` for RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, SBIN,
  cached in browser IndexedDB; Upstox proxy endpoints in `server.ts` with rate-limit caching.
- Self-learning store in localStorage (`aistudio_self_learning_rules`) with 4 seed rules.

## Common extensions

- **Add a stock:** add an `InstrumentConfig` to `DEFAULT_INSTRUMENTS` and a price to
  `LATEST_MARKET_REFERENCE_PRICES` in `src/services/marketData.ts`, and its Upstox key to
  `SYMBOL_TO_KEY` in `server.ts`. Users can also add one at runtime in Level 6.
- **Change rules or risk:** edit `INITIAL_CONFIG` in `src/App.tsx`.
- **Change the probability gate:** `MIN_SUCCESS_PROBABILITY_THRESHOLD` in `orchestratorAgent.ts`.
- **Refresh candle data:** `POST /api/candles/collect-30d` with `{"symbol":"ALL","from_date":"YYYY-MM-DD","to_date":"YYYY-MM-DD"}` (needs a token). Default dates are hard-coded to 2026-09-19 → 2026-10-19.
