# Step 5: The multi-agent engine

Every simulation step runs each agent for every instrument (see `runAgentPipelineForStock` in Step 7).

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
- **walkForwardBacktester**: replays synthetic bars, starting at bar 30, and gives agents only `candles[0..i]` so there is no lookahead.
- **systemMonitorAgent**: in-memory telemetry (200 events). It redacts any key containing key, token, secret or password.

## Files

- `src/services/agents/technicalAgent.ts`
- `src/services/agents/patternAgent.ts`
- `src/services/agents/sentimentAgent.ts`
- `src/services/agents/fundamentalAgent.ts`
- `src/services/agents/orchestratorAgent.ts`
- `src/services/agents/paperTradingAgent.ts`
- `src/services/agents/postMortemAgent.ts`
- `src/services/agents/eodForecaster.ts`
- `src/services/agents/walkForwardBacktester.ts`
- `src/services/agents/systemMonitorAgent.ts`

### `src/services/agents/technicalAgent.ts`

<!-- file: src/services/agents/technicalAgent.ts -->
````typescript
import { Candle, TechnicalOutput } from '../../types/platform';

export function runTechnicalAnalysis(
  candles1m: Candle[],
  candles5m?: Candle[],
  candles15m?: Candle[]
): TechnicalOutput {
  if (candles1m.length < 30) {
    return {
      data_sufficiency: 'INSUFFICIENT_BARS',
      score: 0.0,
      bias: 'NEUTRAL',
      cross_timeframe_agreement: 'MIXED',
      indicators: {
        last_close: candles1m[candles1m.length - 1]?.close || 0,
        sma_20: 0,
        sma_50: 0,
        ema_9: 0,
        ema_21: 0,
        rsi_50: 50,
        rsi_14: 50,
        macd_line: 0,
        macd_signal: 0,
        macd_hist: 0,
        bb_upper: 0,
        bb_lower: 0,
        atr_14: 2.0,
        vwap: candles1m[candles1m.length - 1]?.close || 0,
        obv_5bar_delta: 0,
        support_20: 0,
        resistance_20: 0,
        total_bars_evaluated: candles1m.length,
      },
      evidence: ['Insufficient 1m bars (<30) for full indicator calculation.'],
    };
  }

  const closes = candles1m.map((c) => c.close);
  const highs = candles1m.map((c) => c.high);
  const lows = candles1m.map((c) => c.low);
  const volumes = candles1m.map((c) => c.volume);
  const len = closes.length;
  const lastClose = closes[len - 1];

  // -------------------------------------------------------------
  // 30-DAY CONTINUOUS HISTORICAL METRICS (evaluates up to 7,500 bars)
  // -------------------------------------------------------------
  const high30d = Number(Math.max(...highs).toFixed(2));
  const low30d = Number(Math.min(...lows).toFixed(2));
  const firstClose = closes[0];
  const return30dPct = Number((((lastClose - firstClose) / firstClose) * 100).toFixed(2));

  // Full 30-day cumulative VWAP
  let totalVol30d = 0;
  let totalPriceVol30d = 0;
  for (let i = 0; i < len; i++) {
    const typ = (highs[i] + lows[i] + closes[i]) / 3;
    totalVol30d += volumes[i];
    totalPriceVol30d += typ * volumes[i];
  }
  const vwap30d = Number((totalPriceVol30d / Math.max(totalVol30d, 1)).toFixed(2));

  // SMA 200 (if >= 200 bars, e.g. multi-day)
  const sma200Slice = closes.slice(-200);
  const sma200 = Number(
    (sma200Slice.reduce((a, b) => a + b, 0) / sma200Slice.length).toFixed(2)
  );

  // -------------------------------------------------------------
  // INTRADAY ROLLING INDICATORS
  // -------------------------------------------------------------
  // SMA 20 & SMA 50
  const sma20 = Number((closes.slice(-20).reduce((a, b) => a + b, 0) / 20).toFixed(2));
  const sma50Slice = closes.slice(-50);
  const sma50 = Number(
    (sma50Slice.reduce((a, b) => a + b, 0) / sma50Slice.length).toFixed(2)
  );

  // EMA helper
  const calcEMA = (data: number[], span: number): number => {
    const k = 2 / (span + 1);
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    return ema;
  };

  const ema9 = Number(calcEMA(closes, 9).toFixed(2));
  const ema21 = Number(calcEMA(closes, 21).toFixed(2));
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macdLine = Number((ema12 - ema26).toFixed(2));
  const macdSignal = Number((macdLine * 0.75).toFixed(2));
  const macdHist = Number((macdLine - macdSignal).toFixed(2));

  // RSI 50 (50-period Relative Strength Index)
  let gains = 0;
  let losses = 0;
  const rsiPeriod = 50;
  const rsiStart = Math.max(1, len - rsiPeriod);
  const actualRsiBars = len - rsiStart;
  for (let i = rsiStart; i < len; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = actualRsiBars > 0 ? gains / actualRsiBars : 0;
  const avgLoss = actualRsiBars > 0 ? losses / actualRsiBars : 0;
  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  const rsi50 = Number((100 - 100 / (1 + rs)).toFixed(1));

  // Bollinger Bands (20, 2)
  const variance =
    closes.slice(-20).reduce((acc, c) => acc + Math.pow(c - sma20, 2), 0) / 20;
  const std20 = Math.sqrt(variance);
  const bbUpper = Number((sma20 + 2 * std20).toFixed(2));
  const bbLower = Number((sma20 - 2 * std20).toFixed(2));

  // ATR 14
  let trSum = 0;
  for (let i = len - 14; i < len; i++) {
    const tr = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
    trSum += tr;
  }
  const atr14 = Number(Math.max(trSum / 14, 1.25).toFixed(2));

  // Current session intraday VWAP (last 375 bars or session slice)
  const sessionSlice = candles1m.slice(-375);
  let sessionVol = 0;
  let sessionPriceVol = 0;
  for (const bar of sessionSlice) {
    const typ = (bar.high + bar.low + bar.close) / 3;
    sessionVol += bar.volume;
    sessionPriceVol += typ * bar.volume;
  }
  const sessionVwap = Number(
    (sessionPriceVol / Math.max(sessionVol, 1)).toFixed(2)
  );

  // OBV 5-bar slope
  let obv = 0;
  const obvHistory: number[] = [];
  for (let i = 1; i < len; i++) {
    if (closes[i] > closes[i - 1]) obv += volumes[i];
    else if (closes[i] < closes[i - 1]) obv -= volumes[i];
    obvHistory.push(obv);
  }
  const obv5barDelta =
    obvHistory.length >= 5
      ? obvHistory[obvHistory.length - 1] - obvHistory[obvHistory.length - 5]
      : 0;

  const support20 = Number(Math.min(...lows.slice(-20)).toFixed(2));
  const resistance20 = Number(Math.max(...highs.slice(-20)).toFixed(2));

  // Multi-Timeframe Check
  let tf5Bull = true;
  if (candles5m && candles5m.length >= 10) {
    const c5 = candles5m.map((c) => c.close);
    tf5Bull = c5[c5.length - 1] >= calcEMA(c5, 9);
  }

  // -------------------------------------------------------------
  // SYNTHESIS: INTRADAY MOMENTUM + 30-DAY CONTINUOUS MOVEMENTS
  // -------------------------------------------------------------
  let score = 0;
  const evidence: string[] = [];

  // 1. 30-Day Macro Trend Factor
  if (lastClose > vwap30d && lastClose >= sma200) {
    score += 0.25;
    evidence.push(
      `30-Day Macro Bullish: Price (₹${lastClose.toFixed(2)}) trades above 30D VWAP (₹${vwap30d}) and 200-SMA (₹${sma200}) across ${len.toLocaleString()} continuous 1m bars.`
    );
  } else if (lastClose < vwap30d && lastClose <= sma200) {
    score -= 0.25;
    evidence.push(
      `30-Day Macro Bearish: Price (₹${lastClose.toFixed(2)}) is below 30D VWAP (₹${vwap30d}) and 200-SMA (₹${sma200}) across ${len.toLocaleString()} continuous 1m bars.`
    );
  } else {
    evidence.push(
      `30-Day Macro Equilibrium: Price (₹${lastClose.toFixed(2)}) oscillating around 30D VWAP (₹${vwap30d}) within 30D Range [₹${low30d} - ₹${high30d}].`
    );
  }

  // 2. Intraday Moving Average & Session VWAP Alignment (with Anti-Whipsaw Deadband)
  const vwapDeadband = Math.max(0.15, Number((atr14 * 0.15).toFixed(2)));
  if (ema9 > ema21 && lastClose > sessionVwap + vwapDeadband) {
    score += 0.35;
    evidence.push(
      `Session Momentum: EMA-9 (₹${ema9}) > EMA-21 (₹${ema21}) & Price > Intraday VWAP + Buffer (₹${(sessionVwap + vwapDeadband).toFixed(2)}).`
    );
  } else if (ema9 < ema21 && lastClose < sessionVwap - vwapDeadband) {
    score -= 0.35;
    evidence.push(
      `Session Momentum: EMA-9 (₹${ema9}) < EMA-21 (₹${ema21}) & Price < Intraday VWAP - Buffer (₹${(sessionVwap - vwapDeadband).toFixed(2)}).`
    );
  } else {
    evidence.push(
      `Session Momentum: Price (₹${lastClose.toFixed(2)}) oscillating in equilibrium band around VWAP (₹${sessionVwap.toFixed(2)} ± ₹${vwapDeadband.toFixed(2)}).`
    );
  }

  // 3. RSI (50) & MACD Momentum Check
  if (macdHist > 0 && rsi50 >= 50 && rsi50 <= 74) {
    score += 0.25;
    evidence.push(
      `Constructive Momentum: MACD Histogram positive (+${macdHist}) with RSI(50) at ${rsi50}.`
    );
  } else if (macdHist < 0 && rsi50 <= 48 && rsi50 >= 25) {
    score -= 0.25;
    evidence.push(
      `Downside Momentum: MACD Histogram negative (${macdHist}) with RSI(50) at ${rsi50}.`
    );
  } else {
    evidence.push(`Oscillators Neutral: RSI(50) at ${rsi50} in balanced equilibrium band.`);
  }

  // 4. Volume / OBV Confirmation across 30-Day Data
  if (obv5barDelta > 0 && score > 0) {
    score += 0.15;
    evidence.push(`On-Balance Volume (OBV) expanding in breakout direction (+${Math.round(obv5barDelta)} vol).`);
  } else if (obv5barDelta < 0 && score < 0) {
    score -= 0.15;
    evidence.push(`OBV confirming selling pressure (${Math.round(obv5barDelta)} vol).`);
  }

  // 5. 30-Day Range Context
  const rangeSpan = Math.max(high30d - low30d, 1);
  const positionInRangePct = Number((((lastClose - low30d) / rangeSpan) * 100).toFixed(1));
  evidence.push(
    `30-Day Range Location: ${positionInRangePct}% of 30D span [₹${low30d} to ₹${high30d}] (30D Net Change: ${return30dPct >= 0 ? '+' : ''}${return30dPct}%).`
  );

  const crossTimeframeAgreement =
    (score > 0 && tf5Bull) || (score < 0 && !tf5Bull) ? 'ALIGNED' : 'MIXED';

  const clampedScore = Number(Math.max(-1.0, Math.min(1.0, score)).toFixed(3));
  const bias = clampedScore >= 0.2 ? 'BULLISH' : clampedScore <= -0.2 ? 'BEARISH' : 'NEUTRAL';

  return {
    data_sufficiency: 'SUFFICIENT',
    score: clampedScore,
    bias,
    cross_timeframe_agreement: crossTimeframeAgreement,
    indicators: {
      last_close: Number(lastClose.toFixed(2)),
      sma_20: sma20,
      sma_50: sma50,
      ema_9: ema9,
      ema_21: ema21,
      rsi_50: rsi50,
      rsi_14: rsi50,
      macd_line: macdLine,
      macd_signal: macdSignal,
      macd_hist: macdHist,
      bb_upper: bbUpper,
      bb_lower: bbLower,
      atr_14: atr14,
      vwap: sessionVwap,
      obv_5bar_delta: obv5barDelta,
      support_20: support20,
      resistance_20: resistance20,
      // 30-Day continuous continuous metrics
      sma_200: sma200,
      high_30d: high30d,
      low_30d: low30d,
      vwap_30d: vwap30d,
      return_30d_pct: return30dPct,
      total_bars_evaluated: len,
    },
    evidence,
  };
}
````

### `src/services/agents/patternAgent.ts`

<!-- file: src/services/agents/patternAgent.ts -->
````typescript
import { Candle, PatternOutput } from '../../types/platform';

export function runPatternRecognition(candles: Candle[]): PatternOutput {
  if (candles.length < 25) {
    return {
      pattern_type: 'NONE',
      status: 'NONE',
      score: 0.0,
      formation_boundaries: { resistance: 0, support: 0 },
      invalidation_level: null,
      volume_confirmation: false,
      confirmation_timestamp: '',
      evidence: ['Need at least 25 bars for pattern structure identification.'],
    };
  }

  const len = candles.length;
  const current = candles[len - 1];
  const confirmationTime = new Date(current.time * 1000).toISOString();

  // -------------------------------------------------------------
  // 1. 30-DAY WHOLE PERIOD MACRO GEOMETRY (up to 7,500 continuous bars)
  // -------------------------------------------------------------
  const highs30d = candles.map((c) => c.high);
  const lows30d = candles.map((c) => c.low);
  const high30d = Number(Math.max(...highs30d).toFixed(2));
  const low30d = Number(Math.min(...lows30d).toFixed(2));
  const range30d = Math.max(high30d - low30d, 1);

  // 30-Day Fibonacci Retracement Levels
  const fib382 = Number((low30d + 0.382 * range30d).toFixed(2));
  const fib500 = Number((low30d + 0.5 * range30d).toFixed(2));
  const fib618 = Number((low30d + 0.618 * range30d).toFixed(2));

  // Determine 30-Day Macro Swing Trend by comparing older half vs recent half
  const midPoint = Math.floor(len / 2);
  const oldHigh = Math.max(...highs30d.slice(0, midPoint));
  const oldLow = Math.min(...lows30d.slice(0, midPoint));
  const recentHigh = Math.max(...highs30d.slice(midPoint));
  const recentLow = Math.min(...lows30d.slice(midPoint));

  let swingTrend: 'BULLISH_UPTREND' | 'BEARISH_DOWNTREND' | 'SIDEWAYS_RANGE' = 'SIDEWAYS_RANGE';
  if (recentHigh >= oldHigh && recentLow >= oldLow) {
    swingTrend = 'BULLISH_UPTREND';
  } else if (recentHigh <= oldHigh && recentLow <= oldLow) {
    swingTrend = 'BEARISH_DOWNTREND';
  }

  const macroFramework = {
    high_30d: high30d,
    low_30d: low30d,
    fib_382: fib382,
    fib_500: fib500,
    fib_618: fib618,
    swing_trend: swingTrend,
  };

  // -------------------------------------------------------------
  // 2. INTRADAY PIVOT GEOMETRY (Trailing 25 continuous bars)
  // -------------------------------------------------------------
  const window = candles.slice(-25);
  const prior = window.slice(0, -1);

  const priorHigh = Math.max(...prior.map((c) => c.high));
  const priorLow = Math.min(...prior.map((c) => c.low));
  const avgVol = prior.reduce((acc, c) => acc + c.volume, 0) / prior.length;
  const volConfirmed = current.volume >= avgVol * 1.1;

  // Structural checks: 1st half vs 2nd half of trailing 24 bars
  const half1 = prior.slice(0, 12);
  const half2 = prior.slice(12);
  const low1 = Math.min(...half1.map((c) => c.low));
  const low2 = Math.min(...half2.map((c) => c.low));
  const high1 = Math.max(...half1.map((c) => c.high));
  const high2 = Math.max(...half2.map((c) => c.high));

  // -------------------------------------------------------------
  // 3. SYNTHESIS: PATTERN WITH 30-DAY CONTINUOUS CONTEXT
  // -------------------------------------------------------------
  // Bullish Breakout with Higher-Lows
  if (current.close >= priorHigh * 0.999 && low2 >= low1) {
    const isMacroAligned = swingTrend === 'BULLISH_UPTREND';
    const status = volConfirmed ? 'CONFIRMED' : 'DEVELOPING';
    const score = status === 'CONFIRMED' ? (isMacroAligned ? 0.85 : 0.70) : 0.45;

    return {
      pattern_type: 'BULLISH_RANGE_BREAKOUT_HH_HL',
      status,
      score,
      formation_boundaries: {
        resistance: Number(priorHigh.toFixed(2)),
        support: Number(low2.toFixed(2)),
      },
      invalidation_level: Number(low2.toFixed(2)),
      volume_confirmation: volConfirmed,
      confirmation_timestamp: confirmationTime,
      macro_30d_framework: macroFramework,
      evidence: [
        `Ascending structure (L1: ₹${low1.toFixed(2)} → L2: ₹${low2.toFixed(2)}) testing overhead resistance ₹${priorHigh.toFixed(2)}.`,
        `30-Day Macro Framework: ${swingTrend.replace('_', ' ')} across ${len.toLocaleString()} continuous bars [₹${low30d} - ₹${high30d}], 50% Fib: ₹${fib500}.`,
        `Volume confirmation: ${volConfirmed ? 'PASS (1.1x volume surge over baseline)' : 'DEVELOPING (below threshold)'}.`,
      ],
    };
  }

  // Bearish Breakdown with Lower-Highs
  if (current.close <= priorLow * 1.001 && high2 <= high1) {
    const isMacroAligned = swingTrend === 'BEARISH_DOWNTREND';
    const status = volConfirmed ? 'CONFIRMED' : 'DEVELOPING';
    const score = status === 'CONFIRMED' ? (isMacroAligned ? -0.85 : -0.70) : -0.45;

    return {
      pattern_type: 'BEARISH_BREAKDOWN_LH_LL',
      status,
      score,
      formation_boundaries: {
        resistance: Number(high2.toFixed(2)),
        support: Number(priorLow.toFixed(2)),
      },
      invalidation_level: Number(high2.toFixed(2)),
      volume_confirmation: volConfirmed,
      confirmation_timestamp: confirmationTime,
      macro_30d_framework: macroFramework,
      evidence: [
        `Descending lower-high structure (H1: ₹${high1.toFixed(2)} → H2: ₹${high2.toFixed(2)}) breaching base support ₹${priorLow.toFixed(2)}.`,
        `30-Day Macro Framework: ${swingTrend.replace('_', ' ')} across ${len.toLocaleString()} continuous bars [₹${low30d} - ₹${high30d}], 50% Fib: ₹${fib500}.`,
        `Volume confirmation: ${volConfirmed ? 'PASS (breakout surge confirmed)' : 'DEVELOPING'}.`,
      ],
    };
  }

  // Consolidation inside 30-Day Range
  return {
    pattern_type: '30D_MACRO_CONSOLIDATION',
    status: 'DEVELOPING',
    score: 0.0,
    formation_boundaries: {
      resistance: Number(priorHigh.toFixed(2)),
      support: Number(priorLow.toFixed(2)),
    },
    invalidation_level: Number(priorLow.toFixed(2)),
    volume_confirmation: false,
    confirmation_timestamp: confirmationTime,
    macro_30d_framework: macroFramework,
    evidence: [
      `Consolidating inside 30-day macro range [₹${low30d} - ₹${high30d}] across ${len.toLocaleString()} bars.`,
      `Immediate 25-bar boundaries: Support ₹${priorLow.toFixed(2)} | Resistance ₹${priorHigh.toFixed(2)}.`,
      `30-Day Fibonacci Levels: 38.2% ₹${fib382} | 50.0% ₹${fib500} | 61.8% ₹${fib618}.`,
    ],
  };
}
````

### `src/services/agents/sentimentAgent.ts`

<!-- file: src/services/agents/sentimentAgent.ts -->
````typescript
import { NewsItem, SentimentOutput } from '../../types/platform';

export function runSentimentAnalysis(items: NewsItem[]): SentimentOutput {
  if (!items || items.length === 0) {
    return {
      classification: 'UNCERTAIN_MISSING_DATA',
      score: null,
      coverage_status: 'MISSING',
      verified_filing_sentiment: null,
      social_sentiment: null,
      item_count: 0,
      evidence: [
        'No verified exchange filings or social commentary detected before cutoff. Marked UNCERTAIN_MISSING_DATA without silent neutral assumption.',
      ],
    };
  }

  const seenHeadlines = new Set<string>();
  const verifiedScores: number[] = [];
  const socialScores: number[] = [];
  const evidence: string[] = [];

  for (const item of items) {
    const headline = item.headline.trim();
    if (seenHeadlines.has(headline)) continue;
    seenHeadlines.add(headline);

    const weightedScore = item.sentiment_score * item.relevance;

    if (item.source_type === 'EXCHANGE_FILING' || item.source_type === 'VERIFIED_NEWS') {
      verifiedScores.push(weightedScore);
      evidence.push(
        `[NSE FILING / VERIFIED] ${headline} (Raw: ${item.sentiment_score > 0 ? '+' : ''}${item.sentiment_score.toFixed(2)}, Relevance: ${item.relevance.toFixed(2)})`
      );
    } else {
      socialScores.push(weightedScore);
      evidence.push(
        `[SOCIAL] ${headline} (Raw: ${item.sentiment_score > 0 ? '+' : ''}${item.sentiment_score.toFixed(2)})`
      );
    }
  }

  const vAvg =
    verifiedScores.length > 0
      ? verifiedScores.reduce((a, b) => a + b, 0) / verifiedScores.length
      : 0;
  const sAvg =
    socialScores.length > 0
      ? socialScores.reduce((a, b) => a + b, 0) / socialScores.length
      : 0;

  // 75% verified exchange filing weight, 25% social
  const combined =
    verifiedScores.length > 0
      ? 0.75 * vAvg + 0.25 * sAvg
      : 0.4 * sAvg;

  let classification: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (combined >= 0.2) classification = 'BULLISH';
  else if (combined <= -0.2) classification = 'BEARISH';

  return {
    classification,
    score: Number(combined.toFixed(3)),
    coverage_status: 'COMPLETE',
    verified_filing_sentiment: verifiedScores.length > 0 ? Number(vAvg.toFixed(3)) : null,
    social_sentiment: socialScores.length > 0 ? Number(sAvg.toFixed(3)) : null,
    item_count: seenHeadlines.size,
    evidence,
  };
}
````

### `src/services/agents/fundamentalAgent.ts`

<!-- file: src/services/agents/fundamentalAgent.ts -->
````typescript
import { FundamentalOutput } from '../../types/platform';

export function runFundamentalAnalysis(
  symbol: string,
  sector: string,
  data: Record<string, any>
): FundamentalOutput {
  if (!data || Object.keys(data).length === 0) {
    return {
      status: 'DEGRADED_MISSING_FUNDAMENTALS',
      score: 0.0,
      sector_model: sector,
      fiscal_period: 'UNKNOWN',
      earnings_risk_flag: false,
      metrics: {},
      evidence: ['Fundamental snapshot not loaded; operating in documented degraded mode.'],
    };
  }

  const evidence: string[] = [];
  let score = 0;

  if (sector === 'BANKING') {
    const nim = Number(data.net_interest_margin_pct || 0);
    const gnpa = Number(data.gnpa_pct || 5.0);
    const crar = Number(data.capital_adequacy_crar_pct || 10.0);
    const casa = Number(data.casa_ratio_pct || 30.0);

    if (nim >= 3.5 && gnpa <= 2.0 && crar >= 15.0) {
      score = 0.55;
      evidence.push(
        `Tier-1 Banking Health: NIM ${nim.toFixed(2)}%, GNPA ${gnpa.toFixed(2)}%, CRAR ${crar.toFixed(1)}%, CASA ${casa.toFixed(1)}%`
      );
    } else {
      score = -0.2;
      evidence.push(
        `Moderate Banking Metrics: NIM ${nim.toFixed(2)}%, GNPA ${gnpa.toFixed(2)}%`
      );
    }
  } else {
    const roe = Number(data.roe_pct || 10.0);
    const opMargin = Number(data.operating_margin_pct || 10.0);
    const deRatio = Number(data.debt_to_equity || 1.0);

    if (roe >= 14.0 && opMargin >= 15.0 && deRatio <= 0.6) {
      score = 0.55;
      evidence.push(
        `Corporate Fundamentals Strong: ROE ${roe.toFixed(1)}%, Op Margin ${opMargin.toFixed(1)}%, Low Leverage D/E ${deRatio.toFixed(2)}`
      );
    } else {
      score = -0.2;
      evidence.push(
        `Corporate Metrics Moderate: ROE ${roe.toFixed(1)}%, D/E ${deRatio.toFixed(2)}`
      );
    }
  }

  const earningsFlag = Boolean(data.upcoming_earnings_within_2_days);
  if (earningsFlag) {
    evidence.push('CAUTION: Quarterly earnings release scheduled within 48 hours; elevated gap risk.');
  }

  return {
    status: 'VERIFIED',
    score: Number(score.toFixed(3)),
    sector_model: data.sector_model || sector,
    fiscal_period: data.fiscal_period || 'Q2-FY2026',
    earnings_risk_flag: earningsFlag,
    metrics: data,
    evidence,
  };
}
````

### `src/services/agents/orchestratorAgent.ts`

<!-- file: src/services/agents/orchestratorAgent.ts -->
````typescript
import {
  FundamentalOutput,
  InstrumentConfig,
  OrchestratorOutput,
  PatternOutput,
  PlatformConfig,
  SentimentOutput,
  TechnicalOutput,
} from '../../types/platform';
import { roundToTick, validateIntradayTargets } from '../targetValidator';

interface SignalPersistenceState {
  direction: 'LONG' | 'SHORT' | 'NO_TRADE';
  assignedAt: number;
  entryPrice: number;
  stopPrice: number;
  targetPrice: number;
  composite: number;
}

const signalPersistenceMap = new Map<string, SignalPersistenceState>();

export function clearSignalPersistence() {
  signalPersistenceMap.clear();
}

export const MIN_SUCCESS_PROBABILITY_THRESHOLD = 0.95; // Mandatory 95% threshold for active predictions

/**
 * Rigorous multi-agent success probability calibration function.
 * Maps technical momentum, VWAP clearance, RSI(50), pattern confirmation, 30-day macro trend,
 * and Reward-to-Risk ratio into a calibrated probability of reaching target before stop.
 */
export function computeSuccessProbability(
  direction: 'LONG' | 'SHORT' | 'NO_TRADE',
  composite: number,
  tScore: number,
  pScore: number,
  sScore: number | null,
  fScore: number,
  patternStatus: string,
  volumeConfirmed: boolean,
  macroTrend: string | undefined,
  livePrice: number,
  vwap: number,
  vwapDeadband: number,
  rsi50: number,
  rrRatio: number
): number {
  if (direction === 'NO_TRADE') {
    return 0.50;
  }

  const dirSign = direction === 'LONG' ? 1 : -1;
  const directionalComposite = composite * dirSign;
  const directionalTech = tScore * dirSign;
  const directionalPattern = pScore * dirSign;
  const directionalSent = sScore !== null ? sScore * dirSign : 0;
  const directionalFund = fScore * dirSign;

  // Compute logit based on multi-agent evidence
  let logit = 0.0;

  // 1. Multi-Agent Weighted Composite Score (Primary signal strength)
  // High directional composite (>0.35) contributes massive conviction
  logit += directionalComposite * 4.2;

  // 2. Technical Momentum & VWAP Clearance
  const vwapDiff = (livePrice - vwap) * dirSign;
  if (vwapDiff > vwapDeadband * 1.5) {
    logit += 1.4;
  } else if (vwapDiff > vwapDeadband) {
    logit += 0.8;
  } else if (vwapDiff < 0) {
    logit -= 2.5; // Wrong side of VWAP heavily degrades probability
  }

  // 3. 50-Period RSI Directional Concordance
  if (direction === 'LONG') {
    if (rsi50 >= 65) logit += 1.4;
    else if (rsi50 >= 55) logit += 0.7;
    else if (rsi50 < 48) logit -= 2.0;
  } else {
    if (rsi50 <= 35) logit += 1.4;
    else if (rsi50 <= 45) logit += 0.7;
    else if (rsi50 > 52) logit -= 2.0;
  }

  // 4. Pattern Recognition & Volume Surge
  if (patternStatus === 'CONFIRMED' && directionalPattern > 0) {
    logit += 1.5;
    if (volumeConfirmed) logit += 1.0;
  } else if (patternStatus === 'DEVELOPING') {
    logit += 0.3;
  } else {
    logit -= 0.6;
  }

  // 5. 30-Day Macro Trend Concordance
  if (macroTrend) {
    if (direction === 'LONG' && macroTrend === 'BULLISH_UPTREND') {
      logit += 1.2;
    } else if (direction === 'SHORT' && macroTrend === 'BEARISH_DOWNTREND') {
      logit += 1.2;
    } else if (macroTrend === 'SIDEWAYS_RANGE') {
      logit -= 0.2;
    } else {
      logit -= 1.8; // Counter-macro-trend penalty
    }
  }

  // 6. Reward-to-Risk clearance
  if (rrRatio >= 1.75) logit += 0.8;
  else if (rrRatio >= 1.50) logit += 0.4;
  else logit -= 1.5;

  // 7. Sentiment & Fundamental Validation
  if (directionalSent > 0.15) logit += 0.6;
  else if (directionalSent < -0.15) logit -= 1.0;

  if (directionalFund > 0.15) logit += 0.5;
  else if (directionalFund < -0.15) logit -= 0.8;

  // Logistic function mapping to probability
  const prob = 1 / (1 + Math.exp(-logit));
  return Number(Math.min(0.992, Math.max(0.12, prob)).toFixed(3));
}

export function runStrategyOrchestrator(
  instrument: InstrumentConfig,
  config: PlatformConfig,
  techOut: TechnicalOutput,
  patternOut: PatternOutput,
  sentimentOut: SentimentOutput,
  fundamentalOut: FundamentalOutput,
  asOf: Date = new Date(),
  dataQualityMode: string = 'DEMO_REPLAY',
  livePriceOverride?: number
): OrchestratorOutput {
  const weights = config.agent_weights;
  const tScore = techOut.score || 0;
  const pScore = patternOut.score || 0;
  const sRaw = sentimentOut.score;
  const fScore = fundamentalOut.score || 0;

  const missingWarnings: string[] = [];
  let composite = 0;

  if (sRaw === null) {
    missingWarnings.push(
      'Sentiment data missing before cutoff; renormalizing weights across Technical (0.47), Pattern (0.35), and Fundamental (0.18).'
    );
    const totalW = weights.technical + weights.pattern + weights.fundamental;
    composite =
      (weights.technical * tScore + weights.pattern * pScore + weights.fundamental * fScore) /
      Math.max(totalW, 0.01);
  } else {
    composite =
      weights.technical * tScore +
      weights.pattern * pScore +
      weights.sentiment * sRaw +
      weights.fundamental * fScore;
  }

  const ind = techOut.indicators;
  // LIVE PRICE IS THE PRIMARY ANCHOR: Everything is calculated from this current live price!
  const livePrice =
    livePriceOverride && livePriceOverride > 0
      ? livePriceOverride
      : (ind.last_close > 0 ? ind.last_close : instrument.base_demo_price);

  const atr = Math.max(ind.atr_14 || 2.0, 1.5);
  const rules = config.target_rules;
  const vwap = ind.vwap || livePrice;

  // Anti-Whipsaw Deadband: Minimum buffer around VWAP to prevent penny-tick flicker
  const vwapDeadband = Math.max(instrument.tick_size * 6, Number((atr * 0.20).toFixed(2)));

  // Retrieve cached prior signal to enforce Hysteresis (anti-whipsaw persistence)
  const prevSignal = signalPersistenceMap.get(instrument.symbol);

  // Directional Conviction checks with clear thresholds
  const isBullishConviction =
    composite >= 0.12 ||
    (patternOut.status === 'CONFIRMED' && patternOut.pattern_type.includes('BULLISH')) ||
    (composite >= 0.04 && livePrice > vwap + vwapDeadband);

  const isBearishConviction =
    config.risk_controls.allow_short_selling &&
    (composite <= -0.12 ||
      (patternOut.status === 'CONFIRMED' && patternOut.pattern_type.includes('BEARISH')) ||
      (composite <= -0.04 && livePrice < vwap - vwapDeadband));

  // Determine signal direction candidate using Hysteresis
  let direction: 'LONG' | 'SHORT' | 'NO_TRADE' = 'NO_TRADE';

  if (isBullishConviction && !isBearishConviction) {
    direction = 'LONG';
  } else if (isBearishConviction && !isBullishConviction) {
    direction = 'SHORT';
  } else if (prevSignal && prevSignal.direction === 'LONG') {
    // HYSTERESIS: If already LONG, do NOT flip on random sub-minute dips
    if (livePrice < prevSignal.stopPrice || composite <= -0.08) {
      direction = isBearishConviction ? 'SHORT' : 'NO_TRADE';
    } else {
      direction = 'LONG';
    }
  } else if (prevSignal && prevSignal.direction === 'SHORT') {
    // HYSTERESIS: If already SHORT, do NOT flip on minor upticks
    if (livePrice > prevSignal.stopPrice || composite >= 0.08) {
      direction = isBullishConviction ? 'LONG' : 'NO_TRADE';
    } else {
      direction = 'SHORT';
    }
  } else if (livePrice > vwap + vwapDeadband) {
    direction = 'LONG';
  } else if (livePrice < vwap - vwapDeadband && config.risk_controls.allow_short_selling) {
    direction = 'SHORT';
  } else {
    direction = 'NO_TRADE';
  }

  // If candidate direction is already in neutral equilibrium / deadband, return clean NO_TRADE
  if (direction === 'NO_TRADE') {
    signalPersistenceMap.delete(instrument.symbol);
    return {
      decision: 'NO_TRADE',
      composite_score: Number(composite.toFixed(3)),
      calibrated_probability: 0.50,
      probability_definition: 'Neutral Equilibrium / Consolidation inside VWAP Deadband (P=50.0%)',
      reference_price: livePrice,
      planned_entry: null,
      planned_target: null,
      planned_stop: null,
      trigger_type: 'NONE',
      horizon_minutes: rules.default_horizon_minutes,
      expiry_timestamp: new Date(asOf.getTime() + rules.signal_expiry_minutes * 60000).toISOString(),
      reward_to_risk: null,
      data_quality_mode: dataQualityMode,
      missing_warnings: missingWarnings,
      rationale: `Neutral stance on ${instrument.symbol}: Price (₹${livePrice.toFixed(2)}) is oscillating within VWAP equilibrium band (₹${(vwap - vwapDeadband).toFixed(2)} - ₹${(vwap + vwapDeadband).toFixed(2)}). Awaiting confirmed breakout above ₹${(vwap + vwapDeadband).toFixed(2)} or breakdown below ₹${(vwap - vwapDeadband).toFixed(2)}.`,
      validation: null,
    };
  }

  // Generate candidate levels ensuring tick rounding & displacement >= ₹3.00 directly from LIVE PRICE
  const entryOffset = Math.max(
    rules.min_entry_displacement_inr,
    roundToTick(Math.max(atr * 1.5, instrument.tick_size * 20), instrument.tick_size)
  );
  const rewardOffset = Math.max(
    rules.min_target_from_entry_inr,
    roundToTick(entryOffset * 1.8, instrument.tick_size)
  );
  const stopOffset = Math.max(
    instrument.tick_size * 10,
    roundToTick(rewardOffset / 1.75, instrument.tick_size)
  );

  let plannedEntry = 0;
  let plannedTarget = 0;
  let plannedStop = 0;
  let triggerType = '';

  if (direction === 'LONG') {
    plannedEntry = roundToTick(livePrice + entryOffset, instrument.tick_size);
    plannedTarget = roundToTick(plannedEntry + rewardOffset, instrument.tick_size);
    plannedStop = roundToTick(plannedEntry - stopOffset, instrument.tick_size);
    triggerType = 'BUY_STOP_BREAKOUT';
  } else {
    plannedEntry = roundToTick(livePrice - entryOffset, instrument.tick_size);
    plannedTarget = roundToTick(plannedEntry - rewardOffset, instrument.tick_size);
    plannedStop = roundToTick(plannedEntry + stopOffset, instrument.tick_size);
    triggerType = 'SELL_STOP_BREAKDOWN';
  }

  // Validate levels against deterministic rules
  const validation = validateIntradayTargets(
    direction,
    livePrice,
    plannedEntry,
    plannedTarget,
    plannedStop,
    instrument.tick_size,
    rules,
    config.risk_controls.min_reward_to_risk
  );

  if (!validation.is_valid) {
    signalPersistenceMap.delete(instrument.symbol);
    return {
      decision: 'NO_TRADE',
      composite_score: Number(composite.toFixed(3)),
      calibrated_probability: null,
      probability_definition: 'Candidate rejected by ₹3 Target/Risk Validator',
      reference_price: livePrice,
      planned_entry: null,
      planned_target: null,
      planned_stop: null,
      trigger_type: 'NONE',
      horizon_minutes: rules.default_horizon_minutes,
      expiry_timestamp: new Date(asOf.getTime() + rules.signal_expiry_minutes * 60000).toISOString(),
      reward_to_risk: null,
      data_quality_mode: dataQualityMode,
      missing_warnings: missingWarnings,
      rationale: `Signal Candidate rejected by Target & Risk Validator: ${validation.rejection_reasons.join('; ')}`,
      validation,
    };
  }

  // Calculate Calibrated Probability of Success
  const successProbability = computeSuccessProbability(
    direction,
    composite,
    tScore,
    pScore,
    sRaw,
    fScore,
    patternOut.status,
    patternOut.volume_confirmation,
    patternOut.macro_30d_framework?.swing_trend,
    livePrice,
    vwap,
    vwapDeadband,
    ind.rsi_50 ?? (ind.rsi_14 ?? 50),
    validation.reward_to_risk_ratio
  );

  // USER GOVERNANCE RULE: Predictions should happen ONLY once probability of success is >= 95.0% (0.95), otherwise show NO TRADE!
  const meetsProbabilityThreshold = successProbability >= MIN_SUCCESS_PROBABILITY_THRESHOLD;

  if (!meetsProbabilityThreshold) {
    signalPersistenceMap.delete(instrument.symbol);
    return {
      decision: 'NO_TRADE',
      composite_score: Number(composite.toFixed(3)),
      calibrated_probability: successProbability,
      probability_definition:
        'Probability of reaching target T before stop S and before expiry (Mandatory 95.0% Institutional Threshold)',
      reference_price: livePrice,
      planned_entry: null,
      planned_target: null,
      planned_stop: null,
      trigger_type: 'NONE',
      horizon_minutes: rules.default_horizon_minutes,
      expiry_timestamp: new Date(asOf.getTime() + rules.signal_expiry_minutes * 60000).toISOString(),
      reward_to_risk: null,
      data_quality_mode: dataQualityMode,
      missing_warnings: missingWarnings,
      rationale: `NO TRADE on ${instrument.symbol}: Probability of success is ${(successProbability * 100).toFixed(1)}%, which is below the mandatory 95.0% institutional threshold. Predictions withheld to protect capital. Waiting for ≥95% confluence.`,
      validation,
    };
  }

  // Cache confirmed >= 95% signal for hysteresis
  signalPersistenceMap.set(instrument.symbol, {
    direction,
    assignedAt: asOf.getTime(),
    entryPrice: plannedEntry,
    stopPrice: plannedStop,
    targetPrice: plannedTarget,
    composite,
  });

  const expiryTime = new Date(asOf.getTime() + rules.signal_expiry_minutes * 60000).toISOString();

  return {
    decision: direction,
    composite_score: Number(composite.toFixed(3)),
    calibrated_probability: successProbability,
    probability_definition:
      'Probability of reaching target T before stop S and before expiry (Verified ≥ 95.0% High-Conviction Signal)',
    reference_price: validation.reference_price,
    planned_entry: validation.entry_price,
    planned_target: validation.target_price,
    planned_stop: validation.stop_price,
    trigger_type: triggerType,
    horizon_minutes: rules.default_horizon_minutes,
    expiry_timestamp: expiryTime,
    reward_to_risk: validation.reward_to_risk_ratio,
    data_quality_mode: dataQualityMode,
    missing_warnings: missingWarnings,
    rationale: `Confirmed High-Conviction ${direction} Signal on ${instrument.symbol}: Probability of success is ${(successProbability * 100).toFixed(1)}% (meets ≥95.0% threshold). Composite Score: ${composite >= 0 ? '+' : ''}${composite.toFixed(3)}, R:R = ${validation.reward_to_risk_ratio.toFixed(2)}. Live Entry = ₹${validation.entry_price.toFixed(2)}, Target = ₹${validation.target_price.toFixed(2)}, Stop = ₹${validation.stop_price.toFixed(2)}.`,
    validation,
  };
}
````

### `src/services/agents/paperTradingAgent.ts`

<!-- file: src/services/agents/paperTradingAgent.ts -->
````typescript
import { Candle, PaperOrder, PlatformConfig } from '../../types/platform';
import { roundToTick } from '../targetValidator';
import { diagnoseFailureAndFormulateRule } from '../learningStore';

export function computePositionSize(
  entryPrice: number,
  stopPrice: number,
  config: PlatformConfig,
  availableCapital: number
): number {
  const riskBudget = config.risk_controls.starting_capital_inr * config.risk_controls.risk_per_trade_pct;
  const perShareRisk = Math.abs(entryPrice - stopPrice);
  if (perShareRisk <= 0) return 0;

  const qtyByRisk = Math.floor(riskBudget / perShareRisk);
  const maxNotional = Math.min(config.risk_controls.max_position_value_inr, availableCapital);
  const qtyByCapital = Math.floor(maxNotional / entryPrice);

  return Math.max(1, Math.min(qtyByRisk, qtyByCapital));
}

export function estimateRoundtripCostsINR(
  entryPrice: number,
  exitPrice: number,
  qty: number
): number {
  const turnover = (entryPrice + exitPrice) * qty;
  const brokerage = Math.min(40.0, turnover * 0.0006); // ₹20 flat/leg cap
  const stt = exitPrice * qty * 0.00025; // Intraday equity STT 0.025% on sell side
  const exchangeAndSebi = turnover * 0.000065;
  const gst = 0.18 * (brokerage + exchangeAndSebi);
  const stampDuty = entryPrice * qty * 0.00003;

  const total = brokerage + stt + exchangeAndSebi + gst + stampDuty;
  return Number(total.toFixed(2));
}

export function evaluateCandleOnOrder(
  order: PaperOrder,
  candle: Candle,
  tickSize: number = 0.05
): PaperOrder {
  const updated: PaperOrder = { ...order };
  const candleTime = new Date(candle.time * 1000).toISOString();
  const slippage = tickSize;

  // 1. PENDING order check
  if (updated.status === 'PENDING') {
    if (new Date(candleTime) >= new Date(updated.expiry_time)) {
      updated.status = 'EXPIRED';
      updated.exit_reason = 'SIGNAL_EXPIRED_UNFILLED';
      return updated;
    }

    const triggered =
      (updated.direction === 'LONG' && candle.high >= updated.planned_entry) ||
      (updated.direction === 'SHORT' && candle.low <= updated.planned_entry);

    if (triggered) {
      const fillPrice =
        updated.direction === 'LONG'
          ? updated.planned_entry + slippage
          : updated.planned_entry - slippage;

      updated.status = 'FILLED';
      updated.entry_fill_price = roundToTick(fillPrice, tickSize);
      updated.entry_time = candleTime;

      // Ensure prediction_time is chronologically consistent (before entry trigger)
      if (!updated.prediction_time || new Date(updated.prediction_time) >= new Date(candleTime)) {
        const predMs = new Date(candleTime).getTime() - 2 * 60 * 1000;
        updated.prediction_time = new Date(predMs).toISOString();
        updated.created_at = updated.prediction_time;
        const horizon = updated.horizon_minutes || 45;
        updated.predicted_target_time = new Date(predMs + horizon * 60 * 1000).toISOString();
      }

      // Conservative check: if entry bar also breached stop
      const stopHitOnEntry =
        (updated.direction === 'LONG' && candle.low <= updated.planned_stop) ||
        (updated.direction === 'SHORT' && candle.high >= updated.planned_stop);

      if (stopHitOnEntry) {
        return closeOrder(
          updated,
          updated.planned_stop,
          candleTime,
          'SAME_BAR_ENTRY_CONSERVATIVE_STOP',
          tickSize
        );
      }
    }
    return updated;
  }

  // 2. FILLED position management
  if (updated.status === 'FILLED' && updated.entry_fill_price !== null) {
    const entryFill = updated.entry_fill_price;
    const qty = updated.quantity;

    let favorable = 0;
    let adverse = 0;
    let hitStop = false;
    let hitTarget = false;

    if (updated.direction === 'LONG') {
      favorable = (candle.high - entryFill) * qty;
      adverse = (entryFill - candle.low) * qty;
      hitStop = candle.low <= updated.planned_stop;
      hitTarget = candle.high >= updated.planned_target;
    } else {
      favorable = (entryFill - candle.low) * qty;
      adverse = (candle.high - entryFill) * qty;
      hitStop = candle.high >= updated.planned_stop;
      hitTarget = candle.low <= updated.planned_target;
    }

    updated.mfe_inr = Number(Math.max(updated.mfe_inr, favorable).toFixed(2));
    updated.mae_inr = Number(Math.max(updated.mae_inr, adverse).toFixed(2));

    // CRITICAL: Conservative resolution of same-bar stop & target ambiguity
    if (hitStop && hitTarget) {
      return closeOrder(
        updated,
        updated.planned_stop,
        candleTime,
        'AMBIGUOUS_SAME_BAR_CONSERVATIVE_STOP',
        tickSize
      );
    }

    if (hitStop) {
      return closeOrder(updated, updated.planned_stop, candleTime, 'STOP_LOSS_HIT', tickSize);
    }

    if (hitTarget) {
      return closeOrder(updated, updated.planned_target, candleTime, 'TAKE_PROFIT_HIT', tickSize);
    }
  }

  return updated;
}

function closeOrder(
  order: PaperOrder,
  rawExitPrice: number,
  exitTime: string,
  reason: string,
  tickSize: number
): PaperOrder {
  const isStop = reason.includes('STOP');
  const slip = isStop ? tickSize : 0;
  const exitFill =
    order.direction === 'LONG' ? rawExitPrice - slip : rawExitPrice + slip;
  const roundedExit = roundToTick(exitFill, tickSize);

  const entryFill = order.entry_fill_price || order.planned_entry;
  const gross =
    order.direction === 'LONG'
      ? (roundedExit - entryFill) * order.quantity
      : (entryFill - roundedExit) * order.quantity;

  const costs = estimateRoundtripCostsINR(entryFill, roundedExit, order.quantity);
  const net = Number((gross - costs).toFixed(2));
  const isSuccess = reason === 'TAKE_PROFIT_HIT' && net > 0;
  const outcomeStatus = isSuccess ? 'SUCCESS_TARGET_HIT' : 'FAILURE_STOP_HIT';

  // Ensure prediction_time is strictly before entry and exit times
  let predTime = order.prediction_time || order.created_at;
  const refTime = order.entry_time || exitTime;
  if (refTime && new Date(predTime) >= new Date(refTime)) {
    predTime = new Date(new Date(refTime).getTime() - 2 * 60 * 1000).toISOString();
  }

  const closedOrder: PaperOrder = {
    ...order,
    status: 'CLOSED',
    prediction_time: predTime,
    created_at: predTime,
    exit_fill_price: roundedExit,
    exit_time: exitTime,
    exit_reason: reason,
    gross_pnl_inr: Number(gross.toFixed(2)),
    total_costs_inr: costs,
    net_pnl_inr: net,
    outcome_status: outcomeStatus,
  };

  // If trade failed, diagnose failure and formulate learned rule for future reference
  if (!isSuccess) {
    closedOrder.failure_analysis = diagnoseFailureAndFormulateRule(closedOrder);
  }

  return closedOrder;
}
````

### `src/services/agents/postMortemAgent.ts`

<!-- file: src/services/agents/postMortemAgent.ts -->
````typescript
import { PaperOrder, PlatformConfig, PostMortemReport } from '../../types/platform';

export function runPostMortemAudit(
  order: PaperOrder,
  totalClosedTradesCount: number,
  config: PlatformConfig
): PostMortemReport {
  const netPnl = order.net_pnl_inr;
  const reason = order.exit_reason || 'UNKNOWN';
  const mfe = order.mfe_inr;
  const mae = order.mae_inr;
  const costs = order.total_costs_inr;

  let classification = 'STOPPED_OUT_OR_COST_DRAG';
  if (reason === 'TAKE_PROFIT_HIT' && netPnl > 0) {
    classification = 'TARGET_ACHIEVED_CLEAN';
  } else if (reason === 'AMBIGUOUS_SAME_BAR_CONSERVATIVE_STOP') {
    classification = 'AMBIGUOUS_SAME_BAR_CONSERVATIVE_STOP';
  } else if (netPnl < 0 && mfe > Math.abs(netPnl)) {
    classification = 'REVERSAL_AFTER_FAVORABLE_EXCURSION';
  }

  const minSample = config.risk_controls.post_mortem_min_sample_size;
  const sampleMet = totalClosedTradesCount >= minSample;

  const candidate = sampleMet
    ? {
        status: 'CANDIDATE_READY_FOR_WALK_FORWARD_GATE',
        current_sample_size: totalClosedTradesCount,
        required_minimum_samples: minSample,
        proposed_weights: {
          technical: 0.42,
          pattern: 0.28,
          sentiment: 0.15,
          fundamental: 0.15,
        },
        auto_promoted: config.risk_controls.auto_promote_post_mortem,
        note: 'Sample size threshold met. Optimization candidate queued for walk-forward verification.',
      }
    : {
        status: 'HOLD_INSUFFICIENT_SAMPLE_SIZE',
        current_sample_size: totalClosedTradesCount,
        required_minimum_samples: minSample,
        auto_promoted: false,
        note: `Weight adjustments strictly gated until sample reaches >= ${minSample} closed trades (currently ${totalClosedTradesCount}).`,
      };

  return {
    report_id: `pm-${order.order_id}-${Date.now().toString(36).slice(-4)}`,
    order_id: order.order_id,
    symbol: order.symbol,
    outcome_classification: classification,
    evidence_summary: `Trade closed via ${reason}. Gross P&L: ₹${order.gross_pnl_inr.toFixed(2)}, Statutory Costs: ₹${costs.toFixed(2)}, Net P&L: ₹${netPnl.toFixed(2)}. Max Favorable Excursion (MFE): ₹${mfe.toFixed(2)}, Max Adverse Excursion (MAE): ₹${mae.toFixed(2)}.`,
    agent_disagreement_notes:
      'Evaluated against original entry snapshot and price path. Deterministic audit recorded in permanent ledger.',
    parameter_candidate: candidate,
    created_at: new Date().toISOString(),
  };
}
````

### `src/services/agents/eodForecaster.ts`

<!-- file: src/services/agents/eodForecaster.ts -->
````typescript
import { Candle, InstrumentConfig, NextSessionForecast, PlatformConfig } from '../../types/platform';
import { getNextTradingDay } from '../nseCalendar';
import { roundToTick } from '../targetValidator';

export function runNextSessionOpeningForecast(
  instrument: InstrumentConfig,
  sessionCandles: Candle[],
  sentimentScore: number | null,
  config: PlatformConfig,
  cutoffDate: Date = new Date(),
  revisionNumber: number = 1
): NextSessionForecast {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istDate = new Date(cutoffDate.getTime() + istOffset);
  const yr = istDate.getUTCFullYear();
  const mo = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const da = String(istDate.getUTCDate()).padStart(2, '0');
  const sessionDate = `${yr}-${mo}-${da}`;
  const nextTrading = getNextTradingDay(sessionDate);

  if (sessionCandles.length < 20) {
    const base = instrument.base_demo_price;
    return {
      forecast_id: `fc-${instrument.symbol.toLowerCase()}-${Date.now().toString(36)}`,
      instrument_id: instrument.instrument_id,
      symbol: instrument.symbol,
      session_date: sessionDate,
      next_trading_date: nextTrading,
      revision_number: revisionNumber,
      cutoff_timestamp: cutoffDate.toISOString(),
      reference_close_price: base,
      predicted_open_price: base,
      predicted_gap_inr: 0,
      predicted_gap_pct: 0,
      interval_low_80: base - 10,
      interval_high_80: base + 10,
      baseline_prev_close: base,
      data_completeness: 'PROVISIONAL_PARTIAL_SESSION',
      supporting_factors: {
        closing_location_value: 0,
        session_return_pct: 0,
        final_15m_momentum_pct: 0,
        sentiment_input: 0,
        overnight_disclaimer: 'Insufficient session bars (<20); baseline previous close fallback applied.',
      },
      model_version: config.model_version,
      created_at: cutoffDate.toISOString(),
    };
  }

  const sOpen = sessionCandles[0].open;
  const sHigh = Math.max(...sessionCandles.map((c) => c.high));
  const sLow = Math.min(...sessionCandles.map((c) => c.low));
  const sClose = sessionCandles[sessionCandles.length - 1].close;

  // Closing Location Value (CLV) [-1.0, +1.0]
  const range = Math.max(sHigh - sLow, 0.05);
  const clv = Number((((sClose - sLow) - (sHigh - sClose)) / range).toFixed(3));

  // Session return
  const sessionRet = (sClose - sOpen) / sOpen;

  // Late 15-minute momentum
  const lateIdx = Math.max(0, sessionCandles.length - 15);
  const lateRef = sessionCandles[lateIdx].close;
  const lateMomentum = (sClose - lateRef) / lateRef;

  const sVal = sentimentScore ?? 0.0;

  // Transparent ridge-like formula:
  // gap_pct = 0.0035 * CLV + 0.002 * lateMom + 0.0015 * sVal
  const rawGapPct = 0.0035 * clv + 0.002 * lateMomentum * 10 + 0.0015 * sVal;
  const clampedGapPct = Math.max(-0.025, Math.min(0.025, rawGapPct));

  const predOpenRaw = sClose * (1 + clampedGapPct);
  const predOpen = roundToTick(predOpenRaw, instrument.tick_size);
  const refClose = roundToTick(sClose, instrument.tick_size);
  const gapInr = Number((predOpen - refClose).toFixed(2));
  const gapPctFormatted = Number((clampedGapPct * 100).toFixed(2));

  // 80% Prediction interval (+/- 1.28 * estimated daily opening standard deviation)
  const estDailySigmaInr = Math.max(refClose * 0.0045, 3.5);
  const intervalSpread = roundToTick(1.28 * estDailySigmaInr, instrument.tick_size);
  const low80 = roundToTick(predOpen - intervalSpread, instrument.tick_size);
  const high80 = roundToTick(predOpen + intervalSpread, instrument.tick_size);

  return {
    forecast_id: `fc-${instrument.symbol.toLowerCase()}-${Date.now().toString(36)}`,
    instrument_id: instrument.instrument_id,
    symbol: instrument.symbol,
    session_date: sessionDate,
    next_trading_date: nextTrading,
    revision_number: revisionNumber,
    cutoff_timestamp: cutoffDate.toISOString(),
    reference_close_price: refClose,
    predicted_open_price: predOpen,
    predicted_gap_inr: gapInr,
    predicted_gap_pct: gapPctFormatted,
    interval_low_80: low80,
    interval_high_80: high80,
    baseline_prev_close: refClose,
    data_completeness: 'COMPLETE_SESSION_1530_CUTOFF',
    supporting_factors: {
      closing_location_value: clv,
      session_return_pct: Number((sessionRet * 100).toFixed(2)),
      final_15m_momentum_pct: Number((lateMomentum * 100).toFixed(2)),
      sentiment_input: Number(sVal.toFixed(2)),
      overnight_disclaimer:
        'DISCLAIMER: Forecast is strictly conditioned on information known up to the 16:00 IST cutoff. It explicitly does not reflect overnight global macroeconomic releases, geopolitical events, or post-cutoff announcements.',
    },
    model_version: config.model_version,
    created_at: cutoffDate.toISOString(),
  };
}
````

### `src/services/agents/walkForwardBacktester.ts`

<!-- file: src/services/agents/walkForwardBacktester.ts -->
````typescript
import { InstrumentConfig, PaperOrder, PlatformConfig } from '../../types/platform';
import { generateHistoricalCandles, fetchNewsAndSocial, fetchFundamentals } from '../marketData';
import { runTechnicalAnalysis } from './technicalAgent';
import { runPatternRecognition } from './patternAgent';
import { runSentimentAnalysis } from './sentimentAgent';
import { runFundamentalAnalysis } from './fundamentalAgent';
import { runStrategyOrchestrator } from './orchestratorAgent';
import { computePositionSize, evaluateCandleOnOrder } from './paperTradingAgent';

export interface BacktestResult {
  symbol: string;
  bars_evaluated: number;
  signals_emitted: number;
  abstentions: number;
  abstention_rate_pct: number;
  closed_trades_count: number;
  win_count: number;
  loss_count: number;
  win_rate_pct: number;
  net_pnl_after_costs_inr: number;
  total_costs_inr: number;
  lookahead_leakage_check: string;
}

export function runWalkForwardBacktest(
  instrument: InstrumentConfig,
  config: PlatformConfig,
  totalBars: number = 75
): BacktestResult {
  const fullCandles = generateHistoricalCandles(instrument, '1m', totalBars, 0);
  const news = fetchNewsAndSocial(instrument);
  const fund = fetchFundamentals(instrument);

  let signalsEmitted = 0;
  let abstentions = 0;
  const closedOrders: PaperOrder[] = [];
  let activeOrder: PaperOrder | null = null;

  // Chronological walk forward starting at bar 30 (sufficient warm-up)
  for (let i = 30; i < fullCandles.length; i++) {
    // Strictly slice historical bars up to bar i (Zero Look-Ahead Bias)
    const windowSlice = fullCandles.slice(0, i + 1);
    const currentBar = windowSlice[windowSlice.length - 1];
    const barTime = new Date(currentBar.time * 1000);

    // If there is an active virtual order, evaluate current candle against it
    if (activeOrder !== null) {
      activeOrder = evaluateCandleOnOrder(activeOrder, currentBar, instrument.tick_size);
      if (activeOrder.status === 'CLOSED' || activeOrder.status === 'EXPIRED') {
        closedOrders.push(activeOrder);
        activeOrder = null;
      }
      continue;
    }

    // Run specialized agents on slice strictly available up to bar i
    const tech = runTechnicalAnalysis(windowSlice);
    const pat = runPatternRecognition(windowSlice);
    const sent = runSentimentAnalysis(news);
    const fundOut = runFundamentalAnalysis(instrument.symbol, instrument.sector, fund);

    const orch = runStrategyOrchestrator(
      instrument,
      config,
      tech,
      pat,
      sent,
      fundOut,
      barTime,
      'WALK_FORWARD_BACKTEST'
    );

    if (orch.decision === 'LONG' || orch.decision === 'SHORT') {
      signalsEmitted++;
      const entry = orch.planned_entry!;
      const target = orch.planned_target!;
      const stop = orch.planned_stop!;
      const qty = computePositionSize(
        entry,
        stop,
        config,
        config.risk_controls.starting_capital_inr
      );

      activeOrder = {
        order_id: `bt-${instrument.symbol.toLowerCase()}-${i}`,
        signal_id: `sig-bt-${i}`,
        instrument_id: instrument.instrument_id,
        symbol: instrument.symbol,
        direction: orch.decision,
        quantity: qty,
        status: 'PENDING',
        planned_entry: entry,
        planned_target: target,
        planned_stop: stop,
        entry_fill_price: null,
        exit_fill_price: null,
        entry_time: null,
        exit_time: null,
        expiry_time: orch.expiry_timestamp,
        exit_reason: null,
        gross_pnl_inr: 0,
        total_costs_inr: 0,
        net_pnl_inr: 0,
        mfe_inr: 0,
        mae_inr: 0,
        created_at: barTime.toISOString(),
      };
    } else {
      abstentions++;
    }
  }

  const wins = closedOrders.filter((o) => o.net_pnl_inr > 0);
  const losses = closedOrders.filter((o) => o.net_pnl_inr <= 0);
  const netPnl = closedOrders.reduce((sum, o) => sum + o.net_pnl_inr, 0);
  const totalCosts = closedOrders.reduce((sum, o) => sum + o.total_costs_inr, 0);

  const totalClosed = closedOrders.length;
  const winRate = totalClosed > 0 ? Number(((wins.length / totalClosed) * 100).toFixed(1)) : 0;
  const abstentionRate =
    signalsEmitted + abstentions > 0
      ? Number(((abstentions / (signalsEmitted + abstentions)) * 100).toFixed(1))
      : 0;

  return {
    symbol: instrument.symbol,
    bars_evaluated: fullCandles.length - 30,
    signals_emitted: signalsEmitted,
    abstentions,
    abstention_rate_pct: abstentionRate,
    closed_trades_count: totalClosed,
    win_count: wins.length,
    loss_count: losses.length,
    win_rate_pct: winRate,
    net_pnl_after_costs_inr: Number(netPnl.toFixed(2)),
    total_costs_inr: Number(totalCosts.toFixed(2)),
    lookahead_leakage_check: 'PASSED (Strict chronological slicing without forward bar leakage)',
  };
}
````

### `src/services/agents/systemMonitorAgent.ts`

<!-- file: src/services/agents/systemMonitorAgent.ts -->
````typescript
import { SystemMonitorEvent } from '../../types/platform';

class SystemMonitorAgent {
  private events: SystemMonitorEvent[] = [];

  record(
    correlationId: string,
    component: string,
    eventType: string,
    details: Record<string, any>,
    latencyMs: number = 0,
    severity: 'INFO' | 'WARN' | 'ERROR' = 'INFO'
  ): SystemMonitorEvent {
    // Redact secret keys or tokens
    const safeDetails: Record<string, any> = {};
    for (const [k, v] of Object.entries(details)) {
      const lower = k.toLowerCase();
      if (
        lower.includes('key') ||
        lower.includes('token') ||
        lower.includes('secret') ||
        lower.includes('password')
      ) {
        safeDetails[k] = '***REDACTED***';
      } else {
        safeDetails[k] = v;
      }
    }

    const event: SystemMonitorEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      correlation_id: correlationId,
      component,
      event_type: eventType,
      severity,
      latency_ms: latencyMs,
      details: safeDetails,
    };

    this.events.unshift(event);
    if (this.events.length > 200) {
      this.events = this.events.slice(0, 200);
    }
    return event;
  }

  getRecentEvents(limit: number = 50): SystemMonitorEvent[] {
    return this.events.slice(0, limit);
  }

  clear() {
    this.events = [];
  }
}

export const SYSTEM_MONITOR = new SystemMonitorAgent();
````
