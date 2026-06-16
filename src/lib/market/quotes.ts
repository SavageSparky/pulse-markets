import { generateCandles } from "./simulator"
import type { Instrument } from "./types"

export interface Quote {
  price: number
  changePct: number
}

/** A stable, deterministic day quote derived from the simulated daily candle. */
export function dayQuote(inst: Instrument): Quote {
  const daily = generateCandles(inst, "1D", 40)
  const last = daily[daily.length - 1]
  const open = last.open
  const price = last.close
  return { price, changePct: ((price - open) / open) * 100 }
}
