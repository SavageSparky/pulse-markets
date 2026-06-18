# PulseMarkets — Live Trading Charts

A real-time multi-asset trading terminal built with SvelteKit, powered by live streaming data from the [Binance API](https://binance-docs.github.io/apidocs/) and [Yahoo Finance API](https://finance.yahoo.com/).

## Features

- **Real-time WebSocket streaming** — Live price updates via Binance (for crypto) and Yahoo Finance (for stocks, commodities, indices, and custom tickers)
- **Interactive candlestick charts** — Powered by [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) supporting candlestick, area, and line views
- **Symbol comparison (Overlay)** — Overlay multiple instruments on the active chart to compare historical performance side-by-side
- **Technical indicators** — Configurable Simple Moving Average (SMA), Exponential Moving Average (EMA), and Volume overlays
- **Live watchlist** — Sidebar displaying streaming real-time prices for tracked symbols, with initial state loaded from Yahoo Finance/Binance REST APIs
- **Multi-timeframe support** — 1m, 5m, 15m, 1H, 4H, 1D, 1W, 1M
- **Symbol search** — Instant search across pre-listed instruments and dynamic custom symbols via Yahoo Finance autocomplete search
- **Responsive layout** — Premium dark-themed UI featuring a desktop sidebar and a mobile drawer for the watchlist

## Supported Instruments

| Category | Symbols | Live Data Source |
|----------|---------|------------------|
| **Crypto** | BTCUSD, ETHUSD, SOLUSD, BNBUSD, XRPUSD, DOGEUSD, ADAUSD, AVAXUSD | ✅ Binance WebSocket / REST |
| **US Stocks** | AAPL, MSFT, NVDA, TSLA, AMZN, GOOGL, META, AMD, NFLX, JPM | ✅ Yahoo Finance WebSocket / REST |
| **India Stocks** | RELIANCE, TCS, INFY, HDFCBANK, ICICIBANK, SBIN, TATAMOTORS, BHARTIARTL, ADANIENT, WIPRO | ✅ Yahoo Finance WebSocket / REST |
| **Commodities** | Gold (XAUUSD), Silver (XAGUSD), WTI Crude (WTIUSD), Natural Gas (NATGAS), Copper (COPPER), Platinum (PLATINUM) | ✅ Yahoo Finance WebSocket / REST |
| **Indices** | Nasdaq Composite (NDX), S&P 500 (SPX), Nifty 50 (NIFTY50), Nifty Next 50 (NIFTYNXT50), Nifty Midcap 150 (NIFTYMID150), Nifty Smallcap 250 (NIFTYSML250) | ✅ Yahoo Finance WebSocket / REST |

> Crypto instruments fetch data directly via Binance. Stocks, Commodities, Indices, and any custom search symbols retrieve historical data and live tick streams via Yahoo Finance.

## Tech Stack

- **Framework** — [SvelteKit](https://svelte.dev/docs/kit) (Svelte 5 using runes mode)
- **Charts** — [Lightweight Charts](https://tradingview.github.io/lightweight-charts/) v5
- **Styling** — [Tailwind CSS](https://tailwindcss.com/) v4
- **Icons** — [Lucide Svelte](https://lucide.dev/) (`@lucide/svelte`)
- **WebSockets** — Native WebSocket connections for Binance feeds and Yahoo Finance's protobuf-encoded streaming service
- **Serialization** — [Protobuf.js](https://github.com/protobufjs/protobuf.js) (for decoding Yahoo Finance real-time price tick messages)

## Project Structure

```
src/
├── lib/
│   ├── market/
│   │   ├── binance-ws.ts      # WebSocket client for Binance kline & mini-ticker streams
│   │   ├── indicators.ts      # Price formatting & technical indicator calculations (SMA, EMA)
│   │   ├── instruments.ts     # Predefined instrument list & mapping helper
│   │   ├── types.ts           # Shared TypeScript types (Instrument, Candle, etc.)
│   │   └── yahoo-ws.ts        # WebSocket client for Yahoo Finance protobuf streams
│   ├── components/trading/
│   │   ├── TradingTerminal.svelte  # Main page layout & coordination hub
│   │   ├── PriceChart.svelte       # Lightweight Charts integration & drawing layer
│   │   ├── ChartToolbar.svelte     # Controls for timeframe, chart type, indicators, and comparison
│   │   ├── SymbolHeader.svelte     # Active symbol price, change %, and OHLCV metrics
│   │   ├── Watchlist.svelte        # Sidebar showing streaming prices and watchlist items
│   │   ├── TopBar.svelte           # Header component containing search and logo
│   │   ├── SymbolSearch.svelte     # Autocomplete search dialog with custom symbol support
│   │   └── chart-types.ts          # Configurations, indicator types, and compare states
│   └── utils.ts
├── routes/
│   ├── api/
│   │   ├── candles/
│   │   │   └── +server.ts     # REST endpoint proxying historical candles (Binance / Yahoo Finance)
│   │   ├── quotes/
│   │   │   └── +server.ts     # REST endpoint for batch quote details (Yahoo Finance)
│   │   └── search/
│   │       └── +server.ts     # REST endpoint proxying symbol queries (Yahoo Finance)
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

Fetches historical OHLCV candle data from Binance or Yahoo Finance.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbol` | string | `BTCUSD` | Instrument symbol (or Yahoo ticker symbol) |
| `tf` | string | `1H` | Timeframe (`1m`, `5m`, `15m`, `1H`, `4H`, `1D`, `1W`, `1M`) |
| `limit` | number | `320` | Number of candles to return (max 500) |
| `endTime` | number | *None* | Optional Unix timestamp (seconds) to fetch historical candles before this time (for pagination) |

*Note: For the `4H` timeframe on Yahoo Finance (which does not provide a native 4H interval), the backend automatically downsamples hourly data.*

### `GET /api/quotes`

Fetches current price quotes and daily change percentages for a list of Yahoo Finance symbols.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `symbols` | string | *None* | Comma-separated Yahoo Finance symbols (e.g. `AAPL,MSFT,RELIANCE.NS`) |

### `GET /api/search`

Queries Yahoo Finance's autocomplete search to find instruments matching a text query.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `q` | string | *None* | Search query |
