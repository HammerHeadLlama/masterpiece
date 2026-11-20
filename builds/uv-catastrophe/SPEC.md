# SPEC: uv-catastrophe

The UV catastrophe from your own code. Size S, hard cap 4 h. Week 2026-W47.
Ship: Mon 2026-11-23, shown to a classmate.

## Assumptions (decided, not asked; change any before milestone 1)
1. Cavity: perfectly conducting cube, side L = 10 µm. Chosen so a 160-index mode table keeps the discrete Planck sum within 1% of aT⁴V across the whole T slider.
2. T slider 3000–9500 K, default 5772 K (Sun). Outside this range the fixed table is either too coarse (cold) or cut off too early (hot).
3. Deploy: static build into /docs/uv-catastrophe at the repo root, GitHub Pages serving main:/docs. The repo has no remote yet, so the GitHub repo name is not assumed anywhere (Vite base is './').
4. The photoelectric stretch is out of the 4 h budget.
5. No time integration in this build, so there is no timestep. The numerics are lattice sums.

## Goal and demo moment
Count the standing-wave modes of a real cavity, give each one its thermal energy two ways, and watch one total diverge and the other converge.

10-second README GIF: drag the cutoff slider up. The classical total energy climbs as cutoff³ and leaves the top of the panel; the Planck total flattens onto the dashed aT⁴V line. Then drag T and the spectrum peak slides through the visible band.

## Model
Units: SI throughout. Constants are the exact 2019 SI values:
h = 6.62607015e-34 J s, k = 1.380649e-23 J/K, c = 299792458 m/s.

Modes. n = (nx, ny, nz), integers ≥ 0.
- f_n = c|n| / (2L), λ_n = 2L / |n|. With L = 10 µm: f = 14.990 THz × |n|, so |n| ≤ 160 reaches 2398 THz (λ = 125 nm).
- Polarisation weight w(n): 2 if no index is zero, 1 if exactly one index is zero, 0 otherwise. (Tangential E vanishes on the walls; with one zero index only one field component survives, with two there is no field.)
- Mode table g[m] = Σ w(n) over all n with nx²+ny²+nz² = m, for m = 0 … R_max², R_max = 160. Float64Array of length 25601, built once at load (about 2.1 M lattice points). Temperature never touches it.

Energy per mode, with x = hf/kT = ε√m and ε = hc/(2LkT):
- Classical (equipartition): E = kT.
- Planck: E = kT · x / expm1(x). Use Math.expm1, never exp(x) − 1: the naive form loses all precision as x → 0, exactly where the two laws should agree.

Totals up to cutoff index Rc (m ≤ Rc²):
- U_RJ(Rc) = kT · Σ g[m]
- U_P(Rc) = kT · Σ g[m] · x_m / expm1(x_m)
- Continuum reference: U = aT⁴V, a = 8π⁵k⁴ / (15h³c³) = 7.5657e-16 J m⁻³ K⁻⁴, V = L³.

Analytic results the code must reproduce:
- Weyl count: N(R) = πR³/3 − 3R/2 − 1/4 + lattice noise. The R² surface term cancels because of the polarisation rule. Leading term is 8πVf³/(3c³).
- Finite-cavity deficit: U_P/(aT⁴V) − 1 ≈ −15ε²/(4π³) when the cutoff tail is negligible. Derivation: the −3/2 term in dN/dR integrated against x/(e^x − 1) (integral π²/6), over the leading π⁵/(15ε³).
- Wien: u_f peaks at x = 2.821439 (f_max/T = 5.8789e10 Hz/K); u_λ peaks at x = 4.965114 (λ_max·T = 2.897772e-3 m K). So λ_max·f_max = 0.568c: the two peaks are different photons.

Spectrum. Bin modes by |n| with width ΔR (edges 0.5, 1.5, … for ΔR = 1):
- u_f(bin) = (energy in bin) / (V · ΔR · c/(2L))
- u_λ = u_f · f² / c at the bin centre.

Peak finder. Least-squares quartic in (ln f, ln u) over the contiguous run of bins around the maximum with u > 0.5·u_max; maximise the polynomial on a fine grid. Rescale ln f to [−1, 1] before forming the 5×5 normal equations; solve by Gaussian elimination with partial pivoting. A quadratic is not acceptable: the Planck curve is asymmetric and the prototype measured a −1% to −7% bias with it.

Valid range. For T in 3000–9500 K, ε runs 0.240 → 0.0757 and the table cutoff sits at x = 160ε ≥ 12.1.

Cost. Table build once (< 100 ms). Each slider move is one 25,600-term sum plus a 160-bin histogram with a precomputed bin index per m.

## Verification gates
Vitest. Values in brackets are what an independent NumPy prototype of this model measured on 2026-11-20; the tolerances sit outside them. Never loosen a tolerance to pass.

- Gate 0: `npm run build` and `npm test` succeed; dev server renders the page with no console errors.
- Gate 1, mode table: g[1..6] = 0, 3, 2, 0, 6, 6 (hand count). Σ g for m ≤ 160² equals 4,288,591 exactly.
- Gate 2, Weyl: |N(Rc)/(πRc³/3) − 1| < 1% at Rc = 20 [−0.69%] and < 0.1% at Rc = 160 [−0.017%]. Log-log slope of N against Rc over {20, 40, 80, 160} is 3 ± 0.01 [3.003]. This is the catastrophe: U_RJ = kT·N.
- Gate 3, Planck limits: E/kT at x = 1e-8 equals 1 − x/2 to 1e-12. E/kT at x = 50 equals 50·e⁻⁵⁰ to relative 1e-12. E is finite and zero-safe at x = 800.
- Gate 4, Stefan–Boltzmann: for T in {3000, 4000, 5772, 8000, 9500} K, |U_P(160)/(aT⁴V) − 1| < 1% [worst −0.66% at 3000 K; −0.18% at 5772 K]. Log-log slope of U_P against T is 4 ± 0.01 [4.005].
- Gate 5, finite-size law: for ε in {0.1, 0.2, 0.3}, the measured deficit is within 10% (relative) of −15ε²/(4π³) [−0.00127, −0.00464, −0.01023 against −0.00121, −0.00484, −0.01088].
- Gate 6, spectrum shape: at T = 5772 and 9500 K, bins of ΔR = 2 (edges 1, 3, 5, …) with centre x in [1, 10] each lie within 2% of the continuum Planck density integrated over the same bin [worst 0.8% and 0.9%].
- Gate 7, Wien: for T in {3000, 4000, 5772, 8000, 9500} K with ΔR = 1, λ_max·T is within 1% of 2.897772e-3 m K [worst +0.33%] and f_max/T within 2% of 5.8789e10 Hz/K [worst +0.92%]. λ_max·f_max/c = 0.568 ± 0.015.

## UI and controls
One page, Canvas 2D, two panels.
- Spectrum panel: u_f against f in THz. Bars are the binned mode sums (Planck solid, classical outline, clipped at the top with an arrow). Thin lines are the continuum Planck and Rayleigh–Jeans curves. Visible band (430–750 THz) shaded. Markers at the fitted f_max and at the frequency of λ_max.
- Total-energy panel: U_RJ(Rc) and U_P(Rc) against cutoff, dashed line at aT⁴V.
- Sliders: T (3000–9500 K), cutoff Rc (5–160, labelled as λ_min = 2L/Rc in nm).
- Readouts, every one returned by the functions under test: modes counted, U_RJ, U_P, U_P/(aT⁴V), λ_max·T, f_max/T, λ_max·f_max/c, ε.
- The Wien readouts use the full table, not the cutoff slider, and grey out when Rc is below the peak.

## Stack and file layout
TypeScript, Vite, Canvas 2D, Vitest. No runtime dependencies.

```
builds/uv-catastrophe/
  SPEC.md
  package.json  tsconfig.json  vite.config.ts  index.html
  src/constants.ts   exact SI constants, L, R_MAX
  src/modes.ts       buildModeTable, countModes
  src/planck.ts      planckOverKT, totals, reference aT⁴V
  src/spectrum.ts    binning, u_f, u_λ, continuum curves
  src/peak.ts        quartic log-log fit, peak location
  src/plot.ts        canvas drawing
  src/main.ts        sliders, readouts
  tests/modes.test.ts  planck.test.ts  spectrum.test.ts  peak.test.ts
```
vite.config.ts: base './', build.outDir '../../docs/uv-catastrophe', emptyOutDir true.

## Milestones
Each ends with its gates green and one local commit.
1. Physics core (60 min): scaffold, constants, modes, planck. Gates 0–5.
2. Spectrum and peaks (45 min): spectrum, peak. Gates 6–7.
3. UI (75 min): both panels, sliders, readouts. Gate 0 again in the browser.
4. Ship prep (45 min): production build into docs/, README with GIF, LOG.md line.

At 4 h, stop. Cut order if short: visible-band shading, then the continuum overlay lines. The total-energy panel is the demo and does not get cut.

## Out of scope
Photoelectric effect panel, non-cubic cavities, wall emissivity or time evolution, WebGL, mobile layout, any hardcoded readout.

## Ship
- Deploy: `npm run build` writes docs/uv-catastrophe; Daniel pushes and enables Pages on main:/docs.
- README.md in the build folder: one paragraph, the GIF, the gate table with measured values from the test run.
- Ship date: Monday 2026-11-23.
- Person: a classmate. Hand them the cutoff slider first and say nothing.
- LOG.md: one line at ship.
