import { type NextRequest, NextResponse } from "next/server"
import { getInstrument } from "@/lib/market/instruments"
import { generateCandles } from "@/lib/market/simulator"
import type { Candle, CandlesResponse, DataMode, Timeframe } from "@/lib/market/types"
import { TIMEFRAMES } from "@/lib/market/types"

const BINANCE_INTERVAL: Record<Timeframe, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1H": "1h",
  "4H": "4h",
  "1D": "1d",
  "1W": "1w",
}

async function fetchBinance(pair: string, tf: Timeframe, limit: number): Promise<Candle[] | null> {
  try {
    const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${BINANCE_INTERVAL[tf]}&limit=${limit}`
    const res = await fetch(url, { next: { revalidate: 0 }, cache: "no-store" })
    if (!res.ok) return null
    const rows = (await res.json()) as unknown[][]
    return rows.map((r) => ({
      time: Math.floor(Number(r[0]) / 1000),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
    }))
  } catch {
    return null
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const symbol = searchParams.get("symbol") ?? "BTCUSD"
  const tf = (searchParams.get("tf") as Timeframe) ?? "1H"
  const mode = (searchParams.get("mode") as DataMode) ?? "live"
  const limit = Math.min(Number(searchParams.get("limit")) || 320, 500)

  const instrument = getInstrument(symbol)
  if (!instrument || !TIMEFRAMES.includes(tf)) {
    return NextResponse.json({ error: "Unknown symbol or timeframe" }, { status: 400 })
  }

  let candles: Candle[] | null = null
  let source: DataMode = "simulated"

  // Real market data is available for crypto via Binance's public API (no key).
  // Everything else (or when the user forces simulation) uses the simulator.
  if (mode === "live" && instrument.binance) {
    candles = await fetchBinance(instrument.binance, tf, limit)
    if (candles && candles.length) source = "live"
  }

  if (!candles || !candles.length) {
    candles = generateCandles(instrument, tf, limit)
    source = "simulated"
  }

  const body: CandlesResponse = { symbol, timeframe: tf, source, candles }
  return NextResponse.json(body, {
    headers: { "Cache-Control": "no-store" },
  })
}
