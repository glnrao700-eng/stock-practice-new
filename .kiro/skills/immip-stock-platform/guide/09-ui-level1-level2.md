# Step 9: Level 1 (Market Overview) and Level 2 (Stock Detail)

- **Level 1, "Configured NSE Universe & Multi-Agent Signals"**: watchlist with LTP, change against the reference close, VWAP, RSI50,
  ATR, decision, probability, entry/target/stop, R:R and forecast. Portfolio metric cards open the metrics audit modal.
  Also has a date filter, Upstox sync buttons and stream controls.
- **Level 2**: lightweight-charts v5 candlestick + volume chart, 440 px high, background `#090d16`, up `#10b981`, down `#ef4444`,
  LTP price line `#f59e0b`. Time axis in IST with a date label on 09:15 bars. Includes 1m/5m/15m, ranges 1D–5Y, a session-date picker,
  a percent-scale toggle, an optional TradingView iframe, the OHLCV bar on hover, base-price calibration, quick Buy/Sell,
  CSV/JSON export, collect-30d, the "NSE INR 3.00 Displacement & Ordering Check" panel and "Active Strategy Setup & Rationale".

## Files

- `src/components/Level1MarketOverview.tsx`
- `src/components/Level2StockDetail.tsx`

### `src/components/Level1MarketOverview.tsx`

<!-- file: src/components/Level1MarketOverview.tsx -->
````tsx
import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Percent,
  Wallet,
  Receipt,
  Lock,
  Unlock,
  Calculator,
  ExternalLink,
  ChevronRight,
  Calendar,
  Filter,
  RotateCcw,
  Radio,
  Zap,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import {
  InstrumentConfig,
  NextSessionForecast,
  PaperOrder,
  PlatformConfig,
  SessionStatus,
  TargetValidationResult,
  UpstoxConnectionState,
  UpstoxLiveQuote,
} from '../types/platform';
import { DetailedMetricsAuditModal, MetricTabType } from './DetailedMetricsAuditModal';

export interface WatchlistRow {
  instrument: InstrumentConfig;
  livePrice: number;
  refClose: number;
  upstoxQuote?: UpstoxLiveQuote;
  priceChangeInr: number;
  priceChangePct: number;
  lastClose: number;
  vwap: number;
  rsi50?: number;
  rsi14: number;
  atr14: number;
  direction: 'LONG' | 'SHORT' | 'NO_TRADE';
  calibratedProbability?: number | null;
  plannedEntry: number | null;
  plannedTarget: number | null;
  plannedStop: number | null;
  rewardRisk: number | null;
  score: number;
  validation: TargetValidationResult | null;
  forecast: NextSessionForecast | null;
}

export interface Level1MarketOverviewProps {
  watchlist: WatchlistRow[];
  portfolioOrders: PaperOrder[];
  config: PlatformConfig;
  sessionStatus?: SessionStatus;
  enforceRealMarketHours?: boolean;
  onToggleEnforceMarketHours?: () => void;
  onSelectSymbol: (symbol: string) => void;
  onGoToLevel: (level: number) => void;
  upstoxConnection?: UpstoxConnectionState;
  upstoxQuotes?: Record<string, UpstoxLiveQuote>;
  onSyncAllToUpstox?: () => void;
  onSyncSymbolToUpstox?: (symbol: string) => void;
  isAutoPlaying?: boolean;
  onToggleAutoPlay?: () => void;
  streamSpeed?: number;
  onChangeStreamSpeed?: (speed: number) => void;
  onStepSimulation?: () => void;
  onOpenUpstoxModal?: () => void;
  onRefreshUpstox?: () => void;
}

export const Level1MarketOverview: React.FC<Level1MarketOverviewProps> = ({
  watchlist,
  portfolioOrders,
  config,
  sessionStatus,
  enforceRealMarketHours = true,
  onToggleEnforceMarketHours,
  onSelectSymbol,
  onGoToLevel,
  upstoxConnection,
  upstoxQuotes = {},
  onSyncAllToUpstox,
  onSyncSymbolToUpstox,
  isAutoPlaying = false,
  onToggleAutoPlay,
  streamSpeed = 3,
  onChangeStreamSpeed,
  onStepSimulation,
  onOpenUpstoxModal,
  onRefreshUpstox,
}) => {
  // Date filter state: 'ALL' or specific session date ('2026-10-19', etc.)
  const [selectedDate, setSelectedDate] = useState<string>('ALL');

  // Extract all unique dates from portfolio orders sorted newest first
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    portfolioOrders.forEach((o) => {
      const d = o.session_date || o.created_at.split('T')[0];
      if (d) datesSet.add(d);
    });
    return Array.from(datesSet).sort().reverse();
  }, [portfolioOrders]);

  // Filtered closed orders based on selected date
  const filteredClosedOrders = useMemo(() => {
    return portfolioOrders.filter((o) => {
      if (o.status !== 'CLOSED') return false;
      if (selectedDate === 'ALL') return true;
      const d = o.session_date || o.created_at.split('T')[0];
      return d === selectedDate;
    });
  }, [portfolioOrders, selectedDate]);

  const allClosedOrders = useMemo(
    () => portfolioOrders.filter((o) => o.status === 'CLOSED'),
    [portfolioOrders]
  );

  const startingCapital = config.risk_controls.starting_capital_inr;
  const netRealizedPnl = filteredClosedOrders.reduce((sum, o) => sum + o.net_pnl_inr, 0);
  const totalStatutoryCosts = filteredClosedOrders.reduce((sum, o) => sum + o.total_costs_inr, 0);

  // When 'ALL', Current Equity = Starting Capital + all closed PnL
  // When specific date, Current Equity shows base + cumulative up to that date (or starting capital + day's net)
  const currentEquity = startingCapital + netRealizedPnl;

  const wins = filteredClosedOrders.filter((o) => o.net_pnl_inr > 0);
  const losses = filteredClosedOrders.filter((o) => o.net_pnl_inr <= 0);
  const winRate = filteredClosedOrders.length > 0 ? (wins.length / filteredClosedOrders.length) * 100 : 0;

  const grossProfit = wins.reduce((sum, o) => sum + o.gross_pnl_inr, 0);
  const grossLoss = Math.abs(losses.reduce((sum, o) => sum + o.gross_pnl_inr, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 99 : 0;

  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [selectedMetricTab, setSelectedMetricTab] = useState<MetricTabType>('EQUITY');
  const [syncToast, setSyncToast] = useState<string | null>(null);

  const handleOpenAudit = (tab: MetricTabType) => {
    setSelectedMetricTab(tab);
    setAuditModalOpen(true);
  };

  const handleSyncAllWithFeedback = () => {
    if (onSyncAllToUpstox) {
      onSyncAllToUpstox();
      setSyncToast('All universe stocks synced to Upstox live market LTPs!');
      setTimeout(() => setSyncToast(null), 3500);
    }
  };

  const handleSyncSymbolWithFeedback = (symbol: string) => {
    if (onSyncSymbolToUpstox) {
      onSyncSymbolToUpstox(symbol);
      const q = upstoxQuotes[symbol];
      setSyncToast(`${symbol} price synced to Upstox LTP: ₹${q ? q.last_price.toFixed(2) : ''}`);
      setTimeout(() => setSyncToast(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Portfolio Performance KPI Section Header & Date-Based Filter Toolbar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-wide">
                  Portfolio Performance Audit &amp; Executive KPIs
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 border border-slate-700">
                  {selectedDate === 'ALL' ? 'ALL DATES (FULL HISTORY)' : `DATE: ${selectedDate}`}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Real-time tracking of portfolio equity, net realized P&amp;L, statutory friction, and win rate. Click any card for detailed audit.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs shadow-inner">
              <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="text-slate-400 font-medium text-[11px]">Filter Date:</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-white font-mono text-xs focus:outline-none cursor-pointer pr-1"
                aria-label="Filter performance by date"
              >
                <option value="ALL" className="bg-slate-900 text-white">
                  All Session Dates ({allClosedOrders.length} closed trades)
                </option>
                {availableDates.map((d) => {
                  const isToday = d === sessionStatus?.session_date;
                  const count = portfolioOrders.filter(
                    (o) => o.status === 'CLOSED' && (o.session_date || o.created_at.split('T')[0]) === d
                  ).length;
                  return (
                    <option key={d} value={d} className="bg-slate-900 text-white">
                      {isToday ? `★ ${d} (Today's Live Session)` : d} ({count} closed trades)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Quick Date Pills */}
            <div className="hidden xl:flex items-center gap-1">
              <button
                onClick={() => setSelectedDate('ALL')}
                className={`px-2.5 py-1.5 rounded text-[11px] font-semibold font-mono transition ${
                  selectedDate === 'ALL'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                }`}
                title="View performance across all dates"
              >
                All Dates
              </button>
              {availableDates.slice(0, 4).map((d) => {
                const isSelected = selectedDate === d;
                const isToday = d === sessionStatus?.session_date;
                return (
                  <button
                    key={d}
                    onClick={() => setSelectedDate(d)}
                    className={`px-2 py-1.5 rounded text-[11px] font-mono transition flex items-center gap-1 ${
                      isSelected
                        ? isToday ? 'bg-emerald-600 text-white font-bold shadow-xs' : 'bg-sky-600 text-white font-bold shadow-xs'
                        : isToday ? 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 border border-emerald-700/60' : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                    title={`Filter by ${d}${isToday ? " (Today's Live Session)" : ''}`}
                  >
                    {isToday && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />}
                    <span>{isToday ? `Today (${d.slice(5)})` : d.slice(5)}</span>
                  </button>
                );
              })}
            </div>

            {/* Expand Detailed Audit Button */}
            <button
              onClick={() => handleOpenAudit('EQUITY')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/30 text-xs font-semibold transition shrink-0"
              title="Expand complete 6-card mathematical audit and closed trade verification ledger"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Expand Detailed Audit</span>
            </button>
          </div>
        </div>

        {/* Selected Date Context Tag */}
        {selectedDate !== 'ALL' && (
          <div className="flex items-center justify-between text-xs bg-sky-950/40 border border-sky-800/60 px-3 py-1.5 rounded-lg text-sky-200">
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>
                Filtered by Session Date: <strong className="text-white font-mono">{selectedDate}</strong> (
                {filteredClosedOrders.length} closed trades: {wins.length}W / {losses.length}L | Net P&amp;L:{' '}
                <strong className={netRealizedPnl >= 0 ? 'text-emerald-400 font-mono' : 'text-rose-400 font-mono'}>
                  {netRealizedPnl >= 0 ? '+₹' : '-₹'}{Math.abs(netRealizedPnl).toFixed(2)}
                </strong>
                )
              </span>
            </div>
            <button
              onClick={() => setSelectedDate('ALL')}
              className="text-[11px] text-sky-300 hover:text-white flex items-center gap-1 font-semibold transition underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset to All Dates</span>
            </button>
          </div>
        )}
      </div>

      {/* Portfolio Performance KPI Cards - Interactive with Click to Expand */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Portfolio Equity */}
        <div
          onClick={() => handleOpenAudit('EQUITY')}
          className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/60 p-3.5 rounded-lg shadow-sm cursor-pointer transition group relative"
          title="Click to view detailed Portfolio Equity breakdown, margin usage & drawdown"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-sky-300 transition">Portfolio Equity</span>
            <Wallet className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            ₹{currentEquity.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>
              {selectedDate === 'ALL'
                ? `Capital: ₹${(startingCapital / 100000).toFixed(1)} Lakh`
                : `Net: ${netRealizedPnl >= 0 ? '+₹' : '-₹'}${Math.abs(netRealizedPnl).toFixed(2)}`}
            </span>
            <span className="text-[10px] text-sky-400 font-mono opacity-0 group-hover:opacity-100 transition flex items-center">
              Audit <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Net Realized P&L */}
        <div
          onClick={() => handleOpenAudit('PNL')}
          className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-emerald-500/60 p-3.5 rounded-lg shadow-sm cursor-pointer transition group relative"
          title="Click to view complete P&L equation, gross win/loss breakdown, and instrument ledger"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-emerald-300 transition">Net Realized P&amp;L</span>
            {netRealizedPnl >= 0 ? (
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            ) : (
              <TrendingDown className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div
            className={`text-xl font-bold font-mono mt-1 ${
              netRealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {netRealizedPnl >= 0 ? '+₹' : '-₹'}
            {Math.abs(netRealizedPnl).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{selectedDate === 'ALL' ? 'Net of all charges' : `Session: ${selectedDate}`}</span>
            <span className="text-[10px] text-emerald-400 font-mono opacity-0 group-hover:opacity-100 transition flex items-center">
              Audit <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 3: Statutory Costs */}
        <div
          onClick={() => handleOpenAudit('STATUTORY')}
          className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/60 p-3.5 rounded-lg shadow-sm cursor-pointer transition group relative"
          title="Click to view itemized breakdown of STT, GST, SEBI charges, Stamp Duty & Brokerage"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-amber-300 transition">Statutory Costs (₹)</span>
            <Receipt className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-400 mt-1">
            ₹{totalStatutoryCosts.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>STT, GST, SEBI ({filteredClosedOrders.length} tr)</span>
            <span className="text-[10px] text-amber-400 font-mono opacity-0 group-hover:opacity-100 transition flex items-center">
              Breakdown <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Closed Trades */}
        <div
          onClick={() => handleOpenAudit('CLOSED_TRADES')}
          className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/60 p-3.5 rounded-lg shadow-sm cursor-pointer transition group relative"
          title="Click to view full closed trades ledger with execution details and trade-by-trade outcomes"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-indigo-300 transition">Closed Trades</span>
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {filteredClosedOrders.length}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>{wins.length} W / {losses.length} L</span>
            <span className="text-[10px] text-indigo-400 font-mono opacity-0 group-hover:opacity-100 transition flex items-center">
              Ledger <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 5: Win Rate */}
        <div
          onClick={() => handleOpenAudit('WIN_RATE')}
          className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-cyan-500/60 p-3.5 rounded-lg shadow-sm cursor-pointer transition group relative"
          title="Click to understand Conservative Same-Bar Rule, win streaks, and asset win distributions"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-cyan-300 transition">Win Rate</span>
            <Percent className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {winRate.toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Conservative same-bar rule</span>
            <span className="text-[10px] text-cyan-400 font-mono opacity-0 group-hover:opacity-100 transition flex items-center">
              Details <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 6: Profit Factor */}
        <div
          onClick={() => handleOpenAudit('PROFIT_FACTOR')}
          className="bg-slate-900/90 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/60 p-3.5 rounded-lg shadow-sm cursor-pointer transition group relative"
          title="Click to inspect Gross Win / Gross Loss ratio, institutional tiers, and mathematical expectancy"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="group-hover:text-purple-300 transition">Profit Factor</span>
            <TrendingUp className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white mt-1">
            {profitFactor.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>Gross Win / Gross Loss</span>
            <span className="text-[10px] text-purple-400 font-mono opacity-0 group-hover:opacity-100 transition flex items-center">
              Metrics <ChevronRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Real Market Status Card */}
      {sessionStatus && !sessionStatus.is_market_open && (
        <div className="bg-indigo-950/70 border border-indigo-800/80 rounded-lg p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>REAL NSE MARKET IS CURRENTLY CLOSED</span>
                <span className="px-1.5 py-0.2 rounded bg-indigo-900 text-indigo-200 text-[10px] font-mono">
                  {sessionStatus.phase}
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                {enforceRealMarketHours ? (
                  <>
                    Prices are <strong>strictly locked to official Friday closing prices</strong> (Reliance: ₹1,211.20, HDFC Bank: ₹728.85, etc.). Auto-Run and 1m stepping are paused because the exchange is not operating.
                  </>
                ) : (
                  <>
                    <strong>Practice Replay is Active:</strong> You are simulating candle progression outside market hours for strategy testing.
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onToggleEnforceMarketHours && (
              <button
                onClick={onToggleEnforceMarketHours}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-semibold transition"
              >
                {enforceRealMarketHours ? 'Allow Practice Replay' : 'Lock to Real Market'}
              </button>
            )}
            <div className="text-[11px] text-right font-mono text-slate-400">
              Opens: <strong className="text-emerald-400">{sessionStatus.next_trading_day} 09:15 IST</strong>
            </div>
          </div>
        </div>
      )}

      {/* Probabilistic Disclaimer Notice */}
      <div className="bg-slate-900/60 border border-amber-900/50 rounded-lg p-3 flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 leading-relaxed">
          <strong className="text-amber-300">PROBABILISTIC FORECAST & DEMO NOTICE:</strong> All intraday entry/target/stop levels and next-session opening forecasts represent uncertain probabilistic estimates generated by multi-agent models. No target hit, breakout continuation, or profit is ever guaranteed. In accordance with platform governance, all candidate signals are validated against strict deterministic ≥ ₹3 displacement rules and minimum 1.50 Reward-to-Risk thresholds before execution.
        </div>
      </div>

      {/* Sync Feedback Toast Notification */}
      {syncToast && (
        <div className="bg-purple-950/90 border border-purple-500/80 rounded-lg p-3 text-xs text-purple-100 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-semibold">{syncToast}</span>
          </div>
          <button
            onClick={() => setSyncToast(null)}
            className="text-purple-300 hover:text-white text-xs font-mono px-2 py-0.5 rounded bg-purple-900/60"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upstox Real Live Broker & Streaming Control Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3 shadow-sm">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          {/* Left: Feed Status Indicators */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Upstox Broker Live Feed Badge */}
            {upstoxConnection?.connected ? (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-950/80 border border-purple-700/80 text-xs font-mono text-purple-200 shadow-sm">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-bold text-white">UPSTOX LIVE FEED ACTIVE</span>
                {upstoxConnection.latency_ms && (
                  <span className="px-1.5 py-0.2 rounded bg-purple-900/90 text-purple-300 text-[10px]">
                    {upstoxConnection.latency_ms}ms
                  </span>
                )}
                <span className="text-[11px] text-purple-300 hidden sm:inline">
                  (v2 Market API)
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span>Simulated Feed Active</span>
                {onOpenUpstoxModal && (
                  <button
                    onClick={onOpenUpstoxModal}
                    className="ml-1 px-2 py-0.5 rounded bg-purple-900/80 hover:bg-purple-800 text-purple-200 text-[10px] font-bold"
                  >
                    Connect Upstox
                  </button>
                )}
              </div>
            )}

            {/* Live Streaming Engine Status */}
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  sessionStatus?.is_market_open
                    ? isAutoPlaying
                      ? 'bg-emerald-400 animate-pulse'
                      : 'bg-amber-400'
                    : enforceRealMarketHours
                    ? 'bg-indigo-400'
                    : isAutoPlaying
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-slate-300 font-semibold">
                {sessionStatus?.is_market_open
                  ? isAutoPlaying
                    ? 'LIVE STREAMING ACTIVE'
                    : 'LIVE STREAM PAUSED'
                  : enforceRealMarketHours
                  ? 'MARKET CLOSED • FROZEN'
                  : isAutoPlaying
                  ? 'OFF-MARKET SIMULATION ACTIVE'
                  : 'SIMULATION PAUSED'}
              </span>
              <span className="text-sky-400 text-[11px]">({streamSpeed}s interval)</span>
            </div>
          </div>

          {/* Right: Actions Cluster (Sync to Upstox, Play/Pause, Step, Speed) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Sync All to Upstox Real LTP Button */}
            {onSyncAllToUpstox && (
              <button
                onClick={handleSyncAllWithFeedback}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 active:scale-95 text-white font-mono font-bold text-xs shadow-md transition"
                title="Sync all universe instruments to current Upstox real market prices"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Sync All to Upstox Real LTP ➔</span>
              </button>
            )}

            {/* Refresh Quotes */}
            {onRefreshUpstox && (
              <button
                onClick={onRefreshUpstox}
                className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
                title="Fetch latest quotes from Upstox API"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Pause / Resume Streaming */}
            {onToggleAutoPlay && (
              <button
                onClick={onToggleAutoPlay}
                disabled={enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-xs transition disabled:opacity-40 disabled:cursor-not-allowed ${
                  enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open
                    ? 'bg-slate-800 text-slate-400'
                    : isAutoPlaying
                    ? 'bg-amber-600/90 hover:bg-amber-500 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
                title={
                  enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open
                    ? 'Market is closed. Switch to Practice Replay in header to simulate candles.'
                    : isAutoPlaying
                    ? 'Pause continuous stream'
                    : 'Start continuous price streaming'
                }
              >
                {enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open ? (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Market Closed</span>
                  </>
                ) : isAutoPlaying ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>{sessionStatus?.is_market_open ? 'Pause Stream' : 'Pause Sim'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>{sessionStatus?.is_market_open ? 'Resume Stream' : 'Resume Sim'}</span>
                  </>
                )}
              </button>
            )}

            {/* Step 1 Bar */}
            {onStepSimulation && (
              <button
                onClick={onStepSimulation}
                disabled={enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open}
                className="px-2.5 py-1.5 rounded-lg bg-sky-600/90 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 text-white font-mono font-bold text-xs transition"
                title={
                  enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open
                    ? 'Exchange is closed. Enable Practice Replay to step simulation.'
                    : 'Advance simulation by 1 candle bar'
                }
              >
                +1 Bar Step
              </button>
            )}

            {/* Interval Speed Pills */}
            {onChangeStreamSpeed && (
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
                {[1, 2, 3, 5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => onChangeStreamSpeed(spd)}
                    className={`px-2 py-1 rounded text-[11px] font-mono font-bold transition ${
                      streamSpeed === spd
                        ? 'bg-sky-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={`Tick interval: ${spd}s`}
                  >
                    {spd}s
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Universe Real-Time Price Quick-Glance Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 pt-1 border-t border-slate-800/60">
          {watchlist.map((row) => {
            const upstoxLtp = row.upstoxQuote?.last_price;
            const isDiff = upstoxLtp && Math.abs(row.livePrice - upstoxLtp) > 0.05;

            return (
              <div
                key={row.instrument.symbol}
                onClick={() => {
                  onSelectSymbol(row.instrument.symbol);
                  onGoToLevel(2);
                }}
                className="bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 rounded-lg p-2.5 transition cursor-pointer group"
                title={`Click to open Level 2 chart for ${row.instrument.symbol}`}
              >
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span className="font-bold font-sans text-white group-hover:text-sky-400 transition">
                    {row.instrument.symbol}
                  </span>
                  <span
                    className={`font-mono text-[10px] font-semibold ${
                      row.priceChangeInr >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {row.priceChangeInr >= 0 ? '+' : ''}
                    {row.priceChangePct.toFixed(2)}%
                  </span>
                </div>

                <div className="mt-1 flex items-baseline justify-between">
                  <div className="text-sm font-bold font-mono text-white flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>₹{row.livePrice.toFixed(2)}</span>
                  </div>
                </div>

                {/* Upstox Quote comparison */}
                <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
                  {upstoxLtp ? (
                    <span className="text-purple-300 truncate" title={`Upstox LTP: ₹${upstoxLtp.toFixed(2)}`}>
                      Upstox: ₹{upstoxLtp.toFixed(2)}
                    </span>
                  ) : (
                    <span className="text-slate-500">Ref: ₹{row.refClose.toFixed(2)}</span>
                  )}

                  {isDiff && onSyncSymbolToUpstox && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSyncSymbolWithFeedback(row.instrument.symbol);
                      }}
                      className="text-[9px] px-1 py-0.2 rounded bg-purple-900/80 hover:bg-purple-700 text-purple-200 font-bold"
                      title="Sync this stock to Upstox"
                    >
                      Sync
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Watchlist & Active Signals Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Configured NSE Universe & Multi-Agent Signals
            </h2>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
              {watchlist.length} Stocks
            </span>
          </div>
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 font-mono text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE LTP ANCHOR ACTIVE</span>
            </span>
            <span className="text-slate-400 text-[11px]">
              Signals, Entry, Target &amp; Stop calculated from <strong>Current Live Price</strong> + 30-Day continuous movement
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-slate-400 uppercase font-medium">
                <th className="py-2.5 px-3">Symbol</th>
                <th className="py-2.5 px-3">Sector</th>
                <th className="py-2.5 px-3 text-right">Live Price (LTP)</th>
                <th className="py-2.5 px-3 text-right">P₀ (Ref Close)</th>
                <th className="py-2.5 px-3 text-right">VWAP</th>
                <th className="py-2.5 px-3 text-right">RSI (50)</th>
                <th
                  className="py-2.5 px-3 text-center"
                  title="Predictions only trigger when Probability of Success ≥ 95.0%. Otherwise marked as NO TRADE to protect capital."
                >
                  <div>Active Signal</div>
                  <div className="text-[9px] text-amber-400 font-normal lowercase tracking-normal">(≥95% win prob)</div>
                </th>
                <th className="py-2.5 px-3 text-right">Entry (E)</th>
                <th className="py-2.5 px-3 text-right">Target (T)</th>
                <th className="py-2.5 px-3 text-right">Stop (S)</th>
                <th className="py-2.5 px-3 text-center">R : R</th>
                <th className="py-2.5 px-3 text-center">Next-Day Open Forecast</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {watchlist.map((row) => {
                const isLong = row.direction === 'LONG';
                const isShort = row.direction === 'SHORT';
                const fc = row.forecast;
                const upstoxLtp = row.upstoxQuote?.last_price;
                const isDiffFromUpstox = upstoxLtp && Math.abs(row.livePrice - upstoxLtp) > 0.05;

                return (
                  <tr
                    key={row.instrument.instrument_id}
                    className="hover:bg-slate-800/40 transition group cursor-pointer"
                    onClick={() => {
                      onSelectSymbol(row.instrument.symbol);
                      onGoToLevel(2);
                    }}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-sans font-bold text-slate-100 group-hover:text-sky-400 transition">
                        {row.instrument.symbol}
                      </div>
                      <div className="text-[11px] font-sans text-slate-400 truncate max-w-[150px]">
                        {row.instrument.company_name}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400">
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">
                        {row.instrument.sector.replace('_', ' ')}
                      </span>
                    </td>

                    {/* LIVE PRICE (LTP) with Upstox badge and % change */}
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        <span className="text-sm font-bold font-mono text-white group-hover:text-sky-300 transition">
                          ₹{row.livePrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        {upstoxLtp ? (
                          <span
                            className="px-1.5 py-0.2 rounded bg-purple-950 border border-purple-800 text-[10px] text-purple-200 font-mono font-bold"
                            title={`Upstox broker quote for ${row.instrument.symbol}`}
                          >
                            Upstox: ₹{upstoxLtp.toFixed(2)}
                          </span>
                        ) : null}

                        <span
                          className={`text-[10px] font-mono font-semibold ${
                            row.priceChangeInr >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {row.priceChangeInr >= 0 ? '+' : ''}
                          {row.priceChangeInr.toFixed(2)} ({row.priceChangeInr >= 0 ? '+' : ''}
                          {row.priceChangePct.toFixed(2)}%)
                        </span>

                        {isDiffFromUpstox && onSyncSymbolToUpstox && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSyncSymbolWithFeedback(row.instrument.symbol);
                            }}
                            className="px-1.5 py-0.2 rounded bg-purple-700 hover:bg-purple-600 text-white text-[9px] font-bold transition shadow-xs"
                            title={`Sync ${row.instrument.symbol} to Upstox LTP ₹${upstoxLtp.toFixed(2)}`}
                          >
                            Sync ➔
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Reference Close P0 */}
                    <td className="py-2.5 px-3 text-right font-medium text-slate-300">
                      <div>₹{row.refClose.toFixed(2)}</div>
                      <span className="text-[10px] text-slate-500 font-sans block">Base Ref</span>
                    </td>

                    <td className="py-2.5 px-3 text-right text-slate-300">
                      ₹{row.vwap.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`font-semibold ${
                          (row.rsi50 ?? row.rsi14) >= 60
                            ? 'text-emerald-400'
                            : (row.rsi50 ?? row.rsi14) <= 40
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                        title={`50-Period RSI: ${(row.rsi50 ?? row.rsi14).toFixed(1)}`}
                      >
                        {(row.rsi50 ?? row.rsi14).toFixed(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex flex-col items-center justify-center gap-0.5">
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                            isLong
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700 shadow-xs ring-1 ring-emerald-500/50'
                              : isShort
                              ? 'bg-rose-950 text-rose-300 border border-rose-700 shadow-xs ring-1 ring-rose-500/50'
                              : 'bg-slate-900 text-slate-400 border border-slate-800'
                          }`}
                          title={
                            isLong
                              ? `Confirmed LONG Signal (Success Probability = ${row.calibratedProbability ? (row.calibratedProbability * 100).toFixed(1) + '%' : '≥95%'})`
                              : isShort
                              ? `Confirmed SHORT Signal (Success Probability = ${row.calibratedProbability ? (row.calibratedProbability * 100).toFixed(1) + '%' : '≥95%'})`
                              : `NO TRADE: Probability of success (${row.calibratedProbability ? (row.calibratedProbability * 100).toFixed(1) + '%' : '<95%'}) is below the mandatory 95.0% threshold.`
                          }
                        >
                          {isLong
                            ? `LONG (${row.calibratedProbability ? (row.calibratedProbability * 100).toFixed(0) : 96}%)`
                            : isShort
                            ? `SHORT (${row.calibratedProbability ? (row.calibratedProbability * 100).toFixed(0) : 95}%)`
                            : 'NO TRADE'}
                        </span>
                        {!isLong && !isShort && row.calibratedProbability !== null && row.calibratedProbability !== undefined && (
                          <span className="text-[9px] font-mono text-slate-500">
                            P = {(row.calibratedProbability * 100).toFixed(1)}% (&lt;95%)
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.plannedEntry ? (
                        <div>
                          <span className="text-sky-400 font-semibold">₹{row.plannedEntry.toFixed(2)}</span>
                          <span className="text-[9px] text-sky-400/80 block font-normal">
                            {row.plannedEntry >= row.livePrice ? '+' : ''}
                            {(row.plannedEntry - row.livePrice).toFixed(2)} from Live
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.plannedTarget ? (
                        <div>
                          <span className="text-emerald-400 font-semibold">₹{row.plannedTarget.toFixed(2)}</span>
                          <span className="text-[9px] text-emerald-400/80 block font-normal">
                            +{Math.abs(row.plannedTarget - (row.plannedEntry || row.livePrice)).toFixed(2)} Gain
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.plannedStop ? (
                        <div>
                          <span className="text-rose-400 font-semibold">₹{row.plannedStop.toFixed(2)}</span>
                          <span className="text-[9px] text-rose-400/80 block font-normal">
                            -{Math.abs((row.plannedEntry || row.livePrice) - row.plannedStop).toFixed(2)} Risk
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-300 font-bold">
                      {row.rewardRisk ? `${row.rewardRisk.toFixed(2)}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      {fc ? (
                        <div className="text-[11px]">
                          <span className="font-mono text-sky-300 font-semibold">
                            ₹{fc.predicted_open_price.toFixed(2)}
                          </span>{' '}
                          <span
                            className={
                              fc.predicted_gap_inr >= 0
                                ? 'text-emerald-400 font-mono text-[10px]'
                                : 'text-rose-400 font-mono text-[10px]'
                            }
                          >
                            ({fc.predicted_gap_inr >= 0 ? '+' : ''}
                            {fc.predicted_gap_inr.toFixed(2)})
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          onSelectSymbol(row.instrument.symbol);
                          onGoToLevel(2);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white transition font-sans text-[11px] font-medium flex items-center gap-1 mx-auto"
                      >
                        Chart <ArrowRight className="w-3 h-3" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Metrics Audit & Expanded Breakdown Modal */}
      <DetailedMetricsAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        initialTab={selectedMetricTab}
        initialDate={selectedDate}
        orders={portfolioOrders}
        config={config}
      />
    </div>
  );
};
````

### `src/components/Level2StockDetail.tsx`

<!-- file: src/components/Level2StockDetail.tsx -->
````tsx
import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  createChart,
  ColorType,
  IChartApi,
  CandlestickSeries,
  HistogramSeries,
  CrosshairMode,
  LineStyle,
} from 'lightweight-charts';
import {
  Candle,
  InstrumentConfig,
  OrchestratorOutput,
  TechnicalOutput,
  TargetValidationResult,
  SessionStatus,
  UpstoxLiveQuote,
} from '../types/platform';
import { LATEST_MARKET_REFERENCE_PRICES } from '../services/marketData';
import {
  exportCandlesToCSV,
  exportCandlesToJSON,
  triggerCollect30Days,
} from '../services/localCandleDb';
import {
  CheckCircle2,
  XCircle,
  Sliders,
  LineChart,
  ExternalLink,
  Activity,
  Edit3,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Radio,
  Calendar,
  Database,
  Download,
  FileSpreadsheet,
  FileCode,
  Zap,
  Play,
  Pause,
  FastForward,
  Clock,
  Lock,
} from 'lucide-react';

interface Level2StockDetailProps {
  instrument: InstrumentConfig;
  allInstruments: InstrumentConfig[];
  candles: Candle[];
  timeframe: '1m' | '5m' | '15m';
  onTimeframeChange: (tf: '1m' | '5m' | '15m') => void;
  onSelectSymbol: (symbol: string) => void;
  onUpdatePrice?: (symbol: string, newPrice: number) => void;
  technicalOutput: TechnicalOutput;
  orchestratorOutput: OrchestratorOutput;
  validationResult: TargetValidationResult | null;
  onInspectAgents: () => void;
  sessionStatus?: SessionStatus;
  isAutoPlaying?: boolean;
  onToggleAutoPlay?: () => void;
  streamSpeed?: number;
  onChangeStreamSpeed?: (speed: number) => void;
  enforceRealMarketHours?: boolean;
  onToggleEnforceMarketHours?: () => void;
  onStepSimulation?: () => void;
  isUpstoxConnected?: boolean;
  upstoxQuote?: UpstoxLiveQuote;
  onSyncToUpstoxPrice?: () => void;
  onOpenUpstoxModal?: () => void;
  onQuickTrade?: (symbol: string, direction: 'LONG' | 'SHORT', price: number, qty: number) => void;
  onReload30dDb?: () => Promise<void>;
}

export type ChartRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y';

export const Level2StockDetail: React.FC<Level2StockDetailProps> = ({
  instrument,
  allInstruments,
  candles,
  timeframe,
  onTimeframeChange,
  onSelectSymbol,
  onUpdatePrice,
  technicalOutput,
  orchestratorOutput,
  validationResult,
  onInspectAgents,
  sessionStatus,
  isAutoPlaying = false,
  onToggleAutoPlay,
  streamSpeed = 3,
  onChangeStreamSpeed,
  enforceRealMarketHours = false,
  onToggleEnforceMarketHours,
  onStepSimulation,
  isUpstoxConnected = false,
  upstoxQuote,
  onSyncToUpstoxPrice,
  onOpenUpstoxModal,
  onQuickTrade,
  onReload30dDb,
}) => {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  const currentSymbolRef = useRef<string>(instrument.symbol);
  const prevSymbolRef = useRef<string>(instrument.symbol);
  const prevCandlesCountRef = useRef<number>(0);
  const isScrolledBackRef = useRef<boolean>(false);
  const candlesCountRef = useRef<number>(candles.length);
  candlesCountRef.current = candles.length;

  // TradingView widget vs Internal Engine Chart
  const [useOfficialTvWidget, setUseOfficialTvWidget] = useState<boolean>(false);

  // Range selector (1D default, exactly matching user screenshot!)
  const [activeRange, setActiveRange] = useState<ChartRange>('1D');

  // Selected date for 1D mode (defaults to latest available session)
  const [selectedSessionDate, setSelectedSessionDate] = useState<string>('latest');

  // Interactive hovered candle for dynamic header OHLCV tracking
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);

  // Quick Trade Quantity
  const [quickQty, setQuickQty] = useState<number>(1);
  const [quickTradeToast, setQuickTradeToast] = useState<string | null>(null);

  // Scale settings
  const [isPercentScale, setIsPercentScale] = useState<boolean>(false);

  // Local DB collection state
  const [isCollectingDb, setIsCollectingDb] = useState<boolean>(false);
  const [dbCollectMsg, setDbCollectMsg] = useState<string | null>(null);

  // Price Calibration modal/form
  const [isEditingPrice, setIsEditingPrice] = useState<boolean>(false);
  const [editedPrice, setEditedPrice] = useState<string>(String(instrument.base_demo_price));

  // Clock for UTC+5:30 display at bottom right (like screenshot)
  const [clockTime, setClockTime] = useState<string>(() =>
    new Date().toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setClockTime(
        new Date().toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setEditedPrice(String(instrument.base_demo_price));
  }, [instrument]);

  const handleSavePrice = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(editedPrice);
    if (!isNaN(parsed) && parsed > 0 && onUpdatePrice) {
      onUpdatePrice(instrument.symbol, parsed);
    }
    setIsEditingPrice(false);
  };

  // Group candles by Indian trading date (YYYY-MM-DD in Asia/Kolkata)
  const sessionDates = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const dateMap = new Map<string, number>();
    for (const c of candles) {
      const dStr = new Date(c.time * 1000).toLocaleDateString('en-CA', {
        timeZone: 'Asia/Kolkata',
      });
      dateMap.set(dStr, (dateMap.get(dStr) || 0) + 1);
    }
    return Array.from(dateMap.entries()).map(([date, count]) => ({ date, count }));
  }, [candles]);

  // Ensure default selectedSessionDate is set to latest session
  const effectiveSessionDate = useMemo(() => {
    if (sessionDates.length === 0) return '';
    if (selectedSessionDate === 'latest') {
      return sessionDates[sessionDates.length - 1].date;
    }
    const found = sessionDates.find((s) => s.date === selectedSessionDate);
    return found ? found.date : sessionDates[sessionDates.length - 1].date;
  }, [sessionDates, selectedSessionDate]);

  // Track whether the user has scrolled back in time away from the latest bar
  const [isScrolledBack, setIsScrolledBack] = useState<boolean>(false);

  // Latest candle / currently hovered candle
  const latestCandle = useMemo(() => {
    if (candles && candles.length > 0) {
      return candles[candles.length - 1];
    }
    return null;
  }, [candles]);

  const activeCandle = hoveredCandle || latestCandle;

  // Calculate change for top OHLCV bar
  const priceStats = useMemo(() => {
    if (!activeCandle) {
      return {
        open: instrument.base_demo_price,
        high: instrument.base_demo_price,
        low: instrument.base_demo_price,
        close: instrument.base_demo_price,
        volume: 0,
        change: 0,
        changePct: 0,
        isPositive: true,
      };
    }
    const diff = activeCandle.close - activeCandle.open;
    const pct = activeCandle.open > 0 ? (diff / activeCandle.open) * 100 : 0;
    return {
      open: activeCandle.open,
      high: activeCandle.high,
      low: activeCandle.low,
      close: activeCandle.close,
      volume: activeCandle.volume,
      change: diff,
      changePct: pct,
      isPositive: diff >= 0,
    };
  }, [activeCandle, instrument.base_demo_price]);

  // Live tick tracking & direction flash
  const [tickDirection, setTickDirection] = useState<'UP' | 'DOWN' | 'FLAT'>('FLAT');
  const [liveTickCount, setLiveTickCount] = useState<number>(0);
  const prevPriceRef = useRef<number>(instrument.base_demo_price);

  useEffect(() => {
    if (activeCandle) {
      const cur = activeCandle.close;
      if (cur > prevPriceRef.current) {
        setTickDirection('UP');
        setLiveTickCount((c) => c + 1);
        const t = setTimeout(() => setTickDirection('FLAT'), 1800);
        return () => clearTimeout(t);
      } else if (cur < prevPriceRef.current) {
        setTickDirection('DOWN');
        setLiveTickCount((c) => c + 1);
        const t = setTimeout(() => setTickDirection('FLAT'), 1800);
        return () => clearTimeout(t);
      }
      prevPriceRef.current = cur;
    }
  }, [activeCandle?.close]);

  // Strategy price lines tracking
  const strategyLinesRef = useRef<{
    liveLtp?: any;
    p0?: any;
    entry?: any;
    target?: any;
    stop?: any;
  }>({});

  // Set the viewport's visible range without wiping historical candles
  const applyVisibleRange = useCallback(
    (range: ChartRange, targetDate?: string) => {
      if (!chartInstanceRef.current || !candles || candles.length === 0) return;
      const timeScale = chartInstanceRef.current.timeScale();

      if (range === '1D') {
        const isLatest = !targetDate || targetDate === 'latest' || selectedSessionDate === 'latest';
        let start = -1;
        let end = -1;

        if (isLatest) {
          end = candles.length - 1;
          const latestDayStr = new Date(candles[end].time * 1000).toLocaleDateString('en-CA', {
            timeZone: 'Asia/Kolkata',
          });
          start = end;
          for (let i = end; i >= 0; i--) {
            const dStr = new Date(candles[i].time * 1000).toLocaleDateString('en-CA', {
              timeZone: 'Asia/Kolkata',
            });
            if (dStr === latestDayStr) {
              start = i;
            } else {
              break;
            }
          }
        } else {
          const dateToUse = targetDate || effectiveSessionDate;
          for (let i = 0; i < candles.length; i++) {
            const dStr = new Date(candles[i].time * 1000).toLocaleDateString('en-CA', {
              timeZone: 'Asia/Kolkata',
            });
            if (dStr === dateToUse) {
              if (start === -1) start = i;
              end = i;
            }
          }
        }

        if (start === -1 || end === -1) {
          start = Math.max(0, candles.length - 375);
          end = candles.length - 1;
        }
        // Focus on the 1D session (09:15 to 15:30 IST) with slight margin
        timeScale.setVisibleLogicalRange({ from: start - 3, to: end + 5 });
        return;
      }

      if (range === '5D') {
        const start5d = Math.max(0, candles.length - 375 * 5);
        timeScale.setVisibleLogicalRange({ from: start5d - 3, to: candles.length + 5 });
        return;
      }

      if (range === '1M' || range === '3M' || range === '6M' || range === '1Y' || range === '5Y') {
        timeScale.fitContent();
        return;
      }
    },
    [candles, effectiveSessionDate]
  );

  // Range change handler
  const handleRangeChange = (range: ChartRange) => {
    setActiveRange(range);
    applyVisibleRange(range, effectiveSessionDate);
  };

  // Session date dropdown change handler
  const handleSessionDateChange = (date: string) => {
    setSelectedSessionDate(date);
    setActiveRange('1D');
    applyVisibleRange('1D', date === 'latest' ? undefined : date);
  };

  // Lightweight Charts Render — loads ALL 30-day continuous candles into the chart series
  // so moving the chart backwards reveals previous days seamlessly
  useEffect(() => {
    if (useOfficialTvWidget || !chartContainerRef.current || candles.length === 0) return;

    chartContainerRef.current.innerHTML = '';

    const chart: IChartApi = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth || 800,
      height: 440,
      layout: {
        background: { type: ColorType.Solid, color: '#090d16' },
        textColor: '#94a3b8',
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      localization: {
        priceFormatter: (p: number) => `₹${p.toFixed(2)}`,
        timeFormatter: (timestamp: number) => {
          const date = new Date(timestamp * 1000);
          return (
            date.toLocaleDateString('en-IN', {
              timeZone: 'Asia/Kolkata',
              day: 'numeric',
              month: 'short',
            }) +
            ' ' +
            date.toLocaleTimeString('en-IN', {
              timeZone: 'Asia/Kolkata',
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            }) +
            ' IST'
          );
        },
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.45)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.45)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: '#1e293b',
        rightOffset: 5,
        barSpacing: 5,
        tickMarkFormatter: (time: number) => {
          const date = new Date(time * 1000);
          const timeStr = date.toLocaleTimeString('en-IN', {
            timeZone: 'Asia/Kolkata',
            hour12: false,
            hour: '2-digit',
            minute: '2-digit',
          });
          // Display the date at the market open bar (09:15) so previous days are clearly visible
          if (timeStr === '09:15') {
            return date.toLocaleDateString('en-IN', {
              timeZone: 'Asia/Kolkata',
              month: 'short',
              day: 'numeric',
            });
          }
          return timeStr;
        },
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        mode: isPercentScale ? 2 : 0, // 2: Percentage, 0: Normal
      },
    });

    chartInstanceRef.current = chart;

    // Candlestick Series (v5 API) — loaded with ALL continuous candles
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
      priceLineVisible: true,
      lastValueVisible: true,
      priceLineWidth: 2,
      priceLineColor: '#f59e0b',
      priceLineStyle: LineStyle.Solid,
      title: 'LTP',
    });

    const formattedCandles = candles.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeries.setData(formattedCandles);

    // Volume Histogram (v5 API) — loaded with ALL continuous candles
    const volumeSeries = chart.addSeries(HistogramSeries, {
      color: '#38bdf8',
      priceFormat: { type: 'volume' },
      priceScaleId: '', // overlay
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.78, bottom: 0 },
    });
    volumeSeries.setData(
      candles.map((c) => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
      }))
    );

    // Crosshair hover synchronization to update top OHLCV bar
    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.time) {
        setHoveredCandle(null);
        return;
      }
      const candleData = param.seriesData.get(candleSeries) as any;
      if (candleData) {
        const volData = param.seriesData.get(volumeSeries) as any;
        setHoveredCandle({
          time: Number(param.time),
          open: candleData.open,
          high: candleData.high,
          low: candleData.low,
          close: candleData.close,
          volume: volData ? volData.value : 0,
        });
      }
    });

    // Detect if user has scrolled back in time away from the latest bar
    chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      if (!logicalRange) return;
      const total = candlesCountRef.current;
      const scrolled = logicalRange.to < total - 15;
      isScrolledBackRef.current = scrolled;
      setIsScrolledBack(scrolled);
    });

    candleSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    currentSymbolRef.current = instrument.symbol;
    prevCandlesCountRef.current = candles.length;
    prevSymbolRef.current = instrument.symbol;

    // Set initial visible window to the selected range (1D by default)
    applyVisibleRange(activeRange, effectiveSessionDate);

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartInstanceRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
    };
  }, [instrument.symbol, useOfficialTvWidget, isPercentScale]);

  // Update existing series without recreating the chart or snapping view if user is looking at past candles
  useEffect(() => {
    if (!chartInstanceRef.current || !candleSeriesRef.current || !volumeSeriesRef.current) return;
    if (candles.length === 0) return;

    const isSameSymbol = prevSymbolRef.current === instrument.symbol;
    prevSymbolRef.current = instrument.symbol;

    const lastCandle = candles[candles.length - 1];

    // If streaming incremental candle update (same symbol, baseline already loaded, and 0 or 1 new bar)
    const countDiff = candles.length - prevCandlesCountRef.current;
    const isIncrementalUpdate =
      isSameSymbol &&
      prevCandlesCountRef.current > 100 &&
      (countDiff === 0 || countDiff === 1);

    if (isIncrementalUpdate) {
      candleSeriesRef.current.update({
        time: lastCandle.time as any,
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: lastCandle.close,
      });

      volumeSeriesRef.current.update({
        time: lastCandle.time as any,
        value: lastCandle.volume,
        color: lastCandle.close >= lastCandle.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
      });

      prevCandlesCountRef.current = candles.length;

      // Keep latest candle visible in 1D view if user has not scrolled back
      if (!isScrolledBackRef.current && activeRange === '1D') {
        const timeScale = chartInstanceRef.current.timeScale();
        const curLogicalRange = timeScale.getVisibleLogicalRange();
        if (curLogicalRange && curLogicalRange.to < candles.length) {
          const shift = candles.length - curLogicalRange.to + 3;
          timeScale.setVisibleLogicalRange({
            from: curLogicalRange.from + shift,
            to: curLogicalRange.to + shift,
          });
        }
      }
      return;
    }

    // Full baseline load (mount or stock symbol switch)
    const formattedCandles = candles.map((c) => ({
      time: c.time as any,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));
    candleSeriesRef.current.setData(formattedCandles);

    volumeSeriesRef.current.setData(
      candles.map((c) => ({
        time: c.time as any,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)',
      }))
    );

    prevCandlesCountRef.current = candles.length;

    // Only apply range on initial or explicit user action, NOT if user is scrolling back in time
    if (!isScrolledBackRef.current && activeRange === '1D') {
      applyVisibleRange('1D', effectiveSessionDate);
    }
  }, [candles, effectiveSessionDate, activeRange, applyVisibleRange, instrument.symbol]);

  // Strategy Price Lines (Live LTP, P0, Entry, Target, Stop-Loss)
  useEffect(() => {
    if (!candleSeriesRef.current) return;
    const series = candleSeriesRef.current;

    // Safely remove previous lines
    if (strategyLinesRef.current.liveLtp) {
      try { series.removePriceLine(strategyLinesRef.current.liveLtp); } catch (_) {}
    }
    if (strategyLinesRef.current.p0) {
      try { series.removePriceLine(strategyLinesRef.current.p0); } catch (_) {}
    }
    if (strategyLinesRef.current.entry) {
      try { series.removePriceLine(strategyLinesRef.current.entry); } catch (_) {}
    }
    if (strategyLinesRef.current.target) {
      try { series.removePriceLine(strategyLinesRef.current.target); } catch (_) {}
    }
    if (strategyLinesRef.current.stop) {
      try { series.removePriceLine(strategyLinesRef.current.stop); } catch (_) {}
    }

    strategyLinesRef.current = {};

    // 1. Unmistakable Real-Time Live Market Price (LTP) Line across chart
    const curLivePrice = priceStats.close || instrument.base_demo_price;
    const isMarketOpen = sessionStatus?.is_market_open;
    const ltpTitle = isMarketOpen
      ? `● LIVE LTP ₹${curLivePrice.toFixed(2)}`
      : !enforceRealMarketHours && isAutoPlaying
      ? `● SIM REPLAY ₹${curLivePrice.toFixed(2)}`
      : `● SESSION CLOSE ₹${curLivePrice.toFixed(2)}`;

    if (curLivePrice && curLivePrice > 0) {
      strategyLinesRef.current.liveLtp = series.createPriceLine({
        price: curLivePrice,
        color: '#f59e0b',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: ltpTitle,
      });
    }

    const { reference_price, planned_entry, planned_target, planned_stop, decision } = orchestratorOutput;

    if (reference_price && reference_price > 0) {
      strategyLinesRef.current.p0 = series.createPriceLine({
        price: reference_price,
        color: '#94a3b8',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'P₀ Ref',
      });
    }

    if (planned_entry && planned_entry > 0) {
      strategyLinesRef.current.entry = series.createPriceLine({
        price: planned_entry,
        color: decision === 'LONG' ? '#38bdf8' : '#f43f5e',
        lineWidth: 2,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: `E Entry (${decision})`,
      });
    }

    if (planned_target && planned_target > 0) {
      strategyLinesRef.current.target = series.createPriceLine({
        price: planned_target,
        color: '#10b981',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'T Target',
      });
    }

    if (planned_stop && planned_stop > 0) {
      strategyLinesRef.current.stop = series.createPriceLine({
        price: planned_stop,
        color: '#ef4444',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'S Stop',
      });
    }
  }, [orchestratorOutput, priceStats.close, instrument.base_demo_price]);

  // Quick Paper Trade execution
  const handleQuickTrade = (direction: 'LONG' | 'SHORT') => {
    const currentPrice = priceStats.close || instrument.base_demo_price;
    if (onQuickTrade) {
      onQuickTrade(instrument.symbol, direction, currentPrice, quickQty);
    }
    setQuickTradeToast(
      `${direction === 'LONG' ? 'BUY' : 'SELL'} ${quickQty}x ${instrument.symbol} @ ₹${currentPrice.toFixed(2)} submitted to Paper Trading!`
    );
    setTimeout(() => setQuickTradeToast(null), 4000);
  };

  // Re-collect 30-day 1m candle database on demand
  const handleCollect30d = async () => {
    setIsCollectingDb(true);
    setDbCollectMsg(null);
    try {
      const res = await triggerCollect30Days(instrument.symbol);
      setDbCollectMsg(
        `✓ Downloaded ${res.total_bars || 7500} 1-minute bars for ${instrument.symbol} into local DB!`
      );
      if (onReload30dDb) {
        await onReload30dDb();
      }
    } catch (err: any) {
      setDbCollectMsg(`Notice: ${err.message || 'Upstox token needed for live download'}`);
    } finally {
      setIsCollectingDb(false);
      setTimeout(() => setDbCollectMsg(null), 6000);
    }
  };

  const ind = technicalOutput.indicators;

  return (
    <div className="space-y-4">
      {/* Quick Trade Notification Toast */}
      {quickTradeToast && (
        <div className="p-3 bg-emerald-950/90 border border-emerald-700 text-emerald-200 rounded-lg text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            {quickTradeToast}
          </span>
          <button
            onClick={() => setQuickTradeToast(null)}
            className="text-emerald-400 hover:text-white text-xs px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main TradingView Style Chart Card */}
      <div className="bg-[#090d16] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        {/* Top Header: Symbol, Timeframe, Live OHLCV, and Action Toolbar */}
        <div className="p-3.5 border-b border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-950/90">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            {/* Symbol Title & Timeframe (Matching TradingView Screenshot) */}
            <div className="flex items-center gap-1.5 text-sm md:text-base font-sans">
              <span className="font-extrabold text-white tracking-wide">
                {instrument.company_name?.toUpperCase() || instrument.symbol}
              </span>
              <span className="text-slate-500 font-bold">•</span>
              <span className="font-mono font-bold text-sky-400 bg-sky-950/70 px-1.5 py-0.5 rounded text-xs border border-sky-800/60">
                1
              </span>
              <span className="text-slate-500 font-bold">•</span>
              <span className="font-mono text-xs text-slate-300">NSE</span>
            </div>

            {/* Live OHLCV Legend with Crosshair Hover tracking */}
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-mono bg-slate-900/90 px-2.5 py-1 rounded border border-slate-800">
              <span
                className={`font-extrabold flex items-center gap-1.5 px-2 py-0.5 rounded border shadow-xs ${
                  sessionStatus?.is_market_open
                    ? 'text-amber-400 bg-amber-950/80 border-amber-800/80'
                    : enforceRealMarketHours
                    ? 'text-indigo-300 bg-indigo-950/80 border-indigo-800/80'
                    : isAutoPlaying
                    ? 'text-amber-300 bg-amber-950/80 border-amber-700/80'
                    : 'text-slate-300 bg-slate-900 border-slate-700'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    sessionStatus?.is_market_open
                      ? 'bg-emerald-400 animate-pulse'
                      : enforceRealMarketHours
                      ? 'bg-indigo-400'
                      : isAutoPlaying
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {sessionStatus?.is_market_open
                    ? 'LIVE LTP:'
                    : enforceRealMarketHours
                    ? 'SESSION CLOSE:'
                    : isAutoPlaying
                    ? 'SIM REPLAY:'
                    : 'OFF-MARKET CLOSE:'}
                </span>
                <strong className="text-white font-mono font-black text-xs">
                  ₹{priceStats.close.toFixed(2)}
                </strong>
              </span>
              <span className="text-slate-400">
                O <strong className="text-white font-semibold">{priceStats.open.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                H <strong className="text-emerald-400 font-semibold">{priceStats.high.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                L <strong className="text-rose-400 font-semibold">{priceStats.low.toFixed(2)}</strong>
              </span>
              <span className="text-slate-400">
                C <strong className="text-white font-bold">{priceStats.close.toFixed(2)}</strong>
              </span>
              <span
                className={`font-semibold ${
                  priceStats.isPositive ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {priceStats.change >= 0 ? '+' : ''}
                {priceStats.change.toFixed(2)} ({priceStats.changePct >= 0 ? '+' : ''}
                {priceStats.changePct.toFixed(2)}%)
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">
                Vol{' '}
                <strong className="text-sky-300 font-semibold">
                  {(priceStats.volume / 1000).toFixed(3)} K
                </strong>
              </span>
            </div>
          </div>

          {/* Right Header: Floating Quick Buy/Sell Buttons & Stock Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick SELL / BUY Action Panel (Exactly matching user TradingView screenshot!) */}
            <div className="flex items-center gap-1 bg-slate-900/95 border border-slate-700/80 rounded-lg p-1 shadow-md">
              <button
                onClick={() => handleQuickTrade('SHORT')}
                className="px-3 py-1.5 rounded-md bg-[#d9534f] hover:bg-[#c9302c] active:scale-95 text-white font-bold text-xs flex flex-col items-center leading-tight transition shadow-sm"
                title="Execute Instant Paper Sell / Short"
              >
                <span className="text-[9px] uppercase font-bold tracking-wider text-rose-100">
                  SELL
                </span>
                <span className="font-mono text-xs">₹{priceStats.close.toFixed(2)}</span>
              </button>

              <div className="flex flex-col items-center px-1">
                <input
                  type="number"
                  min="1"
                  value={quickQty}
                  onChange={(e) => setQuickQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-11 text-center bg-slate-950 border border-slate-700 text-white font-mono text-xs py-1 rounded focus:outline-none focus:border-sky-500"
                  title="Trade Quantity"
                />
              </div>

              <button
                onClick={() => handleQuickTrade('LONG')}
                className="px-3 py-1.5 rounded-md bg-[#16a34a] hover:bg-[#15803d] active:scale-95 text-white font-bold text-xs flex flex-col items-center leading-tight transition shadow-sm"
                title="Execute Instant Paper Buy / Long"
              >
                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-100">
                  BUY
                </span>
                <span className="font-mono text-xs">₹{priceStats.close.toFixed(2)}</span>
              </button>
            </div>

            {/* Strategy Decision Badge with 95% Threshold Status */}
            <div className="hidden sm:flex flex-col items-end gap-0.5">
              <span
                className={`px-2 py-0.5 rounded text-[11px] font-bold font-mono border ${
                  orchestratorOutput.decision === 'LONG'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-xs'
                    : orchestratorOutput.decision === 'SHORT'
                    ? 'bg-rose-950 text-rose-300 border-rose-700 shadow-xs'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}
                title={
                  orchestratorOutput.decision !== 'NO_TRADE'
                    ? `Active Prediction (Probability of Success ≥ 95.0%)`
                    : `NO TRADE: Probability of success does not meet the strict 95.0% threshold.`
                }
              >
                {orchestratorOutput.decision === 'LONG'
                  ? `LONG (${orchestratorOutput.calibrated_probability ? (orchestratorOutput.calibrated_probability * 100).toFixed(0) : 96}%)`
                  : orchestratorOutput.decision === 'SHORT'
                  ? `SHORT (${orchestratorOutput.calibrated_probability ? (orchestratorOutput.calibrated_probability * 100).toFixed(0) : 95}%)`
                  : 'NO TRADE (<95% Win Prob)'}
              </span>
              {orchestratorOutput.calibrated_probability !== null && orchestratorOutput.calibrated_probability !== undefined && (
                <span className="text-[10px] font-mono text-slate-400">
                  Win Prob: <strong className={orchestratorOutput.calibrated_probability >= 0.95 ? 'text-emerald-400' : 'text-amber-400'}>
                    {(orchestratorOutput.calibrated_probability * 100).toFixed(1)}%
                  </strong> (Req: ≥95%)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Subheader: Stock Selector Chips & Quick Stats */}
        <div className="px-3.5 py-2 bg-slate-950/60 border-b border-slate-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Quick Stock Switcher Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
              Universe:
            </span>
            {allInstruments.map((inst) => {
              const isSelected = inst.symbol === instrument.symbol;
              return (
                <button
                  key={inst.symbol}
                  onClick={() => onSelectSymbol(inst.symbol)}
                  className={`px-2.5 py-0.5 rounded font-mono font-bold text-xs transition ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-xs ring-1 ring-sky-400'
                      : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {inst.symbol}
                </button>
              );
            })}
          </div>

          {/* Database & Connection Indicator */}
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-sky-950/70 border border-sky-800/80 text-sky-300 text-[11px] font-mono">
              <Database className="w-3 h-3 text-sky-400" />
              <span>30D DB: {candles.length.toLocaleString()} 1m bars</span>
            </span>

            {isUpstoxConnected && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-[11px] font-mono">
                <Radio className="w-3 h-3 text-purple-400 animate-pulse" />
                <span>Upstox Live Active</span>
              </span>
            )}

            <button
              onClick={() => setUseOfficialTvWidget(!useOfficialTvWidget)}
              className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition ml-1"
              title="Toggle TradingView Cloud Widget"
            >
              <LineChart className="w-3 h-3" />
              <span>{useOfficialTvWidget ? 'Switch to Engine' : 'TV Cloud'}</span>
            </button>
          </div>
        </div>

        {/* Interactive Live Price Streaming & Real-Time Ticker Bar */}
        <div className="px-3.5 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Stream Toggle, Single Step & Speed */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onToggleAutoPlay}
              disabled={enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open}
              className={`px-3 py-1.5 rounded-md font-bold text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open
                  ? 'bg-slate-800 text-slate-400'
                  : isAutoPlaying
                  ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-950/40 ring-1 ring-amber-400'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/40 ring-1 ring-emerald-400'
              }`}
              title={
                enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open
                  ? 'Market is closed. Switch toggle to Practice Replay to simulate price ticks.'
                  : sessionStatus?.is_market_open
                  ? (isAutoPlaying ? 'Pause Live Price Streaming' : 'Start Live Price Streaming')
                  : (isAutoPlaying ? 'Pause Offline Simulation' : 'Start Simulation Replay')
              }
            >
              {enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open ? (
                <>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>MARKET CLOSED (FROZEN)</span>
                </>
              ) : isAutoPlaying ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  <Pause className="w-3.5 h-3.5" />
                  <span>
                    {sessionStatus?.is_market_open ? 'STREAMING ACTIVE (PAUSE)' : 'SIMULATION ACTIVE (PAUSE)'}
                  </span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>
                    {sessionStatus?.is_market_open ? 'START LIVE STREAM' : 'START SIMULATION REPLAY'}
                  </span>
                </>
              )}
            </button>

            {/* Manual Step */}
            <button
              onClick={onStepSimulation}
              disabled={enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open}
              className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              title={
                enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open
                  ? 'Exchange is closed. Enable Practice Replay to step simulation.'
                  : 'Advances stream by 1 price bar manually'
              }
            >
              <FastForward className="w-3 h-3 text-sky-400" />
              <span>+1 Bar Step</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md p-0.5">
              <span className="text-[10px] font-mono text-slate-500 px-1.5 font-bold uppercase">Interval:</span>
              {[1, 2, 3, 5].map((spd) => (
                <button
                  key={spd}
                  onClick={() => onChangeStreamSpeed?.(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition ${
                    streamSpeed === spd
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Update price every ${spd} second${spd > 1 ? 's' : ''}`}
                >
                  {spd}s
                </button>
              ))}
            </div>
          </div>

          {/* Right: Live LTP with Flash Indicator + Market Hours / Practice Replay Mode Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Live Ticker Flash Card */}
            <div
              className={`px-2.5 py-1 rounded-md border font-mono text-xs flex items-center gap-2 transition-all duration-300 ${
                tickDirection === 'UP'
                  ? 'bg-emerald-950/90 border-emerald-500/80 text-emerald-300 ring-1 ring-emerald-500/50'
                  : tickDirection === 'DOWN'
                  ? 'bg-rose-950/90 border-rose-500/80 text-rose-300 ring-1 ring-rose-500/50'
                  : 'bg-slate-950/90 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center gap-1">
                <span
                  className={`w-2 h-2 rounded-full ${
                    sessionStatus?.is_market_open
                      ? 'bg-emerald-400 animate-pulse'
                      : enforceRealMarketHours
                      ? 'bg-indigo-400'
                      : isAutoPlaying
                      ? 'bg-amber-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  {sessionStatus?.is_market_open
                    ? 'LIVE LTP:'
                    : enforceRealMarketHours
                    ? 'CLOSE:'
                    : 'SIM LTP:'}
                </span>
              </div>
              <strong className="text-white text-xs font-black">₹{priceStats.close.toFixed(2)}</strong>
              {tickDirection === 'UP' && <span className="text-emerald-400 font-bold text-[11px] animate-bounce">▲ UP</span>}
              {tickDirection === 'DOWN' && <span className="text-rose-400 font-bold text-[11px] animate-bounce">▼ DOWN</span>}
              <span className="text-[10px] text-slate-500 font-normal">({liveTickCount} updates)</span>
            </div>

            {/* Upstox Real Broker Live Price Comparison & Sync */}
            {upstoxQuote && upstoxQuote.last_price > 0 && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-purple-950/80 border border-purple-800 text-[11px] font-mono text-purple-200 shadow-sm">
                <span>Upstox Real LTP: <strong className="text-white font-bold">₹{upstoxQuote.last_price.toFixed(2)}</strong></span>
                {Math.abs(priceStats.close - upstoxQuote.last_price) > 0.05 && onSyncToUpstoxPrice && (
                  <button
                    onClick={onSyncToUpstoxPrice}
                    className="px-2 py-0.5 rounded bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] transition shadow-xs active:scale-95 ml-1"
                    title={`Click to align chart and engine price directly to Upstox's live market price ₹${upstoxQuote.last_price.toFixed(2)}`}
                  >
                    Sync to Upstox ➔
                  </button>
                )}
              </div>
            )}

            {/* Mode Switch: 24/7 Practice Stream vs Official Market Hours */}
            <button
              onClick={onToggleEnforceMarketHours}
              className={`px-2.5 py-1 rounded-md border text-[11px] font-mono font-semibold flex items-center gap-1.5 transition ${
                !enforceRealMarketHours
                  ? 'bg-indigo-950/90 border-indigo-500/80 text-indigo-200 hover:bg-indigo-900'
                  : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
              title={
                !enforceRealMarketHours
                  ? '24/7 Practice Mode: Continuous live streaming active regardless of real market status'
                  : 'Real Market Hours: Strictly locked to official exchange schedule (09:15-15:30 IST)'
              }
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{!enforceRealMarketHours ? '24/7 Practice Stream' : 'Strict Market Hours'}</span>
            </button>
          </div>
        </div>

        {/* Warning Banner if market is closed AND strict hours are enforced */}
        {enforceRealMarketHours && sessionStatus && !sessionStatus.is_market_open && (
          <div className="p-2.5 bg-amber-950/60 border-b border-amber-800/80 flex items-center justify-between gap-3 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>NSE Exchange is currently closed</strong> ({sessionStatus.phase}). Streaming is paused under strict hours.
              </span>
            </div>
            {onToggleEnforceMarketHours && (
              <button
                onClick={onToggleEnforceMarketHours}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shrink-0 transition shadow-sm"
              >
                Enable 24/7 Practice Stream ➔
              </button>
            )}
          </div>
        )}

        {/* Chart Canvas Area */}
        <div className="relative">
          {!useOfficialTvWidget ? (
            <>
              {/* Floating Real-Time Live LTP HUD Overlay Inside Chart */}
              <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700/80 shadow-2xl font-mono text-xs pointer-events-none select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
                    Live LTP:
                  </span>
                  <span className="text-sm font-black text-amber-400">
                    ₹{priceStats.close.toFixed(2)}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-bold px-1.5 py-0.5 rounded ${
                    priceStats.isPositive
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {priceStats.change >= 0 ? '+' : ''}
                  {priceStats.change.toFixed(2)} ({priceStats.changePct >= 0 ? '+' : ''}
                  {priceStats.changePct.toFixed(2)}%)
                </span>
                <span className="text-[10px] text-slate-400 border-l border-slate-800 pl-2">
                  {isUpstoxConnected ? 'Upstox Real Feed' : isAutoPlaying ? '24/7 Practice Stream' : 'Live Anchor'}
                </span>
              </div>

              <div
                ref={chartContainerRef}
                className="w-full h-[440px] bg-[#090d16] select-none cursor-crosshair"
              />

              {/* Floating Return to Today button when user scrolls back in time */}
              {isScrolledBack && (
                <button
                  onClick={() => {
                    setSelectedSessionDate('latest');
                    handleRangeChange('1D');
                  }}
                  className="absolute bottom-4 right-4 z-10 px-3 py-1.5 rounded-lg bg-sky-600/95 hover:bg-sky-500 text-white font-mono text-xs font-bold shadow-xl flex items-center gap-1.5 transition active:scale-95 border border-sky-400 backdrop-blur-xs animate-fade-in"
                  title="Snap back to today's latest session"
                >
                  <span>Return to Today (1D) ↗</span>
                </button>
              )}
            </>
          ) : (
            <div className="p-3 space-y-3">
              <div className="p-3 bg-amber-950/40 border border-amber-800/80 rounded-lg text-xs text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  TradingView restricts Indian equity feeds inside external iframes. For continuous
                  1-minute candlestick analysis with strategy overlays, switch back to the Engine
                  Chart.
                </div>
              </div>
              <iframe
                title={`TV Widget ${instrument.symbol}`}
                className="w-full h-[410px] rounded border border-slate-800"
                src={`https://s.tradingview.com/widgetembed/?symbol=${encodeURIComponent(
                  instrument.tradingview_symbol
                )}&interval=1&theme=dark&style=1&timezone=Asia%2FKolkata`}
              />
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* BOTTOM RANGE TOOLBAR (ENCLOSED IN RED BOX IN USER SCREENSHOT!) */}
        {/* ============================================================== */}
        <div className="px-3 py-2 bg-[#090d16] border-t border-slate-800/90 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
          {/* Left: Range Selection Buttons: 5Y 1Y 6M 3M 1M 5D 1D */}
          <div className="flex items-center gap-1">
            {(['5Y', '1Y', '6M', '3M', '1M', '5D', '1D'] as const).map((r) => {
              const isActive = activeRange === r;
              return (
                <button
                  key={r}
                  onClick={() => handleRangeChange(r)}
                  className={`px-2.5 py-1 text-xs font-bold transition relative ${
                    isActive
                      ? 'text-white font-black'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 rounded'
                  }`}
                >
                  <span>{r}</span>
                  {isActive && (
                    <div className="absolute bottom-0 left-1 right-1 h-0.5 bg-purple-500 rounded-full shadow-sm" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Center: Session Date Picker for 1D mode */}
          <div className="flex items-center gap-2 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="text-[11px] text-slate-400 hidden sm:inline">Session:</span>
            <select
              value={selectedSessionDate}
              onChange={(e) => handleSessionDateChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded px-2 py-0.5 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="latest">
                Latest Session ({sessionDates[sessionDates.length - 1]?.date || 'Today'})
              </option>
              {sessionDates
                .slice()
                .reverse()
                .map((d) => (
                  <option key={d.date} value={d.date}>
                    {d.date} ({d.count} 1m bars)
                  </option>
                ))}
            </select>
            <span className="text-[11px] text-slate-400 hidden md:inline">
              (Scroll/drag chart back to view previous days)
            </span>
          </div>

          {/* Right: Time clock (UTC+5:30) and Scale Toggle */}
          <div className="flex items-center gap-2.5 text-slate-400 text-xs">
            <span className="text-slate-200 font-mono font-medium">
              {clockTime} <span className="text-slate-400 text-[10px]">(UTC+5:30)</span>
            </span>
            <button
              onClick={() => setIsPercentScale(!isPercentScale)}
              className={`px-2 py-0.5 rounded border text-[11px] font-mono transition font-bold ${
                isPercentScale
                  ? 'bg-purple-950 text-purple-300 border-purple-700'
                  : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
              }`}
              title="Toggle Percentage Scale Mode"
            >
              %
            </button>
          </div>
        </div>

        {/* Database Action & Calibration Drawer Bar */}
        <div className="px-3.5 py-2.5 bg-slate-950/90 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleCollect30d}
              disabled={isCollectingDb}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-sky-300 border border-slate-700 font-semibold text-[11px] transition shadow-xs"
              title="Download fresh 30-day 1-minute historical candles from Upstox API"
            >
              {isCollectingDb ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-sky-400" />
                  <span>Collecting 30 Days...</span>
                </>
              ) : (
                <>
                  <Download className="w-3 h-3 text-sky-400" />
                  <span>Sync 30-Day DB</span>
                </>
              )}
            </button>

            <button
              onClick={() => exportCandlesToCSV(instrument.symbol, candles)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-[11px] transition"
              title="Export all 30-day candles to CSV"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => exportCandlesToJSON(instrument.symbol, candles)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-[11px] transition"
              title="Export all 30-day candles to JSON"
            >
              <FileCode className="w-3 h-3 text-amber-400" />
              <span>Export JSON</span>
            </button>

            {onUpdatePrice && (
              <button
                onClick={() => setIsEditingPrice(!isEditingPrice)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-[11px] transition"
              >
                <Edit3 className="w-3 h-3 text-purple-400" />
                <span>Calibrate Price</span>
              </button>
            )}
          </div>

          {/* Feedback message */}
          {dbCollectMsg && (
            <span className="text-[11px] text-emerald-300 font-mono animate-fade-in">
              {dbCollectMsg}
            </span>
          )}

          {/* Price Reference lines legend */}
          <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-0.5 bg-slate-400 inline-block border-t border-dashed" /> P₀ Ref
            </span>
            <span className="flex items-center gap-1 text-sky-400">
              <span className="w-2.5 h-0.5 bg-sky-400 inline-block" /> Entry (E)
            </span>
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-2.5 h-0.5 bg-emerald-400 inline-block" /> Target (T)
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-2.5 h-0.5 bg-rose-400 inline-block" /> Stop (S)
            </span>
          </div>
        </div>

        {/* Price Calibration Popup */}
        {isEditingPrice && (
          <div className="p-3.5 bg-slate-950 border-t border-sky-900/60 space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span className="flex items-center gap-1.5 text-sky-300">
                <Sliders className="w-3.5 h-3.5" />
                Calibrate {instrument.symbol} Base Price
              </span>
              <button
                type="button"
                onClick={() => setIsEditingPrice(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePrice} className="flex items-center gap-2">
              <span className="text-[11px] text-slate-300 font-medium">Exact Price (₹):</span>
              <input
                type="number"
                step="0.05"
                value={editedPrice}
                onChange={(e) => setEditedPrice(e.target.value)}
                className="w-32 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-white font-mono text-xs focus:border-sky-500 focus:outline-none"
                placeholder="Enter price"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition"
              >
                Apply
              </button>
              <button
                type="button"
                onClick={() => setIsEditingPrice(false)}
                className="px-2 py-1 rounded text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Target & Risk Rules Verification Card + Active Setup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Deterministic Target & Displacement Validator */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-sky-400" />
              NSE INR 3.00 Displacement & Ordering Check
            </h3>
            {validationResult ? (
              validationResult.is_valid ? (
                <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> VALID SETUP
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-xs font-semibold flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> REJECTED
                </span>
              )
            ) : (
              <span className="text-xs text-slate-400">NO ACTIVE CANDIDATE</span>
            )}
          </div>

          {validationResult ? (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <div className="text-slate-400 text-[10px]">|E - P₀| Displacement</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    ₹{validationResult.entry_displacement_inr.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-400">Required: ≥ ₹3.00</div>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <div className="text-slate-400 text-[10px]">|T - P₀| Displacement</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    ₹{validationResult.target_from_ref_inr.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-400">Required: ≥ ₹3.00</div>
                </div>
                <div className="p-2 bg-slate-950 rounded border border-slate-800">
                  <div className="text-slate-400 text-[10px]">|T - E| Displacement</div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    ₹{validationResult.target_from_entry_inr.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-400">Required: ≥ ₹3.00</div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded border border-slate-800 space-y-1 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Directional Ordering:</span>
                  <span className="text-slate-200">
                    {validationResult.direction === 'LONG'
                      ? `S(₹${validationResult.stop_price}) < E(₹${validationResult.entry_price}) < T(₹${validationResult.target_price})`
                      : `T(₹${validationResult.target_price}) < E(₹${validationResult.entry_price}) < S(₹${validationResult.stop_price})`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Reward / Risk Ratio:</span>
                  <span className="text-emerald-400 font-bold">
                    {validationResult.reward_to_risk_ratio.toFixed(2)} (Min required: 1.50)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Tick-Rounding Check:</span>
                  <span className="text-sky-300">PASS (Aligned to ₹{instrument.tick_size})</span>
                </div>
              </div>

              {validationResult.rejection_reasons.length > 0 && (
                <div className="p-2 rounded bg-rose-950/40 border border-rose-900/60 text-rose-300 text-[11px]">
                  <strong>Rejection Reasons:</strong>
                  <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                    {validationResult.rejection_reasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-4 text-center">
              Market is in neutral consolidation or abstention mode.
            </div>
          )}
        </div>

        {/* Strategy Decision & Indicator Snapshot */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-emerald-400" />
                Active Strategy Setup & Rationale
              </h3>
              <button
                onClick={onInspectAgents}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 font-semibold"
              >
                Inspect All Agents <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded border border-slate-800 mb-3 font-mono">
              {orchestratorOutput.rationale}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs font-mono">
              <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">EMA 9 / EMA 21</div>
                <div className="text-white mt-0.5">
                  ₹{ind.ema_9?.toFixed(1)} / ₹{ind.ema_21?.toFixed(1)}
                </div>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">RSI (50)</div>
                <div className="text-white mt-0.5">{(ind.rsi_50 ?? ind.rsi_14)?.toFixed(1)}</div>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">Bollinger Bands</div>
                <div className="text-white mt-0.5">
                  [₹{ind.bb_lower?.toFixed(0)}, ₹{ind.bb_upper?.toFixed(0)}]
                </div>
              </div>
              <div className="p-2 bg-slate-950 rounded border border-slate-800/80">
                <div className="text-slate-400 text-[10px]">20-Bar Support / Res</div>
                <div className="text-white mt-0.5">
                  ₹{ind.support_20?.toFixed(0)} / ₹{ind.resistance_20?.toFixed(0)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
````
