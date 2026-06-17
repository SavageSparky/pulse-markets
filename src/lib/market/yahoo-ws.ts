import protobuf from 'protobufjs/light';

const YAHOO_WS_URL = 'wss://streamer.finance.yahoo.com/';

// Reverse-engineered PricingData protobuf schema from Yahoo Finance
const PricingData = new protobuf.Type('PricingData')
  .add(new protobuf.Field('id', 1, 'string'))
  .add(new protobuf.Field('price', 2, 'float'))
  .add(new protobuf.Field('time', 3, 'sint64'))
  .add(new protobuf.Field('currency', 4, 'string'))
  .add(new protobuf.Field('exchange', 5, 'string'))
  .add(new protobuf.Field('quoteType', 6, 'int32'))
  .add(new protobuf.Field('marketHours', 7, 'int32'))
  .add(new protobuf.Field('changePercent', 8, 'float'))
  .add(new protobuf.Field('dayVolume', 9, 'sint64'))
  .add(new protobuf.Field('dayHigh', 10, 'float'))
  .add(new protobuf.Field('dayLow', 11, 'float'))
  .add(new protobuf.Field('change', 12, 'float'))
  .add(new protobuf.Field('shortName', 13, 'string'))
  .add(new protobuf.Field('previousClose', 16, 'float'));

const root = new protobuf.Root().define('quotefeeder').add(PricingData);
const PricingDataType = root.lookupType('quotefeeder.PricingData');

export interface YahooTick {
  /** Yahoo Finance symbol (e.g. AAPL, RELIANCE.NS) */
  id: string;
  price: number;
  changePercent: number;
  time: number;
  dayHigh: number;
  dayLow: number;
  dayVolume: number;
  change: number;
  previousClose: number;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Subscribe to Yahoo Finance real-time price ticks via WebSocket.
 * Sends ticks for the given Yahoo Finance symbols.
 * Returns a cleanup function that closes the socket.
 */
export function subscribeYahooTickers(
  yahooSymbols: string[],
  onTick: (tick: YahooTick) => void,
): () => void {
  if (yahooSymbols.length === 0) return () => {};

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let closed = false;

  function connect() {
    if (closed) return;

    ws = new WebSocket(YAHOO_WS_URL);

    ws.onopen = () => {
      ws?.send(JSON.stringify({ subscribe: yahooSymbols }));
    };

    ws.onmessage = (event) => {
      try {
        const data = event.data;
        if (typeof data !== 'string') return;

        const bytes = base64ToUint8Array(data);
        const decoded = PricingDataType.decode(bytes) as unknown as Record<string, unknown>;

        const tick: YahooTick = {
          id: (decoded.id as string) ?? '',
          price: Number(decoded.price) || 0,
          changePercent: Number(decoded.changePercent) || 0,
          time: Number(decoded.time) || 0,
          dayHigh: Number(decoded.dayHigh) || 0,
          dayLow: Number(decoded.dayLow) || 0,
          dayVolume: Number(decoded.dayVolume) || 0,
          change: Number(decoded.change) || 0,
          previousClose: Number(decoded.previousClose) || 0,
        };

        if (tick.id && tick.price > 0) {
          onTick(tick);
        }
      } catch {
        // Ignore decode errors
      }
    };

    ws.onclose = () => {
      if (!closed) {
        // Auto-reconnect after 5 seconds
        reconnectTimer = setTimeout(connect, 5000);
      }
    };

    ws.onerror = () => {
      // Will trigger onclose, which handles reconnection
    };
  }

  connect();

  return () => {
    closed = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      ws.onclose = null;
      ws.close();
    }
  };
}
