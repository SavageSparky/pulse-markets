<script lang="ts">
  import { ArrowDownRight, ArrowUpRight, Star } from '@lucide/svelte';
  import { formatChange, formatCompact, formatPrice } from '$lib/market/indicators';
  import type { Candle, Instrument } from '$lib/market/types';
  import { cn } from '$lib/utils';

  interface Props {
    instrument: Instrument;
    candles: Candle[];
    liveCandle: Candle | null;
    isSaved?: boolean;
    onToggleSave?: () => void;
  }

  let { instrument, candles, liveCandle, isSaved = false, onToggleSave }: Props = $props();

  let cur = $derived(instrument.currency);
  let last = $derived(liveCandle ?? candles[candles.length - 1]);
  let prev = $derived(candles[candles.length - 2] ?? last);
  let price = $derived(last?.close ?? 0);
  let changeAbs = $derived(prev ? price - prev.close : 0);
  let changePct = $derived(prev ? (changeAbs / prev.close) * 100 : 0);
  let up = $derived(changeAbs >= 0);
  let high = $derived(candles.length ? Math.max(...candles.map((c) => c.high), last?.high ?? 0) : 0);
  let low = $derived(candles.length ? Math.min(...candles.map((c) => c.low), last?.low ?? Infinity) : 0);
  let totalVol = $derived(candles.reduce((a, c) => a + c.volume, 0));
</script>

{#if candles.length === 0}
  <div class="h-[88px] border-b border-border"></div>
{:else}
  <div class="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-border px-4 py-3">
    <div class="flex items-center gap-3">
      <div>
        <div class="flex items-center gap-2">
          {#if onToggleSave}
            <button onclick={onToggleSave} class="flex items-center justify-center transition-transform hover:scale-110 active:scale-95 outline-none">
              <Star class={cn("size-5", isSaved ? "fill-primary text-primary" : "text-muted-foreground hover:text-foreground")} />
            </button>
          {/if}
          <h1 class="font-mono text-lg font-semibold text-foreground">{instrument.symbol}</h1>
          <span class="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            {instrument.exchange}
          </span>
        </div>
        <p class="text-xs text-muted-foreground pl-7">{instrument.name}</p>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <span class="font-mono text-2xl font-semibold tabular-nums text-foreground">
        {formatPrice(price, cur)}
      </span>
      <span
        class={cn(
          'flex items-center gap-1 rounded-md px-2 py-1 font-mono text-sm tabular-nums',
          up ? 'bg-bull/15 text-bull' : 'bg-bear/15 text-bear'
        )}
      >
        {#if up}
          <ArrowUpRight class="size-4" />
        {:else}
          <ArrowDownRight class="size-4" />
        {/if}
        {formatPrice(Math.abs(changeAbs), cur)} ({formatChange(changePct)})
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-x-7 gap-y-2">
      {#each [
        { label: 'Open', value: formatPrice(last.open, cur) },
        { label: 'High', value: formatPrice(high, cur), tone: 'bull' },
        { label: 'Low', value: formatPrice(low, cur), tone: 'bear' },
        { label: 'Volume', value: formatCompact(totalVol) },
      ] as stat}
        <div class="flex flex-col">
          <span class="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{stat.label}</span>
          <span
            class={cn(
              'font-mono text-sm tabular-nums',
              stat.tone === 'bull' ? 'text-bull' : stat.tone === 'bear' ? 'text-bear' : 'text-foreground'
            )}
          >
            {stat.value}
          </span>
        </div>
      {/each}
    </div>
  </div>
{/if}
