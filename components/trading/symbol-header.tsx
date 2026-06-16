"use client"

import { ArrowDownRight, ArrowUpRight } from "lucide-react"
import { formatChange, formatCompact, formatPrice } from "@/lib/market/indicators"
import type { Candle, Instrument } from "@/lib/market/types"
import { cn } from "@/lib/utils"

interface SymbolHeaderProps {
  instrument: Instrument
  candles: Candle[]
  liveCandle: Candle | null
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bull" | "bear" }) {
  return (
    <div className="flex flex-col">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          tone === "bull" ? "text-bull" : tone === "bear" ? "text-bear" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  )
}

export function SymbolHeader({ instrument, candles, liveCandle }: SymbolHeaderProps) {
  const cur = instrument.currency
  if (candles.length === 0) {
    return <div className="h-[88px] border-b border-border" />
  }

  const last = liveCandle ?? candles[candles.length - 1]
  const prev = candles[candles.length - 2] ?? last
  const price = last.close
  const changeAbs = price - prev.close
  const changePct = (changeAbs / prev.close) * 100
  const up = changeAbs >= 0

  // Daily extremes from the visible window.
  const high = Math.max(...candles.map((c) => c.high), last.high)
  const low = Math.min(...candles.map((c) => c.low), last.low)
  const totalVol = candles.reduce((a, c) => a + c.volume, 0)

  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-border px-4 py-3">
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-baseline gap-2">
            <h1 className="font-mono text-lg font-semibold text-foreground">{instrument.symbol}</h1>
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
              {instrument.exchange}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">{instrument.name}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {formatPrice(price, cur)}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 rounded-md px-2 py-1 font-mono text-sm tabular-nums",
            up ? "bg-bull/15 text-bull" : "bg-bear/15 text-bear",
          )}
        >
          {up ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
          {formatPrice(Math.abs(changeAbs), cur)} ({formatChange(changePct)})
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-7 gap-y-2">
        <Stat label="Open" value={formatPrice(last.open, cur)} />
        <Stat label="High" value={formatPrice(high, cur)} tone="bull" />
        <Stat label="Low" value={formatPrice(low, cur)} tone="bear" />
        <Stat label="Volume" value={formatCompact(totalVol)} />
      </div>
    </div>
  )
}
