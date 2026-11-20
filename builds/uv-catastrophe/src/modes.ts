import { R_MAX } from './constants';

/**
 * Number of independent polarisations of the standing wave n = (nx, ny, nz).
 * No zero index: 2. Exactly one zero: 1 (only one field component survives).
 * Two or more zeros: 0 (no field).
 */
export function polarisationWeight(nx: number, ny: number, nz: number): number {
  const zeros = (nx === 0 ? 1 : 0) + (ny === 0 ? 1 : 0) + (nz === 0 ? 1 : 0);
  return zeros === 0 ? 2 : zeros === 1 ? 1 : 0;
}

/**
 * Mode table g[m] = sum of w(n) over all n >= 0 with |n|^2 = m, for m = 0 ... rMax^2.
 * Built once; temperature never touches it.
 */
export function buildModeTable(rMax: number = R_MAX): Float64Array {
  const mMax = rMax * rMax;
  const g = new Float64Array(mMax + 1);
  for (let nx = 0; nx <= rMax; nx++) {
    const rx = mMax - nx * nx;
    for (let ny = 0; ny * ny <= rx; ny++) {
      const rxy = rx - ny * ny;
      for (let nz = 0; nz * nz <= rxy; nz++) {
        g[nx * nx + ny * ny + nz * nz] += polarisationWeight(nx, ny, nz);
      }
    }
  }
  return g;
}

/** N(Rc): number of modes (polarisations counted) with |n| <= Rc. */
export function countModes(g: Float64Array, rc: number): number {
  const mTop = Math.min(Math.floor(rc * rc), g.length - 1);
  let n = 0;
  for (let m = 0; m <= mTop; m++) n += g[m];
  return n;
}
