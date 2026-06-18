<script lang="ts">
  import { Star } from "@lucide/svelte";
  import { getInstrument } from "$lib/market/instruments";
  import { formatChange, formatPrice } from "$lib/market/indicators";
  import { subscribeMiniTickers } from "$lib/market/binance-ws";
  import { subscribeYahooTickers } from "$lib/market/yahoo-ws";
  import { cn } from "$lib/utils";

  import type { Instrument } from "$lib/market/types";

  interface Quote {
    price: number;
    changePct: number;
  }

  interface Props {
    instruments: Instrument[];
    activeSymbol: string;
    onSelect: (instrument: Instrument) => void;
  }

  let { instruments, activeSymbol, onSelect }: Props = $props();

  let quotes = $state<Record<string, Quote>>({});

  // Build a reverse map: Binance pair -> our symbol
  const pairToSymbol = $derived.by(() => {
    const map: Record<string, string> = {};
    for (const inst of instruments) {
      if (inst.binance) map[inst.binance] = inst.symbol;
    }
    return map;
  });

  // Build a reverse map: Yahoo symbol -> our symbol
  const yahooToSymbol = $derived.by(() => {
    const map: Record<string, string> = {};
    for (const inst of instruments) {
      if (inst.yahoo && !inst.binance) {
        map[inst.yahoo] = inst.symbol;
      }
    }
    return map;
  });

  // Derive string representations of our subscription targets to prevent unnecessary effect re-runs
  // if the map evaluates to a new object with the exact same contents.
  const binancePairsStr = $derived(Object.keys(pairToSymbol).sort().join(','));
  const yahooSymbolsStr = $derived(Object.keys(yahooToSymbol).sort().join(','));

  // Subscribe to live mini-ticker WebSocket streams (crypto via Binance)
  $effect(() => {
    if (!binancePairsStr) return;
    const pairs = binancePairsStr.split(',');
    if (pairs.length === 0 || pairs[0] === '') return;

    const unsub = subscribeMiniTickers(pairs, (tickers) => {
      const next = { ...quotes };
      for (const t of tickers) {
        const sym = pairToSymbol[t.symbol];
        if (sym) {
          next[sym] = { price: t.price, changePct: t.changePct };
        }
      }
      quotes = next;
    });

    return unsub;
  });

  // Yahoo Finance: initial REST fetch + real-time WebSocket overlay
  $effect(() => {
    if (!yahooSymbolsStr) return;
    const yahooSymbols = yahooSymbolsStr.split(',');
    if (yahooSymbols.length === 0 || yahooSymbols[0] === '') return;
    const mapping = yahooToSymbol;

    let cancelled = false;

    // 1. Initial REST fetch to populate prices immediately (works even when market is closed)
    async function fetchInitialQuotes() {
      try {
        const res = await fetch(
          `/api/quotes?symbols=${yahooSymbols.join(",")}`,
        );
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (cancelled) return;

        const next = { ...quotes };
        for (const q of data.quotes ?? []) {
          // q.symbol is the Yahoo ticker, we need to map it back to our symbol
          const sym = mapping[q.symbol];
          if (sym && !next[sym]) {
            next[sym] = { price: q.price, changePct: q.changePct };
          }
        }
        quotes = next;
      } catch {
        // Ignore initial fetch errors
      }
    }

    fetchInitialQuotes();

    // 2. Yahoo WebSocket for real-time updates (overlays on top of initial fetch)
    const unsub = subscribeYahooTickers(yahooSymbols, (tick) => {
      const sym = mapping[tick.id];
      if (!sym) return;

      const next = { ...quotes };
      next[sym] = {
        price: tick.price,
        changePct: tick.changePercent,
      };
      quotes = next;
    });

    return () => {
      cancelled = true;
      unsub();
    };
  });
</script>

<div class="flex h-full flex-col">
  <!-- Watchlist Header -->
  <div
    class="flex items-center justify-between border-b border-border px-4 py-3"
  >
    <h2
      class="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground"
    >
      Watchlist
    </h2>
    <span class="font-mono text-[10px] text-muted-foreground"
      >{instruments.length} symbols</span
    >
  </div>
  <div class="flex-1 overflow-y-auto">
    {#each instruments as inst}
      {@const s = inst.symbol}
      {@const q = quotes[s]}
      {@const active = s === activeSymbol}
      <button
        onclick={() => onSelect(inst)}
        class={cn(
          "flex w-full items-center justify-between border-l-2 px-3 py-1.5 text-left transition-colors hover:bg-accent/60",
          active ? "border-l-primary bg-accent/40" : "border-l-transparent",
        )}
      >
        <span class="min-w-0">
          <span class="flex items-center gap-1.5">
            {#if active}
              <Star class="size-3 fill-primary text-primary" />
            {/if}
            <span class="font-mono text-sm font-medium text-foreground"
              >{inst.symbol}</span
            >
          </span>
          <span class="block truncate text-[11px] text-muted-foreground"
            >{inst.name}</span
          >
        </span>
        <span class="text-right">
          {#if q}
            {@const up = q.changePct >= 0}
            <span class="block font-mono text-sm tabular-nums text-foreground">
              {formatPrice(q.price, inst.currency)}
            </span>
            <span
              class={cn(
                "block font-mono text-[11px] tabular-nums",
                up ? "text-bull" : "text-bear",
              )}
            >
              {formatChange(q.changePct)}
            </span>
          {:else}
            <span class="block font-mono text-[11px] text-muted-foreground/50"
              >—</span
            >
          {/if}
        </span>
      </button>
    {/each}
  </div>
</div>
