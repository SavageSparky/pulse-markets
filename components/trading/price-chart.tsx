"use client"

import { useEffect, useRef } from "react"
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  createChart,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type UTCTimestamp,
} from "lightweight-charts"
import { ema, sma } from "@/lib/market/indicators"
import type { Candle } from "@/lib/market/types"

export type ChartType = "candles" | "area" | "line"

export interface IndicatorState {
  sma20: boolean
  sma50: boolean
  ema20: boolean
  volume: boolean
}

const COLORS = {
  text: "#8b93a7",
  grid: "rgba(255,255,255,0.045)",
  border: "rgba(255,255,255,0.08)",
  bull: "#2ebd85",
  bear: "#f6465d",
  bullVol: "rgba(46,189,133,0.4)",
  bearVol: "rgba(246,70,93,0.4)",
  line: "#4aa3df",
  areaTop: "rgba(74,163,223,0.35)",
  areaBottom: "rgba(74,163,223,0.02)",
  sma20: "#e3b341",
  sma50: "#4aa3df",
  ema20: "#ff9f43",
}

interface PriceChartProps {
  candles: Candle[]
  chartType: ChartType
  indicators: IndicatorState
  /** Changes whenever the user switches symbol/timeframe so we refit the view. */
  viewKey: string
  /** The latest in-progress candle for smooth live updates. */
  liveCandle: Candle | null
}

export function PriceChart({ candles, chartType, indicators, viewKey, liveCandle }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const mainRef = useRef<ISeriesApi<"Candlestick" | "Area" | "Line"> | null>(null)
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null)
  const overlaysRef = useRef<ISeriesApi<"Line">[]>([])
  const disposedRef = useRef(false)
  const lastViewKey = useRef<string>("")

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: COLORS.text,
        fontFamily: "var(--font-geist-mono), monospace",
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      rightPriceScale: { borderColor: COLORS.border, scaleMargins: { top: 0.08, bottom: 0.22 } },
      timeScale: { borderColor: COLORS.border, timeVisible: true, secondsVisible: false },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(255,255,255,0.2)", labelBackgroundColor: "#2b3242" },
        horzLine: { color: "rgba(255,255,255,0.2)", labelBackgroundColor: "#2b3242" },
      },
    })
    chartRef.current = chart
    disposedRef.current = false

    return () => {
      disposedRef.current = true
      chart.remove()
      chartRef.current = null
      mainRef.current = null
      volumeRef.current = null
      overlaysRef.current = []
    }
  }, [])

  // (Re)build series whenever the structure or data changes.
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || disposedRef.current || candles.length === 0) return

    // Remove any existing series before rebuilding.
    if (mainRef.current) {
      chart.removeSeries(mainRef.current)
      mainRef.current = null
    }
    if (volumeRef.current) {
      chart.removeSeries(volumeRef.current)
      volumeRef.current = null
    }
    for (const s of overlaysRef.current) chart.removeSeries(s)
    overlaysRef.current = []

    // Main price series.
    if (chartType === "candles") {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: COLORS.bull,
        downColor: COLORS.bear,
        borderUpColor: COLORS.bull,
        borderDownColor: COLORS.bear,
        wickUpColor: COLORS.bull,
        wickDownColor: COLORS.bear,
      })
      s.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      )
      mainRef.current = s
    } else if (chartType === "area") {
      const s = chart.addSeries(AreaSeries, {
        lineColor: COLORS.line,
        topColor: COLORS.areaTop,
        bottomColor: COLORS.areaBottom,
        lineWidth: 2,
      })
      s.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })))
      mainRef.current = s
    } else {
      const s = chart.addSeries(LineSeries, { color: COLORS.line, lineWidth: 2 })
      s.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })))
      mainRef.current = s
    }

    // Volume.
    if (indicators.volume) {
      const v = chart.addSeries(HistogramSeries, {
        priceFormat: { type: "volume" },
        priceScaleId: "vol",
      })
      v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
      v.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? COLORS.bullVol : COLORS.bearVol,
        })),
      )
      volumeRef.current = v
    }

    // Indicator overlays.
    const addLine = (color: string, points: { time: number; value: number }[]) => {
      const line = chart.addSeries(LineSeries, { color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
      line.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })))
      overlaysRef.current.push(line)
    }
    if (indicators.sma20) addLine(COLORS.sma20, sma(candles, 20))
    if (indicators.sma50) addLine(COLORS.sma50, sma(candles, 50))
    if (indicators.ema20) addLine(COLORS.ema20, ema(candles, 20))

    // Only refit the view when the symbol/timeframe actually changed.
    if (lastViewKey.current !== viewKey) {
      chart.timeScale().fitContent()
      lastViewKey.current = viewKey
    }
  }, [candles, chartType, indicators, viewKey])

  // Smooth live updates for the most recent candle.
  useEffect(() => {
    if (!liveCandle || !mainRef.current) return
    const time = liveCandle.time as Time
    if (chartType === "candles") {
      ;(mainRef.current as ISeriesApi<"Candlestick">).update({
        time,
        open: liveCandle.open,
        high: liveCandle.high,
        low: liveCandle.low,
        close: liveCandle.close,
      })
    } else {
      ;(mainRef.current as ISeriesApi<"Area" | "Line">).update({ time, value: liveCandle.close })
    }
    if (volumeRef.current) {
      volumeRef.current.update({
        time,
        value: liveCandle.volume,
        color: liveCandle.close >= liveCandle.open ? COLORS.bullVol : COLORS.bearVol,
      })
    }
  }, [liveCandle, chartType])

  return <div ref={containerRef} className="h-full w-full" />
}
