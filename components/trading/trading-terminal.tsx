"use client"

import { useEffect, useState } from "react"
import useSWR from "swr"
import { getInstrument } from "@/lib/market/instruments"
import { tickCandle } from "@/lib/market/simulator"
import type { Candle, CandlesResponse, DataMode, Timeframe } from "@/lib/market/types"
import { ChartToolbar } from "./chart-toolbar"
import { PriceChart, type ChartType, type IndicatorState } from "./price-chart"
import { SymbolHeader } from "./symbol-header"
import { TopBar } from "./top-bar"
import { Watchlist } from "./watchlist"
import { cn } from "@/lib/utils"

const DEFAULT_WATCHLIST = [
  "BTCUSD",
  "ETHUSD",
  "SOLUSD",
  "AAPL",
  "NVDA",
  "TSLA",
  "RELIANCE",
  "TCS",
  "INFY",
  "XAUUSD",
  "WTIUSD",
  "ADANIENT",
]

const fetcher = (url: string) => fetch(url).then((r) => r.json() as Promise<CandlesResponse>)

export function TradingTerminal() {
  const [symbol, setSymbol] = useState("BTCUSD")
  const [timeframe, setTimeframe] = useState<Timeframe>("1H")
  const [chartType, setChartType] = useState<ChartType>("candles")
  const [dataMode, setDataMode] = useState<DataMode>("live")
  const [indicators, setIndicators] = useState<IndicatorState>({
    sma20: true,
    sma50: false,
    ema20: false,
    volume: true,
  })
  const [liveCandle, setLiveCandle] = useState<Candle | null>(null)
  const [watchlistOpen, setWatchlistOpen] = useState(false)

  const instrument = getInstrument(symbol)

  const { data, isLoading } = useSWR(
    `/api/candles?symbol=${symbol}&tf=${timeframe}&mode=${dataMode}`,
    fetcher,
    {
      refreshInterval: dataMode === "live" ? 15000 : 0,
      revalidateOnFocus: false,
      keepPreviousData: true,
    },
  )

  const candles = data?.candles ?? []
  const source: DataMode = data?.source ?? dataMode

  // Seed the live candle from the latest fetched bar.
  useEffect(() => {
    if (candles.length) setLiveCandle(candles[candles.length - 1])
  }, [candles])

  // Animate the most recent candle for a live feel.
  useEffect(() => {
    if (!instrument) return
    const id = setInterval(() => {
      setLiveCandle((prev) => (prev ? tickCandle(prev, instrument) : prev))
    }, 1200)
    return () => clearInterval(id)
  }, [instrument])

  function handleSelect(s: string) {
    setSymbol(s)
    setWatchlistOpen(false)
  }

  if (!instrument) return null

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <TopBar onSelect={handleSelect} onToggleWatchlist={() => setWatchlistOpen((o) => !o)} />

      <div className="flex min-h-0 flex-1">
        {/* Chart column */}
        <main className="flex min-w-0 flex-1 flex-col">
          <SymbolHeader instrument={instrument} candles={candles} liveCandle={liveCandle} />
          <ChartToolbar
            timeframe={timeframe}
            onTimeframe={setTimeframe}
            chartType={chartType}
            onChartType={setChartType}
            indicators={indicators}
            onIndicators={setIndicators}
            dataMode={dataMode}
            onDataMode={setDataMode}
            source={source}
          />
          <div className="relative min-h-0 flex-1">
            {isLoading && candles.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <span className="font-mono text-sm text-muted-foreground">Loading market data...</span>
              </div>
            ) : (
              <PriceChart
                candles={candles}
                chartType={chartType}
                indicators={indicators}
                viewKey={`${symbol}-${timeframe}`}
                liveCandle={liveCandle}
              />
            )}
          </div>
        </main>

        {/* Watchlist (desktop) */}
        <aside className="hidden w-72 shrink-0 border-l border-border bg-sidebar lg:block">
          <Watchlist symbols={DEFAULT_WATCHLIST} activeSymbol={symbol} onSelect={handleSelect} />
        </aside>
      </div>

      {/* Watchlist (mobile drawer) */}
      {watchlistOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={() => setWatchlistOpen(false)} />
          <aside
            className={cn(
              "absolute right-0 top-0 h-full w-72 border-l border-border bg-sidebar shadow-2xl",
            )}
          >
            <Watchlist symbols={DEFAULT_WATCHLIST} activeSymbol={symbol} onSelect={handleSelect} />
          </aside>
        </div>
      )}
    </div>
  )
}
