import type { Candle } from "./types"

export interface LinePoint {
  time: number
  value: number
}

/** Simple Moving Average over closes. */
export function sma(candles: Candle[], period: number): LinePoint[] {
  const out: LinePoint[] = []
  let sum = 0
  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close
    if (i >= period) sum -= candles[i - period].close
    if (i >= period - 1) out.push({ time: candles[i].time, value: sum / period })
  }
  return out
}

/** Exponential Moving Average over closes. */
export function ema(candles: Candle[], period: number): LinePoint[] {
  const out: LinePoint[] = []
  if (candles.length === 0) return out
  const k = 2 / (period + 1)
  let prev = candles[0].close
  for (let i = 0; i < candles.length; i++) {
    const value = i === 0 ? prev : candles[i].close * k + prev * (1 - k)
    prev = value
    if (i >= period - 1) out.push({ time: candles[i].time, value })
  }
  return out
}

export function formatPrice(value: number, currency: "USD" | "INR" = "USD"): string {
  const symbol = currency === "INR" ? "₹" : "$"
  const fractionDigits = value < 1 ? 4 : value < 100 ? 2 : 2
  return (
    symbol +
    value.toLocaleString("en-US", {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    })
  )
}

export function formatCompact(value: number): string {
  return Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(value)
}

export function formatChange(pct: number): string {
  const sign = pct >= 0 ? "+" : ""
  return `${sign}${pct.toFixed(2)}%`
}
