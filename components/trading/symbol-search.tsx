"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { INSTRUMENTS } from "@/lib/market/instruments"
import { CATEGORY_LABELS, type Category, type Instrument } from "@/lib/market/types"
import { cn } from "@/lib/utils"

interface SymbolSearchProps {
  onSelect: (symbol: string) => void
}

const CATEGORY_ORDER: Category[] = ["us-stocks", "in-stocks", "crypto", "commodities"]

export function SymbolSearch({ onSelect }: SymbolSearchProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? INSTRUMENTS.filter(
          (i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
        )
      : INSTRUMENTS
    const grouped: Record<string, Instrument[]> = {}
    for (const i of list) (grouped[i.category] ??= []).push(i)
    return grouped
  }, [query])

  function handleSelect(symbol: string) {
    onSelect(symbol)
    setOpen(false)
    setQuery("")
  }

  return (
    <div ref={wrapRef} className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Search symbol or name..."
          className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          aria-label="Search symbols"
        />
        {query ? (
          <button onClick={() => setQuery("")} aria-label="Clear search" className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        ) : (
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
            ⌘K
          </kbd>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-2 max-h-[420px] w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-2xl">
          {CATEGORY_ORDER.filter((c) => results[c]?.length).map((cat) => (
            <div key={cat} className="mb-1">
              <p className="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {CATEGORY_LABELS[cat]}
              </p>
              {results[cat].map((i) => (
                <button
                  key={i.symbol}
                  onClick={() => handleSelect(i.symbol)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-accent",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium text-foreground">{i.symbol}</span>
                    <span className="truncate text-xs text-muted-foreground">{i.name}</span>
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">{i.exchange}</span>
                </button>
              ))}
            </div>
          ))}
          {Object.keys(results).length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No results found</p>
          )}
        </div>
      )}
    </div>
  )
}
