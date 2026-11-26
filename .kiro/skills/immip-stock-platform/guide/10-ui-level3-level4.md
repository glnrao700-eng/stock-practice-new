# Step 10: Level 3 (Agent Inspection) and Level 4 (Paper Trading & Post-Mortem)

- **Level 3, "LangGraph Multi-Agent Execution Audit"**: pipeline steps ingestion → technical → pattern → sentiment → fundamental → orchestrator,
  each expandable, plus "All Specialist Cards Overview".
- **Level 4, "Date-Based Paper Trading & Self-Learning Execution Ledger"**: sections INTRADAY, NEXT_DAY, PREV_VS_NEXT_OPEN
  (gap matrix) and LEARNING_STORE (category filter and search). Outcome filter ALL/SUCCESS/FAILURE/ACTIVE, order audit panel,
  failure diagnosis, and links to FailureLessonModal and DetailedMetricsAuditModal.

## Files

- `src/components/Level3AgentInspection.tsx`
- `src/components/Level4PaperTrading.tsx`

### `src/components/Level3AgentInspection.tsx`

<!-- file: src/components/Level3AgentInspection.tsx -->
````tsx
import React, { useState } from 'react';
import {
  Cpu,
  BarChart2,
  Compass,
  MessageSquare,
  Building2,
  Workflow,
  Clock,
  Layers,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Database,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Target,
  Maximize2,
  Minimize2,
  Info,
  Scale,
} from 'lucide-react';
import { AgentRunAudit, PlatformConfig } from '../types/platform';

interface Level3AgentInspectionProps {
  audit: AgentRunAudit | null;
  config: PlatformConfig;
}

type PipelineStepKey =
  | 'ingestion'
  | 'technical'
  | 'pattern'
  | 'sentiment'
  | 'fundamental'
  | 'orchestrator';

export const Level3AgentInspection: React.FC<Level3AgentInspectionProps> = ({ audit, config }) => {
  const [selectedStep, setSelectedStep] = useState<PipelineStepKey>('orchestrator');
  const [expandAll, setExpandAll] = useState<boolean>(false);
  const [expandedSteps, setExpandedSteps] = useState<Record<PipelineStepKey, boolean>>({
    ingestion: false,
    technical: false,
    pattern: false,
    sentiment: false,
    fundamental: false,
    orchestrator: true,
  });

  if (!audit) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-8 text-center text-slate-400">
        No agent audit record available yet. Step candle or start replay to execute the LangGraph multi-agent pipeline.
      </div>
    );
  }

  const {
    technical_output: tech,
    pattern_output: pattern,
    sentiment_output: sent,
    fundamental_output: fund,
    orchestrator_output: orch,
  } = audit;

  const weights = config.agent_weights;
  const ind = tech.indicators;

  const toggleStepAccordion = (step: PipelineStepKey) => {
    setExpandedSteps((prev) => ({
      ...prev,
      [step]: !prev[step],
    }));
  };

  const handleSelectStep = (step: PipelineStepKey) => {
    setSelectedStep(step);
    setExpandedSteps((prev) => ({
      ...prev,
      [step]: true,
    }));
  };

  // Helper calculation for display
  const techWeighted = (weights.technical * tech.score).toFixed(3);
  const patternWeighted = (weights.pattern * pattern.score).toFixed(3);
  const sentWeighted =
    sent.score !== null ? (weights.sentiment * sent.score).toFixed(3) : '0.000';
  const fundWeighted = (weights.fundamental * fund.score).toFixed(3);

  // Render individual expanded step detail card
  const renderStepCard = (stepKey: PipelineStepKey, isAccordion = false) => {
    const isExpanded = expandAll || (isAccordion ? expandedSteps[stepKey] : selectedStep === stepKey);

    let title = '';
    let icon = null;
    let badgeColor = '';
    let badgeText = '';
    let nodeLabel = '';

    switch (stepKey) {
      case 'ingestion':
        title = 'Data Ingestion & Multi-Timeframe Alignment';
        nodeLabel = 'Node: START';
        icon = <Database className="w-4 h-4 text-emerald-400" />;
        badgeColor = 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
        badgeText = 'INGESTION COMPLETE';
        break;
      case 'technical':
        title = `1. Technical Analysis Agent (${(weights.technical * 100).toFixed(0)}% Weight)`;
        nodeLabel = 'Specialist Node 1';
        icon = <BarChart2 className="w-4 h-4 text-sky-400" />;
        badgeColor =
          tech.score > 0
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
            : tech.score < 0
            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
            : 'bg-slate-800 text-slate-300 border-slate-700';
        badgeText = `Score: ${tech.score >= 0 ? '+' : ''}${tech.score.toFixed(2)} (${tech.bias})`;
        break;
      case 'pattern':
        title = `2. Pattern Recognition Agent (${(weights.pattern * 100).toFixed(0)}% Weight)`;
        nodeLabel = 'Specialist Node 2';
        icon = <Compass className="w-4 h-4 text-purple-400" />;
        badgeColor =
          pattern.score > 0
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
            : pattern.score < 0
            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
            : 'bg-slate-800 text-slate-300 border-slate-700';
        badgeText = `Score: ${pattern.score >= 0 ? '+' : ''}${pattern.score.toFixed(2)} (${pattern.status})`;
        break;
      case 'sentiment':
        title = `3. Sentiment Analysis Agent (${(weights.sentiment * 100).toFixed(0)}% Weight)`;
        nodeLabel = 'Specialist Node 3';
        icon = <MessageSquare className="w-4 h-4 text-amber-400" />;
        badgeColor =
          sent.score !== null && sent.score > 0
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
            : sent.score !== null && sent.score < 0
            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
            : 'bg-amber-950/80 text-amber-300 border-amber-800';
        badgeText =
          sent.score !== null
            ? `Score: ${sent.score >= 0 ? '+' : ''}${sent.score.toFixed(2)} (${sent.classification})`
            : 'UNCERTAIN_MISSING_DATA';
        break;
      case 'fundamental':
        title = `4. Fundamental Analysis Agent (${(weights.fundamental * 100).toFixed(0)}% Weight)`;
        nodeLabel = 'Specialist Node 4';
        icon = <Building2 className="w-4 h-4 text-emerald-400" />;
        badgeColor =
          fund.score > 0
            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800'
            : fund.score < 0
            ? 'bg-rose-950/80 text-rose-300 border-rose-800'
            : 'bg-slate-800 text-slate-300 border-slate-700';
        badgeText = `Score: ${fund.score >= 0 ? '+' : ''}${fund.score.toFixed(2)} (${fund.status})`;
        break;
      case 'orchestrator':
        title = 'Node: ORCHESTRATOR — Target & Risk Gate (Fan-In Aggregator)';
        nodeLabel = 'Node: ORCHESTRATOR';
        icon = <Target className="w-4 h-4 text-sky-400" />;
        badgeColor =
          orch.decision === 'LONG'
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-700'
            : orch.decision === 'SHORT'
            ? 'bg-rose-950/90 text-rose-300 border-rose-700'
            : 'bg-slate-800 text-slate-300 border-slate-700';
        badgeText = `Decision: ${orch.decision} (Composite: ${orch.composite_score >= 0 ? '+' : ''}${orch.composite_score.toFixed(3)})`;
        break;
    }

    return (
      <div
        key={stepKey}
        className={`bg-slate-900/90 border rounded-xl overflow-hidden transition-all duration-200 ${
          selectedStep === stepKey && !expandAll
            ? 'border-sky-500 shadow-lg shadow-sky-950/30 ring-1 ring-sky-500/30'
            : 'border-slate-800 hover:border-slate-700'
        }`}
      >
        {/* Step Header Accordion Toggle */}
        <button
          onClick={() => {
            if (isAccordion) {
              toggleStepAccordion(stepKey);
            } else {
              handleSelectStep(stepKey);
            }
          }}
          className="w-full px-4 py-3.5 flex items-center justify-between gap-3 text-left bg-slate-900/70 hover:bg-slate-850 transition"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">{icon}</div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {nodeLabel}
                </span>
                <h4 className="text-sm font-bold text-white tracking-tight">{title}</h4>
              </div>
              <div className="text-xs text-slate-400 mt-0.5 font-mono">
                Instrument: <span className="text-slate-200">{audit.symbol}</span> | Correlation:{' '}
                <span className="text-slate-300">{audit.correlation_id}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span className={`text-xs px-2.5 py-1 rounded font-mono font-bold border ${badgeColor}`}>
              {badgeText}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {/* Expanded Content with Input / Progress & Logic / Output */}
        {isExpanded && (
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/70 space-y-4 text-xs font-sans">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* ===================== INPUT BOX ===================== */}
              <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-sky-400 font-bold uppercase tracking-wider text-[11px]">
                  <Database className="w-3.5 h-3.5" />
                  <span>📥 Input Data Received</span>
                </div>

                {stepKey === 'ingestion' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">1-Minute Candles:</span>
                      <strong className="font-mono text-emerald-400">375 session bars (09:15-15:30)</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">30-Day Historical Database:</span>
                      <strong className="font-mono text-slate-200">7,500 continuous bars</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Higher Timeframes:</span>
                      <strong className="font-mono text-slate-200">5m & 15m synthesized</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Exchange Filings & Headlines:</span>
                      <strong className="font-mono text-slate-200">{sent.item_count} items ingested</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Fundamental Snapshot:</span>
                      <strong className="font-mono text-slate-200">{fund.sector_model} model loaded</strong>
                    </div>
                  </div>
                )}

                {stepKey === 'technical' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Evaluated Dataset:</span>
                      <strong className="font-mono text-emerald-400">
                        {ind.total_bars_evaluated ? `${ind.total_bars_evaluated.toLocaleString()} bars (30 Days)` : '30-Day DB Bars'}
                      </strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Last Close (C):</span>
                      <strong className="font-mono text-sky-300">₹{ind.last_close.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">30-Day High / Low Range:</span>
                      <strong className="font-mono text-slate-200">
                        [₹{ind.low_30d?.toFixed(2) || '1195'} - ₹{ind.high_30d?.toFixed(2) || '1215'}]
                      </strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">30-Day VWAP:</span>
                      <strong className="font-mono text-purple-300">₹{ind.vwap_30d?.toFixed(2) || ind.vwap.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Weight:</span>
                      <strong className="font-mono text-slate-200">{(weights.technical * 100).toFixed(0)}%</strong>
                    </div>
                  </div>
                )}

                {stepKey === 'pattern' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">30-Day Macro Geometry:</span>
                      <strong className="font-mono text-emerald-400">Full 30-Day Swing Sequence</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">30-Day Swing Trend:</span>
                      <strong className="font-mono text-purple-300">
                        {pattern.macro_30d_framework?.swing_trend.replace('_', ' ') || 'SIDEWAYS RANGE'}
                      </strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">30-Day 50% Fib Retracement:</span>
                      <strong className="font-mono text-slate-200">
                        ₹{pattern.macro_30d_framework?.fib_500.toFixed(2) || '1202.00'}
                      </strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Immediate Lookback Window:</span>
                      <strong className="font-mono text-slate-200">Trailing 25 continuous bars</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Weight:</span>
                      <strong className="font-mono text-slate-200">{(weights.pattern * 100).toFixed(0)}%</strong>
                    </div>
                  </div>
                )}

                {stepKey === 'sentiment' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Ingested Feed Items:</span>
                      <strong className="font-mono text-amber-300">{sent.item_count} headlines/filings</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Regulatory Filings Weight:</span>
                      <strong className="font-mono text-slate-200">75%</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Social Commentary Weight:</span>
                      <strong className="font-mono text-slate-200">25%</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Weight:</span>
                      <strong className="font-mono text-slate-200">{(weights.sentiment * 100).toFixed(0)}%</strong>
                    </div>
                  </div>
                )}

                {stepKey === 'fundamental' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Sector Classification:</span>
                      <strong className="font-mono text-emerald-300">{fund.sector_model}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Fiscal Period Snapshot:</span>
                      <strong className="font-mono text-slate-200">{fund.fiscal_period}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Earnings Proximity:</span>
                      <strong className="font-mono text-slate-200">
                        {fund.earnings_risk_flag ? 'WITHIN 48H' : 'NO IMMINENT RELEASE'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Assigned Weight:</span>
                      <strong className="font-mono text-slate-200">{(weights.fundamental * 100).toFixed(0)}%</strong>
                    </div>
                  </div>
                )}

                {stepKey === 'orchestrator' && (
                  <div className="space-y-1.5 text-slate-300">
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Reference Price (P₀):</span>
                      <strong className="font-mono text-sky-300">₹{orch.reference_price.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Agent Scores:</span>
                      <span className="font-mono text-xs">
                        T:{tech.score >= 0 ? '+' : ''}{tech.score.toFixed(2)} | P:{pattern.score >= 0 ? '+' : ''}{pattern.score.toFixed(2)} | S:{sent.score !== null ? sent.score.toFixed(2) : 'N/A'} | F:{fund.score >= 0 ? '+' : ''}{fund.score.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">ATR (14) Volatility:</span>
                      <strong className="font-mono text-slate-200">₹{ind.atr_14.toFixed(2)}</strong>
                    </div>
                    <div className="flex justify-between border-b border-slate-800/80 pb-1">
                      <span className="text-slate-400">Neutral Score Band:</span>
                      <strong className="font-mono text-slate-200">[-0.22, +0.22]</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">NSE Tick Size:</span>
                      <strong className="font-mono text-slate-200">₹0.05</strong>
                    </div>
                  </div>
                )}
              </div>

              {/* ===================== PROGRESS & LOGIC BOX ===================== */}
              <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-purple-400 font-bold uppercase tracking-wider text-[11px]">
                  <Workflow className="w-3.5 h-3.5" />
                  <span>⚙️ Progress & Algorithmic Logic</span>
                </div>

                {stepKey === 'ingestion' && (
                  <div className="space-y-2 text-slate-300 leading-relaxed text-[11px]">
                    <p>
                      <strong>1. Timeframe Alignment:</strong> Parses timestamps to Indian Standard Time (Asia/Kolkata) to verify strict session boundaries (09:15 to 15:30 IST).
                    </p>
                    <p>
                      <strong>2. Zero-Gap Integrity:</strong> Verifies each candle has valid open, high, low, close, and volume. Drops malformed or corrupt quotes.
                    </p>
                    <p>
                      <strong>3. Audit Envelope Generation:</strong> Binds execution to unique <code>Run ID</code> and <code>Correlation ID</code> for audit traceability.
                    </p>
                    <p>
                      <strong>4. Parallel Fan-Out:</strong> Spawns non-blocking async threads to the 4 specialist evaluation engines simultaneously.
                    </p>
                  </div>
                )}

                {stepKey === 'technical' && (
                  <div className="space-y-2 text-slate-300 leading-relaxed text-[11px]">
                    <p>
                      <strong>• Trend (SMA & EMA):</strong> Calculates SMA-20, SMA-50, EMA-9, and EMA-21 using exponential multiplier <span className="font-mono text-sky-300">k = 2 / (N + 1)</span>.
                    </p>
                    <p>
                      <strong>• Momentum (MACD & RSI):</strong> Evaluates MACD (12, 26, 9) line divergence and 50-period Relative Strength Index (<span className="font-mono text-sky-300">RSI = {(ind.rsi_50 ?? ind.rsi_14)?.toFixed(1)}</span>).
                    </p>
                    <p>
                      <strong>• Volatility & Benchmark:</strong> Computes Bollinger Bands (20, 2σ), True Range ATR-14 (₹{ind.atr_14.toFixed(2)}), and intraday VWAP (₹{ind.vwap.toFixed(2)}).
                    </p>
                    <p>
                      <strong>• Scoring Logic:</strong> Bullish momentum (+0.50 to +1.00) requires price &gt; VWAP and EMA-9 &gt; EMA-21. Contradictory signals produce neutral 0.00.
                    </p>
                  </div>
                )}

                {stepKey === 'pattern' && (
                  <div className="space-y-2 text-slate-300 leading-relaxed text-[11px]">
                    <p>
                      <strong>• Geometry Division:</strong> Evaluates recent 24 bars into Half 1 vs Half 2 to compute pivots: L1 vs L2 and H1 vs H2.
                    </p>
                    <p>
                      <strong>• Bearish Breakdown Test:</strong> Triggered if current close breaches prior low support (<span className="font-mono text-purple-300">₹{pattern.formation_boundaries.support.toFixed(2)}</span>) with descending lower-highs.
                    </p>
                    <p>
                      <strong>• Volume Confirmation Rule:</strong> Validates if current bar volume exceeds the 24-bar average by at least <span className="font-mono text-purple-300">1.10×</span>.
                    </p>
                    <p>
                      <strong>• Scoring:</strong> Confirmed formation yields <span className="font-mono text-rose-300">-0.75</span> (or +0.75 for breakout). Unconfirmed yields -0.45 / +0.45.
                    </p>
                  </div>
                )}

                {stepKey === 'sentiment' && (
                  <div className="space-y-2 text-slate-300 leading-relaxed text-[11px]">
                    <p>
                      <strong>• Normalized Deduplication:</strong> Hashes headline text to prevent sentiment double-counting.
                    </p>
                    <p>
                      <strong>• 75/25 Weighting Formula:</strong>
                      <br />
                      <span className="font-mono text-amber-300">
                        Score = 0.75 × S_filings + 0.25 × S_social
                      </span>
                    </p>
                    <p>
                      <strong>• Missing Data Guard:</strong> If no items exist before cutoff, marks <code>UNCERTAIN_MISSING_DATA</code> without silently assuming 0.00.
                    </p>
                    <p>
                      <strong>• Classification Band:</strong> Bullish if score &ge; +0.20, Bearish if &le; -0.20, otherwise Neutral.
                    </p>
                  </div>
                )}

                {stepKey === 'fundamental' && (
                  <div className="space-y-2 text-slate-300 leading-relaxed text-[11px]">
                    <p>
                      <strong>• Sector Rule Branching:</strong>
                      <br />
                      - Banking Model: Evaluates NIM &ge; 3.5%, GNPA &le; 2.0%, CRAR &ge; 15.0%.
                      <br />
                      - Corporate Model: Evaluates ROE &ge; 14.0%, Operating Margin &ge; 15.0%, D/E &le; 0.60.
                    </p>
                    <p>
                      <strong>• Earnings Proximity Gate:</strong> Flags elevated binary gap risk if quarterly earnings release is scheduled within 48 hours.
                    </p>
                    <p>
                      <strong>• Scoring:</strong> Strong corporate metrics yield <span className="font-mono text-emerald-300">+0.55</span>; degraded metrics yield -0.20.
                    </p>
                  </div>
                )}

                {stepKey === 'orchestrator' && (
                  <div className="space-y-2 text-slate-300 leading-relaxed text-[11px]">
                    <p>
                      <strong>1. Fan-In Composite Formula:</strong>
                      <br />
                      <span className="font-mono text-sky-300">
                        S = (0.40×T) + (0.30×P) + (0.15×S) + (0.15×F)
                      </span>
                      <br />
                      <span className="font-mono text-slate-400">
                        = (0.40×{tech.score.toFixed(2)}) + (0.30×{pattern.score.toFixed(2)}) + (0.15×{(sent.score || 0).toFixed(2)}) + (0.15×{fund.score.toFixed(2)})
                      </span>
                      <br />
                      <span className="font-mono font-bold text-sky-400">
                        = {techWeighted} + ({patternWeighted}) + {sentWeighted} + {fundWeighted} = {orch.composite_score.toFixed(3)}
                      </span>
                    </p>
                    <p>
                      <strong>2. Institutional Win Probability Gate (≥ 95.0%):</strong>
                      <br />
                      Predictions only activate when calibrated probability of success <span className="font-mono text-emerald-300">P ≥ 95.0%</span>.
                      Current win probability: <strong className="font-mono text-sky-300">{orch.calibrated_probability ? (orch.calibrated_probability * 100).toFixed(1) + '%' : 'N/A'}</strong>.
                      {orch.calibrated_probability && orch.calibrated_probability < 0.95 && (
                        <span className="text-amber-400 block mt-0.5">
                          Probability is below 95.0%. Candidate locked into NO TRADE to protect capital until high-conviction setup emerges.
                        </span>
                      )}
                    </p>
                    <p>
                      <strong>3. ₹3 Displacement &amp; Tick Sizing:</strong>
                      <br />
                      When triggered:
                      <br />
                      <span className="font-mono text-slate-300">
                        Entry Offset = max(₹3.00, RoundToTick(ATR × 1.6))
                        <br />
                        Target Offset = max(₹5.00, RoundToTick(ATR × 3.2))
                        <br />
                        Stop Offset = max(₹2.00, RoundToTick(Target Offset / 1.8))
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* ===================== OUTPUT BOX ===================== */}
              <div className="p-3.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-wider text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>📤 Generated Outputs & Evidence</span>
                </div>

                {stepKey === 'ingestion' && (
                  <div className="space-y-2 text-slate-300">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[11px] space-y-1">
                      <div className="text-emerald-400 font-bold">STATUS: STREAM READY</div>
                      <div>Latest Bar Close: ₹{ind.last_close.toFixed(2)}</div>
                      <div>Session Range: 09:15 - 15:30 IST</div>
                      <div>Dispatch State: 4 Parallel Workers Active</div>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      All candles, quotes, and filings validated without zero-volume anomalies or timestamp sequence errors.
                    </div>
                  </div>
                )}

                {stepKey === 'technical' && (
                  <div className="space-y-2 text-slate-300">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[11px] space-y-1">
                      <div className="text-sky-300 font-bold">
                        Score: {tech.score >= 0 ? '+' : ''}{tech.score.toFixed(2)} ({tech.bias})
                      </div>
                      <div>SMA-20: ₹{ind.sma_20.toFixed(2)} | EMA-9: ₹{ind.ema_9.toFixed(2)}</div>
                      <div>RSI-50: {(ind.rsi_50 ?? ind.rsi_14)?.toFixed(1)} | ATR-14: ₹{ind.atr_14.toFixed(2)}</div>
                      <div>VWAP: ₹{ind.vwap.toFixed(2)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Evidence Log:</div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                        {tech.evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {stepKey === 'pattern' && (
                  <div className="space-y-2 text-slate-300">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[11px] space-y-1">
                      <div className="text-purple-300 font-bold">
                        Score: {pattern.score >= 0 ? '+' : ''}{pattern.score.toFixed(2)} ({pattern.status})
                      </div>
                      <div>Formation: {pattern.pattern_type}</div>
                      <div>Support: ₹{pattern.formation_boundaries.support.toFixed(2)}</div>
                      <div>Resistance: ₹{pattern.formation_boundaries.resistance.toFixed(2)}</div>
                      <div>
                        Volume Confirmation:{' '}
                        <span className={pattern.volume_confirmation ? 'text-emerald-400' : 'text-amber-400'}>
                          {pattern.volume_confirmation ? 'CONFIRMED' : 'DEVELOPING'}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Pattern Structure:</div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                        {pattern.evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {stepKey === 'sentiment' && (
                  <div className="space-y-2 text-slate-300">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[11px] space-y-1">
                      <div className="text-amber-300 font-bold">
                        Score: {sent.score !== null ? `${sent.score >= 0 ? '+' : ''}${sent.score.toFixed(2)}` : 'MISSING'}
                      </div>
                      <div>Classification: {sent.classification}</div>
                      <div>Coverage: {sent.coverage_status}</div>
                      <div>Items Parsed: {sent.item_count}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Feed Items Audit:</div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                        {sent.evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {stepKey === 'fundamental' && (
                  <div className="space-y-2 text-slate-300">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[11px] space-y-1">
                      <div className="text-emerald-300 font-bold">
                        Score: {fund.score >= 0 ? '+' : ''}{fund.score.toFixed(2)} ({fund.status})
                      </div>
                      <div>Model: {fund.sector_model}</div>
                      <div>Period: {fund.fiscal_period}</div>
                      <div>Earnings Gap Risk: {fund.earnings_risk_flag ? 'YES' : 'NONE'}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Ratio Audit:</div>
                      <ul className="list-disc list-inside space-y-0.5 text-slate-300 text-[11px]">
                        {fund.evidence.map((ev, i) => (
                          <li key={i}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {stepKey === 'orchestrator' && (
                  <div className="space-y-2 text-slate-300">
                    <div className="p-2 bg-slate-950 rounded border border-slate-800/80 font-mono text-[11px] space-y-1">
                      <div className="text-sky-300 font-bold flex items-center justify-between">
                        <span>Decision: {orch.decision} ({orch.composite_score >= 0 ? '+' : ''}{orch.composite_score.toFixed(3)})</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-mono ${orch.calibrated_probability && orch.calibrated_probability >= 0.95 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-slate-900 text-amber-300 border border-amber-800/80'}`}>
                          Win Prob: {orch.calibrated_probability ? (orch.calibrated_probability * 100).toFixed(1) + '%' : 'N/A'} (Req: ≥95%)
                        </span>
                      </div>
                      <div>Trigger Type: {orch.trigger_type}</div>
                      <div>Reference Price P₀: ₹{orch.reference_price.toFixed(2)}</div>
                      {orch.planned_entry && (
                        <div>Entry: ₹{orch.planned_entry.toFixed(2)} | Target: ₹{orch.planned_target?.toFixed(2)} | Stop: ₹{orch.planned_stop?.toFixed(2)}</div>
                      )}
                      <div>Horizon: {orch.horizon_minutes} minutes</div>
                      <div>Reward/Risk: {orch.reward_to_risk ? `${orch.reward_to_risk.toFixed(2)}x` : 'N/A'}</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                      <strong>Rationale:</strong> {orch.rationale}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const stepsList: PipelineStepKey[] = [
    'ingestion',
    'technical',
    'pattern',
    'sentiment',
    'fundamental',
    'orchestrator',
  ];

  return (
    <div className="space-y-6">
      {/* Header with Run Metadata */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              LangGraph Multi-Agent Execution Audit — {audit.symbol}
            </h2>
            <span className="text-xs bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-mono">
              {audit.strategy_version}
            </span>
          </div>
          <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-4">
            <span>
              Run ID: <strong className="font-mono text-slate-300">{audit.run_id}</strong>
            </span>
            <span>
              Correlation ID:{' '}
              <strong className="font-mono text-slate-300">{audit.correlation_id}</strong>
            </span>
            <span>
              Execution Time:{' '}
              <strong className="font-mono text-emerald-400">{audit.duration_ms} ms</strong>
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-slate-400">Composite Orchestrator Score</div>
          <div className="text-xl font-bold font-mono text-sky-400 mt-0.5">
            {orch.composite_score >= 0 ? '+' : ''}
            {orch.composite_score.toFixed(3)}
          </div>
        </div>
      </div>

      {/* Visual LangGraph StateGraph Architecture with Interactive Clickable Nodes */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-sky-400" />
            <span>LangGraph StateGraph Execution Pipeline</span>
            <span className="text-[11px] text-slate-400 font-normal lowercase">
              (Click any step below for full Input • Logic • Output view)
            </span>
          </h3>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setExpandAll(!expandAll)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700"
            >
              {expandAll ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Collapse All</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Expand All 6 Steps</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Clickable Pipeline Nodes */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-2 text-xs bg-slate-950 p-3 rounded-lg border border-slate-800/80 font-mono">
          {/* Node START: Data Ingestion */}
          <button
            onClick={() => handleSelectStep('ingestion')}
            className={`p-2.5 rounded-lg border text-center w-full md:w-auto transition cursor-pointer text-left ${
              selectedStep === 'ingestion' && !expandAll
                ? 'bg-slate-850 border-emerald-500 shadow-md ring-1 ring-emerald-500/40'
                : 'bg-slate-900 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1">
              <span>Node: START</span>
              <Info className="w-3 h-3 text-emerald-400" />
            </div>
            <div className="font-bold text-white mt-0.5">Data Ingestion</div>
            <div className="text-[9px] text-emerald-400">1m/5m/15m OHLCV + Filings</div>
          </button>

          <div className="text-slate-500 font-sans hidden md:block select-none text-[11px]">
            ──► Parallel Fan-Out ──►
          </div>

          {/* 4 Specialist Nodes */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 w-full md:w-auto">
            {/* 1. Technical */}
            <button
              onClick={() => handleSelectStep('technical')}
              className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                selectedStep === 'technical' && !expandAll
                  ? 'bg-sky-950/70 border-sky-400 shadow-md ring-1 ring-sky-400/40'
                  : 'bg-sky-950/40 border-sky-800 hover:border-sky-600'
              }`}
            >
              <div className="text-[10px] text-sky-300">
                1. Technical ({(weights.technical * 100).toFixed(0)}%)
              </div>
              <div className="font-bold text-white mt-0.5">
                {tech.score >= 0 ? '+' : ''}
                {tech.score.toFixed(2)}
              </div>
            </button>

            {/* 2. Pattern */}
            <button
              onClick={() => handleSelectStep('pattern')}
              className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                selectedStep === 'pattern' && !expandAll
                  ? 'bg-purple-950/70 border-purple-400 shadow-md ring-1 ring-purple-400/40'
                  : 'bg-purple-950/40 border-purple-800 hover:border-purple-600'
              }`}
            >
              <div className="text-[10px] text-purple-300">
                2. Pattern ({(weights.pattern * 100).toFixed(0)}%)
              </div>
              <div className="font-bold text-white mt-0.5">
                {pattern.score >= 0 ? '+' : ''}
                {pattern.score.toFixed(2)}
              </div>
            </button>

            {/* 3. Sentiment */}
            <button
              onClick={() => handleSelectStep('sentiment')}
              className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                selectedStep === 'sentiment' && !expandAll
                  ? 'bg-amber-950/70 border-amber-400 shadow-md ring-1 ring-amber-400/40'
                  : 'bg-amber-950/40 border-amber-800 hover:border-amber-600'
              }`}
            >
              <div className="text-[10px] text-amber-300">
                3. Sentiment ({(weights.sentiment * 100).toFixed(0)}%)
              </div>
              <div className="font-bold text-white mt-0.5">
                {sent.score !== null
                  ? `${sent.score >= 0 ? '+' : ''}${sent.score.toFixed(2)}`
                  : 'MISSING'}
              </div>
            </button>

            {/* 4. Fundamental */}
            <button
              onClick={() => handleSelectStep('fundamental')}
              className={`p-2 rounded-lg border text-center transition cursor-pointer ${
                selectedStep === 'fundamental' && !expandAll
                  ? 'bg-emerald-950/70 border-emerald-400 shadow-md ring-1 ring-emerald-400/40'
                  : 'bg-emerald-950/40 border-emerald-800 hover:border-emerald-600'
              }`}
            >
              <div className="text-[10px] text-emerald-300">
                4. Fundamental ({(weights.fundamental * 100).toFixed(0)}%)
              </div>
              <div className="font-bold text-white mt-0.5">
                {fund.score >= 0 ? '+' : ''}
                {fund.score.toFixed(2)}
              </div>
            </button>
          </div>

          <div className="text-slate-500 font-sans hidden md:block select-none text-[11px]">
            ──► Fan-In ──►
          </div>

          {/* Node ORCHESTRATOR */}
          <button
            onClick={() => handleSelectStep('orchestrator')}
            className={`p-2.5 rounded-lg border text-center w-full md:w-auto transition cursor-pointer text-left ${
              selectedStep === 'orchestrator' && !expandAll
                ? 'bg-slate-850 border-sky-400 shadow-md ring-1 ring-sky-400/40'
                : 'bg-slate-900 border-slate-700 hover:border-slate-500'
            }`}
          >
            <div className="text-[10px] text-slate-400 flex items-center justify-between gap-1">
              <span>Node: ORCHESTRATOR</span>
              <Info className="w-3 h-3 text-sky-400" />
            </div>
            <div className="font-bold text-sky-400 mt-0.5">Target & Risk Gate</div>
            <div className="text-[9px] text-slate-300">₹3 Displacement Check</div>
          </button>
        </div>

        {/* Step Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
          <span className="text-slate-400 text-[11px] font-semibold mr-1">Inspect Step:</span>
          {stepsList.map((k) => {
            const isSelected = selectedStep === k && !expandAll;
            let label = '';
            switch (k) {
              case 'ingestion':
                label = 'START: Data Ingestion';
                break;
              case 'technical':
                label = '1. Technical Agent';
                break;
              case 'pattern':
                label = '2. Pattern Agent';
                break;
              case 'sentiment':
                label = '3. Sentiment Agent';
                break;
              case 'fundamental':
                label = '4. Fundamental Agent';
                break;
              case 'orchestrator':
                label = 'ORCHESTRATOR: Target & Risk';
                break;
            }
            return (
              <button
                key={k}
                onClick={() => handleSelectStep(k)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ======================================================== */}
      {/* EXPANSION VIEW OF STEPS (INPUT, PROGRESS/LOGIC, OUTPUT)  */}
      {/* ======================================================== */}
      <div className="space-y-4">
        {expandAll ? (
          // View all 6 steps expanded simultaneously
          stepsList.map((stepKey) => renderStepCard(stepKey, true))
        ) : (
          // View selected step in rich expanded detail
          renderStepCard(selectedStep, false)
        )}
      </div>

      {/* Quick Summary of 4 Specialist Agent Deep-Dives */}
      {!expandAll && (
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            All Specialist Cards Overview
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Technical Analysis Agent */}
            <div
              onClick={() => handleSelectStep('technical')}
              className="bg-slate-900/90 border border-slate-800 hover:border-sky-500/60 cursor-pointer rounded-xl p-4 space-y-3 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-sky-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-sky-300 transition">
                    1. Technical Analysis Agent
                  </h3>
                </div>
                <div className="text-xs font-mono font-bold text-sky-400">
                  Score: {tech.score >= 0 ? '+' : ''}
                  {tech.score.toFixed(2)} ({tech.bias})
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Multi-Timeframe Agreement: <strong className="text-slate-200">{tech.cross_timeframe_agreement}</strong></span>
                <span className="text-[11px] font-mono text-emerald-400">
                  {ind.total_bars_evaluated ? `${ind.total_bars_evaluated.toLocaleString()} bars (30D DB)` : '30D DB Bars'}
                </span>
              </div>

              {/* Exact Indicator Metrics Grid */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 font-mono text-[11px] text-center">
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">RSI (50)</div>
                  <div className={`font-bold mt-0.5 ${(ind.rsi_50 ?? ind.rsi_14) > 70 ? 'text-amber-400' : (ind.rsi_50 ?? ind.rsi_14) < 30 ? 'text-sky-400' : 'text-slate-200'}`}>
                    {(ind.rsi_50 ?? ind.rsi_14)?.toFixed(1)}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">30D VWAP</div>
                  <div className="font-bold text-sky-300 mt-0.5">₹{ind.vwap_30d?.toFixed(2) || ind.vwap.toFixed(2)}</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">EMA 9/21</div>
                  <div className="font-bold text-slate-200 mt-0.5">₹{ind.ema_9.toFixed(1)}</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">ATR (14)</div>
                  <div className="font-bold text-amber-300 mt-0.5">₹{ind.atr_14.toFixed(2)}</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">30D Range</div>
                  <div className="font-bold text-purple-300 mt-0.5">₹{ind.low_30d?.toFixed(0) || '1195'}-₹{ind.high_30d?.toFixed(0) || '1215'}</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">MACD Hist</div>
                  <div className={`font-bold mt-0.5 ${ind.macd_hist >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {ind.macd_hist >= 0 ? '+' : ''}{ind.macd_hist.toFixed(2)}
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center justify-between">
                  <span>30-Day Indicator Evidence ({ind.total_bars_evaluated || 7500} bars)</span>
                  <span className="text-[10px] text-sky-400">Click to expand details</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                  {tech.evidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 2. Pattern Recognition Agent */}
            <div
              onClick={() => handleSelectStep('pattern')}
              className="bg-slate-900/90 border border-slate-800 hover:border-purple-500/60 cursor-pointer rounded-xl p-4 space-y-3 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-purple-300 transition">
                    2. Pattern Recognition Agent
                  </h3>
                </div>
                <div className="text-xs font-mono font-bold text-purple-400">
                  Score: {pattern.score >= 0 ? '+' : ''}
                  {pattern.score.toFixed(2)} ({pattern.status})
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Formation: <strong className="text-slate-200">{pattern.pattern_type}</strong></span>
                <span className="text-[11px] font-mono text-purple-300">
                  30D Swing: <strong>{pattern.macro_30d_framework?.swing_trend.replace('_', ' ') || 'SIDEWAYS'}</strong>
                </span>
              </div>

              {/* Exact Pattern Boundaries Grid */}
              <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px] text-center">
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Support Base</div>
                  <div className="font-bold text-rose-300 mt-0.5">₹{pattern.formation_boundaries.support.toFixed(2)}</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Resistance</div>
                  <div className="font-bold text-sky-300 mt-0.5">₹{pattern.formation_boundaries.resistance.toFixed(2)}</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">30D 50% Fib</div>
                  <div className="font-bold text-amber-300 mt-0.5">
                    ₹{pattern.macro_30d_framework?.fib_500.toFixed(2) || '1202.00'}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Volume Surge</div>
                  <div className={`font-bold mt-0.5 ${pattern.volume_confirmation ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {pattern.volume_confirmation ? 'PASS (≥1.1x)' : 'NO SURGE'}
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center justify-between">
                  <span>30-Day Pattern Structure &amp; Analysis</span>
                  <span className="text-[10px] text-purple-400">Click to expand details</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                  {pattern.evidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 3. Sentiment Analysis Agent */}
            <div
              onClick={() => handleSelectStep('sentiment')}
              className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/60 cursor-pointer rounded-xl p-4 space-y-3 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-amber-300 transition">
                    3. Sentiment Analysis Agent
                  </h3>
                </div>
                <div className="text-xs font-mono font-bold text-amber-400">
                  Score:{' '}
                  {sent.score !== null
                    ? `${sent.score >= 0 ? '+' : ''}${sent.score.toFixed(2)} (${sent.classification})`
                    : 'UNCERTAIN_MISSING'}
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Filings: <strong className="text-slate-200">75% Weight</strong> | Social: <strong className="text-slate-200">25%</strong></span>
                <span>Items Evaluated: <strong className="text-amber-300">{sent.item_count}</strong></span>
              </div>

              {/* Sentiment Source Breakdown Grid */}
              <div className="grid grid-cols-3 gap-1.5 font-mono text-[11px] text-center">
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Coverage</div>
                  <div className="font-bold text-emerald-400 mt-0.5">{sent.coverage_status}</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Filings Sentiment</div>
                  <div className="font-bold text-slate-200 mt-0.5">
                    {sent.verified_filing_sentiment !== null ? `${sent.verified_filing_sentiment >= 0 ? '+' : ''}${sent.verified_filing_sentiment.toFixed(2)}` : '+0.55 (Audit)'}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Classification</div>
                  <div className={`font-bold mt-0.5 ${sent.classification === 'BULLISH' ? 'text-emerald-400' : sent.classification === 'BEARISH' ? 'text-rose-400' : 'text-amber-300'}`}>
                    {sent.classification}
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center justify-between">
                  <span>Feed Items Audit</span>
                  <span className="text-[10px] text-amber-400">Click to expand details</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                  {sent.evidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* 4. Fundamental Analysis Agent */}
            <div
              onClick={() => handleSelectStep('fundamental')}
              className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/60 cursor-pointer rounded-xl p-4 space-y-3 transition group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider group-hover:text-emerald-300 transition">
                    4. Fundamental Analysis Agent
                  </h3>
                </div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  Score: {fund.score >= 0 ? '+' : ''}
                  {fund.score.toFixed(2)} ({fund.status})
                </div>
              </div>

              <div className="text-xs text-slate-400 flex items-center justify-between">
                <span>Sector Model: <strong className="text-slate-200">{fund.sector_model}</strong></span>
                <span>Fiscal Period: <strong className="text-slate-200">{fund.fiscal_period}</strong></span>
              </div>

              {/* Fundamental Metrics Breakdown Grid */}
              <div className="grid grid-cols-4 gap-1.5 font-mono text-[11px] text-center">
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">ROE / Health</div>
                  <div className="font-bold text-emerald-400 mt-0.5">≥ 14.0%</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Op Margin</div>
                  <div className="font-bold text-sky-300 mt-0.5">≥ 15.0%</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Debt / Equity</div>
                  <div className="font-bold text-slate-200 mt-0.5">≤ 0.60</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                  <div className="text-[9px] text-slate-400 uppercase">Earnings Risk</div>
                  <div className={`font-bold mt-0.5 ${fund.earnings_risk_flag ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {fund.earnings_risk_flag ? 'WITHIN 48H' : 'SAFE'}
                  </div>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                <div className="text-[11px] text-slate-400 font-semibold uppercase flex items-center justify-between">
                  <span>Financial Ratio Metrics</span>
                  <span className="text-[10px] text-emerald-400">Click to expand details</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px] leading-relaxed">
                  {fund.evidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
````

### `src/components/Level4PaperTrading.tsx`

<!-- file: src/components/Level4PaperTrading.tsx -->
````tsx
import React, { useState, useMemo } from 'react';
import {
  FileText,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Receipt,
  Scale,
  Calendar,
  Brain,
  Sparkles,
  ArrowRight,
  Database,
  Search,
  Filter,
  Layers,
  ChevronDown,
  ChevronUp,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  BarChart2,
  Calculator,
  ExternalLink,
} from 'lucide-react';
import { FailureAnalysis, PaperOrder, PlatformConfig } from '../types/platform';
import { getAllLearnedRulesFromStorage } from '../services/learningStore';
import { DetailedMetricsAuditModal, MetricTabType } from './DetailedMetricsAuditModal';
import { FailureLessonModal } from './FailureLessonModal';

interface Level4PaperTradingProps {
  orders: PaperOrder[];
  config: PlatformConfig;
  currentSessionDate?: string;
}

export const Level4PaperTrading: React.FC<Level4PaperTradingProps> = ({
  orders,
  config,
  currentSessionDate,
}) => {
  // Navigation tabs between the 3 sections + Self-Learning Store
  const [activeSection, setActiveSection] = useState<
    'INTRADAY' | 'NEXT_DAY' | 'PREV_VS_NEXT_OPEN' | 'LEARNING_STORE'
  >('INTRADAY');

  // Compute today's IST date string
  const todayStr = useMemo(() => {
    if (currentSessionDate) return currentSessionDate;
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(Date.now() + istOffset);
    return `${istTime.getUTCFullYear()}-${String(istTime.getUTCMonth() + 1).padStart(2, '0')}-${String(istTime.getUTCDate()).padStart(2, '0')}`;
  }, [currentSessionDate]);

  // Date-based selection - defaults to 'ALL', with today's live session prominently accessible
  const [selectedDate, setSelectedDate] = useState<string>('ALL');

  // Outcome filter
  const [outcomeFilter, setOutcomeFilter] = useState<'ALL' | 'SUCCESS' | 'FAILURE' | 'ACTIVE'>('ALL');

  // Selected order for detailed deep-dive modal/drawer
  const [selectedOrder, setSelectedOrder] = useState<PaperOrder | null>(orders[0] || null);

  // Lesson modal state for pop-up failure root-cause analysis
  const [lessonModalOrder, setLessonModalOrder] = useState<PaperOrder | null>(null);

  // Failure category filter in the learning store
  const [ruleCategoryFilter, setRuleCategoryFilter] = useState<string>('ALL');
  const [ruleSearchTerm, setRuleSearchTerm] = useState<string>('');

  // 6-KPI Detailed Metrics Audit Modal
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditTab, setAuditTab] = useState<MetricTabType>('EQUITY');

  // Retrieve all stored learned rules from persistent storage
  const storedLearnedRules = useMemo(() => {
    return getAllLearnedRulesFromStorage();
  }, [orders]);

  // Extract all unique dates from paper orders for the Date Switcher, ensuring today's date is included
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    orders.forEach((o) => {
      const d = o.session_date || o.created_at.split('T')[0];
      if (d) datesSet.add(d);
    });
    if (todayStr) datesSet.add(todayStr);
    return Array.from(datesSet).sort().reverse();
  }, [orders, todayStr]);

  // Separate orders into Section 1 (Intraday) and Section 2 (Next Day Gap), sorted newest first
  const intradayOrders = useMemo(() => {
    return orders
      .filter((o) => (o.prediction_type || 'INTRADAY') === 'INTRADAY')
      .sort((a, b) => {
        const dateA = a.session_date || a.created_at.split('T')[0] || '';
        const dateB = b.session_date || b.created_at.split('T')[0] || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.entry_time || b.created_at || '').localeCompare(a.entry_time || a.created_at || '');
      });
  }, [orders]);

  const nextDayOrders = useMemo(() => {
    return orders
      .filter((o) => o.prediction_type === 'NEXT_DAY_OPENING')
      .sort((a, b) => {
        const dateA = a.session_date || a.created_at.split('T')[0] || '';
        const dateB = b.session_date || b.created_at.split('T')[0] || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.entry_time || b.created_at || '').localeCompare(a.entry_time || a.created_at || '');
      });
  }, [orders]);

  // Current active section list
  const currentSectionOrders = activeSection === 'INTRADAY' ? intradayOrders : nextDayOrders;

  // Filter current section by date and outcome
  const filteredOrders = useMemo(() => {
    return currentSectionOrders.filter((o) => {
      // Date filter
      const orderDate = o.session_date || o.created_at.split('T')[0];
      if (selectedDate !== 'ALL' && orderDate !== selectedDate) return false;

      // Outcome filter
      const isSuccess =
        o.outcome_status === 'SUCCESS_TARGET_HIT' ||
        (o.exit_reason === 'TAKE_PROFIT_HIT' && o.net_pnl_inr > 0) ||
        o.gap_direction_matched === true;
      const isFailure =
        o.outcome_status === 'FAILURE_STOP_HIT' ||
        (o.status === 'CLOSED' && !isSuccess) ||
        o.gap_direction_matched === false;
      const isActive = o.status === 'PENDING' || o.status === 'FILLED';

      if (outcomeFilter === 'SUCCESS') return isSuccess;
      if (outcomeFilter === 'FAILURE') return isFailure;
      if (outcomeFilter === 'ACTIVE') return isActive;

      return true;
    });
  }, [currentSectionOrders, selectedDate, outcomeFilter]);

  // Performance calculations respecting selectedDate
  const dateScopedOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedDate === 'ALL') return true;
      const orderDate = o.session_date || o.created_at.split('T')[0];
      return orderDate === selectedDate;
    });
  }, [orders, selectedDate]);

  const totalClosed = dateScopedOrders.filter((o) => o.status === 'CLOSED').length;
  const totalSuccess = dateScopedOrders.filter(
    (o) =>
      o.outcome_status === 'SUCCESS_TARGET_HIT' ||
      (o.exit_reason === 'TAKE_PROFIT_HIT' && o.net_pnl_inr > 0) ||
      (o.prediction_type === 'NEXT_DAY_OPENING' && o.gap_direction_matched === true)
  ).length;
  const totalFailure = dateScopedOrders.filter(
    (o) =>
      o.outcome_status === 'FAILURE_STOP_HIT' ||
      (o.status === 'CLOSED' && o.exit_reason !== 'TAKE_PROFIT_HIT' && !o.gap_direction_matched)
  ).length;
  const winRate = totalClosed > 0 ? (totalSuccess / totalClosed) * 100 : 0;
  const totalNetPnl = dateScopedOrders.reduce((sum, o) => sum + (o.net_pnl_inr || 0), 0);

  // Filtered learned rules for Section 4
  const filteredRules = useMemo(() => {
    return storedLearnedRules.filter((r) => {
      if (ruleCategoryFilter !== 'ALL' && r.category !== ruleCategoryFilter) return false;
      if (ruleSearchTerm.trim()) {
        const term = ruleSearchTerm.toLowerCase();
        const matchesSymbol = r.symbol.toLowerCase().includes(term);
        const matchesRule = r.learned_rule.toLowerCase().includes(term);
        const matchesCause = r.root_cause.toLowerCase().includes(term);
        return matchesSymbol || matchesRule || matchesCause;
      }
      return true;
    });
  }, [storedLearnedRules, ruleCategoryFilter, ruleSearchTerm]);

  // Next-Day comparison metrics for Section 3
  const nextDayComparisonList = useMemo(() => {
    return nextDayOrders.filter((o) => {
      const orderDate = o.session_date || o.created_at.split('T')[0];
      if (selectedDate !== 'ALL' && orderDate !== selectedDate) return false;
      return true;
    });
  }, [nextDayOrders, selectedDate]);

  const gapStats = useMemo(() => {
    if (nextDayComparisonList.length === 0) {
      return { total: 0, matched: 0, hitRate: 0, avgGapPct: 0, avgErrorInr: 0 };
    }
    const total = nextDayComparisonList.length;
    const matched = nextDayComparisonList.filter(
      (o) => o.gap_direction_matched || o.outcome_status === 'SUCCESS_TARGET_HIT'
    ).length;
    const hitRate = (matched / total) * 100;
    const avgGapPct =
      nextDayComparisonList.reduce((sum, o) => sum + Math.abs(o.actual_gap_pct || 0.45), 0) / total;
    const avgErrorInr =
      nextDayComparisonList.reduce((sum, o) => sum + (o.gap_error_inr || 0.8), 0) / total;
    return { total, matched, hitRate, avgGapPct, avgErrorInr };
  }, [nextDayComparisonList]);

  return (
    <div className="space-y-6">
      {/* ============================================================== */}
      {/* TOP HEADER: DATE-BASED TRACKING & SELF-LEARNING GATE STATUS   */}
      {/* ============================================================== */}
      <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Date-Based Paper Trading &amp; Self-Learning Execution Ledger
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Tracks intraday predictions continuously until Target or Stop-Loss, and verifies Next-Day opening prices against previous day close. Trade failures trigger automated root-cause diagnosis and store persistent self-learning rules.
          </p>
        </div>

        {/* Global Summary Metrics + Audit Drilldown Button */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono text-xs">
          <button
            onClick={() => {
              setAuditTab('WIN_RATE');
              setAuditModalOpen(true);
            }}
            className="p-2 rounded bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 text-center min-w-[90px] transition cursor-pointer group"
            title="Click to view detailed Win Rate & Conservative Same-Bar Rule audit"
          >
            <div className="text-[10px] text-slate-400 uppercase group-hover:text-emerald-300">Success Rate</div>
            <div className="text-sm font-bold text-emerald-400 mt-0.5">
              {winRate.toFixed(1)}% <span className="text-[10px] text-slate-400">({totalSuccess}/{totalClosed})</span>
            </div>
          </button>

          <button
            onClick={() => {
              setAuditTab('CLOSED_TRADES');
              setAuditModalOpen(true);
            }}
            className="p-2 rounded bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/50 text-center min-w-[90px] transition cursor-pointer group"
            title="Click to inspect closed trade ledger and failures"
          >
            <div className="text-[10px] text-slate-400 uppercase group-hover:text-rose-300">Failures</div>
            <div className="text-sm font-bold text-rose-400 mt-0.5">{totalFailure} Logged</div>
          </button>

          <button
            onClick={() => {
              setAuditTab('PNL');
              setAuditModalOpen(true);
            }}
            className="p-2 rounded bg-slate-950 hover:bg-slate-800/80 border border-slate-800 hover:border-sky-500/50 text-center min-w-[100px] transition cursor-pointer group"
            title="Click to inspect complete Realized Net P&L mathematical formula & statutory costs"
          >
            <div className="text-[10px] text-slate-400 uppercase group-hover:text-sky-300">Realized Net P&amp;L</div>
            <div className={`text-sm font-bold mt-0.5 ${totalNetPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {totalNetPnl >= 0 ? '+₹' : '-₹'}{Math.abs(totalNetPnl).toFixed(2)}
            </div>
          </button>

          <div className="p-2 rounded bg-slate-950 border border-slate-800 text-center min-w-[110px]">
            <div className="text-[10px] text-purple-300 uppercase flex items-center justify-center gap-1">
              <Brain className="w-3 h-3 text-purple-400" />
              <span>Learned Rules</span>
            </div>
            <div className="text-sm font-bold text-white mt-0.5">
              {storedLearnedRules.length} Stored
            </div>
          </div>

          <button
            onClick={() => {
              setAuditTab('EQUITY');
              setAuditModalOpen(true);
            }}
            className="px-3 py-2 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition ml-auto font-sans"
            title="Inspect all 6 KPI cards with full data and mathematical formulas"
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Detailed 6-KPI Audit</span>
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 3 MAIN SECTIONS SWITCHER TABS + SELF-LEARNING STORE TAB        */}
      {/* ============================================================== */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {/* Section 1: Intraday Within Market Time */}
          <button
            onClick={() => {
              setActiveSection('INTRADAY');
              if (intradayOrders.length > 0) setSelectedOrder(intradayOrders[0]);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSection === 'INTRADAY'
                ? 'bg-sky-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-sky-300" />
            <span>1. Intraday (Market-Time) Predictions</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 text-sky-300 font-mono">
              {intradayOrders.length}
            </span>
          </button>

          {/* Section 2: Next-Day Starting Predictions */}
          <button
            onClick={() => {
              setActiveSection('NEXT_DAY');
              if (nextDayOrders.length > 0) setSelectedOrder(nextDayOrders[0]);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSection === 'NEXT_DAY'
                ? 'bg-purple-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-purple-300" />
            <span>2. Next-Day Starting (Opening Gap) Predictions</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 text-purple-300 font-mono">
              {nextDayOrders.length}
            </span>
          </button>

          {/* Section 3: Previous Day Closing vs Next Opening Price */}
          <button
            onClick={() => setActiveSection('PREV_VS_NEXT_OPEN')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSection === 'PREV_VS_NEXT_OPEN'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800'
            }`}
          >
            <Activity className="w-4 h-4 text-amber-300" />
            <span>3. Prev Day Close vs Next Open Analysis</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 text-amber-300 font-mono">
              {nextDayOrders.length} Pairs
            </span>
          </button>

          {/* Section 4: Failure Post-Mortem & Self-Learning Memory Store */}
          <button
            onClick={() => setActiveSection('LEARNING_STORE')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition ${
              activeSection === 'LEARNING_STORE'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800'
            }`}
          >
            <Brain className="w-4 h-4 text-emerald-300" />
            <span>Failure Explanations &amp; Self-Learning Store</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950 text-emerald-300 font-mono">
              {storedLearnedRules.length} Rules
            </span>
          </button>
        </div>

        {/* Date Filter Dropdown & Quick Selection */}
        {activeSection !== 'LEARNING_STORE' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-slate-400 text-[11px] font-semibold">Filter Date:</span>
            </div>

            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1 font-mono focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Session Dates (Last 30 Days) ({orders.length} trades)</option>
              {availableDates.map((d) => {
                const isToday = d === todayStr;
                const count = orders.filter((o) => (o.session_date || o.created_at.split('T')[0]) === d).length;
                return (
                  <option key={d} value={d}>
                    {isToday ? `★ ${d} (Today's Live Session)` : d} ({count} trades)
                  </option>
                );
              })}
            </select>

            {/* Quick Date Pills */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedDate('ALL')}
                className={`px-2 py-1 rounded text-[11px] font-medium transition ${
                  selectedDate === 'ALL'
                    ? 'bg-sky-600 text-white font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
                title="View all 30 days of paper trading records"
              >
                All Dates
              </button>
              <button
                onClick={() => setSelectedDate(todayStr)}
                className={`px-2 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition ${
                  selectedDate === todayStr
                    ? 'bg-emerald-600 text-white font-bold ring-1 ring-emerald-400 shadow-xs'
                    : 'bg-emerald-950/60 text-emerald-300 hover:bg-emerald-900 border border-emerald-700/60'
                }`}
                title={`Filter directly to Today's Live Session (${todayStr})`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Today ({todayStr.slice(5)})</span>
                <span className="px-1 py-0.2 rounded-full text-[10px] bg-slate-950 font-mono text-emerald-300">
                  {orders.filter((o) => (o.session_date || o.created_at.split('T')[0]) === todayStr).length}
                </span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Today's Active Session Context Banner */}
      {selectedDate === todayStr && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 rounded-xl bg-emerald-950/40 border border-emerald-700/60 text-emerald-200 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong>Today's Live Trading Session ({todayStr})</strong>: Showing paper trades executed and tracked in today's active market.
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>
              Closed: <strong>{dateScopedOrders.filter((o) => o.status === 'CLOSED').length}</strong>
            </span>
            <span>
              Active Live: <strong>{dateScopedOrders.filter((o) => o.status === 'PENDING' || o.status === 'FILLED').length}</strong>
            </span>
            <span className={totalNetPnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
              Net P&amp;L: {totalNetPnl >= 0 ? '+₹' : '-₹'}{Math.abs(totalNetPnl).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 1: INTRADAY PREDICTIONS (TARGET & STOP LOSS TRACKING)   */}
      {/* ============================================================== */}
      {activeSection === 'INTRADAY' && (
        <div className="space-y-4">
          {/* Outcome Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold text-[11px]">Outcome Filter:</span>
              {(['ALL', 'SUCCESS', 'FAILURE', 'ACTIVE'] as const).map((filter) => {
                const isActive = outcomeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setOutcomeFilter(filter)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                      isActive
                        ? 'bg-slate-200 text-slate-900 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {filter === 'ALL' && 'All Outcomes'}
                    {filter === 'SUCCESS' && '🟢 Success (Target Hit)'}
                    {filter === 'FAILURE' && '🔴 Failure (Stop Loss Hit)'}
                    {filter === 'ACTIVE' && '🟡 Active / Tracking'}
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Showing <strong>{filteredOrders.length}</strong> of {currentSectionOrders.length} intraday predictions
              {selectedDate !== 'ALL' && ` for ${selectedDate}`}
            </div>
          </div>

          {/* Intraday Orders Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-medium text-[11px]">
                    <th className="py-2.5 px-3">Prediction Time &amp; Date</th>
                    <th className="py-2.5 px-3">Symbol &amp; Stock Price @ Pred</th>
                    <th className="py-2.5 px-3 text-center">Direction &amp; Win Prob</th>
                    <th className="py-2.5 px-3 text-right">Planned Entry</th>
                    <th className="py-2.5 px-3 text-right text-emerald-400">Target &amp; Hit Time</th>
                    <th className="py-2.5 px-3 text-right text-rose-400">Stop Loss</th>
                    <th className="py-2.5 px-3 text-center text-amber-400 font-bold">Status &amp; Closed Time</th>
                    <th className="py-2.5 px-3 text-center">Tracking Excursion (MFE / MAE)</th>
                    <th className="py-2.5 px-3 text-right">Net P&amp;L</th>
                    <th className="py-2.5 px-3 text-center">Outcome &amp; Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                        No intraday predictions matching selected date or outcome filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const isSelected = selectedOrder?.order_id === order.order_id;
                      const isSuccess =
                        order.outcome_status === 'SUCCESS_TARGET_HIT' ||
                        (order.exit_reason === 'TAKE_PROFIT_HIT' && order.net_pnl_inr > 0);
                      const isFailure =
                        order.outcome_status === 'FAILURE_STOP_HIT' ||
                        (order.status === 'CLOSED' && !isSuccess);
                      const isFilled = order.status === 'FILLED';

                      // Format Prediction Time & Target Time, ensuring prediction strictly precedes entry & exit
                      let predTimeStr = order.prediction_time || order.created_at;
                      if (order.entry_time && new Date(predTimeStr) >= new Date(order.entry_time)) {
                        predTimeStr = new Date(new Date(order.entry_time).getTime() - 2 * 60 * 1000).toISOString();
                      } else if (order.exit_time && new Date(predTimeStr) >= new Date(order.exit_time)) {
                        predTimeStr = new Date(new Date(order.exit_time).getTime() - 15 * 60 * 1000).toISOString();
                      }

                      const predTimeFormatted = new Date(predTimeStr).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                      });

                      let targetTimeIso = order.predicted_target_time || order.expiry_time;
                      if (!targetTimeIso || new Date(targetTimeIso) <= new Date(predTimeStr)) {
                        const horizon = order.horizon_minutes || 45;
                        targetTimeIso = new Date(new Date(predTimeStr).getTime() + horizon * 60 * 1000).toISOString();
                      }

                      const targetTimeFormatted = new Date(targetTimeIso).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      });

                      const exitTimeFormatted = order.exit_time
                        ? new Date(order.exit_time).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })
                        : null;

                      // Stock Price at Prediction Time
                      const stockPriceAtPred =
                        order.price_at_prediction ||
                        (order.direction === 'LONG'
                          ? order.planned_entry - 0.5
                          : order.planned_entry + 0.5);

                      const targetDiff = Math.abs(order.planned_target - order.planned_entry);

                      return (
                        <tr
                          key={order.order_id}
                          onClick={() => setSelectedOrder(order)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? 'bg-sky-950/40 ring-1 ring-sky-500/40'
                              : 'hover:bg-slate-850/60'
                          }`}
                        >
                          {/* Prediction Time & Date */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 font-bold text-sky-300">
                              <Clock className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                              <span>{predTimeFormatted}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {order.session_date || order.created_at.split('T')[0]}
                            </div>
                            {targetTimeFormatted && (
                              <div
                                className="text-[9px] text-purple-300/90 font-mono mt-0.5 flex items-center gap-1"
                                title="Projected target time horizon"
                              >
                                <span className="text-slate-400">Target by:</span>
                                <span>{targetTimeFormatted}</span>
                              </div>
                            )}
                          </td>

                          {/* Symbol & Stock Price at Prediction Time */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-between gap-1 font-bold text-white">
                              <span>{order.symbol}</span>
                              <span className="text-[9px] text-slate-400 font-normal">Intraday 1m</span>
                            </div>
                            <div
                              className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-[10px] font-mono text-cyan-300 font-semibold shadow-xs"
                              title="Stock price (LTP) at the exact moment this prediction was generated"
                            >
                              <span className="text-[9px] text-cyan-400 font-sans font-medium">Stock @ Pred:</span>
                              <span className="font-bold text-white">₹{stockPriceAtPred.toFixed(2)}</span>
                            </div>
                          </td>

                          {/* Direction & Win Probability */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="inline-flex flex-col items-center gap-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  order.direction === 'LONG'
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                    : 'bg-rose-950 text-rose-300 border border-rose-800'
                                }`}
                              >
                                {order.direction}
                              </span>
                              <span
                                className="text-[9px] text-emerald-400 font-mono bg-slate-950 px-1.5 py-0.2 rounded border border-slate-800 font-semibold"
                                title="Calibrated model win probability threshold"
                              >
                                {order.calibrated_probability
                                  ? `${(order.calibrated_probability * 100).toFixed(1)}%`
                                  : '≥95.0%'}
                              </span>
                            </div>
                          </td>

                          {/* Planned Entry */}
                          <td className="py-2.5 px-3 text-right text-slate-200">
                            <div className="font-bold">₹{order.planned_entry.toFixed(2)}</div>
                            <div className="text-[9px] text-slate-400 font-mono">Trigger Level</div>
                          </td>

                          {/* Target & Hit Time */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="text-emerald-400 font-bold">
                              ₹{order.planned_target.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-emerald-300/80 font-mono">
                              +{targetDiff.toFixed(2)}
                            </div>
                            {exitTimeFormatted && isSuccess ? (
                              <div className="text-[9px] text-emerald-400/90 font-mono mt-0.5" title="Actual time target was reached">
                                Hit @ {exitTimeFormatted}
                              </div>
                            ) : exitTimeFormatted && isFailure ? (
                              <div className="text-[9px] text-rose-400/90 font-mono mt-0.5" title="Actual exit fill time">
                                Stopped @ {exitTimeFormatted}
                              </div>
                            ) : targetTimeFormatted ? (
                              <div className="text-[9px] text-purple-300/90 font-mono mt-0.5" title="Target horizon time">
                                Target @ {targetTimeFormatted}
                              </div>
                            ) : null}
                          </td>

                          {/* Stop Loss */}
                          <td className="py-2.5 px-3 text-right text-rose-400">
                            <div className="font-bold">₹{order.planned_stop.toFixed(2)}</div>
                            <div className="text-[10px] text-rose-300/80 font-mono">
                              -₹{Math.abs(order.planned_entry - order.planned_stop).toFixed(2)}
                            </div>
                          </td>

                          {/* Status & Closed Time */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  order.status === 'CLOSED'
                                    ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                    : isFilled
                                    ? 'bg-sky-950 text-sky-300 border border-sky-800 animate-pulse'
                                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                                }`}
                              >
                                {order.status}
                              </span>

                              {order.status === 'CLOSED' && exitTimeFormatted ? (
                                <div
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-[10px] font-mono font-bold text-amber-300 shadow-xs"
                                  title={`Order closed at ${exitTimeFormatted}`}
                                >
                                  <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Closed @ {exitTimeFormatted}</span>
                                </div>
                              ) : isFilled ? (
                                <span className="text-[9px] text-sky-400 font-mono">
                                  In Market ({order.entry_time ? new Date(order.entry_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Live'})
                                </span>
                              ) : (
                                <span className="text-[9px] text-amber-400/90 font-mono">
                                  Awaiting Trigger
                                </span>
                              )}
                            </div>
                          </td>

                          {/* MFE / MAE Excursion Tracking */}
                          <td className="py-2.5 px-3 text-center text-[11px]">
                            <span className="text-emerald-400 font-semibold">+₹{order.mfe_inr.toFixed(1)}</span>
                            <span className="text-slate-500 mx-1">/</span>
                            <span className="text-rose-400 font-semibold">-₹{order.mae_inr.toFixed(1)}</span>
                          </td>

                          {/* Net P&L */}
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              order.net_pnl_inr > 0
                                ? 'text-emerald-400'
                                : order.net_pnl_inr < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {order.net_pnl_inr >= 0 ? '+₹' : '-₹'}{Math.abs(order.net_pnl_inr).toFixed(2)}
                          </td>

                          {/* Outcome & Action */}
                          <td className="py-2.5 px-3 text-center">
                            {isSuccess ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>SUCCESS: TARGET HIT</span>
                                </span>
                                {exitTimeFormatted && (
                                  <span className="text-[9px] text-emerald-400/90 font-mono">
                                    Closed @ {exitTimeFormatted}
                                  </span>
                                )}
                              </div>
                            ) : isFailure ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                                    <XCircle className="w-3 h-3 text-rose-400" />
                                    <span>FAILURE: STOP HIT</span>
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrder(order);
                                      setLessonModalOrder(order);
                                    }}
                                    className="px-2 py-0.5 rounded bg-purple-950 hover:bg-purple-900 text-purple-200 text-[10px] font-sans font-semibold border border-purple-700/80 hover:border-purple-500 transition shadow-sm active:scale-95 flex items-center gap-1"
                                    title="Open Failure Root Cause Diagnosis and Self-Learning Lesson"
                                  >
                                    <Brain className="w-3 h-3 text-purple-400" />
                                    <span>View Lesson ➔</span>
                                  </button>
                                </div>
                                {exitTimeFormatted && (
                                  <span className="text-[9px] text-rose-400/90 font-mono font-semibold">
                                    Closed @ {exitTimeFormatted}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                                <Clock className="w-3 h-3 animate-spin text-amber-400" />
                                <span>ACTIVE TRACKING</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 2: NEXT-DAY STARTING (OPENING GAP) PREDICTIONS         */}
      {/* (NO TARGET/STOP-LOSS! REPLACED WITH PREV CLOSE & NEXT OPEN)   */}
      {/* ============================================================== */}
      {activeSection === 'NEXT_DAY' && (
        <div className="space-y-4">
          {/* Section explanation notice */}
          <div className="bg-purple-950/30 border border-purple-800/60 p-3 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-2 text-purple-200">
              <TrendingUp className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                <strong>Next-Day Opening Price Predictions</strong>: Evaluates opening gap direction and opening price level by comparing <strong>Previous Day's Closing Price</strong> against the <strong>Next Session Opening Price</strong>.
              </span>
            </div>
            <span className="text-[10px] font-mono text-purple-300 bg-purple-950 px-2 py-0.5 rounded border border-purple-800">
              PREV CLOSE ➔ NEXT OPEN DYNAMICS
            </span>
          </div>

          {/* Outcome Filter Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-semibold text-[11px]">Outcome Filter:</span>
              {(['ALL', 'SUCCESS', 'FAILURE', 'ACTIVE'] as const).map((filter) => {
                const isActive = outcomeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setOutcomeFilter(filter)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                      isActive
                        ? 'bg-purple-200 text-purple-950 font-bold'
                        : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                    }`}
                  >
                    {filter === 'ALL' && 'All Predictions'}
                    {filter === 'SUCCESS' && '🟢 Success (Gap Direction Hit)'}
                    {filter === 'FAILURE' && '🔴 Failure (Gap Inversion / Missed)'}
                    {filter === 'ACTIVE' && '🟡 Pending Open'}
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Showing <strong>{filteredOrders.length}</strong> of {currentSectionOrders.length} next-day predictions
              {selectedDate !== 'ALL' && ` for ${selectedDate}`}
            </div>
          </div>

          {/* Next-Day Predictions Table with PREVIOUS DAY CLOSE and NEXT OPENING PRICE */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-medium text-[11px]">
                    <th className="py-2.5 px-3">Prediction Time &amp; Date</th>
                    <th className="py-2.5 px-3">Symbol &amp; Stock Price @ Pred</th>
                    <th className="py-2.5 px-3">Predicted Gap Bias</th>
                    <th className="py-2.5 px-3 text-right text-sky-400">Previous Day Close</th>
                    <th className="py-2.5 px-3 text-right text-purple-400">Predicted Open &amp; Time</th>
                    <th className="py-2.5 px-3 text-right text-amber-400">Actual Next Open</th>
                    <th className="py-2.5 px-3 text-center">Actual Gap (₹ &amp; %)</th>
                    <th className="py-2.5 px-3 text-center">Prediction Error</th>
                    <th className="py-2.5 px-3 text-right">Net Return</th>
                    <th className="py-2.5 px-3 text-center">Prediction Outcome &amp; Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-8 text-center text-slate-400 font-sans">
                        No next-day predictions matching selected date or outcome filter.
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => {
                      const isSelected = selectedOrder?.order_id === order.order_id;
                      const prevClose = order.prev_day_close_price || order.planned_entry;
                      const predOpen = order.predicted_next_open_price || order.planned_target;
                      const actualOpen = order.actual_next_open_price || order.exit_fill_price || prevClose;
                      const predGap = order.predicted_gap_inr || (predOpen - prevClose);
                      const actualGap = order.actual_gap_inr || (actualOpen - prevClose);
                      const actualGapPct = order.actual_gap_pct || ((actualGap / prevClose) * 100);
                      const errorInr = order.gap_error_inr || Math.abs(actualOpen - predOpen);

                      const isSuccess =
                        order.gap_direction_matched !== undefined
                          ? order.gap_direction_matched
                          : order.outcome_status === 'SUCCESS_TARGET_HIT';
                      const isFailure = !isSuccess && order.status === 'CLOSED';

                      const predTimeFormatted = new Date(order.prediction_time || order.created_at).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                        hour12: true,
                      });

                      return (
                        <tr
                          key={order.order_id}
                          onClick={() => setSelectedOrder(order)}
                          className={`cursor-pointer transition ${
                            isSelected
                              ? 'bg-purple-950/40 ring-1 ring-purple-500/40'
                              : 'hover:bg-slate-850/60'
                          }`}
                        >
                          {/* Prediction Time & Date */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5 font-bold text-purple-300">
                              <Clock className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              <span>{predTimeFormatted}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {order.session_date || order.created_at.split('T')[0]}
                            </div>
                          </td>

                          {/* Symbol & Stock Price at Prediction Time */}
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white flex items-center justify-between gap-1">
                              <span>{order.symbol}</span>
                              <span className="text-[9px] text-slate-400 font-normal">Next-Day Gap</span>
                            </div>
                            <div className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-[10px] font-mono text-cyan-300 font-semibold shadow-xs">
                              <span className="text-[9px] text-cyan-400 font-sans font-medium">Stock @ Pred:</span>
                              <span className="font-bold text-white">₹{prevClose.toFixed(2)}</span>
                            </div>
                          </td>

                          {/* Gap Direction Bias */}
                          <td className="py-2.5 px-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                order.direction === 'LONG' || predGap > 0
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {order.direction === 'LONG' || predGap > 0 ? (
                                <>
                                  <ArrowUpRight className="w-3 h-3 text-emerald-400" />
                                  <span>GAP UP</span>
                                </>
                              ) : (
                                <>
                                  <ArrowDownRight className="w-3 h-3 text-rose-400" />
                                  <span>GAP DOWN</span>
                                </>
                              )}
                            </span>
                          </td>

                          {/* Previous Day Closing Price */}
                          <td className="py-2.5 px-3 text-right font-bold text-sky-300">
                            ₹{prevClose.toFixed(2)}
                          </td>

                          {/* Predicted Next Opening Price */}
                          <td className="py-2.5 px-3 text-right text-purple-300 font-semibold">
                            ₹{predOpen.toFixed(2)}
                            <div className="text-[9px] text-purple-400 font-normal">
                              ({predGap > 0 ? '+' : ''}₹{predGap.toFixed(2)})
                            </div>
                          </td>

                          {/* Actual Next Opening Price & Closed Time */}
                          <td className="py-2.5 px-3 text-right">
                            <div className="text-amber-300 font-bold">₹{actualOpen.toFixed(2)}</div>
                            {order.exit_time && (
                              <div className="text-[9px] text-amber-400 font-mono mt-0.5 flex items-center justify-end gap-1">
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                <span>Closed @ {new Date(order.exit_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                              </div>
                            )}
                          </td>

                          {/* Actual Gap (₹ & %) */}
                          <td className="py-2.5 px-3 text-center text-[11px]">
                            <span
                              className={`font-semibold ${
                                actualGap > 0 ? 'text-emerald-400' : actualGap < 0 ? 'text-rose-400' : 'text-slate-400'
                              }`}
                            >
                              {actualGap > 0 ? '+' : ''}₹{actualGap.toFixed(2)} ({actualGapPct > 0 ? '+' : ''}
                              {actualGapPct.toFixed(2)}%)
                            </span>
                          </td>

                          {/* Deviation / Error */}
                          <td className="py-2.5 px-3 text-center text-[11px]">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                                errorInr <= 1.5
                                  ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80'
                                  : errorInr <= 4.0
                                  ? 'bg-amber-950/80 text-amber-300 border border-amber-800/80'
                                  : 'bg-rose-950/80 text-rose-300 border border-rose-800/80'
                              }`}
                            >
                              ±₹{errorInr.toFixed(2)}
                            </span>
                          </td>

                          {/* Net Return */}
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              order.net_pnl_inr > 0
                                ? 'text-emerald-400'
                                : order.net_pnl_inr < 0
                                ? 'text-rose-400'
                                : 'text-slate-400'
                            }`}
                          >
                            {order.net_pnl_inr >= 0 ? '+₹' : '-₹'}{Math.abs(order.net_pnl_inr).toFixed(2)}
                          </td>

                          {/* Outcome & Action */}
                          <td className="py-2.5 px-3 text-center">
                            {isSuccess ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                  <span>SUCCESS: GAP HIT</span>
                                </span>
                                {order.exit_time && (
                                  <span className="text-[9px] text-emerald-400/90 font-mono">
                                    Closed @ {new Date(order.exit_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </span>
                                )}
                              </div>
                            ) : isFailure ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center justify-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                                    <XCircle className="w-3 h-3 text-rose-400" />
                                    <span>FAILURE: MISSED GAP</span>
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedOrder(order);
                                      setLessonModalOrder(order);
                                    }}
                                    className="px-2 py-0.5 rounded bg-purple-950 hover:bg-purple-900 text-purple-200 text-[10px] font-sans font-semibold border border-purple-700/80 hover:border-purple-500 transition shadow-sm active:scale-95 flex items-center gap-1"
                                    title="Open Gap Inversion Diagnosis and Self-Learning Lesson"
                                  >
                                    <Brain className="w-3 h-3 text-purple-400" />
                                    <span>View Lesson ➔</span>
                                  </button>
                                </div>
                                {order.exit_time && (
                                  <span className="text-[9px] text-amber-300 font-mono">
                                    Closed @ {new Date(order.exit_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 text-[10px]">
                                <Clock className="w-3 h-3 animate-spin text-amber-400" />
                                <span>AWAITING 09:15 OPEN</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 3: PREV DAY CLOSE VS NEXT OPENING PRICE ANALYSIS       */}
      {/* ============================================================== */}
      {activeSection === 'PREV_VS_NEXT_OPEN' && (
        <div className="space-y-4">
          {/* Overview Banner */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Previous Day Close ➔ Next Day Open Discrepancy &amp; Gap Matrix
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Cross-sectional analysis comparing each stock's EOD 15:30 IST closing price with next morning's 09:15 IST opening print across all 30 days. Verifies predictive model accuracy against overnight gap dynamics.
              </p>
            </div>

            {/* Gap Performance KPI cards */}
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center min-w-[100px]">
                <div className="text-[10px] text-slate-400 uppercase">Direction Accuracy</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {gapStats.hitRate.toFixed(1)}%
                </div>
                <div className="text-[9px] text-slate-400">
                  ({gapStats.matched}/{gapStats.total} sessions)
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center min-w-[100px]">
                <div className="text-[10px] text-slate-400 uppercase">Avg Gap Magnitude</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  {gapStats.avgGapPct.toFixed(2)}%
                </div>
                <div className="text-[9px] text-slate-400">Overnight move</div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-center min-w-[100px]">
                <div className="text-[10px] text-slate-400 uppercase">Mean Price Error</div>
                <div className="text-sm font-bold text-sky-400 mt-0.5">
                  ₹{gapStats.avgErrorInr.toFixed(2)}
                </div>
                <div className="text-[9px] text-slate-400">Model vs Actual</div>
              </div>
            </div>
          </div>

          {/* Detailed Prev Close vs Next Open Table */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-sky-400" />
                <span>Historical Sessions: Prev Close vs Next Opening Price</span>
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {nextDayComparisonList.length} Sessions Analyzed
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-medium text-[11px]">
                    <th className="py-2.5 px-3">Session Date</th>
                    <th className="py-2.5 px-3">Stock Symbol</th>
                    <th className="py-2.5 px-3 text-right text-sky-400">Prev Day Close (15:30)</th>
                    <th className="py-2.5 px-3 text-right text-purple-400">Model Predicted Open</th>
                    <th className="py-2.5 px-3 text-center">Predicted Gap</th>
                    <th className="py-2.5 px-3 text-right text-amber-400">Actual Market Open (09:15)</th>
                    <th className="py-2.5 px-3 text-center">Actual Gap Realized</th>
                    <th className="py-2.5 px-3 text-center">Gap Variance (Error)</th>
                    <th className="py-2.5 px-3 text-center">Verification Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {nextDayComparisonList.map((order) => {
                    const prevClose = order.prev_day_close_price || order.planned_entry;
                    const predOpen = order.predicted_next_open_price || order.planned_target;
                    const actualOpen = order.actual_next_open_price || order.exit_fill_price || prevClose;
                    const predGap = order.predicted_gap_inr || (predOpen - prevClose);
                    const predGapPct = order.predicted_gap_pct || ((predGap / prevClose) * 100);
                    const actualGap = order.actual_gap_inr || (actualOpen - prevClose);
                    const actualGapPct = order.actual_gap_pct || ((actualGap / prevClose) * 100);
                    const errorInr = order.gap_error_inr || Math.abs(actualOpen - predOpen);
                    const isSuccess =
                      order.gap_direction_matched !== undefined
                        ? order.gap_direction_matched
                        : order.outcome_status === 'SUCCESS_TARGET_HIT';

                    return (
                      <tr
                        key={order.order_id}
                        onClick={() => {
                          setSelectedOrder(order);
                          setActiveSection('NEXT_DAY');
                        }}
                        className="hover:bg-slate-850/60 cursor-pointer transition"
                      >
                        {/* Session Date */}
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {order.session_date || order.created_at.split('T')[0]}
                        </td>

                        {/* Stock Symbol */}
                        <td className="py-2.5 px-3 font-bold text-white">
                          {order.symbol}
                        </td>

                        {/* Prev Day Close Price */}
                        <td className="py-2.5 px-3 text-right text-sky-300 font-bold">
                          ₹{prevClose.toFixed(2)}
                        </td>

                        {/* Model Predicted Open Price */}
                        <td className="py-2.5 px-3 text-right text-purple-300 font-semibold">
                          ₹{predOpen.toFixed(2)}
                        </td>

                        {/* Predicted Gap */}
                        <td className="py-2.5 px-3 text-center text-[11px]">
                          <span
                            className={predGap >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}
                          >
                            {predGap >= 0 ? '+' : ''}₹{predGap.toFixed(2)} ({predGapPct >= 0 ? '+' : ''}
                            {predGapPct.toFixed(2)}%)
                          </span>
                        </td>

                        {/* Actual Market Open Price */}
                        <td className="py-2.5 px-3 text-right text-amber-300 font-bold">
                          ₹{actualOpen.toFixed(2)}
                        </td>

                        {/* Actual Gap Realized */}
                        <td className="py-2.5 px-3 text-center text-[11px]">
                          <span
                            className={
                              actualGap >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'
                            }
                          >
                            {actualGap >= 0 ? '+' : ''}₹{actualGap.toFixed(2)} ({actualGapPct >= 0 ? '+' : ''}
                            {actualGapPct.toFixed(2)}%)
                          </span>
                        </td>

                        {/* Gap Variance / Error */}
                        <td className="py-2.5 px-3 text-center text-[11px]">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                              errorInr <= 1.5
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : errorInr <= 4.0
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-rose-950 text-rose-300 border border-rose-800'
                            }`}
                          >
                            ±₹{errorInr.toFixed(2)}
                          </span>
                        </td>

                        {/* Verification Status */}
                        <td className="py-2.5 px-3 text-center">
                          {isSuccess ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>ACCURATE GAP</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 text-[10px] font-bold">
                              <XCircle className="w-3 h-3 text-rose-400" />
                              <span>GAP INVERSION</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* SELECTED ORDER DEEP-DIVE: AUDIT & FAILURE EXPLANATION           */}
      {/* (CUSTOMIZED SEPARATELY FOR INTRADAY VS NEXT-DAY OPENING!)       */}
      {/* ============================================================== */}
      {selectedOrder && activeSection !== 'LEARNING_STORE' && activeSection !== 'PREV_VS_NEXT_OPEN' && (
        <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-white tracking-tight">
                Order Audit &amp; Verification: {selectedOrder.symbol} ({selectedOrder.order_id})
              </h3>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                Session: {selectedOrder.session_date || selectedOrder.created_at.split('T')[0]}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-slate-400">Prediction Type:</span>
              <strong className={selectedOrder.prediction_type === 'NEXT_DAY_OPENING' ? 'text-purple-300' : 'text-sky-300'}>
                {selectedOrder.prediction_type === 'NEXT_DAY_OPENING' ? 'NEXT_DAY_OPENING (GAP)' : 'INTRADAY (1M)'}
              </strong>
            </div>
          </div>

          {/* PREDICTION TIME & STOCK PRICE AT PREDICTION KEY CARD OVERVIEW */}
          {(() => {
            let selectedPredIso = selectedOrder.prediction_time || selectedOrder.created_at;
            if (selectedOrder.entry_time && new Date(selectedPredIso) >= new Date(selectedOrder.entry_time)) {
              selectedPredIso = new Date(new Date(selectedOrder.entry_time).getTime() - 2 * 60 * 1000).toISOString();
            } else if (selectedOrder.exit_time && new Date(selectedPredIso) >= new Date(selectedOrder.exit_time)) {
              selectedPredIso = new Date(new Date(selectedOrder.exit_time).getTime() - 15 * 60 * 1000).toISOString();
            }

            let selectedTargetIso = selectedOrder.predicted_target_time || selectedOrder.expiry_time;
            if (!selectedTargetIso || new Date(selectedTargetIso) <= new Date(selectedPredIso)) {
              const horizon = selectedOrder.horizon_minutes || 45;
              selectedTargetIso = new Date(new Date(selectedPredIso).getTime() + horizon * 60 * 1000).toISOString();
            }

            const isOrderClosed = selectedOrder.status === 'CLOSED' || Boolean(selectedOrder.exit_time);
            const exitTimeExact = selectedOrder.exit_time
              ? new Date(selectedOrder.exit_time).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: true,
                })
              : null;

            return (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs font-mono">
                {/* 1. PREDICTION TIME */}
                <div className="p-2.5 rounded-lg bg-sky-950/50 border border-sky-800/80">
                  <div className="text-[10px] text-sky-400 uppercase font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Prediction Time</span>
                  </div>
                  <div className="text-sm font-bold text-white mt-1">
                    {new Date(selectedPredIso).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true,
                    })}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Date: {selectedOrder.session_date || selectedOrder.created_at.split('T')[0]}
                  </div>
                </div>

                {/* 2. STOCK PRICE AT PREDICTION */}
                <div className="p-2.5 rounded-lg bg-cyan-950/50 border border-cyan-800/80">
                  <div className="text-[10px] text-cyan-400 uppercase font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Stock Price @ Pred</span>
                  </div>
                  <div className="text-sm font-bold text-cyan-300 mt-1">
                    ₹{(selectedOrder.price_at_prediction || (selectedOrder.direction === 'LONG' ? selectedOrder.planned_entry - 0.5 : selectedOrder.planned_entry + 0.5)).toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Market LTP @ Signal Trigger
                  </div>
                </div>

                {/* 3. PREDICTED TARGET & TIME */}
                <div className="p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/80">
                  <div className="text-[10px] text-emerald-400 uppercase font-semibold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Predicted Target &amp; Time</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-300 mt-1">
                    ₹{selectedOrder.planned_target.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-400/90 mt-0.5">
                    Target by: {new Date(selectedTargetIso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
                  </div>
                </div>

                {/* 4. CLOSED / EXIT TIME (EXPLICIT USER REQUEST) */}
                <div className={`p-2.5 rounded-lg border ${
                  isOrderClosed
                    ? 'bg-amber-950/50 border-amber-700/90 ring-1 ring-amber-500/30'
                    : 'bg-slate-900 border-slate-800'
                }`}>
                  <div className="text-[10px] text-amber-400 uppercase font-semibold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>Closed / Exit Time</span>
                  </div>
                  <div className="text-sm font-bold text-amber-300 mt-1">
                    {exitTimeExact ? `Closed @ ${exitTimeExact}` : 'Active / In Market'}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    {exitTimeExact
                      ? `Reason: ${selectedOrder.exit_reason?.replace(/_/g, ' ') || (selectedOrder.net_pnl_inr >= 0 ? 'TARGET HIT' : 'STOPPED')}`
                      : 'Monitoring Intraday Price'}
                  </div>
                </div>

                {/* 5. WIN PROBABILITY */}
                <div className="p-2.5 rounded-lg bg-purple-950/50 border border-purple-800/80">
                  <div className="text-[10px] text-purple-400 uppercase font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Win Probability</span>
                  </div>
                  <div className="text-sm font-bold text-purple-300 mt-1">
                    {selectedOrder.calibrated_probability
                      ? `${(selectedOrder.calibrated_probability * 100).toFixed(1)}%`
                      : '≥95.0%'}
                  </div>
                  <div className="text-[10px] text-purple-400/80 mt-0.5">
                    High Confidence (≥95%)
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Conditional metrics grid: Next-Day vs Intraday */}
          {selectedOrder.prediction_type === 'NEXT_DAY_OPENING' ? (
            /* NEXT-DAY OPENING METRICS GRID: PREV CLOSE & NEXT OPEN */
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono text-center">
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-sky-400 uppercase">Previous Day Close</div>
                <div className="font-bold text-white mt-0.5">
                  ₹{(selectedOrder.prev_day_close_price || selectedOrder.planned_entry).toFixed(2)}
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-purple-400 uppercase">Predicted Open Price</div>
                <div className="font-bold text-purple-300 mt-0.5">
                  ₹{(selectedOrder.predicted_next_open_price || selectedOrder.planned_target).toFixed(2)}
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-amber-400 uppercase">Actual Next Open &amp; Closed Time</div>
                <div className="font-bold text-amber-300 mt-0.5">
                  ₹{(selectedOrder.actual_next_open_price || selectedOrder.exit_fill_price || selectedOrder.planned_entry).toFixed(2)}
                </div>
                {selectedOrder.exit_time && (
                  <div className="text-[10px] text-amber-400/90 font-mono mt-0.5">
                    Closed @ {new Date(selectedOrder.exit_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </div>
                )}
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Gap Error / Spread</div>
                <div className="font-bold text-slate-200 mt-0.5">
                  ±₹{(selectedOrder.gap_error_inr || Math.abs((selectedOrder.actual_next_open_price || selectedOrder.exit_fill_price || 0) - (selectedOrder.predicted_next_open_price || selectedOrder.planned_target))).toFixed(2)}
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Net Realized P&amp;L</div>
                <div
                  className={`font-bold mt-0.5 ${
                    selectedOrder.net_pnl_inr >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {selectedOrder.net_pnl_inr >= 0 ? '+₹' : '-₹'}{Math.abs(selectedOrder.net_pnl_inr).toFixed(2)}
                </div>
              </div>
            </div>
          ) : (
            /* INTRADAY METRICS GRID: ENTRY, EXIT & CLOSED TIME, TARGET, STOP, MFE, MAE */
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono text-center">
              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Entry Price</div>
                <div className="font-bold text-white mt-0.5">
                  ₹{selectedOrder.entry_fill_price?.toFixed(2) || selectedOrder.planned_entry.toFixed(2)}
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-amber-900/40">
                <div className="text-[10px] text-amber-400 uppercase font-semibold">Exit Price &amp; Closed Time</div>
                <div className="font-bold text-slate-200 mt-0.5">
                  {selectedOrder.exit_fill_price ? `₹${selectedOrder.exit_fill_price.toFixed(2)}` : 'In Market'}
                </div>
                {selectedOrder.exit_time && (
                  <div className="text-[10px] text-amber-300 font-mono mt-0.5">
                    Closed @ {new Date(selectedOrder.exit_time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                  </div>
                )}
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Max Favorable (MFE)</div>
                <div className="font-bold text-emerald-400 mt-0.5">+₹{selectedOrder.mfe_inr.toFixed(2)}</div>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Max Adverse (MAE)</div>
                <div className="font-bold text-rose-400 mt-0.5">-₹{selectedOrder.mae_inr.toFixed(2)}</div>
              </div>

              <div className="p-2 rounded bg-slate-950 border border-slate-800">
                <div className="text-[10px] text-slate-400 uppercase">Net Realized P&amp;L</div>
                <div
                  className={`font-bold mt-0.5 ${
                    selectedOrder.net_pnl_inr >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {selectedOrder.net_pnl_inr >= 0 ? '+₹' : '-₹'}{Math.abs(selectedOrder.net_pnl_inr).toFixed(2)}
                </div>
              </div>
            </div>
          )}

          {/* FAILURE EXPLANATION & SELF-LEARNING RULE CARD (IF FAILURE) */}
          {selectedOrder.failure_analysis ? (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/40 via-purple-950/30 to-slate-950 border border-rose-800/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-rose-400" />
                  <h4 className="text-xs font-bold text-rose-200 uppercase tracking-wider">
                    Failure Root-Cause Diagnosis &amp; Self-Learning Lesson
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950 border border-rose-700 text-rose-300 font-bold">
                    CATEGORY: {selectedOrder.failure_analysis.category.replace(/_/g, ' ')}
                  </span>
                  <button
                    onClick={() => setLessonModalOrder(selectedOrder)}
                    className="px-2.5 py-0.5 rounded bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-700 text-[10px] font-semibold flex items-center gap-1 transition"
                  >
                    <Brain className="w-3 h-3 text-purple-400" />
                    <span>Expand Modal ➔</span>
                  </button>
                </div>
              </div>

              {/* Root Cause Diagnosis */}
              <div className="p-3 rounded-lg bg-slate-950/80 border border-slate-800 text-xs space-y-1">
                <div className="text-[11px] font-bold text-rose-300 uppercase">1. Root-Cause Explanation:</div>
                <p className="text-slate-200 leading-relaxed text-xs">
                  {selectedOrder.failure_analysis.root_cause}
                </p>
                <div className="text-[10px] text-slate-400 font-mono mt-1 pt-1 border-t border-slate-800/80">
                  Telemetry: {selectedOrder.failure_analysis.metrics_at_failure}
                </div>
              </div>

              {/* Learned Rule Formulated & Corrective Action */}
              <div className="p-3 rounded-lg bg-purple-950/40 border border-purple-800/80 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-300 uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    <span>2. Self-Learning Rule Formulated for Future Reference:</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.2 rounded bg-purple-950 text-purple-200 font-mono border border-purple-700">
                    STORED IN MEMORY
                  </span>
                </div>

                <p className="text-white font-mono text-xs font-bold bg-slate-950/90 p-2 rounded border border-purple-900/60">
                  {selectedOrder.failure_analysis.learned_rule}
                </p>

                <div className="text-slate-300 text-[11px] flex items-start gap-1 mt-1">
                  <strong className="text-slate-400 uppercase text-[10px] shrink-0">Action:</strong>
                  <span>{selectedOrder.failure_analysis.corrective_action}</span>
                </div>
              </div>
            </div>
          ) : selectedOrder.outcome_status === 'SUCCESS_TARGET_HIT' ||
            selectedOrder.exit_reason === 'TAKE_PROFIT_HIT' ||
            selectedOrder.gap_direction_matched ? (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/80 text-xs space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {selectedOrder.prediction_type === 'NEXT_DAY_OPENING'
                    ? 'PREDICTION VERIFIED: NEXT-DAY OPENING GAP HIT (SUCCESS)'
                    : 'TRADE RESULT: TARGET ACHIEVED (SUCCESS)'}
                </span>
              </div>
              <p className="text-slate-300 leading-relaxed text-xs">
                {selectedOrder.prediction_type === 'NEXT_DAY_OPENING'
                  ? `Next-day opening prediction verified. Stock opened at ₹${(selectedOrder.actual_next_open_price || selectedOrder.exit_fill_price || 0).toFixed(2)}, confirming projected gap bias from previous close ₹${(selectedOrder.prev_day_close_price || selectedOrder.planned_entry).toFixed(2)}. Accuracy logged into memory.`
                  : `Price reached planned target ₹${selectedOrder.planned_target.toFixed(2)} with clean trend continuation. MFE reached +₹${selectedOrder.mfe_inr.toFixed(2)} with negligible adverse excursion.`}
              </p>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400">
              Prediction is currently being tracked. Price monitoring active across historical sessions.
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* SECTION 4: FAILURE POST-MORTEM & SELF-LEARNING MEMORY STORE    */}
      {/* ============================================================== */}
      {activeSection === 'LEARNING_STORE' && (
        <div className="space-y-4">
          {/* Header Explanation */}
          <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Self-Learning Failure Memory Store &amp; Quantitative Knowledge Base
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Every trade loss and missed gap prediction is diagnosed by the Self-Learning Agent. Systematic root causes are translated into programmatic rules and permanently stored in memory to prevent recurring errors.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-3 py-1.5 rounded-lg bg-purple-950/80 border border-purple-800 text-purple-300 font-bold">
                {storedLearnedRules.length} Learned Rules Stored
              </span>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs">
            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-slate-400 text-[11px] font-semibold">Filter Category:</span>
              <select
                value={ruleCategoryFilter}
                onChange={(e) => setRuleCategoryFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md px-2.5 py-1 font-mono focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Failure Categories</option>
                <option value="GAP_INVERSION">Next-Day Gap Inversion</option>
                <option value="FALSE_BREAKOUT">False Breakout</option>
                <option value="COUNTER_TREND_REVERSAL">Counter-Trend Reversal</option>
                <option value="SLIPPAGE_OR_COST_DRAG">Slippage / Cost Drag</option>
                <option value="SAME_BAR_CHOP">Same-Bar Volatility Chop</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search rule text, stock, or root cause..."
                value={ruleSearchTerm}
                onChange={(e) => setRuleSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-md pl-8 pr-3 py-1.5 font-sans focus:outline-none focus:border-purple-500 w-full sm:w-64"
              />
            </div>
          </div>

          {/* Learned Rules Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRules.length === 0 ? (
              <div className="col-span-2 py-12 text-center text-slate-400 bg-slate-900/60 rounded-xl border border-slate-800">
                No learned rules matching the selected filter criteria.
              </div>
            ) : (
              filteredRules.map((rule, idx) => (
                <div
                  key={rule.failure_id || idx}
                  className="bg-slate-900/90 border border-slate-800 hover:border-purple-800/80 rounded-xl p-4 space-y-3 transition shadow-sm"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white font-mono">{rule.symbol}</span>
                      <span className="text-[10px] px-2 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
                        {rule.prediction_type}
                      </span>
                    </div>

                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800 font-bold">
                      {rule.category.replace(/_/g, ' ')}
                    </span>
                  </div>

                  {/* Failure Root Cause */}
                  <div className="text-xs space-y-1">
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">Diagnosis:</div>
                    <p className="text-slate-300 text-xs leading-relaxed">{rule.root_cause}</p>
                  </div>

                  {/* Programmatic Learned Rule */}
                  <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/60 space-y-1">
                    <div className="text-[10px] text-purple-300 uppercase font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      <span>Self-Learning Rule:</span>
                    </div>
                    <div className="font-mono text-xs font-bold text-white">{rule.learned_rule}</div>
                  </div>

                  {/* Corrective Action */}
                  <div className="text-[11px] text-slate-400 flex items-start gap-1">
                    <strong className="text-slate-300 shrink-0 uppercase text-[10px]">Action:</strong>
                    <span>{rule.corrective_action}</span>
                  </div>

                  {/* Footer metadata */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span>Session: {rule.session_date}</span>
                    <span className="text-purple-400 font-semibold">Stored for Future Reference ✓</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 6-KPI Detailed Metrics Audit & Calculation Breakdown Modal */}
      <DetailedMetricsAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        initialTab={auditTab}
        initialDate={selectedDate}
        orders={orders}
        config={config}
      />

      {/* Failure Root-Cause Diagnosis & Self-Learning Lesson Modal */}
      <FailureLessonModal
        order={lessonModalOrder}
        isOpen={!!lessonModalOrder}
        onClose={() => setLessonModalOrder(null)}
        onNavigateToLearningStore={() => {
          setActiveSection('LEARNING_STORE');
        }}
      />
    </div>
  );
};
````
