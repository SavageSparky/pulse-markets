export type Category = "us-stocks" | "in-stocks" | "crypto" | "commodities"

export type Timeframe = "1m" | "5m" | "15m" | "1H" | "4H" | "1D" | "1W"

export interface Instrument {
  symbol: string
  name: string
  exchange: string
  category: Category
  currency: "USD" | "INR"
  /** Binance trading pair, present for crypto that has real data available */
  binance?: string
  /** Yahoo Finance symbol, present for stocks / commodities */
  yahoo?: string
}

export interface Candle {
  /** unix time in seconds */
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface CandlesResponse {
  symbol: string
  timeframe: Timeframe
  candles: Candle[]
}

export const CATEGORY_LABELS: Record<Category, string> = {
  "us-stocks": "US Stocks",
  "in-stocks": "India Stocks",
  crypto: "Crypto",
  commodities: "Commodities",
}

export const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1H", "4H", "1D", "1W"]

export const TF_SECONDS: Record<Timeframe, number> = {
  "1m": 60,
  "5m": 300,
  "15m": 900,
  "1H": 3600,
  "4H": 14400,
  "1D": 86400,
  "1W": 604800,
}
