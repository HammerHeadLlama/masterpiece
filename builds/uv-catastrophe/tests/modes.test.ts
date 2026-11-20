import { describe, expect, it } from 'vitest';
import { R_MAX } from '../src/constants';
import { buildModeTable, countModes, polarisationWeight } from '../src/modes';

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

describe('Gate 1: mode table', () => {
  it('has length R_MAX^2 + 1', () => {
    expect(g.length).toBe(R_MAX * R_MAX + 1);
  });

  it('polarisation weights follow the zero-index rule', () => {
    expect(polarisationWeight(1, 2, 3)).toBe(2);
    expect(polarisationWeight(0, 2, 3)).toBe(1);
    expect(polarisationWeight(0, 0, 3)).toBe(0);
    expect(polarisationWeight(0, 0, 0)).toBe(0);
  });

  it('g[1..6] matches the hand count 0, 3, 2, 0, 6, 6', () => {
    expect(Array.from(g.slice(1, 7))).toEqual([0, 3, 2, 0, 6, 6]);
  });

  it('sum of g for m <= 160^2 is exactly 4,288,591', () => {
    expect(countModes(g, 160)).toBe(4288591);
  });
});

describe('Gate 2: Weyl count', () => {
  const weylRel = (rc: number) => countModes(g, rc) / ((Math.PI * rc ** 3) / 3) - 1;

  it('within 1% of pi R^3 / 3 at Rc = 20', () => {
    const d = weylRel(20);
    console.log(`[gate2] N(20)/(πR³/3) − 1 = ${(d * 100).toFixed(4)}%`);
    expect(Math.abs(d)).toBeLessThan(0.01);
  });

  it('within 0.1% of pi R^3 / 3 at Rc = 160', () => {
    const d = weylRel(160);
    console.log(`[gate2] N(160)/(πR³/3) − 1 = ${(d * 100).toFixed(4)}%`);
    expect(Math.abs(d)).toBeLessThan(0.001);
  });

  it('log-log slope of N against Rc over {20, 40, 80, 160} is 3 ± 0.01', () => {
    const rcs = [20, 40, 80, 160];
    const slope = olsSlope(
      rcs.map(Math.log),
      rcs.map((r) => Math.log(countModes(g, r))),
    );
    console.log(`[gate2] slope d ln N / d ln Rc = ${slope.toFixed(5)}`);
    expect(Math.abs(slope - 3)).toBeLessThan(0.01);
  });
});
