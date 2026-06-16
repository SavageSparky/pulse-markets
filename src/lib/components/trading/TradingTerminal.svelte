<script lang="ts">
  import { untrack } from 'svelte';
  import { getInstrument } from '$lib/market/instruments';
  import { tickCandle } from '$lib/market/simulator';
  import type { Candle, CandlesResponse, DataMode, Timeframe } from '$lib/market/types';
  import ChartToolbar from './ChartToolbar.svelte';
  import PriceChart from './PriceChart.svelte';
  import SymbolHeader from './SymbolHeader.svelte';
  import TopBar from './TopBar.svelte';
  import Watchlist from './Watchlist.svelte';
  import { cn } from '$lib/utils';
  import type { ChartType, IndicatorState } from './chart-types';

  const DEFAULT_WATCHLIST = [
    'BTCUSD', 'ETHUSD', 'SOLUSD',
    'AAPL', 'NVDA', 'TSLA',
    'RELIANCE', 'TCS', 'INFY',
    'XAUUSD', 'WTIUSD', 'ADANIENT',
  ];

  let symbol = $state('BTCUSD');
  let timeframe = $state<Timeframe>('1H');
  let chartType = $state<ChartType>('candles');
  let dataMode = $state<DataMode>('live');
  let indicators = $state<IndicatorState>({
    sma20: true, sma50: false, ema20: false, volume: true,
  });
  let liveCandle = $state<Candle | null>(null);
  let watchlistOpen = $state(false);

  let candles = $state<Candle[]>([]);
  let source = $state<DataMode>('live');
  let isLoading = $state(false);

  const instrument = $derived(getInstrument(symbol));

  // Fetch candles whenever symbol/timeframe/dataMode changes
  $effect(() => {
    // Track only these three — the rest is untracked
    const s = symbol;
    const tf = timeframe;
    const mode = dataMode;
    let cancelled = false;

    async function load() {
      untrack(() => { isLoading = true; });
      try {
        const res = await fetch(`/api/candles?symbol=${s}&tf=${tf}&mode=${mode}`);
        const data: CandlesResponse = await res.json();
        if (!cancelled) {
          untrack(() => {
            candles = data.candles;
            source = data.source;
            // Seed live candle directly here
            if (data.candles.length) liveCandle = data.candles[data.candles.length - 1];
          });
        }
      } catch {
        // silently fail
      } finally {
        if (!cancelled) untrack(() => { isLoading = false; });
      }
    }

    load();

    // Poll for live data
    const interval = mode === 'live' ? setInterval(load, 15000) : undefined;

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  });

  // Animate the most recent candle for a live feel
  $effect(() => {
    const inst = instrument;
    if (!inst) return;
    const id = setInterval(() => {
      // Read + write liveCandle inside untrack to avoid re-triggering this effect
      untrack(() => {
        if (liveCandle) liveCandle = tickCandle(liveCandle, inst);
      });
    }, 1200);
    return () => clearInterval(id);
  });

  function handleSelect(s: string) {
    symbol = s;
    watchlistOpen = false;
  }
</script>

<div class="flex h-dvh flex-col overflow-hidden bg-background">
  <TopBar onSelect={handleSelect} onToggleWatchlist={() => (watchlistOpen = !watchlistOpen)} />

  <div class="flex min-h-0 flex-1">
    <!-- Chart column -->
    <main class="flex min-w-0 flex-1 flex-col">
      {#if instrument}
        <SymbolHeader {instrument} {candles} {liveCandle} />
        <ChartToolbar
          {timeframe}
          onTimeframe={(tf) => (timeframe = tf)}
          {chartType}
          onChartType={(t) => (chartType = t)}
          {indicators}
          onIndicators={(i) => (indicators = i)}
          {dataMode}
          onDataMode={(m) => (dataMode = m)}
          {source}
        />
        <div class="relative min-h-0 flex-1">
          {#if isLoading && candles.length === 0}
            <div class="flex h-full items-center justify-center">
              <span class="font-mono text-sm text-muted-foreground">Loading market data...</span>
            </div>
          {:else}
            <PriceChart
              {candles}
              {chartType}
              {indicators}
              viewKey={`${symbol}-${timeframe}`}
              {liveCandle}
            />
          {/if}
        </div>
      {/if}
    </main>

    <!-- Watchlist (desktop) -->
    <aside class="hidden w-72 shrink-0 border-l border-border bg-sidebar lg:block">
      <Watchlist symbols={DEFAULT_WATCHLIST} activeSymbol={symbol} onSelect={handleSelect} />
    </aside>
  </div>

  <!-- Watchlist (mobile drawer) -->
  {#if watchlistOpen}
    <div class="fixed inset-0 z-50 lg:hidden">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <div
        class="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onclick={() => (watchlistOpen = false)}
      ></div>
      <aside
        class={cn(
          'absolute right-0 top-0 h-full w-72 border-l border-border bg-sidebar shadow-2xl'
        )}
      >
        <Watchlist symbols={DEFAULT_WATCHLIST} activeSymbol={symbol} onSelect={handleSelect} />
      </aside>
    </div>
  {/if}
</div>
