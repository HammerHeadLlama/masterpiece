import { C, F0, H, K_B, R_MAX, V } from './constants';
import { epsilon, planckOverKT } from './planck';

export interface Binning {
  /** Bin width in |n| units. */
  dR: number;
  /** Lower edge of bin 0 in |n| units. */
  edge0: number;
  nBins: number;
  /** Bin centres in |n| units. */
  centres: Float64Array;
  /** Bin index of each m = |n|^2, or -1 when outside the bins. */
  binOfM: Int32Array;
  /** Largest m the binning covers. */
  mMax: number;
}

/**
 * Bins of width dR in |n| with edges edge0, edge0 + dR, ...
 * Bins are half-open [lo, hi): a mode exactly on an edge belongs to the upper bin.
 */
export function makeBinning(rMax: number = R_MAX, dR = 1, edge0 = 0.5): Binning {
  const mMax = rMax * rMax;
  const nBins = Math.ceil((rMax - edge0) / dR);
  const centres = new Float64Array(nBins);
  for (let b = 0; b < nBins; b++) centres[b] = edge0 + (b + 0.5) * dR;
  const binOfM = new Int32Array(mMax + 1);
  for (let m = 0; m <= mMax; m++) {
    const r = Math.sqrt(m); // exact for perfect squares, so edge modes land deterministically
    const b = r < edge0 ? -1 : Math.floor((r - edge0) / dR);
    binOfM[m] = b < nBins ? b : -1;
  }
  return { dR, edge0, nBins, centres, binOfM, mMax };
}

export interface Spectrum {
  /** Bin-centre frequencies, Hz. */
  f: Float64Array;
  /** Spectral energy density per unit frequency, J m^-3 Hz^-1. */
  uf_P: Float64Array;
  uf_RJ: Float64Array;
  /** Spectral energy density per unit wavelength at the bin centre, J m^-4. */
  ul_P: Float64Array;
  ul_RJ: Float64Array;
}

/** Binned mode sums, Planck and equipartition, over modes with |n|^2 <= rc^2. */
export function spectrum(g: Float64Array, bins: Binning, T: number, rc = Math.sqrt(bins.mMax)): Spectrum {
  const n = bins.nBins;
  const eP = new Float64Array(n);
  const eRJ = new Float64Array(n);
  const eps = epsilon(T);
  const mTop = Math.min(Math.floor(rc * rc), bins.mMax, g.length - 1);
  for (let m = 1; m <= mTop; m++) {
    const w = g[m];
    const b = bins.binOfM[m];
    if (w === 0 || b < 0) continue;
    eRJ[b] += w;
    eP[b] += w * planckOverKT(eps * Math.sqrt(m));
  }
  const kT = K_B * T;
  const norm = kT / (V * bins.dR * F0);
  const f = new Float64Array(n);
  const uf_P = new Float64Array(n);
  const uf_RJ = new Float64Array(n);
  const ul_P = new Float64Array(n);
  const ul_RJ = new Float64Array(n);
  for (let b = 0; b < n; b++) {
    const fb = bins.centres[b] * F0;
    const toLambda = (fb * fb) / C;
    f[b] = fb;
    uf_P[b] = eP[b] * norm;
    uf_RJ[b] = eRJ[b] * norm;
    ul_P[b] = uf_P[b] * toLambda;
    ul_RJ[b] = uf_RJ[b] * toLambda;
  }
  return { f, uf_P, uf_RJ, ul_P, ul_RJ };
}

/** Continuum Planck density per unit frequency, J m^-3 Hz^-1. */
export function planckUf(f: number, T: number): number {
  const x = (H * f) / (K_B * T);
  return ((8 * Math.PI * f * f) / C ** 3) * K_B * T * planckOverKT(x);
}

/** Continuum Rayleigh–Jeans density per unit frequency, J m^-3 Hz^-1. */
export function rayleighJeansUf(f: number, T: number): number {
  return (8 * Math.PI * f * f * K_B * T) / C ** 3;
}

/** Average of the continuum Planck density over [fLo, fHi], composite Simpson. */
export function planckUfBinAverage(fLo: number, fHi: number, T: number, intervals = 200): number {
  const n = intervals % 2 === 0 ? intervals : intervals + 1;
  const h = (fHi - fLo) / n;
  let s = planckUf(fLo, T) + planckUf(fHi, T);
  for (let i = 1; i < n; i++) s += (i % 2 === 1 ? 4 : 2) * planckUf(fLo + i * h, T);
  return (s * h) / 3 / (fHi - fLo);
}
