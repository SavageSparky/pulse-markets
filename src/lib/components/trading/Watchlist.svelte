<script lang="ts">
  import { Star } from '@lucide/svelte';
  import { getInstrument } from '$lib/market/instruments';
  import { formatChange, formatPrice } from '$lib/market/indicators';
  import { dayQuote, type Quote } from '$lib/market/quotes';
  import { cn } from '$lib/utils';

  interface Props {
    symbols: string[];
    activeSymbol: string;
    onSelect: (symbol: string) => void;
  }

  let { symbols, activeSymbol, onSelect }: Props = $props();

  let base = $derived.by(() => {
    const map: Record<string, Quote> = {};
    for (const s of symbols) {
      const inst = getInstrument(s);
      if (inst) map[s] = dayQuote(inst);
    }
    return map;
  });

  let quotes = $state<Record<string, Quote>>({});

  // Sync quotes when base changes
  $effect(() => {
    quotes = { ...base };
  });

  // Light ticking for live feel
  $effect(() => {
    const id = setInterval(() => {
      const next: Record<string, Quote> = {};
      for (const s of symbols) {
        const q = quotes[s] ?? base[s];
        if (!q) continue;
        const inst = getInstrument(s);
        const vol = inst?.category === 'crypto' ? 0.0015 : 0.0008;
        const drift = (Math.random() - 0.5) * 2 * vol;
        const price = q.price * (1 + drift);
        next[s] = { price, changePct: q.changePct + drift * 100 };
      }
      quotes = next;
    }, 1600);
    return () => clearInterval(id);
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
      {@const q = quotes[s] ?? base[s]}
      {#if inst && q}
        {@const up = q.changePct >= 0}
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
          </span>
        </button>
      {/if}
    {/each}
  </div>
</div>
