"use client"

import { useEffect, useState } from "react"
import { CandlestickChart, PanelRightOpen } from "lucide-react"
import { SymbolSearch } from "./symbol-search"

interface TopBarProps {
  onSelect: (symbol: string) => void
  onToggleWatchlist: () => void
}

export function TopBar({ onSelect, onToggleWatchlist }: TopBarProps) {
  const [clock, setClock] = useState("")

  useEffect(() => {
    const update = () =>
      setClock(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "UTC",
        }),
      )
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <header className="flex items-center gap-3 border-b border-border bg-card/60 px-3 py-2.5 backdrop-blur">
      <div className="flex items-center gap-2 pr-1">
        <div className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <CandlestickChart className="size-4" />
        </div>
        <span className="hidden font-mono text-sm font-semibold tracking-tight text-foreground sm:block">
          Pulse<span className="text-primary">Markets</span>
        </span>
      </div>

      <SymbolSearch onSelect={onSelect} />

      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 md:flex">
          <span className="font-mono text-[11px] text-muted-foreground">UTC</span>
          <span className="font-mono text-sm tabular-nums text-foreground">{clock}</span>
        </div>
        <button
          onClick={onToggleWatchlist}
          aria-label="Toggle watchlist"
          className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground lg:hidden"
        >
          <PanelRightOpen className="size-4" />
        </button>
      </div>
    </header>
  )
}
