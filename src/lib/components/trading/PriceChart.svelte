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
    PriceScaleMode,
    type IChartApi,
    type ISeriesApi,
    type Time,
    type UTCTimestamp
  } from 'lightweight-charts';
  import { ChevronRight, ChevronUp, Eye, EyeOff, Settings, X } from '@lucide/svelte';
  import { ema, sma } from '$lib/market/indicators';
  import type { Candle } from '$lib/market/types';
  import { cn } from '$lib/utils';
  import type { ChartType, CompareSymbol, IndicatorConfig, IndicatorLine } from './chart-types';
  import { PRESET_COLORS } from './chart-types';

  interface Props {
    candles: Candle[];
    chartType: ChartType;
    indicators: IndicatorConfig[];
    viewKey: string;
    liveCandle: Candle | null;
    onLoadMore?: () => void;
    onUpdateIndicator?: (id: string, updates: Partial<IndicatorConfig>) => void;
    onRemoveIndicator?: (id: string) => void;
    compareSymbols?: CompareSymbol[];
    compareCandles?: Map<string, Candle[]>;
    onRemoveCompare?: (symbol: string) => void;
    onToggleCompareVisibility?: (symbol: string) => void;
    primarySymbol?: string;
  }

  let {
    candles, chartType, indicators, viewKey, liveCandle,
    onLoadMore, onUpdateIndicator, onRemoveIndicator,
    compareSymbols = [], compareCandles = new Map(),
    onRemoveCompare, onToggleCompareVisibility, primarySymbol = ''
  }: Props = $props();

  const isCompareMode = $derived(compareSymbols.length > 0);

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
  };

  let containerEl: HTMLDivElement;
  let chart: IChartApi | null = null;
  let mainSeries: ISeriesApi<'Candlestick' | 'Area' | 'Line'> | null = null;
  let volumeSeries: ISeriesApi<'Histogram'> | null = null;
  let overlaySeries: ISeriesApi<'Line'>[] = [];
  let compareSeries: ISeriesApi<'Line'>[] = [];
  let lastViewKey = '';

  let hoveredCandle = $state<Candle | null>(null);
  let displayCandle = $derived(hoveredCandle || liveCandle || (candles.length > 0 ? candles[candles.length - 1] : null));
  let indicatorsCollapsed = $state(false);
  let settingsOpenId = $state<string | null>(null);
  let colorPickerState = $state<{ lineIdx: number } | null>(null);

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
      let left = 0;
      let right = candles.length - 1;
      let found: Candle | null = null;
      while (left <= right) {
        const mid = Math.floor((left + right) / 2);
        if (candles[mid].time === time) { found = candles[mid]; break; }
        else if (candles[mid].time < time) left = mid + 1;
        else right = mid - 1;
      }
      hoveredCandle = found;
    });

    return () => { chart?.remove(); chart = null; mainSeries = null; volumeSeries = null; overlaySeries = []; };
  });

  // (Re)build series whenever structure or data changes
  $effect(() => {
    if (!chart || candles.length === 0) return;

    if (mainSeries) { chart.removeSeries(mainSeries); mainSeries = null; }
    if (volumeSeries) { chart.removeSeries(volumeSeries); volumeSeries = null; }
    for (const s of overlaySeries) chart.removeSeries(s);
    overlaySeries = [];
    for (const s of compareSeries) chart.removeSeries(s);
    compareSeries = [];

    // Configure price scale mode based on compare state
    chart.priceScale('right').applyOptions({
      mode: isCompareMode ? PriceScaleMode.Percentage : PriceScaleMode.Normal,
    });

    // Main price series
    if (chartType === 'candles') {
      const s = chart.addSeries(CandlestickSeries, {
        upColor: COLORS.bull, downColor: COLORS.bear,
        borderUpColor: COLORS.bull, borderDownColor: COLORS.bear,
        wickUpColor: COLORS.bull, wickDownColor: COLORS.bear
      });
      s.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
      mainSeries = s;
    } else if (chartType === 'area') {
      const s = chart.addSeries(AreaSeries, { lineColor: COLORS.line, topColor: COLORS.areaTop, bottomColor: COLORS.areaBottom, lineWidth: 2 });
      s.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
      mainSeries = s;
    } else {
      const s = chart.addSeries(LineSeries, { color: COLORS.line, lineWidth: 2 });
      s.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.close })));
      mainSeries = s;
    }

    // Process indicators
    for (const ind of indicators) {
      if (!ind.visible) continue;

      if (ind.type === 'VOL') {
        const v = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'vol' });
        v.priceScale().applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
        v.setData(candles.map((c) => ({ time: c.time as UTCTimestamp, value: c.volume, color: c.close >= c.open ? COLORS.bullVol : COLORS.bearVol })));
        volumeSeries = v;
      } else {
        const calcFn = ind.type === 'SMA' ? sma : ema;
        for (const ln of ind.lines) {
          if (!ln.enabled) continue;
          const points = calcFn(candles, ln.period);
          const line = chart.addSeries(LineSeries, { color: ln.color, lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
          line.setData(points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })));
          overlaySeries.push(line);
        }
      }
    }

    // Process compare symbols
    if (isCompareMode) {
      for (const cs of compareSymbols) {
        if (!cs.visible) continue;
        const data = compareCandles.get(cs.symbol);
        if (!data || data.length === 0) continue;

        const line = chart.addSeries(LineSeries, {
          color: cs.color,
          lineWidth: 2,
          priceLineVisible: false,
          lastValueVisible: true,
        });

        line.setData(data.map(c => ({
          time: c.time as UTCTimestamp,
          value: c.close,
        })));

        compareSeries.push(line);
      }
    }

    if (lastViewKey !== viewKey) { chart.timeScale().fitContent(); lastViewKey = viewKey; }
  });

  // Smooth live updates
  $effect(() => {
    if (!liveCandle || !mainSeries) return;
    const time = liveCandle.time as Time;
    if (chartType === 'candles') {
      (mainSeries as ISeriesApi<'Candlestick'>).update({ time, open: liveCandle.open, high: liveCandle.high, low: liveCandle.low, close: liveCandle.close });
    } else {
      (mainSeries as ISeriesApi<'Area' | 'Line'>).update({ time, value: liveCandle.close });
    }
    if (volumeSeries) {
      volumeSeries.update({ time, value: liveCandle.volume, color: liveCandle.close >= liveCandle.open ? COLORS.bullVol : COLORS.bearVol });
    }
  });

  function toggleVisibility(id: string, current: boolean) {
    onUpdateIndicator?.(id, { visible: !current });
  }

  function toggleLine(ind: IndicatorConfig, lineIdx: number) {
    const newLines = ind.lines.map((ln, i) => i === lineIdx ? { ...ln, enabled: !ln.enabled } : ln);
    onUpdateIndicator?.(ind.id, { lines: newLines });
  }

  function changeLineColor(ind: IndicatorConfig, lineIdx: number, color: string) {
    const newLines = ind.lines.map((ln, i) => i === lineIdx ? { ...ln, color } : ln);
    onUpdateIndicator?.(ind.id, { lines: newLines });
    colorPickerState = null;
  }

  function openSettings(id: string) {
    settingsOpenId = settingsOpenId === id ? null : id;
    colorPickerState = null;
  }

  function closeSettings() {
    settingsOpenId = null;
    colorPickerState = null;
  }

  // Build summary text for an indicator chip
  function chipLabel(ind: IndicatorConfig): string {
    if (ind.type === 'VOL') return 'Vol';
    const enabledPeriods = ind.lines.filter(l => l.enabled).map(l => l.period);
    if (enabledPeriods.length === 0) return ind.type;
    return `${ind.type} ${enabledPeriods.join(', ')}`;
  }
</script>

<div class="relative h-full w-full">
  <!-- OHLC Legend + Indicator Chips -->
  <div class="pointer-events-none absolute left-3 top-2 z-10 flex flex-col gap-1 max-w-[50%]">
    {#if displayCandle}
      <div class="flex gap-4 font-mono text-[11.5px] text-muted-foreground backdrop-blur-sm bg-background/30 rounded px-1.5 py-0.5">
        <span>O <span class="text-foreground">{displayCandle.open.toFixed(2)}</span></span>
        <span>H <span class="text-foreground">{displayCandle.high.toFixed(2)}</span></span>
        <span>L <span class="text-foreground">{displayCandle.low.toFixed(2)}</span></span>
        <span>C <span class={displayCandle.close >= displayCandle.open ? 'text-bull font-medium' : 'text-bear font-medium'}>{displayCandle.close.toFixed(2)}</span></span>
      </div>
    {/if}

    <!-- Collapse Toggle (collapsed state) -->
    {#if indicators.length > 0 && indicatorsCollapsed}
      <button
        class="pointer-events-auto flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors w-fit"
        onclick={() => indicatorsCollapsed = false}
      >
        <ChevronRight class="size-3" />
        <span>{indicators.length} indicators</span>
      </button>
    {/if}

    <!-- Indicator Chips -->
    {#if !indicatorsCollapsed}
      {#each indicators as ind}
        <div class="pointer-events-auto flex items-center gap-0.5 font-mono text-[11px] backdrop-blur-sm bg-background/50 rounded w-fit border border-border/30">
          <!-- Color dots for enabled lines -->
          <span class="flex items-center gap-1 pl-1.5 py-0.5">
            {#if ind.type === 'VOL'}
              <span class="size-2 rounded-full bg-muted-foreground"></span>
            {:else}
              {#each ind.lines.filter(l => l.enabled) as ln}
                <span class="size-2 rounded-full" style:background-color={ln.color}></span>
              {/each}
            {/if}
            <span class={cn('font-medium text-foreground/80', !ind.visible && 'line-through opacity-40')}>
              {chipLabel(ind)}
            </span>
          </span>

          <!-- Eye toggle -->
          <button
            onclick={() => toggleVisibility(ind.id, ind.visible)}
            class="p-0.5 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
            title={ind.visible ? 'Hide' : 'Show'}
          >
            {#if ind.visible}
              <Eye class="size-3" />
            {:else}
              <EyeOff class="size-3" />
            {/if}
          </button>

          <!-- Settings -->
          {#if ind.type !== 'VOL'}
            <button
              onclick={() => openSettings(ind.id)}
              class={cn('p-0.5 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors', settingsOpenId === ind.id && 'text-primary')}
              title="Settings"
            >
              <Settings class="size-3" />
            </button>
          {/if}

          <!-- Remove -->
          <button
            onclick={() => onRemoveIndicator?.(ind.id)}
            class="p-0.5 pr-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove"
          >
            <X class="size-3" />
          </button>
        </div>
      {/each}

      <!-- Compare Symbol Chips -->
      {#each compareSymbols as cs}
        <div class="pointer-events-auto flex items-center gap-0.5 font-mono text-[11px] backdrop-blur-sm bg-background/50 rounded w-fit border border-border/30">
          <span class="flex items-center gap-1 pl-1.5 py-0.5">
            <span class="size-2 rounded-full" style:background-color={cs.color}></span>
            <span class={cn('font-medium text-foreground/80', !cs.visible && 'line-through opacity-40')}>
              {cs.symbol}
            </span>
          </span>

          <button
            onclick={() => onToggleCompareVisibility?.(cs.symbol)}
            class="p-0.5 rounded hover:bg-accent/60 text-muted-foreground hover:text-foreground transition-colors"
            title={cs.visible ? 'Hide' : 'Show'}
          >
            {#if cs.visible}
              <Eye class="size-3" />
            {:else}
              <EyeOff class="size-3" />
            {/if}
          </button>

          <button
            onclick={() => onRemoveCompare?.(cs.symbol)}
            class="p-0.5 pr-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
            title="Remove"
          >
            <X class="size-3" />
          </button>
        </div>
      {/each}

      <!-- Collapse Toggle (expanded state) — at bottom -->
      {#if indicators.length > 0}
        <button
          class="pointer-events-auto flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors w-fit"
          onclick={() => indicatorsCollapsed = true}
        >
          <ChevronUp class="size-3" />
        </button>
      {/if}
    {/if}
  </div>

  <!-- Settings Popup (rendered as a floating panel) -->
  {#if settingsOpenId}
    {@const ind = indicators.find(i => i.id === settingsOpenId)}
    {#if ind}
      <!-- Backdrop -->
      <button class="pointer-events-auto absolute inset-0 z-20 cursor-default bg-transparent" onclick={closeSettings} aria-label="Close settings"></button>

      <!-- Panel -->
      <div class="pointer-events-auto absolute left-3 top-[120px] z-30 w-64 rounded-lg border border-border bg-popover shadow-2xl overflow-hidden">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-border px-4 py-2.5 bg-accent/20">
          <span class="font-mono text-xs font-semibold uppercase tracking-wider text-foreground">{ind.type} Settings</span>
          <button onclick={closeSettings} class="text-muted-foreground hover:text-foreground"><X class="size-4" /></button>
        </div>

        <!-- Lines -->
        <div class="p-3 flex flex-col gap-2.5">
          {#each ind.lines as ln, idx}
            <div class="flex items-center gap-3">
              <!-- Checkbox -->
              <button
                onclick={() => toggleLine(ind, idx)}
                class={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded border transition-colors',
                  ln.enabled ? 'border-primary bg-primary' : 'border-border hover:border-muted-foreground'
                )}
              >
                {#if ln.enabled}
                  <svg class="size-3 text-primary-foreground" viewBox="0 0 12 12" fill="none"><path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                {/if}
              </button>

              <!-- Period label -->
              <span class={cn('font-mono text-sm flex-1', ln.enabled ? 'text-foreground' : 'text-muted-foreground')}>
                {ind.type} {ln.period}
              </span>

              <!-- Color swatch button -->
              <div class="relative">
                <button
                  onclick={() => colorPickerState = colorPickerState?.lineIdx === idx ? null : { lineIdx: idx }}
                  class="size-5 rounded-full border-2 border-border hover:border-foreground transition-colors"
                  style:background-color={ln.color}
                  title="Change color"
                ></button>

                <!-- Color palette popup -->
                {#if colorPickerState?.lineIdx === idx}
                  <div class="absolute right-0 top-full mt-1 z-50 rounded-lg border border-border bg-popover p-2 shadow-xl">
                    <div class="grid grid-cols-4 gap-1.5">
                      {#each PRESET_COLORS as c}
                        <button
                          onclick={() => changeLineColor(ind, idx, c)}
                          class={cn(
                            'size-5 rounded-full border-2 transition-transform hover:scale-110',
                            c === ln.color ? 'border-foreground scale-110' : 'border-transparent'
                          )}
                          style:background-color={c}
                        ></button>
                      {/each}
                    </div>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  {/if}

  <!-- Chart Container -->
  <div bind:this={containerEl} class="absolute inset-0"></div>
</div>
