<script lang="ts">
  import { Star } from '@lucide/svelte';
  import { getInstrument } from '$lib/market/instruments';
  import { formatChange, formatPrice } from '$lib/market/indicators';
  import { subscribeMiniTickers } from '$lib/market/binance-ws';
  import { cn } from '$lib/utils';

  interface Quote {
    price: number;
    changePct: number;
  }

  interface Props {
    symbols: string[];
    activeSymbol: string;
    onSelect: (symbol: string) => void;
  }

  let { symbols, activeSymbol, onSelect }: Props = $props();

  let quotes = $state<Record<string, Quote>>({});

  // Build a reverse map: Binance pair -> our symbol
  const pairToSymbol = $derived.by(() => {
    const map: Record<string, string> = {};
    for (const s of symbols) {
      const inst = getInstrument(s);
      if (inst?.binance) map[inst.binance] = s;
    }
    return map;
  });

  // Subscribe to live mini-ticker WebSocket streams
  $effect(() => {
    const pairs = Object.keys(pairToSymbol);
    if (pairs.length === 0) return;

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
</script>

<div class="flex h-full flex-col">
  <div class="flex items-center justify-between border-b border-border px-4 py-3">
    <h2 class="font-mono text-xs font-semibold uppercase tracking-widest text-muted-foreground">
      Watchlist
    </h2>
    <span class="font-mono text-[10px] text-muted-foreground">{symbols.length} symbols</span>
  </div>
  <div class="flex-1 overflow-y-auto">
    {#each symbols as s}
      {@const inst = getInstrument(s)}
      {@const q = quotes[s]}
      {#if inst}
        {@const active = s === activeSymbol}
        <button
          onclick={() => onSelect(s)}
          class={cn(
            'flex w-full items-center justify-between border-l-2 px-4 py-2.5 text-left transition-colors hover:bg-accent/60',
            active ? 'border-l-primary bg-accent/40' : 'border-l-transparent'
          )}
        >
          <span class="min-w-0">
            <span class="flex items-center gap-1.5">
              {#if active}
                <Star class="size-3 fill-primary text-primary" />
              {/if}
              <span class="font-mono text-sm font-medium text-foreground">{inst.symbol}</span>
            </span>
            <span class="block truncate text-[11px] text-muted-foreground">{inst.name}</span>
          </span>
          <span class="text-right">
            {#if q}
              {@const up = q.changePct >= 0}
              <span class="block font-mono text-sm tabular-nums text-foreground">
                {formatPrice(q.price, inst.currency)}
              </span>
              <span
                class={cn(
                  'block font-mono text-[11px] tabular-nums',
                  up ? 'text-bull' : 'text-bear'
                )}
              >
                {formatChange(q.changePct)}
              </span>
            {:else}
              <span class="block font-mono text-[11px] text-muted-foreground/50">—</span>
            {/if}
          </span>
        </button>
      {/if}
    {/each}
  </div>
</div>
