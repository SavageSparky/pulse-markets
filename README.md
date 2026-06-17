# PulseMarkets — Live Trading Charts

A real-time cryptocurrency trading terminal built with SvelteKit, powered by live data from the [Binance API](https://binance-docs.github.io/apidocs/).

## Features

- **Real-time WebSocket streaming** — Prices update every ~1 second via Binance kline and mini-ticker WebSocket feeds
- **Interactive candlestick charts** — Powered by [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) with candlestick, area, and line views
- **Technical indicators** — SMA 20, SMA 50, EMA 20, and volume overlays
- **Live watchlist** — Sidebar with streaming prices for tracked symbols
- **Multi-timeframe support** — 1m, 5m, 15m, 1H, 4H, 1D, 1W
- **Symbol search** — Quick search across all listed instruments
- **Responsive layout** — Desktop sidebar + mobile drawer for the watchlist

## Supported Instruments

| Category | Symbols | Live Data |
|----------|---------|-----------|
| **Crypto** | BTC, ETH, SOL, BNB, XRP, DOGE, ADA, AVAX | ✅ Binance |
| **US Stocks** | AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META, AMD, NFLX, JPM | ❌ No data source |
| **India Stocks** | RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, SBIN, TATAMOTORS, BHARTIARTL, ADANIENT, WIPRO | ❌ No data source |
| **Commodities** | Gold, Silver, Crude Oil, Natural Gas, Copper, Platinum | ❌ No data source |

> Only crypto instruments have live chart and ticker data via Binance. Other instruments are listed but require a data provider to be integrated.

## Tech Stack

- **Framework** — [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5 with runes)
- **Charts** — [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) v5
- **Styling** — [Tailwind CSS](https://tailwindcss.com/) v4
- **Icons** — [Lucide](https://lucide.dev/)
- **Data** — [Binance REST + WebSocket API](https://binance-docs.github.io/apidocs/)

## Project Structure

```
src/
├── lib/
│   ├── market/
│   │   ├── binance-ws.ts      # WebSocket client for kline & mini-ticker streams
│   │   ├── indicators.ts      # Price formatting & technical indicator calculations
│   │   ├── instruments.ts     # Instrument definitions (symbols, exchanges, pairs)
│   │   └── types.ts           # Shared TypeScript types
│   ├── components/trading/
│   │   ├── TradingTerminal.svelte  # Main layout orchestrator
│   │   ├── PriceChart.svelte       # Lightweight Charts wrapper
│   │   ├── ChartToolbar.svelte     # Timeframe, chart type & indicator controls
│   │   ├── SymbolHeader.svelte     # Price header with OHLCV stats
│   │   ├── Watchlist.svelte        # Sidebar with live streaming prices
│   │   ├── TopBar.svelte           # App header with search
│   │   └── SymbolSearch.svelte     # Symbol search dialog
│   └── utils.ts
├── routes/
│   ├── api/candles/+server.ts  # REST endpoint proxying Binance kline data
│   ├── +page.svelte
│   └── +layout.svelte
└── app.html
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [pnpm](https://pnpm.io/)

### Install & Run

```sh
pnpm install
pnpm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```sh
pnpm run build
pnpm run preview
```

## API Endpoints

### `GET /api/candles`

Fetches historical OHLCV candle data from Binance.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | string | `BTCUSD` | Instrument symbol |
| `tf` | string | `1H` | Timeframe (`1m`, `5m`, `15m`, `1H`, `4H`, `1D`, `1W`) |
| `limit` | number | `320` | Number of candles (max 500) |

Returns `404` if the instrument doesn't have a Binance pair, or `502` if the Binance API request fails.
