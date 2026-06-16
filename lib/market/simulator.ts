import type { Candle, Category, Instrument, Timeframe } from "./types"
import { TF_SECONDS } from "./types"

/** Per-candle volatility (relative) used as a base, scaled by timeframe. */
const CATEGORY_VOL: Record<Category, number> = {
  "us-stocks": 0.009,
  "in-stocks": 0.011,
  crypto: 0.018,
  commodities: 0.008,
}

function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** Deterministic seeded PRNG so a symbol+timeframe always renders the same history. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function gaussian(rng: () => number): number {
  // Box-Muller
  const u = Math.max(rng(), 1e-9)
  const v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function baseVolume(inst: Instrument): number {
  switch (inst.category) {
    case "crypto":
      return inst.basePrice > 1000 ? 1200 : 90000
    case "commodities":
      return 45000
    case "in-stocks":
      return 320000
    default:
      return 180000
  }
}

/**
 * Generate a deterministic but realistic looking OHLC series ending at the
 * current time bucket for the given timeframe. The final close is normalized
 * to the instrument's base price so live data and simulated data line up.
 */
export function generateCandles(inst: Instrument, tf: Timeframe, count = 320): Candle[] {
  const rng = mulberry32(hashString(inst.symbol + ":" + tf))
  const interval = TF_SECONDS[tf]
  const now = Math.floor(Date.now() / 1000)
  const lastBucket = Math.floor(now / interval) * interval
  const start = lastBucket - interval * (count - 1)

  // Larger timeframes accumulate more variance.
  const vol = CATEGORY_VOL[inst.category] * Math.sqrt(interval / 3600 + 0.4)
  const drift = (rng() - 0.5) * vol * 0.25 // gentle long-term trend
  const baseVol = baseVolume(inst)

  const candles: Candle[] = []
  let price = inst.basePrice

  for (let i = 0; i < count; i++) {
    const open = price
    const shock = gaussian(rng) * vol + drift
    const close = Math.max(open * (1 + shock), open * 0.5)
    const wickUp = Math.abs(gaussian(rng)) * vol * 0.6
    const wickDown = Math.abs(gaussian(rng)) * vol * 0.6
    const high = Math.max(open, close) * (1 + wickUp)
    const low = Math.min(open, close) * (1 - wickDown)
    const volume = Math.round(baseVol * (0.45 + rng() * 1.1) * (1 + Math.abs(shock) * 12))

    candles.push({ time: start + i * interval, open, high, low, close, volume })
    price = close
  }

  // Normalize so the most recent close equals the base price.
  const factor = inst.basePrice / price
  for (const c of candles) {
    c.open *= factor
    c.high *= factor
    c.low *= factor
    c.close *= factor
  }

  return candles
}

/** Produce the next live tick for an in-progress candle. */
export function tickCandle(last: Candle, inst: Instrument): Candle {
  const vol = CATEGORY_VOL[inst.category] * 0.5
  const change = (Math.random() - 0.5) * 2 * vol
  const close = Math.max(last.close * (1 + change), last.close * 0.7)
  return {
    ...last,
    close,
    high: Math.max(last.high, close),
    low: Math.min(last.low, close),
    volume: last.volume + Math.round(Math.random() * baseVolume(inst) * 0.02),
  }
}
