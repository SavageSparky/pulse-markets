import type { Instrument } from "./types"

export const INSTRUMENTS: Instrument[] = [
  // US Stocks
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD" },
  { symbol: "MSFT", name: "Microsoft Corp.", exchange: "NASDAQ", category: "us-stocks", currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ", category: "us-stocks", currency: "USD" },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD" },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD" },
  { symbol: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ", category: "us-stocks", currency: "USD" },
  { symbol: "NFLX", name: "Netflix Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", category: "us-stocks", currency: "USD" },

  // India Stocks
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", category: "in-stocks", currency: "INR" },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", category: "in-stocks", currency: "INR" },
  { symbol: "INFY", name: "Infosys Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR" },
  { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", category: "in-stocks", currency: "INR" },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR" },
  { symbol: "ADANIENT", name: "Adani Enterprises", exchange: "NSE", category: "in-stocks", currency: "INR" },
  { symbol: "WIPRO", name: "Wipro Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR" },

  // Crypto (real data via Binance)
  { symbol: "BTCUSD", name: "Bitcoin", exchange: "Crypto", category: "crypto", currency: "USD", binance: "BTCUSDT" },
  { symbol: "ETHUSD", name: "Ethereum", exchange: "Crypto", category: "crypto", currency: "USD", binance: "ETHUSDT" },
  { symbol: "SOLUSD", name: "Solana", exchange: "Crypto", category: "crypto", currency: "USD", binance: "SOLUSDT" },
  { symbol: "BNBUSD", name: "BNB", exchange: "Crypto", category: "crypto", currency: "USD", binance: "BNBUSDT" },
  { symbol: "XRPUSD", name: "XRP", exchange: "Crypto", category: "crypto", currency: "USD", binance: "XRPUSDT" },
  { symbol: "DOGEUSD", name: "Dogecoin", exchange: "Crypto", category: "crypto", currency: "USD", binance: "DOGEUSDT" },
  { symbol: "ADAUSD", name: "Cardano", exchange: "Crypto", category: "crypto", currency: "USD", binance: "ADAUSDT" },
  { symbol: "AVAXUSD", name: "Avalanche", exchange: "Crypto", category: "crypto", currency: "USD", binance: "AVAXUSDT" },

  // Commodities
  { symbol: "XAUUSD", name: "Gold (Spot)", exchange: "COMEX", category: "commodities", currency: "USD" },
  { symbol: "XAGUSD", name: "Silver (Spot)", exchange: "COMEX", category: "commodities", currency: "USD" },
  { symbol: "WTIUSD", name: "Crude Oil WTI", exchange: "NYMEX", category: "commodities", currency: "USD" },
  { symbol: "NATGAS", name: "Natural Gas", exchange: "NYMEX", category: "commodities", currency: "USD" },
  { symbol: "COPPER", name: "Copper", exchange: "COMEX", category: "commodities", currency: "USD" },
  { symbol: "PLATINUM", name: "Platinum", exchange: "NYMEX", category: "commodities", currency: "USD" },
]

const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]))

export function getInstrument(symbol: string): Instrument | undefined {
  return BY_SYMBOL.get(symbol)
}
