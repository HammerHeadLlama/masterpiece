import { A_RAD, C, H, K_B, L, V } from './constants';

/**
 * Mean Planck energy of one mode in units of kT: x / (e^x - 1), x = hf/kT.
 * Uses expm1 so x -> 0 keeps full precision; x = 0 gives the classical limit 1.
 * For large x, expm1 overflows to Infinity and the result is a finite 0.
 */
export function planckOverKT(x: number): number {
  if (x === 0) return 1;
  return x / Math.expm1(x);
}

/** epsilon = hc / (2 L k T), so that x_m = epsilon * sqrt(m). */
export function epsilon(T: number): number {
  return (H * C) / (2 * L * K_B * T);
}

/** Inverse of epsilon(T). */
export function temperatureFromEpsilon(eps: number): number {
  return (H * C) / (2 * L * K_B * eps);
}

export interface Totals {
  /** N(Rc), polarisations counted. */
  modes: number;
  /** Equipartition total kT * N(Rc), J. */
  U_RJ: number;
  /** Planck total, J. */
  U_P: number;
}

/** Totals over all modes with |n|^2 <= Rc^2, one pass over the mode table. */
export function totals(g: Float64Array, T: number, rc: number): Totals {
  const eps = epsilon(T);
  const mTop = Math.min(Math.floor(rc * rc), g.length - 1);
  let n = 0;
  let p = 0;
  for (let m = 0; m <= mTop; m++) {
    const w = g[m];
    if (w === 0) continue;
    n += w;
    p += w * planckOverKT(eps * Math.sqrt(m));
  }
  const kT = K_B * T;
  return { modes: n, U_RJ: kT * n, U_P: kT * p };
}

/** Continuum Stefan–Boltzmann energy a T^4 V, J. */
export function referenceEnergy(T: number): number {
  return A_RAD * T ** 4 * V;
}

/** Finite-cavity prediction for U_P / (a T^4 V) - 1 when the cutoff tail is negligible. */
export function predictedDeficit(eps: number): number {
  return (-15 * eps * eps) / (4 * Math.PI ** 3);
}
