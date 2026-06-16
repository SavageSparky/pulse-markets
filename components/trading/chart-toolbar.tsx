"use client"

import { useState } from "react"
import { Activity, BarChart3, CandlestickChart, ChevronDown, LineChart, Radio } from "lucide-react"
import type { ChartType, IndicatorState } from "./price-chart"
import { TIMEFRAMES, type DataMode, type Timeframe } from "@/lib/market/types"
import { cn } from "@/lib/utils"

interface ChartToolbarProps {
  timeframe: Timeframe
  onTimeframe: (tf: Timeframe) => void
  chartType: ChartType
  onChartType: (t: ChartType) => void
  indicators: IndicatorState
  onIndicators: (i: IndicatorState) => void
  dataMode: DataMode
  onDataMode: (m: DataMode) => void
  source: DataMode
}

const CHART_TYPES: { type: ChartType; icon: typeof CandlestickChart; label: string }[] = [
  { type: "candles", icon: CandlestickChart, label: "Candles" },
  { type: "area", icon: Activity, label: "Area" },
  { type: "line", icon: LineChart, label: "Line" },
]

const INDICATOR_OPTIONS: { key: keyof IndicatorState; label: string; color: string }[] = [
  { key: "sma20", label: "SMA 20", color: "#e3b341" },
  { key: "sma50", label: "SMA 50", color: "#4aa3df" },
  { key: "ema20", label: "EMA 20", color: "#ff9f43" },
  { key: "volume", label: "Volume", color: "#8b93a7" },
]

export function ChartToolbar({
  timeframe,
  onTimeframe,
  chartType,
  onChartType,
  indicators,
  onIndicators,
  dataMode,
  onDataMode,
  source,
}: ChartToolbarProps) {
  const [indicatorsOpen, setIndicatorsOpen] = useState(false)
  const activeCount = Object.values(indicators).filter(Boolean).length

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-3 py-2">
      {/* Timeframes */}
      <div className="flex items-center gap-0.5 rounded-md bg-secondary/60 p-0.5">
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframe(tf)}
            className={cn(
              "rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors",
              timeframe === tf ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tf}
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-border" />

      {/* Chart type */}
      <div className="flex items-center gap-0.5 rounded-md bg-secondary/60 p-0.5">
        {CHART_TYPES.map(({ type, icon: Icon, label }) => (
          <button
            key={type}
            onClick={() => onChartType(type)}
            title={label}
            aria-label={label}
            className={cn(
              "rounded p-1.5 transition-colors",
              chartType === type ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>

      <div className="h-5 w-px bg-border" />

      {/* Indicators */}
      <div className="relative">
        <button
          onClick={() => setIndicatorsOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
        >
          <BarChart3 className="size-4 text-muted-foreground" />
          Indicators
          {activeCount > 0 && (
            <span className="rounded bg-primary px-1.5 font-mono text-[10px] text-primary-foreground">{activeCount}</span>
          )}
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </button>
        {indicatorsOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIndicatorsOpen(false)} />
            <div className="absolute left-0 z-50 mt-2 w-44 rounded-lg border border-border bg-popover p-1 shadow-2xl">
              {INDICATOR_OPTIONS.map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => onIndicators({ ...indicators, [key]: !indicators[key] })}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent"
                >
                  <span className="flex items-center gap-2">
                    <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-foreground">{label}</span>
                  </span>
                  <span
                    className={cn(
                      "flex size-4 items-center justify-center rounded border",
                      indicators[key] ? "border-primary bg-primary" : "border-border",
                    )}
                  >
                    {indicators[key] && <span className="size-1.5 rounded-sm bg-primary-foreground" />}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Live source indicator */}
        <span
          className={cn(
            "hidden items-center gap-1.5 rounded-md px-2 py-1 font-mono text-[10px] uppercase tracking-wider sm:flex",
            source === "live" ? "bg-bull/15 text-bull" : "bg-muted text-muted-foreground",
          )}
        >
          <Radio className="size-3" />
          {source === "live" ? "Live feed" : "Simulated"}
        </span>

        {/* Data mode toggle */}
        <div className="flex items-center gap-0.5 rounded-md bg-secondary/60 p-0.5">
          {(["live", "simulated"] as DataMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onDataMode(m)}
              className={cn(
                "rounded px-2.5 py-1 font-mono text-[11px] font-medium capitalize transition-colors",
                dataMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
