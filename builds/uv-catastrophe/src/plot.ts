// Canvas 2D drawing. No physics here: every value drawn is passed in, computed elsewhere.

export interface Theme {
  bg: string;
  fg: string;
  muted: string;
  dim: string;
  grid: string;
  planck: string;
  classical: string;
  /** Text halo colour (the panel), so labels stay legible over lines and bars. */
  halo: string;
  font: string;
  /** Type sizes in CSS px. */
  textXs: number;
  textSm: number;
  /** Opacities. */
  barAlpha: number;
  bandAlpha: number;
  shadeAlpha: number;
}

/** All canvas colours, fonts, sizes and opacities come from the CSS tokens (DESIGN.md). */
export function readTheme(): Theme {
  const s = getComputedStyle(document.documentElement);
  const v = (name: string) => s.getPropertyValue(name).trim();
  const n = (name: string, fallback: number) => {
    const x = parseFloat(v(name));
    return Number.isFinite(x) ? x : fallback;
  };
  return {
    bg: v('--panel'),
    fg: v('--fg'),
    muted: v('--muted'),
    dim: v('--dim') || v('--muted'),
    grid: v('--grid'),
    planck: v('--planck'),
    classical: v('--classical'),
    halo: v('--halo') || v('--panel'),
    font: v('--font-ui') || 'system-ui, sans-serif',
    textXs: n('--text-xs', 12),
    textSm: n('--text-sm', 14),
    barAlpha: n('--bar-alpha', 0.7),
    bandAlpha: n('--band-alpha', 0.18),
    shadeAlpha: n('--shade-alpha', 0.5),
  };
}

interface TextOpts {
  color: string;
  size?: number;
  weight?: number;
  align?: CanvasTextAlign;
  baseline?: CanvasTextBaseline;
}

/** Canvas text with a panel-coloured halo behind it. */
function text(ctx: CanvasRenderingContext2D, th: Theme, s: string, x: number, y: number, o: TextOpts) {
  ctx.save();
  ctx.font = `${o.weight ?? 400} ${o.size ?? th.textXs}px ${th.font}`;
  ctx.textAlign = o.align ?? 'left';
  ctx.textBaseline = o.baseline ?? 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = th.halo;
  ctx.strokeText(s, x, y);
  ctx.fillStyle = o.color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

function textWidth(ctx: CanvasRenderingContext2D, th: Theme, s: string, size: number, weight = 400): number {
  ctx.save();
  ctx.font = `${weight} ${size}px ${th.font}`;
  const wd = ctx.measureText(s).width;
  ctx.restore();
  return wd;
}

/** Size the backing store to the CSS box at the device pixel ratio; returns a context in CSS pixels. */
export function fitCanvas(canvas: HTMLCanvasElement): { ctx: CanvasRenderingContext2D; w: number; h: number } {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const bw = Math.max(1, Math.round(w * dpr));
  const bh = Math.max(1, Math.round(h * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

/** Round tick positions covering [min, max], steps of 1, 2 or 5 × 10^k. */
export function niceTicks(min: number, max: number, count = 5): number[] {
  const span = max - min;
  if (!(span > 0)) return [min];
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const r = raw / mag;
  const step = (r < 1.5 ? 1 : r < 3.5 ? 2 : r < 7.5 ? 5 : 10) * mag;
  const out: number[] = [];
  for (let t = Math.ceil(min / step - 1e-9) * step; t <= max + step * 1e-9; t += step) {
    out.push(Math.abs(t) < step * 1e-9 ? 0 : t);
  }
  return out;
}

const SUP: Record<string, string> = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻',
};
export const superscript = (n: number) => String(n).split('').map((c) => SUP[c] ?? c).join('');

/** "8.382 × 10⁻¹⁶" */
export function sci(v: number, digits = 3): string {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  const m = v / 10 ** e;
  return `${m.toFixed(digits)} × 10${superscript(e)}`;
}

/** Trim a tick value for display. */
function tickLabel(t: number): string {
  if (t === 0) return '0';
  const a = Math.abs(t);
  if (a >= 1e6 || a < 0.01) return t.toExponential(0);
  return String(Number(t.toPrecision(6)));
}

interface Frame {
  left: number;
  right: number;
  top: number;
  bottom: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}
const X = (f: Frame, v: number) => f.left + ((v - f.xMin) / (f.xMax - f.xMin)) * (f.right - f.left);
const Y = (f: Frame, v: number) => f.bottom - ((v - f.yMin) / (f.yMax - f.yMin)) * (f.bottom - f.top);

const MARGIN = { left: 58, right: 18, top: 30, bottom: 42 };

function makeFrame(
  w: number,
  h: number,
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  top = MARGIN.top,
): Frame {
  return {
    left: MARGIN.left,
    right: w - MARGIN.right,
    top,
    bottom: h - MARGIN.bottom,
    xMin,
    xMax,
    yMin,
    yMax,
  };
}

function clear(ctx: CanvasRenderingContext2D, w: number, h: number, th: Theme) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = th.bg;
  ctx.fillRect(0, 0, w, h);
}

/** Grid, axes, tick labels and axis titles. yScale divides tick values for display. */
function drawAxes(
  ctx: CanvasRenderingContext2D,
  f: Frame,
  th: Theme,
  xTitle: string,
  yTitle: string,
  yScale = 1,
) {
  ctx.font = `${th.textXs}px ${th.font}`;
  ctx.lineWidth = 1;
  // tick density follows the frame so labels never collide on narrow canvases
  const xCount = Math.max(3, Math.min(8, Math.floor((f.right - f.left) / 72)));
  const yCount = Math.max(3, Math.min(5, Math.floor((f.bottom - f.top) / 44)));
  const xt = niceTicks(f.xMin, f.xMax, xCount);
  const yt = niceTicks(f.yMin / yScale, f.yMax / yScale, yCount);
  ctx.strokeStyle = th.grid;
  ctx.beginPath();
  for (const t of xt) {
    const x = Math.round(X(f, t)) + 0.5;
    ctx.moveTo(x, f.top);
    ctx.lineTo(x, f.bottom);
  }
  for (const t of yt) {
    const y = Math.round(Y(f, t * yScale)) + 0.5;
    ctx.moveTo(f.left, y);
    ctx.lineTo(f.right, y);
  }
  ctx.stroke();

  ctx.strokeStyle = th.muted;
  ctx.beginPath();
  ctx.moveTo(f.left + 0.5, f.top);
  ctx.lineTo(f.left + 0.5, f.bottom + 0.5);
  ctx.lineTo(f.right, f.bottom + 0.5);
  ctx.stroke();

  ctx.fillStyle = th.muted;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const t of xt) ctx.fillText(tickLabel(t), X(f, t), f.bottom + 5);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (const t of yt) ctx.fillText(tickLabel(t), f.left - 6, Y(f, t * yScale));

  ctx.fillStyle = th.fg;
  ctx.font = `${th.textXs}px ${th.font}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(xTitle, (f.left + f.right) / 2, f.bottom + 38);
  ctx.save();
  ctx.translate(14, (f.top + f.bottom) / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textBaseline = 'middle';
  ctx.fillText(yTitle, 0, 0);
  ctx.restore();
}

function withClip(ctx: CanvasRenderingContext2D, f: Frame, draw: () => void) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(f.left, f.top - 1, f.right - f.left, f.bottom - f.top + 1);
  ctx.clip();
  draw();
  ctx.restore();
}

function polyline(ctx: CanvasRenderingContext2D, f: Frame, xs: ArrayLike<number>, ys: ArrayLike<number>, n = xs.length) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const x = X(f, xs[i]);
    const y = Y(f, Math.min(ys[i], f.yMax * 1.5));
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

/** Upward arrow at the top edge of the frame, with a label kept inside the frame. */
function clipArrow(ctx: CanvasRenderingContext2D, f: Frame, x: number, color: string, label: string, th: Theme) {
  const y = f.top + 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x - 6, y + 3);
  ctx.lineTo(x + 6, y + 3);
  ctx.closePath();
  ctx.fill();
  const size = f.right - f.left < 320 ? th.textXs : th.textSm;
  const wd = textWidth(ctx, th, label, size, 600);
  let lx = x + 10 + wd < f.right - 4 ? x + 10 : x - 10 - wd;
  lx = Math.max(f.left + 6, Math.min(lx, f.right - 4 - wd));
  text(ctx, th, label, lx, y + 12, { color, size, weight: 600, baseline: 'middle' });
}

function legend(ctx: CanvasRenderingContext2D, f: Frame, th: Theme, items: { label: string; color: string; kind: 'fill' | 'line' | 'thin' | 'dash' | 'dot' }[]) {
  ctx.font = `11px ${th.font}`;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  let x = f.left;
  const y = 14;
  for (const it of items) {
    ctx.strokeStyle = it.color;
    ctx.fillStyle = it.color;
    ctx.lineWidth = it.kind === 'line' ? 2 : 1.25;
    if (it.kind === 'fill') {
      ctx.globalAlpha = 0.6;
      ctx.fillRect(x, y - 5, 14, 10);
      ctx.globalAlpha = 1;
    } else {
      ctx.setLineDash(it.kind === 'dash' ? [5, 3] : it.kind === 'dot' ? [1.5, 2.5] : []);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 16, y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.fillStyle = th.fg;
    ctx.fillText(it.label, x + 20, y);
    x += 26 + ctx.measureText(it.label).width + 10;
  }
}

// ---------------------------------------------------------------- spectrum panel

export interface SpectrumView {
  /** Bin centres and width, THz. */
  fTHz: Float64Array;
  binTHz: number;
  /** Binned densities, J m^-3 Hz^-1. */
  ufP: Float64Array;
  ufRJ: Float64Array;
  /** Continuum curves sampled at curveTHz. */
  curveTHz: Float64Array;
  curveP: Float64Array;
  curveRJ: Float64Array;
  xMaxTHz: number;
  yMax: number;
  visibleTHz: [number, number];
  cutoffTHz: number;
  fMaxTHz: number;
  fLambdaTHz: number;
  fMaxDim: boolean;
  fLambdaDim: boolean;
}

function visibleBand(ctx: CanvasRenderingContext2D, f: Frame, lo: number, hi: number) {
  const x0 = X(f, lo);
  const x1 = X(f, hi);
  const g = ctx.createLinearGradient(x0, 0, x1, 0);
  // low frequency (red) to high frequency (violet)
  const stops = ['#ff2a2a', '#ff8c00', '#ffe600', '#2ee05a', '#19c8ff', '#3a5bff', '#9b3cff'];
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.save();
  ctx.globalAlpha = 0.16;
  ctx.fillStyle = g;
  ctx.fillRect(x0, f.top, x1 - x0, f.bottom - f.top);
  ctx.restore();
}

function vMarker(ctx: CanvasRenderingContext2D, f: Frame, x: number, label: string, th: Theme, dim: boolean, row: number) {
  const px = Math.round(X(f, x)) + 0.5;
  ctx.save();
  ctx.globalAlpha = dim ? 0.3 : 1;
  ctx.strokeStyle = th.fg;
  ctx.setLineDash([4, 3]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  const ly = f.top + 34 + row * 15;
  ctx.moveTo(px, ly);
  ctx.lineTo(px, f.bottom);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = th.fg;
  ctx.font = `11px ${th.font}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, px + 4, ly);
  ctx.restore();
}

export function drawSpectrum(canvas: HTMLCanvasElement, v: SpectrumView, th: Theme) {
  const { ctx, w, h } = fitCanvas(canvas);
  clear(ctx, w, h, th);
  const f = makeFrame(w, h, 0, v.xMaxTHz, 0, v.yMax);
  const exp = Math.floor(Math.log10(v.yMax));
  visibleBand(ctx, f, v.visibleTHz[0], v.visibleTHz[1]);
  drawAxes(ctx, f, th, 'frequency f (THz)', `u_f  (10${superscript(exp)} J m⁻³ Hz⁻¹)`, 10 ** exp);

  withClip(ctx, f, () => {
    // region above the cutoff
    const xc = X(f, v.cutoffTHz);
    ctx.fillStyle = th.grid;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(xc, f.top, f.right - xc, f.bottom - f.top);
    ctx.globalAlpha = 1;

    // Planck bars
    ctx.fillStyle = th.planck;
    ctx.globalAlpha = 0.55;
    const half = v.binTHz / 2;
    for (let i = 0; i < v.fTHz.length; i++) {
      if (v.ufP[i] <= 0) continue;
      const x0 = X(f, v.fTHz[i] - half);
      const x1 = X(f, v.fTHz[i] + half);
      const y = Y(f, v.ufP[i]);
      ctx.fillRect(x0, y, Math.max(0.5, x1 - x0 - 0.4), f.bottom - y);
    }
    ctx.globalAlpha = 1;

    // classical bars: step outline
    ctx.strokeStyle = th.classical;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(X(f, v.fTHz[0] - half), Y(f, 0));
    const cap = v.yMax * 1.2;
    for (let i = 0; i < v.fTHz.length; i++) {
      const y = Y(f, Math.min(v.ufRJ[i], cap));
      ctx.lineTo(X(f, v.fTHz[i] - half), y);
      ctx.lineTo(X(f, v.fTHz[i] + half), y);
    }
    ctx.lineTo(X(f, v.fTHz[v.fTHz.length - 1] + half), Y(f, 0));
    ctx.stroke();

    // continuum curves
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = th.planck;
    polyline(ctx, f, v.curveTHz, v.curveP);
    ctx.strokeStyle = th.classical;
    ctx.setLineDash([1.5, 2.5]);
    polyline(ctx, f, v.curveTHz, v.curveRJ);
    ctx.setLineDash([]);

    // cutoff line
    ctx.strokeStyle = th.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(xc) + 0.5, f.top);
    ctx.lineTo(Math.round(xc) + 0.5, f.bottom);
    ctx.stroke();
  });

  ctx.fillStyle = th.muted;
  ctx.font = `11px ${th.font}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  if (X(f, v.cutoffTHz) > f.left + 60) ctx.fillText('cutoff', X(f, v.cutoffTHz) - 4, f.bottom - 4);

  vMarker(ctx, f, v.fMaxTHz, `f_max ${v.fMaxTHz.toFixed(0)} THz`, th, v.fMaxDim, 1);
  vMarker(ctx, f, v.fLambdaTHz, `c/λ_max ${v.fLambdaTHz.toFixed(0)} THz`, th, v.fLambdaDim, 2);

  let firstClip = -1;
  for (let i = 0; i < v.ufRJ.length; i++) {
    if (v.ufRJ[i] > v.yMax) {
      firstClip = i;
      break;
    }
  }
  if (firstClip >= 0) clipArrow(ctx, f, X(f, v.fTHz[firstClip]), th.classical, 'classical bars leave the panel', th);

  legend(ctx, f, th, [
    { label: 'Planck modes', color: th.planck, kind: 'fill' },
    { label: 'classical modes', color: th.classical, kind: 'line' },
    { label: 'Planck continuum', color: th.planck, kind: 'thin' },
    { label: 'Rayleigh–Jeans', color: th.classical, kind: 'dot' },
  ]);
}

// ---------------------------------------------------------------- total-energy panel

export interface TotalsView {
  rMax: number;
  rc: number;
  /** U(R)/(aT⁴V) for R = 0 ... rMax. */
  rjRatio: Float64Array;
  pRatio: Float64Array;
  yMax: number;
  lambdaMinNm: number;
  /** Cutoff index where λ_min reaches 400 nm (start of the ultraviolet); omitted = not drawn. */
  uvRc?: number;
}

/** Dash pattern that marks the classical series wherever it is drawn as a line (not colour alone). */
export const CLASSICAL_DASH = [7, 4];

export function drawTotals(canvas: HTMLCanvasElement, v: TotalsView, th: Theme) {
  const { ctx, w, h } = fitCanvas(canvas);
  clear(ctx, w, h, th);
  const f = makeFrame(w, h, 0, v.rMax, 0, v.yMax, 22);
  drawAxes(ctx, f, th, 'cutoff index Rc  (λ_min = 2L / Rc)', 'U / aT⁴V');

  // ultraviolet boundary: λ_min = 400 nm
  if (v.uvRc !== undefined && v.uvRc > 0 && v.uvRc < v.rMax) {
    const xu = Math.round(X(f, v.uvRc)) + 0.5;
    ctx.save();
    ctx.strokeStyle = th.muted;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(xu, f.top);
    ctx.lineTo(xu, f.bottom);
    ctx.stroke();
    ctx.restore();
    if (xu + 90 < f.right) {
      text(ctx, th, 'ultraviolet', xu + 6, f.bottom - 20, { color: th.muted });
      text(ctx, th, 'λ < 400 nm', xu + 6, f.bottom - 6, { color: th.muted });
    }
  }

  const rs = new Float64Array(v.rc + 1).map((_, i) => i);
  withClip(ctx, f, () => {
    // reference line aT⁴V
    ctx.strokeStyle = th.fg;
    ctx.lineWidth = 1.25;
    ctx.setLineDash([2, 4]);
    ctx.beginPath();
    ctx.moveTo(f.left, Y(f, 1));
    ctx.lineTo(f.right, Y(f, 1));
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.lineCap = 'round';
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = th.classical;
    ctx.setLineDash(CLASSICAL_DASH);
    polyline(ctx, f, rs, v.rjRatio, v.rc + 1);
    ctx.setLineDash([]);
    ctx.strokeStyle = th.planck;
    polyline(ctx, f, rs, v.pRatio, v.rc + 1);
    ctx.lineCap = 'butt';

    // current cutoff
    const xc = Math.round(X(f, v.rc)) + 0.5;
    ctx.strokeStyle = th.muted;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(xc, f.top);
    ctx.lineTo(xc, f.bottom);
    ctx.stroke();

    for (const [ratio, color] of [
      [v.pRatio[v.rc], th.planck],
      [v.rjRatio[v.rc], th.classical],
    ] as const) {
      if (ratio > v.yMax) continue;
      ctx.fillStyle = th.halo;
      ctx.beginPath();
      ctx.arc(X(f, v.rc), Y(f, ratio), 6, 0, 2 * Math.PI);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(X(f, v.rc), Y(f, ratio), 4, 0, 2 * Math.PI);
      ctx.fill();
    }
  });

  // reference label sits at the left end of its line, clear of the curves' end dots
  text(ctx, th, 'aT⁴V', f.left + 6, Y(f, 1) - 5, { color: th.fg });

  const xc = X(f, v.rc);
  const lab = `λ_min = ${v.lambdaMinNm.toFixed(0)} nm`;
  const lw = textWidth(ctx, th, lab, th.textXs);
  const fitsRight = xc + 6 + lw < f.right - 4;
  text(ctx, th, lab, fitsRight ? xc + 6 : xc - 6, f.top + 30, { color: th.muted, align: fitsRight ? 'left' : 'right' });

  if (v.rjRatio[v.rc] > v.yMax) {
    let r = 0;
    while (r < v.rc && v.rjRatio[r] <= v.yMax) r++;
    const val = v.rjRatio[v.rc];
    const shown = val >= 100 ? val.toFixed(0) : val.toFixed(1);
    clipArrow(ctx, f, X(f, r), th.classical, `classical U = ${shown} × aT⁴V and climbing`, th);
  }
}
