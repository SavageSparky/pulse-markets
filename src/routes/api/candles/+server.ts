import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getInstrument } from '$lib/market/instruments';
import type { Candle, CandlesResponse, Timeframe } from '$lib/market/types';
import { TIMEFRAMES } from '$lib/market/types';

const BINANCE_INTERVAL: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1H': '1h',
  '4H': '4h',
  '1D': '1d',
  '1W': '1w',
  '1M': '1M'
};

// Yahoo Finance uses different interval names and range constraints
const YAHOO_INTERVAL: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1H': '1h',
  '4H': '1h',   // no 4h — we'll downsample from 1h
  '1D': '1d',
  '1W': '1wk',
  '1M': '1mo'
};

// Yahoo limits intraday data to specific ranges
const YAHOO_RANGE: Record<Timeframe, string> = {
  '1m': '7d',    // max 7 days for 1m
  '5m': '60d',   // max 60 days for 5m
  '15m': '60d',
  '1H': '2y',
  '4H': '2y',    // we fetch 1h and downsample
  '1D': '1y',
  '1W': '5y',
  '1M': '10y'
};

async function fetchBinance(pair: string, tf: Timeframe, limit: number, endTime?: number): Promise<Candle[] | null> {
  try {
    let url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${BINANCE_INTERVAL[tf]}&limit=${limit}`;
    if (endTime) {
      url += `&endTime=${endTime * 1000}`;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const rows = (await res.json()) as unknown[][];
    return rows.map((r) => ({
      time: Math.floor(Number(r[0]) / 1000),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5])
    }));
  } catch (err) {
    console.error('Binance fetch error:', err);
    return null;
  }
}

/** Downsample 1h candles into 4h candles */
function downsample4H(hourly: Candle[]): Candle[] {
  const result: Candle[] = [];
  for (let i = 0; i < hourly.length; i += 4) {
    const chunk = hourly.slice(i, i + 4);
    if (chunk.length === 0) continue;
    result.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0)
    });
  }
  return result;
}

async function fetchYahoo(yahooSymbol: string, tf: Timeframe, limit: number, endTime?: number): Promise<Candle[] | null> {
  try {
    const interval = YAHOO_INTERVAL[tf];
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?interval=${interval}`;
    
    if (endTime) {
      const period2 = endTime;
      // Fetch more than requested limit to account for weekends/holidays where no candles exist
      const tfSeconds = tf === '4H' ? 3600 : (tf === '1m' ? 60 : (tf === '1D' ? 86400 : 3600));
      // Multiplier ensures we get enough trading days within calendar days
      const period1 = period2 - (limit * tfSeconds * 5); 
      url += `&period1=${period1}&period2=${period2}`;
    } else {
      const range = YAHOO_RANGE[tf];
      url += `&range=${range}`;
    }

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (!res.ok) return null;

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const timestamps: number[] = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0];
    if (!quote || timestamps.length === 0) return null;

    const opens: (number | null)[] = quote.open ?? [];
    const highs: (number | null)[] = quote.high ?? [];
    const lows: (number | null)[] = quote.low ?? [];
    const closes: (number | null)[] = quote.close ?? [];
    const volumes: (number | null)[] = quote.volume ?? [];

    let candles: Candle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      // Skip bars with null values (e.g. current trading day may have null close)
      if (
        opens[i] == null || highs[i] == null ||
        lows[i] == null || closes[i] == null
      ) continue;

      candles.push({
        time: timestamps[i],
        open: opens[i]!,
        high: highs[i]!,
        low: lows[i]!,
        close: closes[i]!,
        volume: volumes[i] ?? 0
      });
    }

    // Downsample 1h → 4h when needed
    if (tf === '4H') {
      candles = downsample4H(candles);
    }

    // Trim to requested limit
    if (candles.length > limit) {
      candles = candles.slice(candles.length - limit);
    }

    return candles;
  } catch (err) {
    console.error('Yahoo fetch error:', err);
    return null;
  }
}

export const GET: RequestHandler = async ({ url }) => {
  const symbol = url.searchParams.get('symbol') ?? 'BTCUSD';
  const tf = (url.searchParams.get('tf') as Timeframe) ?? '1H';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 320, 500);
  const endTimeStr = url.searchParams.get('endTime');
  const endTime = endTimeStr ? Number(endTimeStr) : undefined;

  let instrument = getInstrument(symbol);
  if (!TIMEFRAMES.includes(tf)) {
    return json({ error: 'Unknown timeframe' }, { status: 400 });
  }

  // If the symbol isn't in our hardcoded instruments list, assume it's a dynamic Yahoo Finance ticker from the search proxy
  if (!instrument) {
    instrument = {
      symbol: symbol,
      name: symbol,
      exchange: '',
      category: 'custom',
      currency: '',
      yahoo: symbol
    };
  }

  // Try Binance first (crypto)
  if (instrument.binance) {
    const candles = await fetchBinance(instrument.binance, tf, limit, endTime);
    if (candles && candles.length > 0) {
      const body: CandlesResponse = { symbol, timeframe: tf, candles };
      return json(body, { headers: { 'Cache-Control': 'public, max-age=60' } });
    }
  }

  // Try Yahoo Finance (stocks, commodities)
  if (instrument.yahoo) {
    const candles = await fetchYahoo(instrument.yahoo, tf, limit, endTime);
    if (candles && candles.length > 0) {
      const body: CandlesResponse = { symbol, timeframe: tf, candles };
      return json(body, {
        headers: { 'Cache-Control': 'public, max-age=60' }
      });
    }
  }

  // No data source available
  if (!instrument.binance && !instrument.yahoo) {
    return json({ error: 'No data source configured for this instrument' }, { status: 404 });
  }

  return json({ error: 'No historical data available for this symbol on the requested timeframe' }, { status: 404 });
};
