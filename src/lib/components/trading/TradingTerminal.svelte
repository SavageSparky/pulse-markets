<script lang="ts">
  import { untrack, onMount } from 'svelte';
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
    'NDX', 'SPX', 'AAPL', 'NVDA', 'TSLA',
    'NIFTY50', 'NIFTYNXT50', 'NIFTYMID150', 'NIFTYSML250',
    'RELIANCE', 'TCS', 'INFY',
    'XAUUSD', 'WTIUSD'
  ];

  let symbol = $state('BTCUSD');
  let timeframe = $state<Timeframe>('1D');
  let chartType = $state<ChartType>('candles');
  let indicators = $state<IndicatorState>({
    sma50: true, sma100: false, sma200: false,
    ema50: false, ema100: false, ema200: false,
    volume: true,
  });
  let liveCandle = $state<Candle | null>(null);
  let watchlistOpen = $state(false);

  let candles = $state<Candle[]>([]);
  let isLoading = $state(false);
  let isPaginating = $state(false);
  let hasReachedEnd = $state(false);
  let fetchError = $state<string | null>(null);
  let isClient = $state(false);

  const instrument = $derived(getInstrument(symbol));

  function mergeCandles(oldCandles: Candle[], newCandles: Candle[]) {
    const combined = [...newCandles, ...oldCandles];
    const unique = new Map<number, Candle>();
    for (const c of combined) {
      unique.set(c.time, c);
    }
    return Array.from(unique.values()).sort((a, b) => a.time - b.time);
  }

  onMount(() => {
    isClient = true;
    const saved = localStorage.getItem('indicator_prefs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge so we don't break if new keys are added
        indicators = { ...indicators, ...parsed };
      } catch {}
    }
  });

  $effect(() => {
    if (isClient) {
      localStorage.setItem('indicator_prefs', JSON.stringify(indicators));
    }
  });

  // Fetch historical candles whenever symbol/timeframe changes
  $effect(() => {
    const s = symbol;
    const tf = timeframe;
    let cancelled = false;

    async function load() {
      untrack(() => { isLoading = true; fetchError = null; hasReachedEnd = false; isPaginating = false; });
      try {
        const res = await fetch(`/api/candles?symbol=${s}&tf=${tf}`);
        const data = await res.json();
        if (!cancelled) {
          untrack(() => {
            if (res.ok) {
              const response = data as CandlesResponse;
              candles = mergeCandles([], response.candles);
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
          candles = mergeCandles(candles, [updated]);
        }
      });
    });

    return unsub;
  });

  async function loadMoreHistory() {
    if (isPaginating || hasReachedEnd || candles.length === 0) return;
    
    // Capture current values in case they change during fetch
    const s = symbol;
    const tf = timeframe;
    const endTime = candles[0].time;

    isPaginating = true;
    try {
      const res = await fetch(`/api/candles?symbol=${s}&tf=${tf}&endTime=${endTime}`);
      if (res.ok) {
        const data = await res.json() as CandlesResponse;
        if (data.candles.length === 0) {
          hasReachedEnd = true;
        } else {
          // Prepend historical candles safely via mergeCandles
          const newCandles = data.candles.filter(c => c.time < endTime);
          if (newCandles.length === 0) {
            hasReachedEnd = true;
          } else {
            // Check if symbol hasn't changed while fetching
            if (symbol === s && timeframe === tf) {
              candles = mergeCandles(candles, newCandles);
            }
          }
        }
      } else {
        hasReachedEnd = true;
      }
    } catch {
      // Ignore network errors for background pagination
    } finally {
      if (symbol === s && timeframe === tf) {
        isPaginating = false;
      }
    }
  }

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
              <span class="text-xs text-muted-foreground/60">Try selecting a different symbol or timeframe</span>
            </div>
          {:else}
            <PriceChart
              {candles}
              {chartType}
              {indicators}
              viewKey={`${symbol}-${timeframe}`}
              {liveCandle}
              onLoadMore={loadMoreHistory}
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
      <button
        class="absolute inset-0 w-full cursor-default border-none bg-background/70 backdrop-blur-sm"
        aria-label="Close watchlist"
        onclick={() => (watchlistOpen = false)}
      ></button>
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
