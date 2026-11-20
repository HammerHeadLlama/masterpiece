// Milestone 1 stub: every value shown is computed by the functions under test.
import { R_MAX } from './constants';
import { buildModeTable } from './modes';
import { wienPeaks } from './peak';
import { epsilon, referenceEnergy, totals } from './planck';

const T = 5772;
const t0 = performance.now();
const g = buildModeTable(R_MAX);
const buildMs = performance.now() - t0;
const tot = totals(g, T, R_MAX);
const wien = wienPeaks(g, T);

const rows: [string, string][] = [
  ['T', `${T} K`],
  ['Mode table build', `${buildMs.toFixed(1)} ms`],
  [`Modes counted (|n| ≤ ${R_MAX})`, tot.modes.toLocaleString('en-US')],
  ['U_RJ', `${tot.U_RJ.toExponential(4)} J`],
  ['U_P', `${tot.U_P.toExponential(4)} J`],
  ['U_P / (aT⁴V)', (tot.U_P / referenceEnergy(T)).toFixed(5)],
  ['ε', epsilon(T).toFixed(5)],
  ['f_max', `${(wien.fMax / 1e12).toFixed(1)} THz`],
  ['λ_max', `${(wien.lambdaMax * 1e9).toFixed(1)} nm`],
  ['λ_max·T', `${wien.lambdaMaxT.toExponential(5)} m K`],
  ['f_max / T', `${wien.fMaxOverT.toExponential(5)} Hz/K`],
  ['λ_max·f_max / c', wien.productOverC.toFixed(4)],
];

const dl = document.getElementById('readouts');
if (dl) {
  for (const [k, v] of rows) {
    const dt = document.createElement('dt');
    dt.textContent = k;
    const dd = document.createElement('dd');
    dd.textContent = v;
    dl.append(dt, dd);
  }
}
