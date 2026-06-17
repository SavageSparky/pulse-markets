<script lang="ts">
  import { untrack } from 'svelte';
  import { getInstrument } from '$lib/market/instruments';
  import { subscribeKline } from '$lib/market/binance-ws';
  import type { Candle, CandlesResponse, Timeframe } from '$lib/market/types';
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
  let indicators = $state<IndicatorState>({
    sma20: true, sma50: false, ema20: false, volume: true,
  });
  let liveCandle = $state<Candle | null>(null);
  let watchlistOpen = $state(false);

  let candles = $state<Candle[]>([]);
  let isLoading = $state(false);
  let fetchError = $state<string | null>(null);

  const instrument = $derived(getInstrument(symbol));

  // Fetch historical candles whenever symbol/timeframe changes
  $effect(() => {
    const s = symbol;
    const tf = timeframe;
    let cancelled = false;

    async function load() {
      untrack(() => { isLoading = true; fetchError = null; });
      try {
        const res = await fetch(`/api/candles?symbol=${s}&tf=${tf}`);
        const data = await res.json();
        if (!cancelled) {
          untrack(() => {
            if (res.ok) {
              const response = data as CandlesResponse;
              candles = response.candles;
              if (response.candles.length) liveCandle = response.candles[response.candles.length - 1];
              fetchError = null;
            } else {
              candles = [];
              liveCandle = null;
              fetchError = data.error ?? 'Failed to fetch data';
            }
          });
        }
      } catch {
        if (!cancelled) untrack(() => { fetchError = 'Network error'; });
      } finally {
        if (!cancelled) untrack(() => { isLoading = false; });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  });

  // Stream live kline updates via Binance WebSocket
  $effect(() => {
    const inst = instrument;
    const tf = timeframe;
    if (!inst?.binance) return;

    const unsub = subscribeKline(inst.binance, tf, (k) => {
      untrack(() => {
        const updated: Candle = {
          time: k.time,
          open: k.open,
          high: k.high,
          low: k.low,
          close: k.close,
          volume: k.volume,
        };

        liveCandle = updated;

        // If the kline is closed, append it to the candles array
        if (k.closed) {
          candles = [...candles, updated];
        }
      });
    });

    return unsub;
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
        />
        <div class="relative min-h-0 flex-1">
          {#if isLoading && candles.length === 0}
            <div class="flex h-full items-center justify-center">
              <span class="font-mono text-sm text-muted-foreground">Loading market data...</span>
            </div>
          {:else if fetchError && candles.length === 0}
            <div class="flex h-full flex-col items-center justify-center gap-2">
              <span class="font-mono text-sm text-muted-foreground">{fetchError}</span>
              <span class="text-xs text-muted-foreground/60">Live data is only available for crypto instruments</span>
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
