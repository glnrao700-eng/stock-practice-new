# Step 4: Core services (calendar, validator, market data, Upstox client, candle cache)

- **nseCalendar.ts**: NSE holidays for 2025–26, `isTradingDay`, `getNextTradingDay`, and `getSessionWindowStatus`.
  The last one converts to IST (UTC+5:30) and returns the phase: OFF_MARKET_HOLIDAY_OR_WEEKEND, PRE_OPEN_PREPARATION (<09:15),
  MARKET_OPEN_WARMUP (09:15–09:30), INTRADAY_ACTIVE_ANALYSIS (09:30–15:30, new entries until 15:10),
  EOD_NEXT_OPEN_FORECASTING (15:30–16:00) or POST_MARKET_MAINTENANCE.
- **targetValidator.ts**: `roundToTick` and `validateIntradayTargets`. Level ordering must be S<E<T for a long and T<E<S for a short.
  |E−P0|, |T−P0| and |T−E| must each be at least ₹3.00, and reward-to-risk at least 1.5.
- **marketData.ts**: the 6-stock universe (RELIANCE, TCS, HDFCBANK, INFY, ICICIBANK, SBIN) and the reference prices.
  It also holds a deterministic synthetic candle generator (sine-based pseudo-random, built backwards so the last close
  equals the base price) and mock news and fundamentals.
- **upstoxClient.ts**: browser client for `/api/upstox/*`. It stores the token in localStorage and sessionStorage under `upstox_broker_session_token`.
- **localCandleDb.ts**: IndexedDB cache (`IMMIP_LocalMarketDB` / `historical_1m_candles`) in front of `/api/candles/30d`, plus CSV and JSON export.

## Files

- `src/services/nseCalendar.ts`
- `src/services/targetValidator.ts`
- `src/services/marketData.ts`
- `src/services/upstoxClient.ts`
- `src/services/localCandleDb.ts`

### `src/services/nseCalendar.ts`

<!-- file: src/services/nseCalendar.ts -->
````typescript
import { SessionStatus } from '../types/platform';

export const NSE_HOLIDAYS_2025_2026: Set<string> = new Set([
  '2026-01-26', // Republic Day
  '2026-03-03', // Holi
  '2026-03-30', // Id-Ul-Fitr
  '2026-04-03', // Good Friday
  '2026-04-14', // Dr. Baba Saheb Ambedkar Jayanti
  '2026-05-01', // Maharashtra Day
  '2026-08-15', // Independence Day
  '2026-10-02', // Mahatma Gandhi Jayanti
  '2026-10-20', // Dussehra
  '2026-11-09', // Diwali Laxmi Pujan
  '2026-11-10', // Diwali Balipratipada
  '2026-11-24', // Gurunanak Jayanti
  '2026-12-25', // Christmas
  // 2025 holidays
  '2025-01-26',
  '2025-03-14',
  '2025-03-31',
  '2025-04-10',
  '2025-04-14',
  '2025-04-18',
  '2025-05-01',
  '2025-08-15',
  '2025-08-27',
  '2025-10-02',
  '2025-10-21',
  '2025-10-22',
  '2025-11-05',
  '2025-12-25',
]);

export function isTradingDay(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const day = dt.getUTCDay();
  // Saturday = 6, Sunday = 0
  if (day === 0 || day === 6) return false;
  if (NSE_HOLIDAYS_2025_2026.has(dateStr)) return false;
  return true;
}

export function getNextTradingDay(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));

  let candidate = new Date(dt.getTime() + 86400000);
  while (true) {
    const yr = candidate.getUTCFullYear();
    const mo = String(candidate.getUTCMonth() + 1).padStart(2, '0');
    const da = String(candidate.getUTCDate()).padStart(2, '0');
    const candStr = `${yr}-${mo}-${da}`;
    if (isTradingDay(candStr)) {
      return candStr;
    }
    candidate = new Date(candidate.getTime() + 86400000);
  }
}

export function getSessionWindowStatus(now: Date = new Date()): SessionStatus {
  // Format in IST (Asia/Kolkata is UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);

  const yr = istTime.getUTCFullYear();
  const mo = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const da = String(istTime.getUTCDate()).padStart(2, '0');
  const sessionDate = `${yr}-${mo}-${da}`;

  const hours = istTime.getUTCHours();
  const minutes = istTime.getUTCMinutes();
  const seconds = istTime.getUTCSeconds();
  const timeInMinutes = hours * 60 + minutes;

  const tradingDay = isTradingDay(sessionDate);
  const nextTradingDay = getNextTradingDay(sessionDate);

  let phase = 'OFF_MARKET_HOLIDAY_OR_WEEKEND';
  let allowEntries = false;

  if (!tradingDay) {
    phase = 'OFF_MARKET_HOLIDAY_OR_WEEKEND';
  } else if (timeInMinutes < 9 * 60 + 15) {
    phase = 'PRE_OPEN_PREPARATION';
  } else if (timeInMinutes >= 9 * 60 + 15 && timeInMinutes < 9 * 60 + 30) {
    phase = 'MARKET_OPEN_WARMUP';
  } else if (timeInMinutes >= 9 * 60 + 30 && timeInMinutes < 15 * 60 + 30) {
    phase = 'INTRADAY_ACTIVE_ANALYSIS';
    allowEntries = timeInMinutes <= 15 * 60 + 10;
  } else if (timeInMinutes >= 15 * 60 + 30 && timeInMinutes <= 16 * 60) {
    phase = 'EOD_NEXT_OPEN_FORECASTING';
  } else {
    phase = 'POST_MARKET_MAINTENANCE';
  }

  const istFormatted = `${sessionDate} ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} IST`;

  const isMarketOpen = tradingDay && timeInMinutes >= 9 * 60 + 15 && timeInMinutes < 15 * 60 + 30;

  return {
    utc_timestamp: now.toISOString(),
    ist_timestamp: istFormatted,
    session_date: sessionDate,
    is_trading_day: tradingDay,
    next_trading_day: nextTradingDay,
    phase,
    allow_new_intraday_entries: allowEntries,
    is_market_open: isMarketOpen,
  };
}
````

### `src/services/targetValidator.ts`

<!-- file: src/services/targetValidator.ts -->
````typescript
import { TargetRulesConfig, TargetValidationResult } from '../types/platform';

export function roundToTick(price: number, tickSize: number = 0.05): number {
  const steps = Math.round(price / tickSize);
  return Number((steps * tickSize).toFixed(2));
}

export function validateIntradayTargets(
  direction: 'LONG' | 'SHORT' | 'NO_TRADE',
  referencePrice: number,
  rawEntry: number,
  rawTarget: number,
  rawStop: number,
  tickSize: number,
  rules: TargetRulesConfig,
  minRR: number = 1.5
): TargetValidationResult {
  const p0 = roundToTick(referencePrice, tickSize);
  const e = roundToTick(rawEntry, tickSize);
  const t = roundToTick(rawTarget, tickSize);
  const s = roundToTick(rawStop, tickSize);

  const reasons: string[] = [];
  let reward = 0;
  let risk = 1;

  if (direction === 'LONG') {
    if (!(s < e && e < t)) {
      reasons.push(`Invalid LONG level ordering: require S (₹${s}) < E (₹${e}) < T (₹${t})`);
    }
    reward = t - e;
    risk = e - s;
  } else if (direction === 'SHORT') {
    if (!(t < e && e < s)) {
      reasons.push(`Invalid SHORT level ordering: require T (₹${t}) < E (₹${e}) < S (₹${s})`);
    }
    reward = e - t;
    risk = s - e;
  } else {
    reasons.push(`Unsupported or non-actionable direction: ${direction}`);
  }

  const dispEP0 = Number(Math.abs(e - p0).toFixed(2));
  const dispTP0 = Number(Math.abs(t - p0).toFixed(2));
  const dispTE = Number(Math.abs(t - e).toFixed(2));

  if (dispEP0 < rules.min_entry_displacement_inr) {
    reasons.push(
      `|E - P0| = ₹${dispEP0.toFixed(2)} is below minimum required ₹${rules.min_entry_displacement_inr.toFixed(2)}`
    );
  }
  if (dispTP0 < rules.min_target_from_ref_inr) {
    reasons.push(
      `|T - P0| = ₹${dispTP0.toFixed(2)} is below minimum required ₹${rules.min_target_from_ref_inr.toFixed(2)}`
    );
  }
  if (dispTE < rules.min_target_from_entry_inr) {
    reasons.push(
      `|T - E| = ₹${dispTE.toFixed(2)} is below minimum required ₹${rules.min_target_from_entry_inr.toFixed(2)}`
    );
  }

  const rrRatio = risk > 0 ? Number((reward / risk).toFixed(2)) : 0;
  if (rrRatio < minRR) {
    reasons.push(`Reward-to-Risk ratio ${rrRatio.toFixed(2)} is below minimum required ${minRR.toFixed(2)}`);
  }

  return {
    is_valid: reasons.length === 0,
    direction,
    reference_price: p0,
    entry_price: e,
    target_price: t,
    stop_price: s,
    entry_displacement_inr: dispEP0,
    target_from_ref_inr: dispTP0,
    target_from_entry_inr: dispTE,
    reward_per_share_inr: Math.max(reward, 0),
    risk_per_share_inr: Math.max(risk, 0),
    reward_to_risk_ratio: rrRatio,
    rejection_reasons: reasons,
  };
}
````

### `src/services/marketData.ts`

<!-- file: src/services/marketData.ts -->
````typescript
import { Candle, InstrumentConfig, NewsItem, SessionStatus } from '../types/platform';
import { roundToTick } from './targetValidator';

export const LATEST_MARKET_REFERENCE_PRICES: Record<string, number> = {
  RELIANCE: 1202.0,
  TCS: 2460.9,
  HDFCBANK: 712.0,
  INFY: 1130.7,
  ICICIBANK: 1381.0,
  SBIN: 973.7,
};

export const DEFAULT_INSTRUMENTS: InstrumentConfig[] = [
  {
    instrument_id: 'NSE_RELIANCE',
    company_name: 'Reliance Industries Limited',
    exchange: 'NSE',
    symbol: 'RELIANCE',
    provider_token: '738561',
    tradingview_symbol: 'NSE:RELIANCE',
    upstox_instrument_key: 'NSE_EQ|INE002A01018',
    currency: 'INR',
    tick_size: 0.05,
    lot_size: 1,
    enabled: true,
    sector: 'ENERGY_CONGLOMERATE',
    historical_coverage_from: '2018-01-01',
    base_demo_price: 1202.0,
  },
  {
    instrument_id: 'NSE_TCS',
    company_name: 'Tata Consultancy Services Limited',
    exchange: 'NSE',
    symbol: 'TCS',
    provider_token: '2953217',
    tradingview_symbol: 'NSE:TCS',
    upstox_instrument_key: 'NSE_EQ|INE467B01029',
    currency: 'INR',
    tick_size: 0.05,
    lot_size: 1,
    enabled: true,
    sector: 'IT_SERVICES',
    historical_coverage_from: '2018-01-01',
    base_demo_price: 2460.9,
  },
  {
    instrument_id: 'NSE_HDFCBANK',
    company_name: 'HDFC Bank Limited',
    exchange: 'NSE',
    symbol: 'HDFCBANK',
    provider_token: '341249',
    tradingview_symbol: 'NSE:HDFCBANK',
    upstox_instrument_key: 'NSE_EQ|INE040A01034',
    currency: 'INR',
    tick_size: 0.05,
    lot_size: 1,
    enabled: true,
    sector: 'BANKING',
    historical_coverage_from: '2018-01-01',
    base_demo_price: 712.0,
  },
  {
    instrument_id: 'NSE_INFY',
    company_name: 'Infosys Limited',
    exchange: 'NSE',
    symbol: 'INFY',
    provider_token: '408065',
    tradingview_symbol: 'NSE:INFY',
    upstox_instrument_key: 'NSE_EQ|INE009A01021',
    currency: 'INR',
    tick_size: 0.05,
    lot_size: 1,
    enabled: true,
    sector: 'IT_SERVICES',
    historical_coverage_from: '2018-01-01',
    base_demo_price: 1130.7,
  },
  {
    instrument_id: 'NSE_ICICIBANK',
    company_name: 'ICICI Bank Limited',
    exchange: 'NSE',
    symbol: 'ICICIBANK',
    provider_token: '1270529',
    tradingview_symbol: 'NSE:ICICIBANK',
    upstox_instrument_key: 'NSE_EQ|INE090A01021',
    currency: 'INR',
    tick_size: 0.05,
    lot_size: 1,
    enabled: true,
    sector: 'BANKING',
    historical_coverage_from: '2018-01-01',
    base_demo_price: 1381.0,
  },
  {
    instrument_id: 'NSE_SBIN',
    company_name: 'State Bank of India',
    exchange: 'NSE',
    symbol: 'SBIN',
    provider_token: '779521',
    tradingview_symbol: 'NSE:SBIN',
    upstox_instrument_key: 'NSE_EQ|INE062A01020',
    currency: 'INR',
    tick_size: 0.05,
    lot_size: 1,
    enabled: true,
    sector: 'BANKING',
    historical_coverage_from: '2018-01-01',
    base_demo_price: 973.7,
  },
];

export function getLastTradingBarTimestamp(
  sessionDate: string,
  isMarketOpen: boolean,
  timeframe: '1m' | '5m' | '15m' = '1m'
): number {
  const [yr, mo, da] = sessionDate.split('-').map(Number);
  const now = new Date();

  // If market is currently open in IST (between 09:15 and 15:30 IST on a trading day)
  if (isMarketOpen) {
    const epochSec = Math.floor(now.getTime() / 1000);
    const tfSeconds = timeframe === '1m' ? 60 : timeframe === '5m' ? 300 : 900;
    return epochSec - (epochSec % tfSeconds);
  }

  // When market is closed, the last completed candle corresponds to the official NSE close:
  // NSE regular trading session closes at 15:30:00 IST.
  // 15:29:00 IST = 09:59:00 UTC (15:29 - 5:30 = 09:59 UTC)
  // For 1m: bar opens at 15:29 IST = 09:59 UTC
  // For 5m: bar opens at 15:25 IST = 09:55 UTC
  // For 15m: bar opens at 15:15 IST = 09:45 UTC
  const closeMinuteUtc = timeframe === '1m' ? 59 : timeframe === '5m' ? 55 : 45;
  const closeUtc = Date.UTC(yr, mo - 1, da, 9, closeMinuteUtc, 0) / 1000;
  return closeUtc;
}

// Pseudo-random deterministic generator based on a string seed and integer step
function pseudoRandom(seed: number, index: number): number {
  const x = Math.sin(seed * 997 + index * 101.37) * 10000;
  return x - Math.floor(x);
}

export function generateHistoricalCandles(
  instrument: InstrumentConfig,
  timeframe: '1m' | '5m' | '15m' = '1m',
  barsCount: number = 90,
  stepOffset: number = 0,
  sessionStatus?: SessionStatus
): Candle[] {
  const base = instrument.base_demo_price;
  const seed = instrument.symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const tfSeconds = timeframe === '1m' ? 60 : timeframe === '5m' ? 300 : 900;

  // Determine anchor time: if sessionStatus is provided and market is closed, anchor to the last market close!
  let lastBarTime: number;
  if (sessionStatus && !sessionStatus.is_market_open) {
    lastBarTime = getLastTradingBarTimestamp(sessionStatus.session_date, false, timeframe) + stepOffset * tfSeconds;
  } else {
    const nowSec = Math.floor(Date.now() / 1000);
    lastBarTime = nowSec - (nowSec % tfSeconds) + stepOffset * tfSeconds;
  }

  const startTime = lastBarTime - (barsCount - 1) * tfSeconds;
  const lastIndex = barsCount - 1;

  // Generate a realistic multi-wave market trajectory with support/resistance levels, trend swings, and pullbacks
  // We want the final bar (index = lastIndex) to land exactly on the official closing/current price (base)
  // when stepOffset === 0, or with realistic simulated live progression when stepOffset > 0.
  const pathCumulativeDeltas: number[] = new Array(barsCount).fill(0);

  // Volatility scale per bar in Rupees based on stock price and timeframe
  const tfMultiplier = timeframe === '1m' ? 1 : timeframe === '5m' ? 2.1 : 3.6;
  const barVolRup = Math.max(instrument.tick_size * 2, (base * 0.00075) * tfMultiplier);

  // Precompute realistic price walk backwards from the target terminal price
  // The terminal price at index = lastIndex:
  const stepDrift = stepOffset > 0 ? (stepOffset * 0.12 * (seed % 2 === 1 ? 1 : -0.7)) : 0;
  const terminalPrice = base + stepDrift;

  // Build series backwards from terminal price so terminal price is exact
  const closePrices: number[] = new Array(barsCount);
  closePrices[lastIndex] = terminalPrice;

  let currentPrice = terminalPrice;
  for (let i = lastIndex - 1; i >= 0; i--) {
    const r1 = pseudoRandom(seed, i * 7 + 1);
    const r2 = pseudoRandom(seed, i * 11 + 3);
    const r3 = pseudoRandom(seed, i * 19 + 5);

    // Realistic market wave structure: combine momentum cycle, mean reversion, and noise
    const cycle = Math.sin((i / 8) + (seed % 5)) * 0.45;
    const microTrend = (seed % 2 === 1 ? 0.08 : -0.08);
    const delta = (r1 - 0.5 + cycle * 0.35 + microTrend) * barVolRup;

    currentPrice = currentPrice - delta;
    // Bound price so it doesn't deviate unrealistically far from base
    const maxDeviation = base * 0.025;
    if (currentPrice > base + maxDeviation) currentPrice = base + maxDeviation - (r2 * barVolRup);
    if (currentPrice < base - maxDeviation) currentPrice = base - maxDeviation + (r2 * barVolRup);

    closePrices[i] = currentPrice;
  }

  const candles: Candle[] = [];

  for (let i = 0; i < barsCount; i++) {
    const barTime = startTime + i * tfSeconds;
    const closeVal = closePrices[i];

    // Open is typically close of previous bar + slight micro gap
    let openVal: number;
    if (i === 0) {
      const prevRand = pseudoRandom(seed, i * 13 + 7);
      openVal = closeVal - (prevRand - 0.48) * (barVolRup * 0.6);
    } else {
      const gap = (pseudoRandom(seed, i * 17 + 2) - 0.5) * (barVolRup * 0.25);
      openVal = closePrices[i - 1] + gap;
    }

    // High and Low wicks with realistic distribution (sometimes long wicks, sometimes marubozu)
    const upperBody = Math.max(openVal, closeVal);
    const lowerBody = Math.min(openVal, closeVal);
    const bodySize = upperBody - lowerBody;

    const rWickUp = pseudoRandom(seed, i * 23 + 4);
    const rWickDown = pseudoRandom(seed, i * 29 + 8);

    const upperWick = Math.max(instrument.tick_size, rWickUp * (barVolRup * 0.85) + bodySize * 0.2);
    const lowerWick = Math.max(instrument.tick_size, rWickDown * (barVolRup * 0.85) + bodySize * 0.2);

    const highVal = upperBody + upperWick;
    const lowVal = lowerBody - lowerWick;

    // Realistic volume: higher volume at breakouts and turning points
    const baseVol = 35000 + (seed * 117) % 25000;
    const volSurge = (bodySize / barVolRup) * 18000;
    const volNoise = pseudoRandom(seed, i * 31) * 15000;
    const vol = Math.floor((baseVol + volSurge + volNoise) * tfMultiplier);

    // For the final candle, ensure the close precisely matches terminalPrice
    if (i === lastIndex) {
      const openPrice = roundToTick(openVal, instrument.tick_size);
      const closePrice = roundToTick(terminalPrice, instrument.tick_size);
      candles.push({
        time: barTime,
        open: openPrice,
        high: roundToTick(Math.max(openPrice, closePrice, highVal), instrument.tick_size),
        low: roundToTick(Math.min(openPrice, closePrice, lowVal), instrument.tick_size),
        close: closePrice,
        volume: vol,
      });
      continue;
    }

    candles.push({
      time: barTime,
      open: roundToTick(openVal, instrument.tick_size),
      high: roundToTick(highVal, instrument.tick_size),
      low: roundToTick(lowVal, instrument.tick_size),
      close: roundToTick(closeVal, instrument.tick_size),
      volume: vol,
    });
  }

  return candles;
}

export function fetchNewsAndSocial(instrument: InstrumentConfig, now: Date = new Date()): NewsItem[] {
  const seed = instrument.symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const isBullish = seed % 2 === 1;

  return [
    {
      source_id: `NSE-FILING-${instrument.symbol}-01`,
      source_type: 'EXCHANGE_FILING',
      quality_tier: 'TIER_1_VERIFIED',
      headline: isBullish
        ? `${instrument.company_name} secures ₹4,800 Cr institutional order; operating margin expands 140 bps`
        : `${instrument.company_name} files disclosure on temporary production recalibration & raw material cost pressure`,
      published_at: new Date(now.getTime() - 22 * 60000).toISOString(),
      sentiment_score: isBullish ? 0.68 : -0.58,
      relevance: 0.92,
      impact_horizon: 'INTRADAY_TO_MULTI_DAY',
    },
    {
      source_id: `SOCIAL-FIN-${instrument.symbol}-02`,
      source_type: 'SOCIAL_MEDIA',
      quality_tier: 'TIER_3_UNVERIFIED_SOCIAL',
      headline: isBullish
        ? `Heavy call buying noted in ${instrument.symbol} ATM strike near key VWAP support`
        : `Unusual put buildup in ${instrument.symbol} front-month contracts`,
      published_at: new Date(now.getTime() - 11 * 60000).toISOString(),
      sentiment_score: isBullish ? 0.35 : -0.25,
      relevance: 0.6,
      impact_horizon: 'INTRADAY',
    },
  ];
}

export function fetchFundamentals(instrument: InstrumentConfig): Record<string, any> {
  if (instrument.sector === 'BANKING') {
    const isTopTier = instrument.symbol === 'HDFCBANK' || instrument.symbol === 'ICICIBANK';
    return {
      sector_model: 'BANKING_FINANCIALS',
      fiscal_period: 'Q2-FY2026',
      published_date: '2026-07-20',
      net_interest_margin_pct: isTopTier ? 3.85 : 3.45,
      gnpa_pct: isTopTier ? 1.28 : 2.15,
      nnpa_pct: isTopTier ? 0.38 : 0.55,
      capital_adequacy_crar_pct: isTopTier ? 18.6 : 15.8,
      casa_ratio_pct: 42.1,
      roe_pct: isTopTier ? 17.2 : 14.8,
      pe_ratio: isTopTier ? 19.2 : 11.5,
      pb_ratio: isTopTier ? 2.8 : 1.4,
      upcoming_earnings_within_2_days: false,
    };
  }

  return {
    sector_model: 'CORPORATE_INDUSTRIAL_IT',
    fiscal_period: 'Q2-FY2026',
    published_date: '2026-07-18',
    revenue_yoy_growth_pct: 12.4,
    operating_margin_pct: instrument.sector === 'IT_SERVICES' ? 24.8 : 17.2,
    roe_pct: instrument.sector === 'IT_SERVICES' ? 29.1 : 15.4,
    roce_pct: instrument.sector === 'IT_SERVICES' ? 33.4 : 16.8,
    debt_to_equity: instrument.sector === 'IT_SERVICES' ? 0.06 : 0.42,
    current_ratio: 2.3,
    pe_ratio: instrument.sector === 'IT_SERVICES' ? 26.5 : 22.8,
    upcoming_earnings_within_2_days: false,
  };
}
````

### `src/services/upstoxClient.ts`

<!-- file: src/services/upstoxClient.ts -->
````typescript
import { Candle, UpstoxConnectionState, UpstoxLiveQuote } from '../types/platform';

const STORAGE_KEY = 'upstox_broker_session_token';

let inMemoryToken: string | null = null;

export function getUpstoxSessionToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    const fromLocal = localStorage.getItem(STORAGE_KEY);
    if (fromLocal) {
      inMemoryToken = fromLocal;
      return fromLocal;
    }
  } catch {
    // localStorage unavailable
  }
  try {
    const fromSession = sessionStorage.getItem(STORAGE_KEY);
    if (fromSession) {
      inMemoryToken = fromSession;
      return fromSession;
    }
  } catch {
    // sessionStorage unavailable
  }
  return null;
}

export function setUpstoxSessionToken(token: string): void {
  const clean = token.trim();
  inMemoryToken = clean;
  try {
    localStorage.setItem(STORAGE_KEY, clean);
  } catch {
    // ignored
  }
  try {
    sessionStorage.setItem(STORAGE_KEY, clean);
  } catch {
    // ignored
  }
}

export function clearUpstoxSessionToken(): void {
  inMemoryToken = null;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignored
  }
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignored
  }
}

function getAuthHeaders(tokenOverride?: string): Record<string, string> {
  const token = tokenOverride || getUpstoxSessionToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Ping /api/upstox/status to test connectivity with Upstox API
 */
export async function checkUpstoxStatus(tokenOverride?: string): Promise<UpstoxConnectionState> {
  try {
    const res = await fetch('/api/upstox/status', {
      headers: getAuthHeaders(tokenOverride),
    });
    const data = await res.json();
    return {
      connected: Boolean(data.connected),
      latency_ms: data.latency_ms,
      hasServerToken: Boolean(data.hasServerToken),
      message: data.message,
      error: data.error,
      lastUpdated: new Date().toLocaleTimeString('en-IN'),
    };
  } catch (err: any) {
    return {
      connected: false,
      hasServerToken: false,
      error: err.message || 'Network error reaching Upstox proxy endpoint',
    };
  }
}

/**
 * Fetch live market quotes for given instrument keys
 */
export async function fetchUpstoxLiveQuotes(
  instrumentKeys: string[],
  tokenOverride?: string
): Promise<Record<string, UpstoxLiveQuote>> {
  if (instrumentKeys.length === 0) return {};

  const query = instrumentKeys.map(encodeURIComponent).join(',');
  const res = await fetch(`/api/upstox/quotes?instrument_keys=${query}`, {
    headers: getAuthHeaders(tokenOverride),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Upstox API returned status ${res.status}`);
  }

  const json = await res.json();
  const data = json.data || {};
  const result: Record<string, UpstoxLiveQuote> = {};

  for (const [key, quote] of Object.entries<any>(data)) {
    // Upstox key might be like "NSE_EQ:RELIANCE" or "RELIANCE" or "NSE_EQ|INE002A01018"
    const symbolParts = key.split(':');
    const symbolFromKey = symbolParts.length > 1 ? symbolParts[1] : key;
    const finalSymbol = (quote.symbol || symbolFromKey || key).toUpperCase();

    const quoteObj: UpstoxLiveQuote = {
      symbol: finalSymbol,
      instrument_key: quote.instrument_token || key,
      last_price: Number(quote.last_price || 0),
      volume: Number(quote.volume || 0),
      open: quote.ohlc?.open ? Number(quote.ohlc.open) : undefined,
      high: quote.ohlc?.high ? Number(quote.ohlc.high) : undefined,
      low: quote.ohlc?.low ? Number(quote.ohlc.low) : undefined,
      close: quote.ohlc?.close ? Number(quote.ohlc.close) : undefined,
      net_change: quote.net_change ? Number(quote.net_change) : undefined,
      timestamp: quote.timestamp ? Number(quote.timestamp) : Date.now(),
    };

    result[finalSymbol] = quoteObj;
    result[key] = quoteObj;
    if (quote.symbol) result[quote.symbol.toUpperCase()] = quoteObj;
    if (quote.instrument_token) result[quote.instrument_token] = quoteObj;
  }

  return result;
}

/**
 * Fetch real intraday candles for an instrument
 */
export async function fetchUpstoxLiveCandles(
  instrumentKey: string,
  interval: '1minute' | '30minute' = '1minute',
  tokenOverride?: string
): Promise<Candle[]> {
  const res = await fetch(
    `/api/upstox/candles?instrument_key=${encodeURIComponent(instrumentKey)}&interval=${encodeURIComponent(interval)}`,
    {
      headers: getAuthHeaders(tokenOverride),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to fetch Upstox candles: status ${res.status}`);
  }

  const json = await res.json();
  return json.candles || [];
}
````

### `src/services/localCandleDb.ts`

<!-- file: src/services/localCandleDb.ts -->
````typescript
import { Candle } from '../types/platform';

const DB_NAME = 'IMMIP_LocalMarketDB';
const DB_VERSION = 1;
const STORE_NAME = 'historical_1m_candles';

export interface StoredHistoricalRecord {
  symbol: string;
  instrument_key: string;
  interval: '1minute';
  total_bars: number;
  from_date: string;
  to_date: string;
  last_updated: string;
  candles: Candle[];
}

export interface CandleDbStatusItem {
  symbol: string;
  instrument_key: string;
  interval: string;
  total_bars: number;
  from_date: string;
  to_date: string;
  file_size_kb: number;
  last_updated: string;
  in_browser_idb?: boolean;
}

/**
 * Open or initialize browser IndexedDB
 */
function openIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported in this environment'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'symbol' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

/**
 * Save candles into browser IndexedDB
 */
export async function saveToIndexedDB(record: StoredHistoricalRecord): Promise<void> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save notice (non-fatal):', err);
  }
}

/**
 * Retrieve candles from browser IndexedDB
 */
export async function getFromIndexedDB(symbol: string): Promise<StoredHistoricalRecord | null> {
  try {
    const db = await openIndexedDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(symbol.toUpperCase());
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB read notice:', err);
    return null;
  }
}

/**
 * Fetch 30-day 1-minute historical candles.
 * First checks IndexedDB (instant offline).
 * If not present or forceRefresh=true, fetches from server endpoint /api/candles/30d and syncs into IndexedDB!
 */
export async function load30DayHistoricalCandles(
  symbol: string,
  forceRefresh: boolean = false
): Promise<{ candles: Candle[]; source: string; total_bars: number; from_date: string; to_date: string }> {
  const cleanSymbol = symbol.trim().toUpperCase();

  // 1. Check browser IndexedDB if not forcing refresh
  if (!forceRefresh) {
    const cachedIdb = await getFromIndexedDB(cleanSymbol);
    if (cachedIdb && cachedIdb.candles && cachedIdb.candles.length > 0) {
      return {
        candles: cachedIdb.candles,
        source: 'BROWSER_INDEXED_DB',
        total_bars: cachedIdb.total_bars || cachedIdb.candles.length,
        from_date: cachedIdb.from_date,
        to_date: cachedIdb.to_date,
      };
    }
  }

  // 2. Fetch from server endpoint
  const res = await fetch(`/api/candles/30d?symbol=${encodeURIComponent(cleanSymbol)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Server returned ${res.status}`);
  }

  const data = await res.json();
  const candles: Candle[] = data.candles || [];

  // 3. Save into browser IndexedDB for instant future loads
  if (candles.length > 0) {
    await saveToIndexedDB({
      symbol: cleanSymbol,
      instrument_key: data.instrument_key || `NSE_${cleanSymbol}`,
      interval: '1minute',
      total_bars: candles.length,
      from_date: data.from_date,
      to_date: data.to_date,
      last_updated: data.last_updated || new Date().toISOString(),
      candles,
    });
  }

  return {
    candles,
    source: data.source || 'LOCAL_SERVER_DB',
    total_bars: candles.length,
    from_date: data.from_date,
    to_date: data.to_date,
  };
}

/**
 * Get summary status of all 30-day databases on the server and in IndexedDB
 */
export async function getHistoricalDbStatus(): Promise<CandleDbStatusItem[]> {
  const res = await fetch('/api/candles/db-status');
  if (!res.ok) {
    throw new Error(`Failed to fetch database status: ${res.status}`);
  }
  const data = await res.json();
  const items: CandleDbStatusItem[] = data.items || [];

  // Augment with IndexedDB local presence
  for (const item of items) {
    try {
      const idb = await getFromIndexedDB(item.symbol);
      item.in_browser_idb = Boolean(idb && idb.candles?.length);
    } catch {
      item.in_browser_idb = false;
    }
  }

  return items;
}

/**
 * Trigger collection of 30-day historical data on the server
 */
export async function triggerCollect30Days(symbol: string = 'ALL'): Promise<any> {
  const res = await fetch(`/api/candles/collect-30d?symbol=${encodeURIComponent(symbol)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ symbol }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed to collect candles: ${res.status}`);
  }
  return res.json();
}

/**
 * Export candles to CSV file download
 */
export function exportCandlesToCSV(symbol: string, candles: Candle[]): void {
  if (!candles || candles.length === 0) return;

  const header = 'Timestamp,DateTime_IST,Open,High,Low,Close,Volume\n';
  const rows = candles.map((c) => {
    const dateStr = new Date(c.time * 1000).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour12: false,
    });
    return `${c.time},"${dateStr}",${c.open.toFixed(2)},${c.high.toFixed(2)},${c.low.toFixed(2)},${c.close.toFixed(2)},${c.volume}`;
  });

  const csvContent = header + rows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${symbol}_1m_30days_${candles.length}bars.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export candles to JSON file download
 */
export function exportCandlesToJSON(symbol: string, candles: Candle[]): void {
  if (!candles || candles.length === 0) return;

  const payload = {
    symbol,
    interval: '1minute',
    total_bars: candles.length,
    exported_at: new Date().toISOString(),
    candles,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${symbol}_1m_30days_${candles.length}bars.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
````
