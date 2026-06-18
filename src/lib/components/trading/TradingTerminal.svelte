<script lang="ts">
  import { untrack, onMount } from "svelte";
  import { getInstrument } from "$lib/market/instruments";
  import { subscribeKline } from "$lib/market/binance-ws";
  import type { Candle, CandlesResponse, Timeframe } from "$lib/market/types";
  import ChartToolbar from "./ChartToolbar.svelte";
  import PriceChart from "./PriceChart.svelte";
  import SymbolHeader from "./SymbolHeader.svelte";
  import TopBar from "./TopBar.svelte";
  import Watchlist from "./Watchlist.svelte";
  import { cn } from "$lib/utils";
  import type {
    ChartType,
    CompareSymbol,
    IndicatorConfig,
    IndicatorType,
  } from "./chart-types";
  import { COMPARE_COLORS, createDefaultIndicators } from "./chart-types";

  const DEFAULT_WATCHLIST = [
    "BTCUSD",
    "ETHUSD",
    "SOLUSD",
    "NDX",
    "SPX",
    "AAPL",
    "NVDA",
    "TSLA",
    "NIFTY50",
    "NIFTYNXT50",
    "NIFTYMID150",
    "NIFTYSML250",
    "RELIANCE",
    "TCS",
    "INFY",
    "XAUUSD",
    "WTIUSD",
  ];

  const DEFAULT_INSTRUMENTS = DEFAULT_WATCHLIST.map((s) =>
    getInstrument(s),
  ).filter(Boolean) as import("$lib/market/types").Instrument[];

  let customWatchlist = $state<import("$lib/market/types").Instrument[]>([]);
  let activeInstrument = $state<import("$lib/market/types").Instrument>(
    getInstrument("BTCUSD")!,
  );
  let timeframe = $state<Timeframe>("1D");
  let chartType = $state<ChartType>("candles");
  let indicators = $state<IndicatorConfig[]>(createDefaultIndicators());
  let liveCandle = $state<Candle | null>(null);
  let mobileWatchlistOpen = $state(false);
  let desktopWatchlistOpen = $state(true);

  let candles = $state<Candle[]>([]);
  let isLoading = $state(false);
  let isPaginating = $state(false);
  let hasReachedEnd = $state(false);
  let fetchError = $state<string | null>(null);
  let isClient = $state(false);

  // Compare overlay state
  let compareSymbols = $state<CompareSymbol[]>([]);
  let compareCandles = $state<Map<string, Candle[]>>(new Map());
  const isCompareMode = $derived(compareSymbols.length > 0);

  const defaultSymbols = new Set(DEFAULT_INSTRUMENTS.map((i) => i.symbol));

  // Expose toggleWatchlistItem method so SymbolHeader can call it
  export function toggleWatchlistItem(
    inst: import("$lib/market/types").Instrument,
  ) {
    // Don't allow removing default items; skip adding if already a default
    if (defaultSymbols.has(inst.symbol)) return;

    const exists = customWatchlist.some((i) => i.symbol === inst.symbol);
    if (exists) {
      customWatchlist = customWatchlist.filter((i) => i.symbol !== inst.symbol);
    } else {
      customWatchlist = [...customWatchlist, inst];
    }
  }

  const isInWatchlist = $derived(
    defaultSymbols.has(activeInstrument.symbol) ||
      customWatchlist.some((i) => i.symbol === activeInstrument.symbol),
  );

  // Deduplicate: custom items that overlap with defaults are excluded
  let combinedWatchlist = $derived([
    ...DEFAULT_INSTRUMENTS,
    ...customWatchlist.filter((i) => !defaultSymbols.has(i.symbol)),
  ]);

  function mergeCandles(oldCandles: Candle[], newCandles: Candle[]) {
    const combined = [...newCandles, ...oldCandles];
    const unique = new Map<number, Candle>();
    for (const c of combined) {
      unique.set(c.time, c);
    }
    return Array.from(unique.values()).sort((a, b) => a.time - b.time);
  }

  let nextIndicatorId = $state(100);

  function addIndicator(type: IndicatorType) {
    if (indicators.some((i) => i.type === type)) return;
    const id = `${type.toLowerCase()}-${nextIndicatorId++}`;
    if (type === "VOL") {
      indicators = [...indicators, { id, type, visible: true, lines: [] }];
    } else {
      const defaults =
        type === "SMA"
          ? [
              { period: 50, enabled: true, color: "#e3b341" },
              { period: 100, enabled: false, color: "#4aa3df" },
              { period: 200, enabled: false, color: "#8e44ad" },
            ]
          : [
              { period: 50, enabled: true, color: "#f39c12" },
              { period: 100, enabled: false, color: "#d35400" },
              { period: 200, enabled: false, color: "#c0392b" },
            ];
      indicators = [
        ...indicators,
        { id, type, visible: true, lines: defaults },
      ];
    }
  }

  function updateIndicator(id: string, updates: Partial<IndicatorConfig>) {
    indicators = indicators.map((i) =>
      i.id === id ? { ...i, ...updates } : i,
    );
  }

  function removeIndicator(id: string) {
    indicators = indicators.filter((i) => i.id !== id);
  }

  // Compare functions
  function addCompare(inst: import("$lib/market/types").Instrument) {
    if (compareSymbols.some((c) => c.symbol === inst.symbol)) return;
    if (inst.symbol === activeInstrument.symbol) return;
    const color = COMPARE_COLORS[compareSymbols.length % COMPARE_COLORS.length];
    compareSymbols = [
      ...compareSymbols,
      {
        symbol: inst.symbol,
        yahoo: inst.yahoo,
        name: inst.name,
        color,
        visible: true,
      },
    ];
  }

  function removeCompare(symbol: string) {
    compareSymbols = compareSymbols.filter((c) => c.symbol !== symbol);
    const next = new Map(compareCandles);
    next.delete(symbol);
    compareCandles = next;
  }

  function toggleCompareVisibility(symbol: string) {
    compareSymbols = compareSymbols.map((c) =>
      c.symbol === symbol ? { ...c, visible: !c.visible } : c,
    );
  }

  onMount(() => {
    isClient = true;
    try {
      const savedPrefs = localStorage.getItem("indicator_prefs_v3");
      if (savedPrefs) {
        const parsed = JSON.parse(savedPrefs);
        if (Array.isArray(parsed) && parsed.every((i: any) => "lines" in i))
          indicators = parsed;
      }
    } catch {}

    try {
      const savedWatchlist = localStorage.getItem("custom_watchlist");
      if (savedWatchlist) customWatchlist = JSON.parse(savedWatchlist);
    } catch {}

    try {
      const savedDesktop = localStorage.getItem("desktop_watchlist_open");
      if (savedDesktop !== null)
        desktopWatchlistOpen = JSON.parse(savedDesktop);
    } catch {}
  });

  $effect(() => {
    if (isClient) {
      localStorage.setItem("indicator_prefs_v3", JSON.stringify(indicators));
      localStorage.setItem("custom_watchlist", JSON.stringify(customWatchlist));
      localStorage.setItem(
        "desktop_watchlist_open",
        JSON.stringify(desktopWatchlistOpen),
      );
    }
  });

  // Fetch historical candles whenever instrument/timeframe changes
  $effect(() => {
    const inst = activeInstrument;
    const tf = timeframe;
    let cancelled = false;

    async function load() {
      untrack(() => {
        isLoading = true;
        fetchError = null;
        hasReachedEnd = false;
        isPaginating = false;
        candles = [];
      });
      try {
        // We pass yahoo or binance ticker explicitly to backend if custom, else symbol
        const s = inst.yahoo || inst.symbol;
        const res = await fetch(
          `/api/candles?symbol=${encodeURIComponent(s)}&tf=${tf}`,
        );
        const data = await res.json();
        if (!cancelled) {
          untrack(() => {
            if (res.ok) {
              const response = data as CandlesResponse;
              candles = mergeCandles([], response.candles);
              if (response.candles.length)
                liveCandle = response.candles[response.candles.length - 1];
              fetchError = null;
            } else {
              candles = [];
              liveCandle = null;
              fetchError = data.error ?? "Failed to fetch data";
            }
          });
        }
      } catch {
        if (!cancelled)
          untrack(() => {
            fetchError = "Network error";
          });
      } finally {
        if (!cancelled)
          untrack(() => {
            isLoading = false;
          });
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  });

  // Force line or area chart when in compare mode (candles not supported)
  $effect(() => {
    if (isCompareMode && chartType !== "line" && chartType !== "area") {
      chartType = "line";
    }
  });

  // Fetch candle data for compare symbols
  $effect(() => {
    const symbols = compareSymbols;
    const tf = timeframe;
    let cancelled = false;

    async function loadCompare() {
      for (const cs of symbols) {
        if (cancelled) return;
        // Skip if we already have data for this symbol
        if (compareCandles.has(cs.symbol)) continue;
        try {
          const ticker = cs.yahoo || cs.symbol;
          const res = await fetch(
            `/api/candles?symbol=${encodeURIComponent(ticker)}&tf=${tf}`,
          );
          if (res.ok) {
            const data: CandlesResponse = await res.json();
            if (!cancelled) {
              const next = new Map(compareCandles);
              next.set(cs.symbol, data.candles);
              compareCandles = next;
            }
          }
        } catch {
          /* ignore */
        }
      }
    }

    loadCompare();
    return () => {
      cancelled = true;
    };
  });

  // Clear compare candles when timeframe changes
  $effect(() => {
    timeframe; // track
    untrack(() => {
      compareCandles = new Map();
    });
  });

  // Stream live kline updates via Binance WebSocket
  $effect(() => {
    const inst = activeInstrument;
    const tf = timeframe;
    if (!inst.binance) return;

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
    const inst = activeInstrument;
    const tf = timeframe;
    const endTime = candles[0].time;

    isPaginating = true;
    try {
      const s = inst.yahoo || inst.symbol;
      const res = await fetch(
        `/api/candles?symbol=${encodeURIComponent(s)}&tf=${tf}&endTime=${endTime}`,
      );
      if (res.ok) {
        const data = (await res.json()) as CandlesResponse;
        if (data.candles.length === 0) {
          hasReachedEnd = true;
        } else {
          // Prepend historical candles safely via mergeCandles
          const newCandles = data.candles.filter((c) => c.time < endTime);
          if (newCandles.length === 0) {
            hasReachedEnd = true;
          } else {
            // Check if symbol hasn't changed while fetching
            if (activeInstrument === inst && timeframe === tf) {
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
      if (activeInstrument === inst && timeframe === tf) {
        isPaginating = false;
      }
    }
  }

  function handleSelect(inst: import("$lib/market/types").Instrument) {
    activeInstrument = inst;
    mobileWatchlistOpen = false;
  }
</script>

<div class="flex h-dvh flex-col overflow-hidden bg-background">
  <TopBar
    onSelect={handleSelect}
    onToggleMobileWatchlist={() => (mobileWatchlistOpen = !mobileWatchlistOpen)}
    onToggleDesktopWatchlist={() =>
      (desktopWatchlistOpen = !desktopWatchlistOpen)}
    {desktopWatchlistOpen}
  />

  <div class="flex min-h-0 flex-1">
    <!-- Chart column -->
    <main class="flex min-w-0 flex-1 flex-col">
      {#if activeInstrument}
        <SymbolHeader
          instrument={activeInstrument}
          {candles}
          {liveCandle}
          isSaved={isInWatchlist}
          onToggleSave={() => toggleWatchlistItem(activeInstrument)}
        />
        <ChartToolbar
          {timeframe}
          onTimeframe={(tf) => (timeframe = tf)}
          {chartType}
          onChartType={(t) => (chartType = t)}
          onAddIndicator={addIndicator}
          onRemoveIndicator={removeIndicator}
          {indicators}
          {isCompareMode}
          {compareSymbols}
          onAddCompare={addCompare}
          onRemoveCompare={removeCompare}
        />
        <div class="relative min-h-0 flex-1">
          {#if isLoading && candles.length === 0}
            <div class="flex h-full items-center justify-center">
              <span class="font-mono text-sm text-muted-foreground"
                >Loading market data...</span
              >
            </div>
          {:else if fetchError && candles.length === 0}
            <div class="flex h-full flex-col items-center justify-center gap-2">
              <span class="font-mono text-sm text-muted-foreground"
                >{fetchError}</span
              >
              <span class="text-xs text-muted-foreground/60"
                >Try selecting a different symbol or timeframe</span
              >
            </div>
          {:else}
            <PriceChart
              {candles}
              {chartType}
              {indicators}
              viewKey={`${activeInstrument.symbol}-${timeframe}`}
              {liveCandle}
              onLoadMore={loadMoreHistory}
              onUpdateIndicator={updateIndicator}
              onRemoveIndicator={removeIndicator}
              {compareSymbols}
              {compareCandles}
              onRemoveCompare={removeCompare}
              onToggleCompareVisibility={toggleCompareVisibility}
              primarySymbol={activeInstrument.symbol}
            />
          {/if}
        </div>
      {/if}
    </main>

    <!-- Watchlist (desktop) -->
    {#if desktopWatchlistOpen}
      <aside
        class="hidden w-72 shrink-0 border-l border-border bg-sidebar lg:block"
      >
        <Watchlist
          instruments={combinedWatchlist}
          activeSymbol={activeInstrument.symbol}
          onSelect={handleSelect}
        />
      </aside>
    {/if}
  </div>

  <!-- Watchlist (mobile drawer) -->
  {#if mobileWatchlistOpen}
    <div class="fixed inset-0 z-50 lg:hidden">
      <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
      <button
        class="absolute inset-0 w-full cursor-default border-none bg-background/70 backdrop-blur-sm"
        aria-label="Close watchlist"
        onclick={() => (mobileWatchlistOpen = false)}
      ></button>
      <aside
        class={cn(
          "absolute right-0 top-0 h-full w-72 border-l border-border bg-sidebar shadow-2xl",
        )}
      >
        <Watchlist
          instruments={combinedWatchlist}
          activeSymbol={activeInstrument.symbol}
          onSelect={handleSelect}
        />
      </aside>
    </div>
  {/if}
</div>
