import { describe, expect, it } from 'vitest';
import { F0, R_MAX, V } from '../src/constants';
import { buildModeTable } from '../src/modes';
import { epsilon, totals } from '../src/planck';
import { makeBinning, planckUf, planckUfBinAverage, rayleighJeansUf, spectrum } from '../src/spectrum';

const g = buildModeTable(R_MAX);

describe('binning', () => {
  it('ΔR = 1 bins are centred on integers with edges at half-integers', () => {
    const b = makeBinning(R_MAX, 1, 0.5);
    expect(b.nBins).toBe(160);
    expect(b.centres[0]).toBe(1);
    expect(b.centres[159]).toBe(160);
    expect(b.binOfM[0]).toBe(-1); // |n| = 0 is below the first edge
    expect(b.binOfM[1]).toBe(0);
    expect(b.binOfM[2]).toBe(0); // |n| = 1.414 < 1.5
    expect(b.binOfM[3]).toBe(1); // |n| = 1.732
  });

  it('bins are half-open [lo, hi): a mode on an edge goes to the upper bin', () => {
    const b = makeBinning(R_MAX, 2, 1);
    expect(b.binOfM[9]).toBe(1); // |n| = 3 is the lower edge of [3, 5)
    expect(b.binOfM[25]).toBe(2); // |n| = 5 is the lower edge of [5, 7)
    expect(b.binOfM[24]).toBe(1);
  });
});

describe('spectrum bookkeeping', () => {
  it.each([3000, 5772, 9500])('T = %i K: bin sums reproduce the M1 totals', (T) => {
    const b = makeBinning(R_MAX, 1, 0.5);
    for (const rc of [40, 160]) {
      const s = spectrum(g, b, T, rc);
      const scale = V * b.dR * F0;
      let eP = 0;
      let eRJ = 0;
      for (let i = 0; i < b.nBins; i++) {
        eP += s.uf_P[i] * scale;
        eRJ += s.uf_RJ[i] * scale;
      }
      const tot = totals(g, T, rc);
      expect(Math.abs(eP / tot.U_P - 1)).toBeLessThan(1e-12);
      expect(Math.abs(eRJ / tot.U_RJ - 1)).toBeLessThan(1e-12);
    }
  });

  it('continuum Planck tends to Rayleigh–Jeans at low frequency', () => {
    const T = 5772;
    const f = 1e9; // x ≈ 8e-6
    expect(Math.abs(planckUf(f, T) / rayleighJeansUf(f, T) - 1)).toBeLessThan(1e-5);
  });
});

describe('Gate 6: spectrum shape', () => {
  it.each([5772, 9500])('T = %i K: ΔR = 2 bins with centre x in [1, 10] within 0.02 of the continuum', (T) => {
    const b = makeBinning(R_MAX, 2, 1);
    const s = spectrum(g, b, T);
    const eps = epsilon(T);
    let worst = 0;
    let checked = 0;
    for (let i = 0; i < b.nBins; i++) {
      const x = eps * b.centres[i];
      if (x < 1 || x > 10) continue;
      const lo = (b.centres[i] - b.dR / 2) * F0;
      const hi = (b.centres[i] + b.dR / 2) * F0;
      const d = s.uf_P[i] / planckUfBinAverage(lo, hi, T) - 1;
      if (Math.abs(d) > Math.abs(worst)) worst = d;
      checked++;
      expect(Math.abs(d)).toBeLessThan(0.02);
    }
    console.log(`[gate6] T=${T} K  ${checked} bins  worst ${(worst * 100).toFixed(3)}%`);
    expect(checked).toBeGreaterThan(10);
  });
});
