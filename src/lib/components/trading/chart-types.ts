export type ChartType = 'candles' | 'area' | 'line';

export interface IndicatorState {
  sma20: boolean;
  sma50: boolean;
  ema20: boolean;
  volume: boolean;
}
