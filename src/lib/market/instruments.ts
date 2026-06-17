import type { Instrument } from "./types"

export const INSTRUMENTS: Instrument[] = [
  // US Stocks
  { symbol: "AAPL", name: "Apple Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", yahoo: "AAPL" },
  { symbol: "MSFT", name: "Microsoft Corp.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", yahoo: "MSFT" },
  { symbol: "NVDA", name: "NVIDIA Corp.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", yahoo: "NVDA" },
  { symbol: "TSLA", name: "Tesla Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", yahoo: "TSLA" },
  { symbol: "AMZN", name: "Amazon.com Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", yahoo: "AMZN" },
  { symbol: "GOOGL", name: "Alphabet Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", yahoo: "GOOGL" },
  { symbol: "META", name: "Meta Platforms Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", yahoo: "META" },
  { symbol: "AMD", name: "Advanced Micro Devices", exchange: "NASDAQ", category: "us-stocks", currency: "USD", yahoo: "AMD" },
  { symbol: "NFLX", name: "Netflix Inc.", exchange: "NASDAQ", category: "us-stocks", currency: "USD", yahoo: "NFLX" },
  { symbol: "JPM", name: "JPMorgan Chase & Co.", exchange: "NYSE", category: "us-stocks", currency: "USD", yahoo: "JPM" },

  // India Stocks
  { symbol: "RELIANCE", name: "Reliance Industries", exchange: "NSE", category: "in-stocks", currency: "INR", yahoo: "RELIANCE.NS" },
  { symbol: "TCS", name: "Tata Consultancy Services", exchange: "NSE", category: "in-stocks", currency: "INR", yahoo: "TCS.NS" },
  { symbol: "INFY", name: "Infosys Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", yahoo: "INFY.NS" },
  { symbol: "HDFCBANK", name: "HDFC Bank Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", yahoo: "HDFCBANK.NS" },
  { symbol: "ICICIBANK", name: "ICICI Bank Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", yahoo: "ICICIBANK.NS" },
  { symbol: "SBIN", name: "State Bank of India", exchange: "NSE", category: "in-stocks", currency: "INR", yahoo: "SBIN.NS" },
  { symbol: "TATAMOTORS", name: "Tata Motors Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", yahoo: "TATAMOTORS.NS" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", yahoo: "BHARTIARTL.NS" },
  { symbol: "ADANIENT", name: "Adani Enterprises", exchange: "NSE", category: "in-stocks", currency: "INR", yahoo: "ADANIENT.NS" },
  { symbol: "WIPRO", name: "Wipro Ltd.", exchange: "NSE", category: "in-stocks", currency: "INR", yahoo: "WIPRO.NS" },

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
  { symbol: "XAUUSD", name: "Gold (Spot)", exchange: "COMEX", category: "commodities", currency: "USD", yahoo: "GC=F" },
  { symbol: "XAGUSD", name: "Silver (Spot)", exchange: "COMEX", category: "commodities", currency: "USD", yahoo: "SI=F" },
  { symbol: "WTIUSD", name: "Crude Oil WTI", exchange: "NYMEX", category: "commodities", currency: "USD", yahoo: "CL=F" },
  { symbol: "NATGAS", name: "Natural Gas", exchange: "NYMEX", category: "commodities", currency: "USD", yahoo: "NG=F" },
  { symbol: "COPPER", name: "Copper", exchange: "COMEX", category: "commodities", currency: "USD", yahoo: "HG=F" },
  { symbol: "PLATINUM", name: "Platinum", exchange: "NYMEX", category: "commodities", currency: "USD", yahoo: "PL=F" },
]

const BY_SYMBOL = new Map(INSTRUMENTS.map((i) => [i.symbol, i]))

export function getInstrument(symbol: string): Instrument | undefined {
  return BY_SYMBOL.get(symbol)
}
