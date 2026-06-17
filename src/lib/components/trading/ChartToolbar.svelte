<script lang="ts">
  import { Activity, BarChart3, CandlestickChart, GitCompareArrows, LineChart, Plus, Radio, Search, Trash2, X } from '@lucide/svelte';
  import type { ChartType, CompareSymbol, IndicatorConfig, IndicatorType } from './chart-types';
  import type { Instrument } from '$lib/market/types';
  import { TIMEFRAMES, type Timeframe } from '$lib/market/types';
  import { cn } from '$lib/utils';

  interface Props {
    timeframe: Timeframe;
    onTimeframe: (tf: Timeframe) => void;
    chartType: ChartType;
    onChartType: (t: ChartType) => void;
    onAddIndicator: (type: IndicatorType) => void;
    onRemoveIndicator?: (id: string) => void;
    indicators: IndicatorConfig[];
    isCompareMode: boolean;
    compareSymbols: CompareSymbol[];
    onAddCompare: (inst: Instrument) => void;
    onRemoveCompare: (symbol: string) => void;
  }

  let {
    timeframe, onTimeframe, chartType, onChartType,
    onAddIndicator, onRemoveIndicator, indicators,
    isCompareMode, compareSymbols, onAddCompare, onRemoveCompare
  }: Props = $props();

  let indicatorModalOpen = $state(false);
  let compareModalOpen = $state(false);
  let compareQuery = $state('');
  let compareResults = $state<Instrument[]>([]);
  let searchLoading = $state(false);
  let searchTimeout: ReturnType<typeof setTimeout> | null = null;

  const CHART_TYPES: { type: ChartType; icon: typeof CandlestickChart; label: string }[] = [
    { type: 'candles', icon: CandlestickChart, label: 'Candles' },
    { type: 'area', icon: Activity, label: 'Area' },
    { type: 'line', icon: LineChart, label: 'Line' },
  ];

  const INDICATOR_TYPES: { type: IndicatorType; label: string; desc: string }[] = [
    { type: 'SMA', label: 'SMA', desc: 'Simple Moving Average' },
    { type: 'EMA', label: 'EMA', desc: 'Exponential Moving Average' },
    { type: 'VOL', label: 'Volume', desc: 'Volume Histogram' },
  ];

  function isIndicatorActive(type: IndicatorType) {
    return indicators.some(i => i.type === type);
  }

  function getActiveId(type: IndicatorType) {
    return indicators.find(i => i.type === type)?.id;
  }

  function isAlreadyCompared(symbol: string) {
    return compareSymbols.some(c => c.symbol === symbol);
  }

  function handleCompareSearch(query: string) {
    compareQuery = query;
    if (searchTimeout) clearTimeout(searchTimeout);
    if (query.trim().length < 1) {
      compareResults = [];
      return;
    }
    searchLoading = true;
    searchTimeout = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
        if (res.ok) {
          const data = await res.json();
          compareResults = data.results || [];
        }
      } catch { /* ignore */ }
      searchLoading = false;
    }, 300);
  }

  function handleSelectCompare(inst: Instrument) {
    onAddCompare(inst);
    compareQuery = '';
    compareResults = [];
  }

  function openCompareModal() {
    compareModalOpen = true;
    compareQuery = '';
    compareResults = [];
  }
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
        onclick={() => !isCompareMode && onChartType(type)}
        title={isCompareMode && type !== 'line' ? 'Line only in compare mode' : label}
        aria-label={label}
        class={cn(
          'rounded p-1.5 transition-colors',
          chartType === type ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
          isCompareMode && type !== 'line' && 'opacity-30 cursor-not-allowed'
        )}
      >
        <Icon class="size-4" />
      </button>
    {/each}
  </div>

  <div class="h-5 w-px bg-border"></div>

  <!-- Indicators -->
  <button
    onclick={() => (indicatorModalOpen = true)}
    class="flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-secondary"
  >
    <Plus class="size-3.5 text-muted-foreground" />
    Indicators
  </button>

  <!-- Compare -->
  <button
    onclick={openCompareModal}
    class={cn(
      'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
      isCompareMode
        ? 'bg-primary/15 text-primary border border-primary/30'
        : 'bg-secondary/60 text-foreground hover:bg-secondary'
    )}
  >
    <GitCompareArrows class="size-3.5" />
    Compare{isCompareMode ? ` (${compareSymbols.length})` : ''}
  </button>

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

<!-- Indicator Modal -->
{#if indicatorModalOpen}
  <div class="fixed inset-0 z-[100] flex items-center justify-center">
    <button
      class="absolute inset-0 border-none cursor-default bg-transparent"
      onclick={() => (indicatorModalOpen = false)}
      aria-label="Close"
    ></button>

    <div class="relative z-10 w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl">
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 class="text-sm font-semibold tracking-wide uppercase text-foreground">Indicators</h3>
        <button
          onclick={() => (indicatorModalOpen = false)}
          class="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X class="size-4" />
        </button>
      </div>

      <div class="flex flex-col gap-1 p-3">
        {#each INDICATOR_TYPES as { type, label, desc }}
          {@const active = isIndicatorActive(type)}
          <div class={cn(
            'flex items-center justify-between rounded-lg px-4 py-3.5 transition-colors',
            active ? 'bg-primary/8' : 'hover:bg-accent/60'
          )}>
            <div class="flex flex-col">
              <span class="text-sm font-medium text-foreground">{label}</span>
              <span class="text-[11px] text-muted-foreground">{desc}</span>
            </div>
            {#if active}
              <button
                onclick={() => { const id = getActiveId(type); if (id) onRemoveIndicator?.(id); }}
                class="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
              >
                <Trash2 class="size-3" />
                Remove
              </button>
            {:else}
              <button
                onclick={() => onAddIndicator(type)}
                class="flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                <Plus class="size-3" />
                Add
              </button>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{/if}

<!-- Compare Modal -->
{#if compareModalOpen}
  <div class="fixed inset-0 z-[100] flex items-center justify-center">
    <button
      class="absolute inset-0 border-none cursor-default bg-transparent"
      onclick={() => (compareModalOpen = false)}
      aria-label="Close"
    ></button>

    <div class="relative z-10 w-full max-w-md rounded-xl border border-border bg-card shadow-2xl">
      <!-- Header -->
      <div class="flex items-center justify-between border-b border-border px-5 py-4">
        <h3 class="text-sm font-semibold tracking-wide uppercase text-foreground">Compare Symbols</h3>
        <button
          onclick={() => (compareModalOpen = false)}
          class="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X class="size-4" />
        </button>
      </div>

      <!-- Search -->
      <div class="px-4 pt-3 pb-2">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search symbol to compare..."
            value={compareQuery}
            oninput={(e) => handleCompareSearch((e.target as HTMLInputElement).value)}
            class="w-full rounded-lg border border-border bg-secondary/40 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      </div>

      <!-- Search Results -->
      {#if compareResults.length > 0}
        <div class="max-h-48 overflow-y-auto px-3 pb-2">
          {#each compareResults as result}
            {@const already = isAlreadyCompared(result.symbol)}
            <button
              onclick={() => !already && handleSelectCompare(result)}
              disabled={already}
              class={cn(
                'flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors',
                already ? 'opacity-40 cursor-not-allowed' : 'hover:bg-accent/60'
              )}
            >
              <div class="flex flex-col">
                <span class="text-sm font-medium text-foreground">{result.symbol}</span>
                <span class="text-[11px] text-muted-foreground">{result.name}</span>
              </div>
              {#if already}
                <span class="text-[10px] text-muted-foreground font-mono">ADDED</span>
              {:else}
                <Plus class="size-4 text-primary" />
              {/if}
            </button>
          {/each}
        </div>
      {:else if compareQuery.length > 0 && !searchLoading}
        <div class="px-4 pb-3">
          <span class="text-xs text-muted-foreground">No results</span>
        </div>
      {/if}

      <!-- Active Comparisons -->
      {#if compareSymbols.length > 0}
        <div class="border-t border-border px-3 py-3">
          <span class="px-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Active Comparisons</span>
          <div class="mt-2 flex flex-col gap-1">
            {#each compareSymbols as cs}
              <div class="flex items-center justify-between rounded-lg px-3 py-2.5 bg-primary/5">
                <div class="flex items-center gap-2.5">
                  <span class="size-3 rounded-full" style:background-color={cs.color}></span>
                  <div class="flex flex-col">
                    <span class="text-sm font-medium text-foreground">{cs.symbol}</span>
                    <span class="text-[11px] text-muted-foreground">{cs.name}</span>
                  </div>
                </div>
                <button
                  onclick={() => onRemoveCompare(cs.symbol)}
                  class="flex items-center gap-1.5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                >
                  <Trash2 class="size-3" />
                  Remove
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}
