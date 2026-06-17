<script lang="ts">
  import { onMount } from 'svelte';
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
    type UTCTimestamp
  } from 'lightweight-charts';
  import { ema, sma } from '$lib/market/indicators';
  import type { Candle } from '$lib/market/types';
  import type { ChartType, IndicatorState } from './chart-types';

  interface Props {
    candles: Candle[];
    chartType: ChartType;
    indicators: IndicatorState;
    viewKey: string;
    liveCandle: Candle | null;
    onLoadMore?: () => void;
  }

  let { candles, chartType, indicators, viewKey, liveCandle, onLoadMore }: Props = $props();

  const COLORS = {
    text: '#8b93a7',
    grid: 'rgba(255,255,255,0.045)',
    border: 'rgba(255,255,255,0.08)',
    bull: '#2ebd85',
    bear: '#f6465d',
    bullVol: 'rgba(46,189,133,0.4)',
    bearVol: 'rgba(246,70,93,0.4)',
    line: '#4aa3df',
    areaTop: 'rgba(74,163,223,0.35)',
    areaBottom: 'rgba(74,163,223,0.02)',
    sma50: '#e3b341',
    sma100: '#4aa3df',
    sma200: '#8e44ad',
    ema50: '#f39c12',
    ema100: '#d35400',
    ema200: '#c0392b'
  };

  let containerEl: HTMLDivElement;
  let chart: IChartApi | null = null;
  let mainSeries: ISeriesApi<'Candlestick' | 'Area' | 'Line'> | null = null;
  let volumeSeries: ISeriesApi<'Histogram'> | null = null;
  let overlaySeries: ISeriesApi<'Line'>[] = [];
  let lastViewKey = '';

  let hoveredCandle = $state<Candle | null>(null);
  let displayCandle = $derived(hoveredCandle || liveCandle || (candles.length > 0 ? candles[candles.length - 1] : null));

  // Create chart on mount
  onMount(() => {
    chart = createChart(containerEl, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: COLORS.text,
        fontFamily: "'Geist Mono', monospace",
        fontSize: 11,
        attributionLogo: false
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid }
      },
      rightPriceScale: {
        borderColor: COLORS.border,
        scaleMargins: { top: 0.12, bottom: 0.22 }
      },
      timeScale: { borderColor: COLORS.border, timeVisible: true, secondsVisible: false },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.2)', labelBackgroundColor: '#2b3242' },
        horzLine: { color: 'rgba(255,255,255,0.2)', labelBackgroundColor: '#2b3242' }
      }
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange((logicalRange) => {
      if (logicalRange !== null && logicalRange.from < 20) {
        if (onLoadMore) onLoadMore();
      }
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time || param.point === undefined || param.point.x < 0 || param.point.y < 0) {
        hoveredCandle = null;
        return;
      }
      
      const time = param.time as number;
      // Fast binary search since array is strictly sorted
      let left = 0;
      let right = candles.length - 1;
      let found: Candle | null = null;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (candles[mid].time === time) {
          found = candles[mid];
          break;
        } else if (candles[mid].time < time) {
          left = mid + 1;
        } else {
          right = mid - 1;
        }
      }
      hoveredCandle = found;
    });

    return () => {
      chart?.remove();
      chart = null;
      mainSeries = null;
      volumeSeries = null;
      overlaySeries = [];
    };
  });

  // (Re)build series whenever structure or data changes
  $effect(() => {
    if (!chart || candles.length === 0) return;

    // Remove existing series
    if (mainSeries) { chart.removeSeries(mainSeries); mainSeries = null; }
    if (volumeSeries) { chart.removeSeries(volumeSeries); volumeSeries = null; }
    for (const s of overlaySeries) chart.removeSeries(s);
    overlaySeries = [];

    // Main price series
    if (chartType === 'candles') {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: COLORS.bull,
        downColor: COLORS.bear,
        borderUpColor: COLORS.bull,
        borderDownColor: COLORS.bear,
        wickUpColor: COLORS.bull,
        wickDownColor: COLORS.bear
      });
      s.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close
        }))
      );
      mainSeries = s;
    } else if (chartType === 'area') {
      const s = chart.addSeries(AreaSeries, {
        lineColor: COLORS.line,
        topColor: COLORS.areaTop,
        bottomColor: COLORS.areaBottom,
        lineWidth: 2
      });
      s.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
      mainSeries = s;
    } else {
      const s = chart.addSeries(LineSeries, { color: COLORS.line, lineWidth: 2 });
      s.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
      mainSeries = s;
    }

    // Volume
    if (indicators.volume) {
      const v = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol'
      });
      v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
      v.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? COLORS.bullVol : COLORS.bearVol
        }))
      );
      volumeSeries = v;
    }

    // Indicator overlays
    const addLine = (color: string, points: { time: number; value: number }[]) => {
      const line = chart!.addSeries(LineSeries, {
        color,
        lineWidth: 1,
        priceLineVisible: false,
        lastValueVisible: false
      });
      line.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
      overlaySeries.push(line);
    };
    if (indicators.sma50) addLine(COLORS.sma50, sma(candles, 50));
    if (indicators.sma100) addLine(COLORS.sma100, sma(candles, 100));
    if (indicators.sma200) addLine(COLORS.sma200, sma(candles, 200));
    if (indicators.ema50) addLine(COLORS.ema50, ema(candles, 50));
    if (indicators.ema100) addLine(COLORS.ema100, ema(candles, 100));
    if (indicators.ema200) addLine(COLORS.ema200, ema(candles, 200));

    // Only refit view when symbol/timeframe changed
    if (lastViewKey !== viewKey) {
      chart.timeScale().fitContent();
      lastViewKey = viewKey;
    }
  });

  // Smooth live updates
  $effect(() => {
    if (!liveCandle || !mainSeries) return;
    const time = liveCandle.time as Time;
    if (chartType === 'candles') {
      (mainSeries as ISeriesApi<'Candlestick'>).update({
        time,
        open: liveCandle.open,
        high: liveCandle.high,
        low: liveCandle.low,
        close: liveCandle.close
      });
    } else {
      (mainSeries as ISeriesApi<'Area' | 'Line'>).update({ time, value: liveCandle.close });
    }
    if (volumeSeries) {
      volumeSeries.update({
        time,
        value: liveCandle.volume,
        color: liveCandle.close >= liveCandle.open ? COLORS.bullVol : COLORS.bearVol
      });
    }
  });
</script>

<div class="relative h-full w-full">
  <!-- OHLC Legend -->
  {#if displayCandle}
    <div class="pointer-events-none absolute left-3 top-2 z-10 flex gap-4 font-mono text-[11.5px] text-muted-foreground backdrop-blur-sm bg-background/30 rounded px-1.5 py-0.5">
      <span>O <span class="text-foreground">{displayCandle.open.toFixed(2)}</span></span>
      <span>H <span class="text-foreground">{displayCandle.high.toFixed(2)}</span></span>
      <span>L <span class="text-foreground">{displayCandle.low.toFixed(2)}</span></span>
      <span>C <span class={displayCandle.close >= displayCandle.open ? 'text-bull font-medium' : 'text-bear font-medium'}>{displayCandle.close.toFixed(2)}</span></span>
    </div>
  {/if}
  <!-- Chart Container -->
  <div bind:this={containerEl} class="absolute inset-0"></div>
</div>
