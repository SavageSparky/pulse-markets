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
  }

  let { candles, chartType, indicators, viewKey, liveCandle }: Props = $props();

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
    sma20: '#e3b341',
    sma50: '#4aa3df',
    ema20: '#ff9f43'
  };

  let containerEl: HTMLDivElement;
  let chart: IChartApi | null = null;
  let mainSeries: ISeriesApi<'Candlestick' | 'Area' | 'Line'> | null = null;
  let volumeSeries: ISeriesApi<'Histogram'> | null = null;
  let overlaySeries: ISeriesApi<'Line'>[] = [];
  let lastViewKey = '';

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
        scaleMargins: { top: 0.08, bottom: 0.22 }
      },
      timeScale: { borderColor: COLORS.border, timeVisible: true, secondsVisible: false },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(255,255,255,0.2)', labelBackgroundColor: '#2b3242' },
        horzLine: { color: 'rgba(255,255,255,0.2)', labelBackgroundColor: '#2b3242' }
      }
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
    if (indicators.sma20) addLine(COLORS.sma20, sma(candles, 20));
    if (indicators.sma50) addLine(COLORS.sma50, sma(candles, 50));
    if (indicators.ema20) addLine(COLORS.ema20, ema(candles, 20));

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

<div bind:this={containerEl} class="h-full w-full"></div>
