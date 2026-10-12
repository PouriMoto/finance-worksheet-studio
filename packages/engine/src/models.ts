// Built-in simulation models. Pure functions: no eval, so content can never run arbitrary code.
import type { SimModel } from '@hormat/content/schema';

export type SimValues = Record<string, number>;
export interface SimResult { value: number; band: 'low' | 'mid' | 'high'; extra: Record<string, number> }

export function runSim(model: SimModel, v: SimValues): SimResult {
  switch (model) {
    case 'runway': {
      const months = v.expenses > 0 ? v.savings / v.expenses : 0;
      return { value: months, band: months < 3 ? 'low' : months < 6 ? 'mid' : 'high', extra: {} };
    }
    case 'purchasing-power': {
      const real = v.amount / Math.pow(1 + v.inflation / 100, v.years);
      const ratio = v.amount > 0 ? real / v.amount : 0;
      return { value: real, band: ratio < 0.4 ? 'low' : ratio < 0.75 ? 'mid' : 'high', extra: { ratio } };
    }
    case 'margin-of-safety': {
      const margin = v.value > 0 ? ((v.value - v.price) / v.value) * 100 : 0;
      return { value: margin, band: margin < 0 ? 'low' : margin < 25 ? 'mid' : 'high', extra: { value: v.value, price: v.price } };
    }
    case 'rebalance': {
      const stock = 50 * (1 + v.growth / 100);
      const share = (stock / (stock + 50)) * 100;
      const drift = Math.abs(share - 50);
      return { value: share, band: drift > 15 ? 'low' : drift > 5 ? 'mid' : 'high', extra: { target: 50 } };
    }
  }
}
