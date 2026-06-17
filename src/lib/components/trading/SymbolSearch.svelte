<script lang="ts">
  import { Search, X, Loader2 } from '@lucide/svelte';
  import { INSTRUMENTS } from '$lib/market/instruments';
  import type { Instrument } from '$lib/market/types';
  import { cn } from '$lib/utils';

  interface Props {
    onSelect: (inst: Instrument) => void;
  }

  let { onSelect }: Props = $props();

  let open = $state(false);
  let query = $state('');
  let wrapEl: HTMLDivElement;
  let searchResults = $state<Instrument[]>([]);
  let isSearching = $state(false);

  let searchTimeout: ReturnType<typeof setTimeout>;

  $effect(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Show default popular instruments when query is empty
      searchResults = INSTRUMENTS.slice(0, 8);
      isSearching = false;
      return;
    }

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      isSearching = true;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          searchResults = data.results || [];
        }
      } catch {
        // ignore network errors
      } finally {
        isSearching = false;
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
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

  function handleSelect(inst: Instrument) {
    onSelect(inst);
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
      {#if isSearching}
        <div class="flex items-center justify-center p-6 text-muted-foreground">
          <Loader2 class="size-5 animate-spin" />
        </div>
      {:else}
        {#if !query}
          <p class="px-3 py-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Popular
          </p>
        {/if}
        {#each searchResults as i}
          <button
            onclick={() => handleSelect(i)}
            class={cn('flex w-full items-center justify-between rounded-md px-3 py-2 text-left hover:bg-accent')}
          >
            <span class="flex items-center gap-2 min-w-0">
              <span class="font-mono text-sm font-medium text-foreground">{i.symbol}</span>
              <span class="truncate text-xs text-muted-foreground">{i.name}</span>
            </span>
            <span class="shrink-0 font-mono text-[10px] text-muted-foreground">{i.exchange}</span>
          </button>
        {/each}
        {#if searchResults.length === 0}
          <p class="px-3 py-6 text-center text-sm text-muted-foreground">No results found for "{query}"</p>
        {/if}
      {/if}
    </div>
  {/if}
</div>
