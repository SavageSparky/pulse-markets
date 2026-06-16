<script lang="ts">
  import { Search, X } from '@lucide/svelte';
  import { INSTRUMENTS } from '$lib/market/instruments';
  import { CATEGORY_LABELS, type Category, type Instrument } from '$lib/market/types';
  import { cn } from '$lib/utils';

  interface Props {
    onSelect: (symbol: string) => void;
  }

  let { onSelect }: Props = $props();

  const CATEGORY_ORDER: Category[] = ['us-stocks', 'in-stocks', 'crypto', 'commodities'];

  let open = $state(false);
  let query = $state('');
  let wrapEl: HTMLDivElement;

  let results = $derived.by(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? INSTRUMENTS.filter((i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q))
      : INSTRUMENTS;
    const grouped: Record<string, Instrument[]> = {};
    for (const i of list) (grouped[i.category] ??= []).push(i);
    return grouped;
  });

  $effect(() => {
    function onClick(e: MouseEvent) {
      if (wrapEl && !wrapEl.contains(e.target as Node)) open = false;
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') open = false;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        open = true;
      }
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  });

  function handleSelect(symbol: string) {
    onSelect(symbol);
    open = false;
    query = '';
  }
</script>

<div bind:this={wrapEl} class="relative w-full max-w-md">
  <div class="flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-2">
    <Search class="size-4 text-muted-foreground" />
    <input
      bind:value={query}
      onfocus={() => (open = true)}
      placeholder="Search symbol or name..."
      class="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
      aria-label="Search symbols"
    />
    {#if query}
      <button onclick={() => (query = '')} aria-label="Clear search" class="text-muted-foreground hover:text-foreground">
        <X class="size-4" />
      </button>
    {:else}
      <kbd class="hidden rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:block">
        ⌘K
      </kbd>
    {/if}
  </div>

  {#if open}
    <div class="absolute z-50 mt-2 max-h-[420px] w-full overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-2xl">
      {#each CATEGORY_ORDER.filter((c) => results[c]?.length) as cat}
        <div class="mb-1">
          <p class="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {CATEGORY_LABELS[cat]}
          </p>
          {#each results[cat] as i}
            <button
              onclick={() => handleSelect(i.symbol)}
              class={cn('flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-accent')}
            >
              <span class="flex items-center gap-2">
                <span class="font-mono text-sm font-medium text-foreground">{i.symbol}</span>
                <span class="truncate text-xs text-muted-foreground">{i.name}</span>
              </span>
              <span class="font-mono text-[10px] text-muted-foreground">{i.exchange}</span>
            </button>
          {/each}
        </div>
      {/each}
      {#if Object.keys(results).length === 0}
        <p class="px-3 py-6 text-center text-sm text-muted-foreground">No results found</p>
      {/if}
    </div>
  {/if}
</div>
