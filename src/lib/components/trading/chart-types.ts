export type ChartType = 'candles' | 'area' | 'line';

export type IndicatorType = 'SMA' | 'EMA' | 'VOL';

export interface IndicatorLine {
  period: number;
  enabled: boolean;
  color: string;
}

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  visible: boolean;        // master visibility toggle
  lines: IndicatorLine[];  // sub-lines for SMA/EMA; empty for VOL
}

const SMA_DEFAULTS: IndicatorLine[] = [
  { period: 50,  enabled: true,  color: '#e3b341' },
  { period: 100, enabled: false, color: '#4aa3df' },
  { period: 200, enabled: false, color: '#8e44ad' },
];

const EMA_DEFAULTS: IndicatorLine[] = [
  { period: 50,  enabled: true,  color: '#f39c12' },
  { period: 100, enabled: false, color: '#d35400' },
  { period: 200, enabled: false, color: '#c0392b' },
];

export function createDefaultIndicators(): IndicatorConfig[] {
  return [
    { id: 'sma', type: 'SMA', visible: true,  lines: structuredClone(SMA_DEFAULTS) },
    { id: 'ema', type: 'EMA', visible: false, lines: structuredClone(EMA_DEFAULTS) },
    { id: 'vol', type: 'VOL', visible: true,  lines: [] },
  ];
}

export const PRESET_COLORS = [
  '#e3b341', '#4aa3df', '#8e44ad', '#f39c12', '#d35400', '#c0392b',
  '#2ebd85', '#e74c3c', '#3498db', '#1abc9c', '#9b59b6', '#e67e22',
  '#f1c40f', '#ecf0f1', '#95a5a6', '#fd79a8',
];

export const COMPARE_COLORS = [
  '#4aa3df', '#f39c12', '#2ebd85', '#e74c3c', '#9b59b6',
  '#1abc9c', '#e67e22', '#fd79a8', '#3498db', '#d35400',
];

export interface CompareSymbol {
  symbol: string;    // instrument symbol key
  yahoo?: string;    // yahoo ticker for fetching
  name: string;      // display name
  color: string;     // line color
  visible: boolean;
}
