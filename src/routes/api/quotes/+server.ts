import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getInstrument } from '$lib/market/instruments';

export interface QuoteData {
  symbol: string;
  price: number;
  changePct: number;
}

export const GET: RequestHandler = async ({ url }) => {
  const symbolsParam = url.searchParams.get('symbols') ?? '';
  const yahooSymbols = symbolsParam.split(',').filter(Boolean);

  if (yahooSymbols.length === 0) {
    return json({ quotes: [] });
  }

  const quotes: QuoteData[] = [];

  // Fetch quotes from Yahoo Finance (batch via multiple chart calls)
  // Yahoo doesn't have a free batch quote endpoint, so we fetch individually
  // but in parallel for speed
  const results = await Promise.allSettled(
    yahooSymbols.map(async (ySym) => {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=1d&range=2d`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          }
        );
        if (!res.ok) return null;
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) return null;

        const price = meta.regularMarketPrice ?? 0;
        const prevClose = meta.chartPreviousClose ?? price;
        const changePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

        return {
          symbol: ySym,
          price,
          changePct
        } satisfies QuoteData;
      } catch {
        return null;
      }
    })
  );

  for (const r of results) {
    if (r.status === 'fulfilled' && r.value) {
      quotes.push(r.value);
    }
  }

  return json(
    { quotes },
    { headers: { 'Cache-Control': 'public, max-age=15' } }
  );
};
