<script lang="ts">
  import { Activity, BarChart3, CandlestickChart, ChevronDown, LineChart, Radio } from '@lucide/svelte';
  import type { ChartType, IndicatorState } from './chart-types';
  import { TIMEFRAMES, type Timeframe } from '$lib/market/types';
  import { cn } from '$lib/utils';

  interface Props {
    timeframe: Timeframe;
    onTimeframe: (tf: Timeframe) => void;
    chartType: ChartType;
    onChartType: (t: ChartType) => void;
    indicators: IndicatorState;
    onIndicators: (i: IndicatorState) => void;
  }

  let { timeframe, onTimeframe, chartType, onChartType, indicators, onIndicators }: Props = $props();

  let indicatorsOpen = $state(false);
  let activeCount = $derived(Object.values(indicators).filter(Boolean).length);

  const CHART_TYPES: { type: ChartType; icon: typeof CandlestickChart; label: string }[] = [
    { type: 'candles', icon: CandlestickChart, label: 'Candles' },
    { type: 'area', icon: Activity, label: 'Area' },
    { type: 'line', icon: LineChart, label: 'Line' },
  ];

  const INDICATOR_OPTIONS: { key: keyof IndicatorState; label: string; color: string }[] = [
    { key: 'sma50', label: 'SMA 50', color: '#e3b341' },
    { key: 'sma100', label: 'SMA 100', color: '#4aa3df' },
    { key: 'sma200', label: 'SMA 200', color: '#8e44ad' },
    { key: 'ema50', label: 'EMA 50', color: '#f39c12' },
    { key: 'ema100', label: 'EMA 100', color: '#d35400' },
    { key: 'ema200', label: 'EMA 200', color: '#c0392b' },
    { key: 'volume', label: 'Volume', color: '#8b93a7' },
  ];
</script>

<div class="flex flex-wrap items-center gap-2 border-b border-border bg-card/40 px-3 py-2">
  <!-- Timeframes -->
  <div class="flex items-center gap-0.5 rounded-md bg-secondary/60 p-0.5">
    {#each TIMEFRAMES as tf}
      <button
        onclick={() => onTimeframe(tf)}
        class={cn(
          'rounded px-2.5 py-1 font-mono text-xs font-medium transition-colors',
          timeframe === tf ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        {tf}
      </button>
    {/each}
  </div>

  <div class="h-5 w-px bg-border"></div>

  <!-- Chart type -->
  <div class="flex items-center gap-0.5 rounded-md bg-secondary/60 p-0.5">
    {#each CHART_TYPES as { type, icon: Icon, label }}
      <button
        onclick={() => onChartType(type)}
        title={label}
        aria-label={label}
        class={cn(
          'rounded p-1.5 transition-colors',
          chartType === type ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <Icon class="size-4" />
      </button>
    {/each}
  </div>

  <div class="h-5 w-px bg-border"></div>

  <!-- Indicators -->
  <div class="relative">
    <button
      onclick={() => (indicatorsOpen = !indicatorsOpen)}
      class="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
    >
      <BarChart3 class="size-4 text-muted-foreground" />
      Indicators
      {#if activeCount > 0}
        <span class="rounded bg-primary px-1.5 font-mono text-[10px] text-primary-foreground">{activeCount}</span>
      {/if}
      <ChevronDown class="size-3.5 text-muted-foreground" />
    </button>
    {#if indicatorsOpen}
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <button class="fixed inset-0 z-40 w-full cursor-default border-none bg-transparent" aria-label="Close indicators menu" onclick={() => (indicatorsOpen = false)}></button>
      <div class="absolute left-0 z-50 mt-2 w-44 rounded-lg border border-border bg-popover p-1 shadow-2xl">
        {#each INDICATOR_OPTIONS as { key, label, color }}
          <button
            onclick={() => onIndicators({ ...indicators, [key]: !indicators[key] })}
            class="flex w-full items-center justify-between rounded-md px-2.5 py-2 text-left text-sm hover:bg-accent"
          >
            <span class="flex items-center gap-2">
              <span class="size-2.5 rounded-full" style:background-color={color}></span>
              <span class="text-foreground">{label}</span>
            </span>
            <span
              class={cn(
                'flex size-4 items-center justify-center rounded border',
                indicators[key] ? 'border-primary bg-primary' : 'border-border'
              )}
            >
              {#if indicators[key]}
                <span class="size-1.5 rounded-sm bg-primary-foreground"></span>
              {/if}
            </span>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <div class="ml-auto flex items-center gap-2">
    <!-- Live indicator -->
    <span
      class="hidden items-center gap-1.5 rounded-md bg-bull/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-bull sm:flex"
    >
      <Radio class="size-3" />
      Live feed
    </span>
  </div>
</div>
