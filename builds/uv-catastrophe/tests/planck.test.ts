import { describe, expect, it } from 'vitest';
import { A_RAD, K_B, R_MAX } from '../src/constants';
import { buildModeTable, countModes } from '../src/modes';
import {
  cumulativeTotals,
  epsilon,
  planckOverKT,
  predictedDeficit,
  referenceEnergy,
  temperatureFromEpsilon,
  totals,
} from '../src/planck';

function olsSlope(xs: number[], ys: number[]): number {
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return num / den;
}

const g = buildModeTable(R_MAX);
const TEMPS = [3000, 4000, 5772, 8000, 9500];

describe('constants', () => {
  it('radiation constant a ≈ 7.5657e-16 J m^-3 K^-4', () => {
    expect(Math.abs(A_RAD / 7.5657e-16 - 1)).toBeLessThan(1e-4);
  });

  it('epsilon and temperatureFromEpsilon are inverses', () => {
    expect(temperatureFromEpsilon(epsilon(5772))).toBeCloseTo(5772, 9);
  });
});

describe('Gate 3: Planck limits', () => {
  it('x = 1e-8: E/kT equals 1 − x/2 to 1e-12', () => {
    const x = 1e-8;
    console.log(`[gate3] x=1e-8  |E/kT − (1 − x/2)| = ${Math.abs(planckOverKT(x) - (1 - x / 2)).toExponential(2)}`);
    expect(Math.abs(planckOverKT(x) - (1 - x / 2))).toBeLessThan(1e-12);
  });

  it('x = 50: E/kT equals 50·e^−50 to relative 1e-12', () => {
    const ref = 50 * Math.exp(-50);
    console.log(`[gate3] x=50  relative error ${Math.abs(planckOverKT(50) / ref - 1).toExponential(2)}`);
    expect(Math.abs(planckOverKT(50) / ref - 1)).toBeLessThan(1e-12);
  });

  it('x = 800: finite and zero-safe', () => {
    const e = planckOverKT(800);
    console.log(`[gate3] x=800  E/kT = ${e}`);
    expect(Number.isFinite(e)).toBe(true);
    expect(e).toBeGreaterThanOrEqual(0);
    expect(e).toBeLessThan(1e-300);
  });

  it('x = 0: classical limit exactly 1', () => {
    expect(planckOverKT(0)).toBe(1);
  });
});

describe('Gate 4: Stefan–Boltzmann', () => {
  it.each(TEMPS)('T = %i K: |U_P(160)/(aT⁴V) − 1| < 0.01', (T) => {
    const d = totals(g, T, 160).U_P / referenceEnergy(T) - 1;
    console.log(`[gate4] T=${T} K  U_P/(aT⁴V) − 1 = ${(d * 100).toFixed(4)}%`);
    expect(Math.abs(d)).toBeLessThan(0.01);
  });

  it('log-log slope of U_P against T is 4 ± 0.01', () => {
    const slope = olsSlope(
      TEMPS.map(Math.log),
      TEMPS.map((T) => Math.log(totals(g, T, 160).U_P)),
    );
    console.log(`[gate4] slope d ln U_P / d ln T = ${slope.toFixed(5)}`);
    expect(Math.abs(slope - 4)).toBeLessThan(0.01);
  });

  it('U_RJ is kT times the mode count', () => {
    const T = 5772;
    const tot = totals(g, T, 160);
    expect(tot.modes).toBe(countModes(g, 160));
    expect(tot.U_RJ).toBe(K_B * T * tot.modes);
  });
});

describe('Gate 5: finite-size law', () => {
  it.each([0.1, 0.2, 0.3])('ε = %f: deficit within 0.1 relative of −15ε²/(4π³)', (eps) => {
    const T = temperatureFromEpsilon(eps);
    const measured = totals(g, T, 160).U_P / referenceEnergy(T) - 1;
    const predicted = predictedDeficit(eps);
    console.log(
      `[gate5] ε=${eps}  measured ${measured.toFixed(6)}  predicted ${predicted.toFixed(6)}`,
    );
    expect(Math.abs(measured / predicted - 1)).toBeLessThan(0.1);
  });
});

describe('cumulative totals (energy-panel curves)', () => {
  it.each([3000, 5772, 9500])('T = %i K: cumulativeTotals equals totals at every sampled cutoff', (T) => {
    const cum = cumulativeTotals(g, T, R_MAX);
    expect(cum.U_P.length).toBe(R_MAX + 1);
    for (const rc of [5, 20, 77, 160]) {
      const tot = totals(g, T, rc);
      expect(Math.abs(cum.U_RJ[rc] / tot.U_RJ - 1)).toBeLessThan(1e-12);
      expect(Math.abs(cum.U_P[rc] / tot.U_P - 1)).toBeLessThan(1e-12);
    }
  });
});
