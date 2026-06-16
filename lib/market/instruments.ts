import type { Instrument } from "./types"

export const INSTRUMENTS: Instrument[] = [
  // US Stocks
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", basePrice: 229.5 },
  { symbol: "MSFT", name: "Microsoft Corp.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", basePrice: 438.2 },
  { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", basePrice: 142.8 },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", basePrice: 412.4 },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", basePrice: 224.1 },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", basePrice: 191.6 },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", basePrice: 612.3 },
  { symbol: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ", category: "us-stocks", currency: "USD", basePrice: 138.9 },
  { symbol: "NFLX", name: "Netflix Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", basePrice: 905.7 },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", category: "us-stocks", currency: "USD", basePrice: 248.5 },

  // India Stocks
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", category: "in-stocks", currency: "INR", basePrice: 1295.0 },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", category: "in-stocks", currency: "INR", basePrice: 4180.0 },
  { symbol: "INFY", name: "Infosys Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", basePrice: 1890.0 },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", basePrice: 1760.0 },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", basePrice: 1310.0 },
  { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", category: "in-stocks", currency: "INR", basePrice: 820.0 },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", basePrice: 785.0 },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", basePrice: 1620.0 },
  { symbol: "ADANIENT", name: "Adani Enterprises", exchange: "NSE", category: "in-stocks", currency: "INR", basePrice: 2410.0 },
  { symbol: "WIPRO", name: "Wipro Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", basePrice: 305.0 },

  // Crypto (real data via Binance)
  { symbol: "BTCUSD", name: "Bitcoin", exchange: "Crypto", category: "crypto", currency: "USD", basePrice: 97500, binance: "BTCUSDT" },
  { symbol: "ETHUSD", name: "Ethereum", exchange: "Crypto", category: "crypto", currency: "USD", basePrice: 3450, binance: "ETHUSDT" },
  { symbol: "SOLUSD", name: "Solana", exchange: "Crypto", category: "crypto", currency: "USD", basePrice: 215, binance: "SOLUSDT" },
  { symbol: "BNBUSD", name: "BNB", exchange: "Crypto", category: "crypto", currency: "USD", basePrice: 695, binance: "BNBUSDT" },
  { symbol: "XRPUSD", name: "XRP", exchange: "Crypto", category: "crypto", currency: "USD", basePrice: 2.35, binance: "XRPUSDT" },
  { symbol: "DOGEUSD", name: "Dogecoin", exchange: "Crypto", category: "crypto", currency: "USD", basePrice: 0.38, binance: "DOGEUSDT" },
  { symbol: "ADAUSD", name: "Cardano", exchange: "Crypto", category: "crypto", currency: "USD", basePrice: 1.05, binance: "ADAUSDT" },
  { symbol: "AVAXUSD", name: "Avalanche", exchange: "Crypto", category: "crypto", currency: "USD", basePrice: 42.5, binance: "AVAXUSDT" },

  // Commodities
  { symbol: "XAUUSD", name: "Gold (Spot)", exchange: "COMEX", category: "commodities", currency: "USD", basePrice: 2650.0 },
  { symbol: "XAGUSD", name: "Silver (Spot)", exchange: "COMEX", category: "commodities", currency: "USD", basePrice: 30.8 },
  { symbol: "WTIUSD", name: "Crude Oil WTI", exchange: "NYMEX", category: "commodities", currency: "USD", basePrice: 71.4 },
  { symbol: "NATGAS", name: "Natural Gas", exchange: "NYMEX", category: "commodities", currency: "USD", basePrice: 3.65 },
  { symbol: "COPPER", name: "Copper", exchange: "COMEX", category: "commodities", currency: "USD", basePrice: 4.18 },
  { symbol: "PLATINUM", name: "Platinum", exchange: "NYMEX", category: "commodities", currency: "USD", basePrice: 945.0 },
]

const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]))

export function getInstrument(symbol: string): Instrument | undefined {
  return BY_SYMBOL.get(symbol)
}
