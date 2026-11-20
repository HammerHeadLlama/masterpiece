import { describe, expect, it } from 'vitest';
import { R_MAX } from '../src/constants';
import { buildModeTable } from '../src/modes';
import { evalPoly, fitPolynomial, solveLinear, wienPeaks } from '../src/peak';

// Reference values from SPEC.md (test-only; never displayed).
const WIEN_B = 2.897772e-3; // λ_max T, m K
const WIEN_F_OVER_T = 5.8789e10; // f_max / T, Hz/K

const g = buildModeTable(R_MAX);
const TEMPS = [3000, 4000, 5772, 8000, 9500];

describe('linear algebra and fit', () => {
  it('solveLinear needs and uses partial pivoting', () => {
    // Zero on the first pivot: fails without row exchange.
    const A = [
      [0, 2, 1],
      [1, 1, 1],
      [2, 1, 3],
    ];
    const xTrue = [1, -2, 3];
    const b = A.map((row) => row.reduce((s, a, j) => s + a * xTrue[j], 0));
    const x = solveLinear(A, b);
    x.forEach((xi, i) => expect(xi).toBeCloseTo(xTrue[i], 12));
  });

  it('fitPolynomial recovers an exact quartic', () => {
    const p = (x: number) => 0.3 - 1.2 * x + 0.7 * x ** 2 + 0.05 * x ** 3 - 0.02 * x ** 4;
    const xs = Array.from({ length: 30 }, (_, i) => -3 + i * 0.4);
    const fit = fitPolynomial(xs, xs.map(p), 4);
    for (const x of [-2.5, 0, 1.7, 8]) expect(evalPoly(fit, x)).toBeCloseTo(p(x), 9);
  });
});

describe('Gate 7: Wien', () => {
  it.each(TEMPS)('T = %i K: λ_max·T within 0.01, f_max/T within 0.02, λ_max·f_max/c = 0.568 ± 0.015', (T) => {
    const w = wienPeaks(g, T);
    const dL = w.lambdaMaxT / WIEN_B - 1;
    const dF = w.fMaxOverT / WIEN_F_OVER_T - 1;
    console.log(
      `[gate7] T=${T} K  λ_max·T ${(dL * 100).toFixed(3)}%  f_max/T ${(dF * 100).toFixed(3)}%  ` +
        `λf/c ${w.productOverC.toFixed(4)}  fit bins ${w.peakF.hi - w.peakF.lo + 1}/${w.peakLambda.hi - w.peakLambda.lo + 1}`,
    );
    expect(Math.abs(dL)).toBeLessThan(0.01);
    expect(Math.abs(dF)).toBeLessThan(0.02);
    expect(Math.abs(w.productOverC - 0.568)).toBeLessThan(0.015);
  });
});
