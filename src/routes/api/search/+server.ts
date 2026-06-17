import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q');
  if (!q) {
    return json({ error: 'Missing query parameter' }, { status: 400 });
  }

  try {
    const yahooUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=10&newsCount=0`;
    const res = await fetch(yahooUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!res.ok) {
      return json({ error: 'Failed to fetch search results from Yahoo' }, { status: res.status });
    }

    const data = await res.json();
    const quotes = data.quotes || [];

    // Map to our Instrument structure
    const results = quotes
      .filter((q: any) => q.symbol && q.shortname)
      .map((q: any) => ({
        symbol: q.symbol, // Use Yahoo symbol as the display symbol for simplicity
        name: q.shortname,
        exchange: q.exchDisp || q.exchange,
        category: 'custom',
        currency: q.currency || '',
        yahoo: q.symbol // The critical piece that routes historical/live data to Yahoo
      }));

    return json({ results });
  } catch (err) {
    console.error('Search API Error:', err);
    return json({ error: 'Internal Server Error' }, { status: 500 });
  }
};
