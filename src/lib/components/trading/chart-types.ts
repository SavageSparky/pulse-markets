export type ChartType = 'candles' | 'area' | 'line';

export interface IndicatorState {
  sma50: boolean;
  sma100: boolean;
  sma200: boolean;
  ema50: boolean;
  ema100: boolean;
  ema200: boolean;
  volume: boolean;
}
