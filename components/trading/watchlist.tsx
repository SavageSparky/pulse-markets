"use client"

import { useEffect, useMemo, useState } from "react"
import { Star } from "lucide-react"
import { getInstrument } from "@/lib/market/instruments"
import { formatChange, formatPrice } from "@/lib/market/indicators"
import { dayQuote, type Quote } from "@/lib/market/quotes"
import { cn } from "@/lib/utils"

interface WatchlistProps {
  symbols: string[]
  activeSymbol: string
  onSelect: (symbol: string) => void
}

export function Watchlist({ symbols, activeSymbol, onSelect }: WatchlistProps) {
  const base = useMemo(() => {
    const map: Record<string, Quote> = {}
    for (const s of symbols) {
      const inst = getInstrument(s)
      if (inst) map[s] = dayQuote(inst)
    }
    return map
  }, [symbols])

  const [quotes, setQuotes] = useState<Record<string, Quote>>(base)

  useEffect(() => setQuotes(base), [base])

  // Light, continuous ticking so the list feels live.
  useEffect(() => {
    const id = setInterval(() => {
      setQuotes((prev) => {
        const next: Record<string, Quote> = {}
        for (const s of symbols) {
          const q = prev[s] ?? base[s]
          if (!q) continue
          const inst = getInstrument(s)
          const vol = inst?.category === "crypto" ? 0.0015 : 0.0008
          const drift = (Math.random() - 0.5) * 2 * vol
          const price = q.price * (1 + drift)
          next[s] = { price, changePct: q.changePct + drift * 100 }
        }
        return next
      })
    }, 1600)
    return () => clearInterval(id)
  }, [symbols, base])

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Watchlist
        </h2>
        <span className="font-mono text-[10px] text-muted-foreground">{symbols.length} symbols</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {symbols.map((s) => {
          const inst = getInstrument(s)
          const q = quotes[s] ?? base[s]
          if (!inst || !q) return null
          const up = q.changePct >= 0
          const active = s === activeSymbol
          return (
            <button
              key={s}
              onClick={() => onSelect(s)}
              className={cn(
                "flex w-full items-center justify-between border-l-2 px-4 py-2.5 text-left transition-colors hover:bg-accent/60",
                active ? "border-l-primary bg-accent/40" : "border-l-transparent",
              )}
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5">
                  {active && <Star className="size-3 fill-primary text-primary" />}
                  <span className="font-mono text-sm font-medium text-foreground">{inst.symbol}</span>
                </span>
                <span className="block truncate text-[11px] text-muted-foreground">{inst.name}</span>
              </span>
              <span className="text-right">
                <span className="block font-mono text-sm tabular-nums text-foreground">
                  {formatPrice(q.price, inst.currency)}
                </span>
                <span
                  className={cn(
                    "block font-mono text-[11px] tabular-nums",
                    up ? "text-bull" : "text-bear",
                  )}
                >
                  {formatChange(q.changePct)}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
