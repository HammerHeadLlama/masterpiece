import { C, F0, L, R_MAX } from './constants';
import { buildModeTable } from './modes';
import { wienPeaks, type WienResult } from './peak';
import { cumulativeTotals, epsilon, referenceEnergy, totals, type CumulativeTotals } from './planck';
import { drawSpectrum, drawTotals, readTheme, sci, type SpectrumView } from './plot';
import { makeBinning, planckUf, rayleighJeansUf, spectrum } from './spectrum';

// Spec parameters for the controls (SPEC.md, assumptions 2 and UI). Not readouts.
const T_MIN = 3000;
const T_MAX = 9500;
const T_DEFAULT = 5772;
const RC_MIN = 5;
const RC_DEFAULT = 20;
const VISIBLE_THZ: [number, number] = [430, 750];
const TOTALS_Y_MAX = 2.5; // in units of aT⁴V
const SPECTRUM_HEADROOM = 1.3;
const CURVE_SAMPLES = 600;

const $ = <T extends HTMLElement>(id: string) => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const g = buildModeTable(R_MAX);
const bins = makeBinning(R_MAX, 1, 0.5);
const xMaxTHz = (R_MAX * F0) / 1e12;

interface PerT {
  T: number;
  cum: CumulativeTotals;
  ref: number;
  wien: WienResult;
  yMax: number;
  curveTHz: Float64Array;
  curveP: Float64Array;
  curveRJ: Float64Array;
}

let perT: PerT | null = null;

function computePerT(T: number): PerT {
  const cum = cumulativeTotals(g, T, R_MAX);
  const wien = wienPeaks(g, T, bins);
  const full = spectrum(g, bins, T);
  let peak = 0;
  for (const u of full.uf_P) peak = Math.max(peak, u);
  const curveTHz = new Float64Array(CURVE_SAMPLES);
  const curveP = new Float64Array(CURVE_SAMPLES);
  const curveRJ = new Float64Array(CURVE_SAMPLES);
  for (let i = 0; i < CURVE_SAMPLES; i++) {
    const fTHz = (xMaxTHz * (i + 1)) / CURVE_SAMPLES;
    curveTHz[i] = fTHz;
    curveP[i] = planckUf(fTHz * 1e12, T);
    curveRJ[i] = rayleighJeansUf(fTHz * 1e12, T);
  }
  return { T, cum, ref: referenceEnergy(T), wien, yMax: peak * SPECTRUM_HEADROOM, curveTHz, curveP, curveRJ };
}

// ---------------------------------------------------------------- controls

const tInput = $<HTMLInputElement>('temp');
const rcInput = $<HTMLInputElement>('cutoff');
/** Integer URL parameter (?T=…&rc=…), clamped to [min, max]; the default when missing or invalid. */
function intParam(name: string, min: number, max: number, fallback: number): number {
  const raw = new URLSearchParams(window.location.search).get(name);
  const v = raw === null ? NaN : Math.round(Number(raw));
  return Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
}

const T_START = intParam('T', T_MIN, T_MAX, T_DEFAULT);
const RC_START = intParam('rc', RC_MIN, R_MAX, RC_DEFAULT);
Object.assign(tInput, { min: String(T_MIN), max: String(T_MAX), step: '1', value: String(T_START) });
Object.assign(rcInput, { min: String(RC_MIN), max: String(R_MAX), step: '1', value: String(RC_START) });

$('caption').textContent =
  `A perfectly conducting cube, L = ${(L * 1e6).toFixed(0)} µm. Every standing-wave mode up to the cutoff is counted ` +
  `and given its thermal energy twice: kT each (classical equipartition) and kT·x/(eˣ − 1) (Planck).`;

const spectrumCanvas = $<HTMLCanvasElement>('spectrum');
const totalsCanvas = $<HTMLCanvasElement>('totals');

function setText(id: string, text: string) {
  $(id).textContent = text;
}

function setDim(dtId: string, dim: boolean, note: string) {
  const dt = $(dtId);
  dt.classList.toggle('dimmed', dim);
  const dd = dt.nextElementSibling as HTMLElement;
  let n = dd.querySelector('.note');
  if (dim) {
    if (!n) {
      n = document.createElement('span');
      n.className = 'note';
      dd.append(n);
    }
    n.textContent = note;
  } else n?.remove();
}

// ---------------------------------------------------------------- render

function render() {
  const T = Number(tInput.value);
  const rc = Number(rcInput.value);
  if (!perT || perT.T !== T) perT = computePerT(T);
  const p = perT;
  const tot = totals(g, T, rc);
  const spec = spectrum(g, bins, T, rc);
  const lambdaMinNm = ((2 * L) / rc) * 1e9;

  // control labels
  setText('t-out', `${T} K`);
  setText('rc-out', `Rc = ${rc}`);
  setText('lmin-out', `λ_min = 2L/Rc = ${lambdaMinNm.toFixed(0)} nm, f_cut = ${((rc * F0) / 1e12).toFixed(0)} THz`);

  // readouts
  setText('r-modes', tot.modes.toLocaleString('en-US'));
  setText('r-urj', `${sci(tot.U_RJ)} J`);
  setText('r-up', `${sci(tot.U_P)} J`);
  setText('r-ratio', (tot.U_P / p.ref).toFixed(4));
  setText('r-eps', epsilon(T).toFixed(4));

  const w = p.wien;
  const fPeakIndex = w.fMax / F0;
  const lPeakIndex = C / w.lambdaMax / F0;
  const fDim = rc < fPeakIndex;
  const lDim = rc < lPeakIndex;
  setText('r-lt', `${(w.lambdaMaxT * 1e3).toFixed(4)} mm K`);
  setText('r-ft', `${sci(w.fMaxOverT, 4)} Hz/K`);
  setText('r-prod', w.productOverC.toFixed(4));
  setDim('d-lt', lDim, `peak (${(w.lambdaMax * 1e9).toFixed(0)} nm) beyond cutoff`);
  setDim('d-ft', fDim, `peak (${(w.fMax / 1e12).toFixed(0)} THz) beyond cutoff`);
  setDim('d-prod', lDim || fDim, 'a peak is beyond cutoff');

  const th = readTheme();
  const fTHz = new Float64Array(bins.nBins).map((_, i) => spec.f[i] / 1e12);
  const view: SpectrumView = {
    fTHz,
    binTHz: (bins.dR * F0) / 1e12,
    ufP: spec.uf_P,
    ufRJ: spec.uf_RJ,
    curveTHz: p.curveTHz,
    curveP: p.curveP,
    curveRJ: p.curveRJ,
    xMaxTHz,
    yMax: p.yMax,
    visibleTHz: VISIBLE_THZ,
    cutoffTHz: (rc * F0) / 1e12,
    fMaxTHz: w.fMax / 1e12,
    fLambdaTHz: C / w.lambdaMax / 1e12,
    fMaxDim: fDim,
    fLambdaDim: lDim,
  };
  drawSpectrum(spectrumCanvas, view, th);

  const rjRatio = p.cum.U_RJ.map((u) => u / p.ref);
  const pRatio = p.cum.U_P.map((u) => u / p.ref);
  drawTotals(totalsCanvas, { rMax: R_MAX, rc, rjRatio, pRatio, yMax: TOTALS_Y_MAX, lambdaMinNm }, th);
}

let pending = false;
function schedule() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => {
    pending = false;
    render();
  });
}

tInput.addEventListener('input', schedule);
rcInput.addEventListener('input', schedule);
new ResizeObserver(schedule).observe(spectrumCanvas);
new ResizeObserver(schedule).observe(totalsCanvas);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', schedule);
render();
