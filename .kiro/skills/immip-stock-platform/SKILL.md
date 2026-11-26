---
name: immip-stock-platform
description: Build the "Indian Market Multi-Agent Intelligence Platform (IMMIP)" stock practice app from scratch (NSE intraday multi-agent signals, ₹3 target validator, 95% probability gate, virtual paper trading with Indian costs, self-learning failure store, next-day opening gap forecasts, walk-forward backtest, Upstox v2 live feed, 30-day 1m candle DB) with the same UI, features and behaviour. Use when the user asks to generate, clone, rebuild, scaffold, explain or extend this stock trading / paper trading app.
---

# IMMIP Stock Practice Platform: build from scratch

This skill holds everything needed to develop the app from nothing: no access to the original
repository and no prior knowledge of it is required. It documents the app at
https://github.com/glnrao700-eng/stock-practice-new (commit `d43b83a`).

## What is in this skill

| Path | Purpose |
|---|---|
| `guide/01-…11-*.md` | Step-by-step development guide. Each step explains what to build and why, then gives the **exact source** of every file in that step under a `<!-- file: path -->` marker. |
| `reference/ARCHITECTURE.md` | How the app works: stack, file map, server API, stock universe, NSE calendar, every agent formula and threshold, paper-trading rules and Indian costs, default config, state and timers, design system, and screen contents. |
| `scripts/build-from-guide.mjs` | Writes all 42 source files from the guide into a new folder, generates the candle data and creates `.env`. |
| `scripts/generate-candles.mjs` | Generates `data/candles/<SYM>_1m_30d.json` (6 stocks × 20 trading days × 375 one-minute bars). |
| `scripts/regenerate-guide.mjs` | Maintainer tool: refreshes `guide/` from an updated copy of the app so the skill does not go stale. |

## Build order (the guide follows it)

1. `01-project-setup.md`: package.json, tsconfig, Vite + Tailwind v4, index.html, entry files.
2. `02-types.md`: all shared TypeScript interfaces.
3. `03-server.md`: Express server, Upstox v2 proxy, local 30-day candle API, Vite middleware.
4. `04-core-services.md`: NSE calendar, ₹3 target validator, market data and instruments, Upstox client, IndexedDB cache.
5. `05-agents.md`: technical, pattern, sentiment, fundamental, orchestrator (95% gate), paper trading, post-mortem, EOD forecast, backtest, system monitor.
6. `06-learning-and-repo-content.md`: self-learning failure store, seed ledger, repo-explorer content.
7. `07-app-shell.md`: `App.tsx` global state, pipeline, simulation loop, tabs layout.
8. `08-ui-header-and-modals.md`: header banner and all seven modals, plus the design language.
9. `09-ui-level1-level2.md`: Market Overview and Stock Detail chart.
10. `10-ui-level3-level4.md`: Agent Inspection and Paper Trading & Post-Mortem.
11. `11-ui-level5-level6.md`: Forecasts & Backtest and Config & System Monitor.
12. Data: run `scripts/generate-candles.mjs`, or collect real data later through the app.

## How to generate the app

Fast path (exact copy of the code):

```bash
node <skill-dir>/scripts/build-from-guide.mjs <empty-target-dir>
cd <empty-target-dir>
npm install
npm run lint      # tsc --noEmit
npm run build     # vite build
npm run dev       # http://localhost:3000 (long-running: run it in the background)
curl -s localhost:3000/api/candles/db-status   # expect 6 symbols, 7500 bars each
```

Manual path: work through `guide/01` to `guide/11` in order and create each file with the exact
content shown, then run `generate-candles.mjs`. Use this when the user wants to understand or
change the app as it is built.

Optional live data: set `UPSTOX_ACCESS_TOKEN` in `.env`, or paste a token in the Upstox modal or
Level 6. Then `POST /api/candles/collect-30d` with `{"symbol":"ALL"}` replaces the generated
candles with real ones.

## Rules for the agent using this skill

- Copy code from the guide exactly. Do not rewrite files from memory; the exact Tailwind classes,
  labels, colours and formulas are what make the UI and behaviour identical.
- When the user asks for a change, read the matching guide chapter and `reference/ARCHITECTURE.md`
  first, then edit the generated project, keeping formulas, thresholds and styling consistent.
- After changing the app's code, run `scripts/regenerate-guide.mjs <app-dir>` if the skill itself
  should learn the change.

## Differences from the original repo

- Candle data is generated, not the original files. Same format, dates (2026-09-21 → 2026-10-19),
  bar counts and final closes; the intraday price path differs, so individual signals can differ.
- The 20 screenshot PNGs in `public/assets/aistudio/` are omitted. No code references them.

## Feature checklist (what "same app" means)

- Sticky header with IST clock, NSE session phase, step / auto-play / reset, stream speed,
  market-hours lock, kill switch, Upstox status, user guide and repo explorer.
- Six tabs: Market Overview, Stock Detail, Agent Inspection, Paper Trading & Post-Mortem,
  Forecasts & Backtest, Config & System Monitor.
- Agent weights 0.40/0.30/0.15/0.15, hysteresis, ₹3 displacement validator, R:R ≥ 1.5,
  signals only at probability ≥ 95%, Indian statutory costs, conservative same-bar handling.
- Self-learning rules in localStorage (`aistudio_self_learning_rules`) with 4 seed rules;
  candles cached in IndexedDB (`IMMIP_LocalMarketDB`).

## Common extensions

- **Add a stock:** add it to `DEFAULT_INSTRUMENTS` and `LATEST_MARKET_REFERENCE_PRICES` in
  `src/services/marketData.ts`, and to `SYMBOL_TO_KEY` in `server.ts`. Users can also add one at runtime in Level 6.
- **Change rules or risk:** `INITIAL_CONFIG` in `src/App.tsx`.
- **Change the probability gate:** `MIN_SUCCESS_PROBABILITY_THRESHOLD` in `src/services/agents/orchestratorAgent.ts`.
