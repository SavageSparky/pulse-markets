import type { Candle, Timeframe } from './types'

const BINANCE_WS = 'wss://stream.binance.com:9443/ws'

const WS_INTERVAL: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1H': '1h',
  '4H': '4h',
  '1D': '1d',
  '1W': '1w',
  '1M': '1M',
}

export interface KlineMessage {
  /** kline start time (ms) */
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  closed: boolean
}

/**
 * Open a Binance kline WebSocket for a given pair and timeframe.
 * Calls `onUpdate` every time a kline message arrives (typically every ~1-2s).
 * Returns a cleanup function that closes the socket.
 */
export function subscribeKline(
  pair: string,
  tf: Timeframe,
  onUpdate: (k: KlineMessage) => void,
): () => void {
  const stream = `${pair.toLowerCase()}@kline_${WS_INTERVAL[tf]}`
  const ws = new WebSocket(`${BINANCE_WS}/${stream}`)

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      const k = msg.k
      if (!k) return
      onUpdate({
        time: Math.floor(k.t / 1000),
        open: Number(k.o),
        high: Number(k.h),
        low: Number(k.l),
        close: Number(k.c),
        volume: Number(k.v),
        closed: k.x,
      })
    } catch {
      // ignore parse errors
    }
  }

  return () => {
    ws.close()
  }
}

export interface MiniTicker {
  symbol: string
  price: number
  changePct: number
}

/**
 * Subscribe to mini-ticker streams for multiple Binance pairs.
 * Calls `onUpdate` each time any pair's ticker is received.
 * Returns a cleanup function.
 */
export function subscribeMiniTickers(
  pairs: string[],
  onUpdate: (tickers: MiniTicker[]) => void,
): () => void {
  if (pairs.length === 0) return () => {}

  const streams = pairs.map((p) => `${p.toLowerCase()}@miniTicker`).join('/')
  const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`)

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data)
      // Combined stream wraps data in { stream, data }
      const d = msg.data ?? msg
      if (d.e === '24hrMiniTicker') {
        onUpdate([{
          symbol: d.s,
          price: Number(d.c),      // close price
          changePct: ((Number(d.c) - Number(d.o)) / Number(d.o)) * 100,
        }])
      }
    } catch {
      // ignore
    }
  }

  return () => {
    ws.close()
  }
}
