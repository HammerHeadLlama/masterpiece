import { C, R_MAX } from './constants';
import { makeBinning, spectrum, type Binning } from './spectrum';

/** Solve A x = b by Gaussian elimination with partial pivoting. Inputs are not modified. */
export function solveLinear(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row) => row.slice());
  const v = b.slice();
  for (let i = 0; i < n; i++) {
    let p = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[p][i])) p = r;
    if (M[p][i] === 0) throw new Error('solveLinear: singular matrix');
    [M[i], M[p]] = [M[p], M[i]];
    [v[i], v[p]] = [v[p], v[i]];
    for (let r = i + 1; r < n; r++) {
      const k = M[r][i] / M[i][i];
      for (let c = i; c < n; c++) M[r][c] -= k * M[i][c];
      v[r] -= k * v[i];
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = v[i];
    for (let c = i + 1; c < n; c++) s -= M[i][c] * x[c];
    x[i] = s / M[i][i];
  }
  return x;
}

export interface PolyFit {
  /** Coefficients in the rescaled variable t in [-1, 1], lowest order first. */
  coeffs: number[];
  xMin: number;
  xMax: number;
}

/** Map x to t in [-1, 1] over the fit range. */
export function toT(fit: PolyFit, x: number): number {
  return (2 * (x - fit.xMin)) / (fit.xMax - fit.xMin) - 1;
}

/** Evaluate the fitted polynomial at x (original variable). */
export function evalPoly(fit: PolyFit, x: number): number {
  const t = toT(fit, x);
  let s = 0;
  for (let i = fit.coeffs.length - 1; i >= 0; i--) s = s * t + fit.coeffs[i];
  return s;
}

/** Least-squares polynomial fit, x rescaled to [-1, 1] before forming the normal equations. */
export function fitPolynomial(xs: ArrayLike<number>, ys: ArrayLike<number>, degree: number): PolyFit {
  const n = xs.length;
  if (n < degree + 1) throw new Error(`fitPolynomial: need at least ${degree + 1} points, got ${n}`);
  let xMin = Infinity;
  let xMax = -Infinity;
  for (let i = 0; i < n; i++) {
    xMin = Math.min(xMin, xs[i]);
    xMax = Math.max(xMax, xs[i]);
  }
  const k = degree + 1;
  const A = Array.from({ length: k }, () => new Array<number>(k).fill(0));
  const b = new Array<number>(k).fill(0);
  const pw = new Array<number>(k);
  for (let i = 0; i < n; i++) {
    const t = (2 * (xs[i] - xMin)) / (xMax - xMin) - 1;
    pw[0] = 1;
    for (let j = 1; j < k; j++) pw[j] = pw[j - 1] * t;
    for (let r = 0; r < k; r++) {
      b[r] += pw[r] * ys[i];
      for (let c = 0; c < k; c++) A[r][c] += pw[r] * pw[c];
    }
  }
  return { coeffs: solveLinear(A, b), xMin, xMax };
}

export interface Peak {
  /** Fitted peak frequency, Hz. */
  fPeak: number;
  /** Index range of the bins used in the fit, inclusive. */
  lo: number;
  hi: number;
  /** Index of the largest bin. */
  iMax: number;
}

const GRID_POINTS = 4001;

/**
 * Peak of u(f): quartic least-squares fit in (ln f, ln u) over the contiguous run of bins
 * around the maximum with u > 0.5 u_max, maximised on a fine grid over that run.
 */
export function findPeak(f: ArrayLike<number>, u: ArrayLike<number>): Peak {
  let iMax = 0;
  for (let i = 1; i < u.length; i++) if (u[i] > u[iMax]) iMax = i;
  const threshold = 0.5 * u[iMax];
  let lo = iMax;
  let hi = iMax;
  while (lo > 0 && u[lo - 1] > threshold) lo--;
  while (hi < u.length - 1 && u[hi + 1] > threshold) hi++;
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = lo; i <= hi; i++) {
    xs.push(Math.log(f[i]));
    ys.push(Math.log(u[i]));
  }
  const fit = fitPolynomial(xs, ys, 4);
  let best = fit.xMin;
  let bestVal = -Infinity;
  for (let j = 0; j < GRID_POINTS; j++) {
    const x = fit.xMin + ((fit.xMax - fit.xMin) * j) / (GRID_POINTS - 1);
    const v = evalPoly(fit, x);
    if (v > bestVal) {
      bestVal = v;
      best = x;
    }
  }
  return { fPeak: Math.exp(best), lo, hi, iMax };
}

export interface WienResult {
  /** Peak of u_f, Hz. */
  fMax: number;
  /** Peak of u_λ, m. */
  lambdaMax: number;
  /** λ_max T, m K. */
  lambdaMaxT: number;
  /** f_max / T, Hz/K. */
  fMaxOverT: number;
  /** λ_max f_max / c. */
  productOverC: number;
  /** Peaks with their fit ranges, for the plot markers. */
  peakF: Peak;
  peakLambda: Peak;
}

let defaultBinning: Binning | null = null;

/** Wien peaks from the full mode table (cutoff at R_MAX), bins of width 1. */
export function wienPeaks(g: Float64Array, T: number, bins?: Binning): WienResult {
  const b = bins ?? (defaultBinning ??= makeBinning(R_MAX, 1, 0.5));
  const s = spectrum(g, b, T);
  const peakF = findPeak(s.f, s.uf_P);
  const peakLambda = findPeak(s.f, s.ul_P);
  const fMax = peakF.fPeak;
  const lambdaMax = C / peakLambda.fPeak;
  return {
    fMax,
    lambdaMax,
    lambdaMaxT: lambdaMax * T,
    fMaxOverT: fMax / T,
    productOverC: (lambdaMax * fMax) / C,
    peakF,
    peakLambda,
  };
}
