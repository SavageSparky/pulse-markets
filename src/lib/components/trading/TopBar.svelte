<script lang="ts">
  import { CandlestickChart, PanelRightOpen } from '@lucide/svelte';
  import SymbolSearch from './SymbolSearch.svelte';

  interface Props {
    onSelect: (symbol: string) => void;
    onToggleWatchlist: () => void;
  }

  let { onSelect, onToggleWatchlist }: Props = $props();

  let clock = $state('');

  $effect(() => {
    const update = () =>
      (clock = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC'
      }));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  });
</script>

<header class="flex items-center gap-3 border-b border-border bg-card/60 px-3 py-2.5 backdrop-blur">
  <div class="flex items-center gap-2 pr-1">
    <div class="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
      <CandlestickChart class="size-4" />
    </div>
    <span class="hidden font-mono text-sm font-semibold tracking-tight text-foreground sm:block">
      Pulse<span class="text-primary">Markets</span>
    </span>
  </div>

  <SymbolSearch {onSelect} />

  <div class="ml-auto flex items-center gap-3">
    <div class="hidden items-center gap-2 md:flex">
      <span class="font-mono text-[11px] text-muted-foreground">UTC</span>
      <span class="font-mono text-sm tabular-nums text-foreground">{clock}</span>
    </div>
    <button
      onclick={onToggleWatchlist}
      aria-label="Toggle watchlist"
      class="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground lg:hidden"
    >
      <PanelRightOpen class="size-4" />
    </button>
  </div>
</header>
