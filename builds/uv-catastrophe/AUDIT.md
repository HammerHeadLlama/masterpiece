# AUDIT.md: uv-catastrophe, before the redesign

Step 1 of the redesign loop: `/impeccable critique`, then `/impeccable audit`. No changes were made in this step.

- **Method:** dual-agent, as two isolated sub-agents. Assessment A was the design review; Assessment B was browser and technical evidence. Both ran on the live dev server at base `9ed70b7`.
- **Deterministic detector:** unavailable. The impeccable launcher is not executable in this sandbox, so Assessment B is browser measurements only. The snapshot helper could not run either, so this file is the record.
- **Judged for:** an IB physics classmate handed the cutoff slider cold on a laptop. The secondary user is Daniel presenting it.
- **Questions skipped:** the brief says to run the loop without stopping.

## Scores

**Critique (Nielsen): 22/40, Acceptable**

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Instant redraws, but at 1280×720 `#totals` starts at y = 492, so the main effect happens below the fold |
| 2 | Match with the real world | 2 | `Rc` is an index, not a wavelength; code notation (`λ_max`, `u_f`, "(full table)"); ε is unexplained |
| 3 | User control and freedom | 3 | Sliders are their own undo; no reset |
| 4 | Consistency and standards | 2 | One theory has four names ("classical modes", "Rayleigh–Jeans", "classical (equipartition)", "U classical") |
| 5 | Error prevention | 3 | Ranges and clamped URL parameters; the "peak beyond cutoff" state is allowed and explained |
| 6 | Recognition rather than recall | 2 | aT⁴V, ε, Rc, Wien and equipartition are all assumed knowledge |
| 7 | Flexibility and efficiency | 2 | Native arrow keys only; `#temp` steps 1 K over a 6500 K range |
| 8 | Aesthetic and minimalist design | 2 | 8 readouts at equal weight; the punchline is 12px canvas text |
| 9 | Error recognition and recovery | 2 | Grey-out notes give the cause, not the fix; the grey is 2.1:1 |
| 10 | Help and documentation | 1 | A formula-heavy caption; nothing says what to try |

**Cognitive load:** 6 of 8 checklist items fail (high). The readout card shows 8 values at once, and the spectrum layers about 9 visual signals.

**Audit (technical): 13/20, Acceptable**

| # | Dimension | Score | Key finding |
|---|---|---|---|
| 1 | Accessibility | 2 | Grey-out text 2.1:1 / 2.3:1. `--classical` text 4.30:1 (light). UA focus ring about 2.66:1. No live region. Canvases have no `role="img"`. Series told apart by colour only |
| 2 | Performance | 4 | 18.8 KB built, no web fonts, rAF-coalesced redraws, no console errors |
| 3 | Theming | 3 | Colour tokens and dark mode are solid. Sizes, spacing, fonts and alphas are hard-coded in CSS and `plot.ts` |
| 4 | Responsive | 1 | No horizontal overflow, but at ≤ 900px the sliders sit below both plots (y = 740 at 768px), so you can't drag and watch. At 375px, legends are clipped, x-ticks overlap and the arrow label runs off the canvas. Thumbs are about 16px |
| 5 | Implementation integrity | 3 | Coherent token-to-canvas system. Minor drift: `--font-num` is not used for canvas numbers, and `!important` on the dimmed dd |

**Design specificity:** the frame is generic, but the content inside is specific to this product. The shell is a stock dashboard kit: off-white background, 8px-radius cards, uppercase micro-headings, equal-weight `dl` rows. All the product character lives in small canvas text ("× aT⁴V and climbing", the colour-matched labels, the honest grey-out). An "ultraviolet catastrophe" page never shows where ultraviolet is.

## Fix (ranked)

Each item notes where the change lands. **logic** means a `src/main.ts` change; those get their own clearly labelled commit.

| ID | Sev | Finding | Fix | Where |
|---|---|---|---|---|
| F1 | P0 | The demo panel (`#totals`) is second and partly below the fold at 1280×720. At ≤ 900px the sliders sit below both plots | Put the energy panel first. Size canvases to the viewport. On narrow screens, put the controls before the plots | markup, CSS |
| F2 | P1 | The payoff (classical vs Stefan–Boltzmann) exists only as 12px canvas text. The catastrophe happens within about 7px of drag from the default Rc = 20 | Hero readout showing classical U / aT⁴V and Planck U / aT⁴V, large. Bigger arrow label. Default Rc 20 → 10 for more runway | logic, markup, CSS, `plot.ts` |
| F3 | P1 | Contrast failures:<br>• grey-out 2.10 / 2.30<br>• `--classical` light 4.30 as text<br>• dimmed canvas markers 1.91 / 2.49<br>• Planck bar fill 2.33 / 2.93 (graphic < 3)<br>• "cutoff" label on bars 2.28<br>• focus ring about 2.66 | New tokens meeting AA; a `:focus-visible` ring of 3:1 or better; bar fill alpha raised with a stroke; text halos | CSS, `plot.ts` |
| F4 | P1 | Ultraviolet is never shown: the visible band is unlabelled and nothing marks the UV region | Label "visible" and "ultraviolet →" on the spectrum. Mark λ_min = 400 nm on the energy panel. Add "(ultraviolet)" to the λ_min line when below 400 nm | `plot.ts`, logic |
| F5 | P1 | 375px canvas text: legends clipped, x-ticks overlap, arrow label at x = −93 | Tick count based on width, legends that wrap, labels clamped to the frame | `plot.ts` |
| F6 | P2 | Naming drift across legends and labels | One name per theory: "classical (Rayleigh–Jeans)" and "Planck" | markup, `plot.ts` (copy) |
| F7 | P2 | Code notation in the DOM (`λ_max`, `f_max`, "(full table)") | Real `<sub>`; plain group headings | markup |
| F8 | P2 | Flat hierarchy: 8 readouts at the same 13px weight | A type scale; primary and secondary readout tiers | CSS |
| F9 | P2 | Screen readers: canvases have no `role="img"` or description; no live region; sliders have no `aria-valuetext` | `role="img"` and descriptions; `aria-live="polite"` on the hero; `aria-valuetext` set from the readouts | markup, logic |
| F10 | P2 | The energy panel tells classical from Planck by colour only | Direct labels at the line ends, and a dash pattern on classical | `plot.ts` |
| F11 | P2 | Canvas labels drawn over lines and bars ("classical bars leave the panel", marker labels) | A panel-coloured halo behind canvas text | `plot.ts` |
| F12 | P2 | The grey-out note names the cause, not the fix | "raise the cutoff above Rc N", with N computed from the peak index | logic |
| F13 | P3 | Slider thumbs about 16px, below the 24px target | Styled range thumb of at least 24px, track of at least 6px | CSS |
| F14 | P3 | No first-step cue for a cold user | One line by the cutoff slider saying what to try | markup (copy) |
| F15 | P3 | Hard-coded sizes and spacing in CSS; fonts and sizes in `plot.ts` | Tokens for type, space and radius; `plot.ts` reads the font tokens | CSS, `plot.ts` |
| F16 | P3 | The visible band is a muddy smear in dark mode (alpha 0.16) | A band opacity token per theme | CSS, `plot.ts` |
| F17 | P3 | `.dimmed + dd` uses `!important` | Remove through specificity | CSS |

## Keep

| ID | What | Why |
|---|---|---|
| K1 | `readTheme` pulls the series colours from CSS, so sidebar labels, bars, curves and arrows always match in both themes | The strongest system decision on the page |
| K2 | The computed "classical U = N × aT⁴V and climbing" label | The best moment; every number in it comes from the simulation |
| K3 | Wien rows grey out with a computed reason instead of hiding | Honest, and teaches when the cutoff is too low |
| K4 | The spectrum y-axis auto-scales per T | Deliberate: u_f varies 31× across the slider, and a fixed scale flattens 3000 K into nothing. A's P3 ("fixed scale shows T³ growth") stays open as a product question |
| K5 | The spectrum x-axis is fixed at 0–2398 THz | Deliberate, so the peak visibly slides with T |
| K6 | System font stacks, no web fonts, 18.8 KB | Lean; the redesign must not get noticeably heavier |
| K7 | Native range inputs (arrow, PageUp and End keys work) | Native affordances; no custom slider |

## Open (features, not a redesign)

These are outside "restyle, don't add logic" and are noted for later: a reset button, writing the slider state back to the URL, typed numeric entry, "jump to catastrophe" presets, hover values on the canvases, and a coarser T step.
