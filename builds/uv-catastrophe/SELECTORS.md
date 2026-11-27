# SELECTORS.md: the DOM contract for the redesign

Everything `src/main.ts` and `src/plot.ts` rely on in `index.html`. Every entry must still match at the end of the redesign. This was inventoried from the code on branch `redesign` at base `9ed70b7`.

## Element IDs (`document.getElementById` via `$()` / `setText` / `setDim`)

| ID | Element | Used for |
|---|---|---|
| `caption` | `<p>` | caption text set from `L` |
| `spectrum` | `<canvas>` | spectrum panel (`drawSpectrum`) |
| `totals` | `<canvas>` | total-energy panel (`drawTotals`) |
| `cutoff` | `<input type="range">` | Rc slider; `min/max/step/value` set from JS; `input` event |
| `temp` | `<input type="range">` | T slider; `min/max/step/value` set from JS; `input` event |
| `rc-out` | `<output>` | "Rc = …" |
| `t-out` | `<output>` | "… K" |
| `lmin-out` | any text element | λ_min and f_cut line |
| `r-modes` | `<dd>` | modes counted |
| `r-urj` | `<dd>` | U classical |
| `r-up` | `<dd>` | U Planck |
| `r-ratio` | `<dd>` | U Planck / aT⁴V |
| `r-eps` | `<dd>` | ε |
| `r-lt` | `<dd>` | λ_max·T |
| `r-ft` | `<dd>` | f_max/T |
| `r-prod` | `<dd>` | λ_max·f_max/c |
| `d-lt` | `<dt>` | grey-out target for λ_max·T |
| `d-ft` | `<dt>` | grey-out target for f_max/T |
| `d-prod` | `<dt>` | grey-out target for the product |
| `v-rj` | `<span>` in the Fig. 1 caption | classical U / aT⁴V (added in the redesign, logic commit) |
| `v-p` | `<span>` in the Fig. 1 caption | Planck U / aT⁴V (added in the redesign, logic commit) |

The redesign's logic commit also makes `main.ts` set `aria-valuetext` on `#cutoff` and `#temp`.

## Structure

- `#d-lt`, `#d-ft` and `#d-prod` must each be **immediately followed by** their `<dd>`: `setDim` uses `dt.nextElementSibling`.
- `#spectrum` and `#totals` must have a CSS width and height: `fitCanvas` reads `clientWidth` and `clientHeight`, and ResizeObserver watches them.

## Classes

| Class | Set by | Meaning |
|---|---|---|
| `.dimmed` | `main.ts` toggles it on the `<dt>` | the Wien peak is beyond the cutoff; CSS greys the `dt` and the `dt + dd` |
| `.note` | `main.ts` creates `<span class="note">` inside the `<dd>` | the "peak … beyond cutoff" note |

`.classical` and `.planck` are only used in the markup to colour two labels; no JS depends on them.

## CSS custom properties read by the canvas (`readTheme` in `plot.ts`)

`--panel`, `--fg`, `--muted`, `--grid`, `--planck`, `--classical`, `--font-ui`. These must stay defined in light and dark mode, and be valid canvas colour or font strings.

## Other hooks

- The URL parameters `?T=` and `?rc=` set the starting slider values.
- `matchMedia('(prefers-color-scheme: dark)')` triggers a redraw when the theme changes.
- The `<script type="module" src="/src/main.ts">` entry (Vite rewrites it at build time).

## Core flow, tested by hand

1. **Load** the page with no query string. Rc = 20 and T = 5772 K. Every readout is filled. All three Wien rows are greyed with a "beyond cutoff" note.
2. **Drag the cutoff to 160.**
   - The classical curve leaves the top of the energy panel with an arrow and an "× aT⁴V and climbing" label.
   - The Planck curve flattens onto the dashed aT⁴V line.
   - Readouts: modes counted 4,288,591, U Planck/aT⁴V 0.9982, λ_max·T 2.9000 mm K. The Wien rows are no longer greyed.
3. **Drag T from 3000 to 9500 K.** The spectrum peak and markers slide right, and f_max enters the shaded visible band near 9500 K. At 3000 K, f_max/T reads 5.9327 × 10¹⁰. At 9500 K, U Planck/aT⁴V reads 0.9974.
4. **Set Rc = 30 at 5772 K.** λ_max·T and the product are greyed; f_max/T is not.
5. **Open `?T=9500&rc=160`.** The sliders start there.
6. **Switch the OS theme** between light and dark. Both canvases redraw in the new colours.
7. **Resize the window.** Both canvases re-fit without blurring.

## Baseline (before the redesign)

- Page weight: `index.html` 4,055 B, JS 14,710 B, total 18.8 KB. Fonts: system stacks only.
- Gates: 41/41 tests pass.
