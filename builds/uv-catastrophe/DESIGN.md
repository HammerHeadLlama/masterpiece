# DESIGN.md: uv-catastrophe

Step 2 of the redesign loop. The three directions come from `ui-ux-pro-max --design-system` matches:
- "science education simulation" gave Swiss minimalism.
- "scientific instrument" gave a dark HUD.
- "editorial textbook" gave editorial print.

Each one is adapted to this page's constraints:
- **Fonts:** system stacks only, at most 2 families, no web-font weight (the page is 18.8 KB).
- **Series colours:** a warm colour for classical and a cool one for Planck, each passing 4.5:1 as text on the panel in light and dark.

Every contrast ratio below was computed with the WCAG 2.x formula, not estimated. Axis lines use each palette's `muted` colour, because a dedicated lighter axis grey failed 3:1 in all three. Grid lines are decorative, at about 1.2:1 against the panel.

## The three directions

### 1. Lab notebook (Swiss minimalism)
- **Palette, light:**

  | Token | Hex | Ratio on panel |
  |---|---|---|
  | bg | `#F8FAFC` | |
  | panel | `#FFFFFF` | |
  | fg | `#0F172A` | 17.85 |
  | muted | `#475569` | 7.58 |
  | dim | `#64748B` | 4.76 |
  | classical | `#C2410C` | 5.18 |
  | planck | `#1D4ED8` | 6.70 |
  | ring | `#1D4ED8` | 6.70 |

- **Palette, dark:**

  | Token | Hex | Ratio on panel |
  |---|---|---|
  | bg | `#0B1220` | |
  | panel | `#111827` | |
  | fg | `#E5E7EB` | 14.33 |
  | muted | `#9CA3AF` | 6.99 |
  | dim | `#8B93A1` | 5.73 |
  | classical | `#FB923C` | 7.84 |
  | planck | `#60A5FA` | 6.98 |

- **Type:** system sans for everything, tabular numerals. Scale 12 / 14 / 16 / 20 / 28 / 40.
- **Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48. **Radius:** 8 / 12.
- **Mood:** a clean slate dashboard: correct and calm, but interchangeable. It is the closest of the three to the look the audit called generic.

### 2. Instrument panel (dark-first)
- **Palette, dark (primary):**

  | Token | Hex | Ratio on panel |
  |---|---|---|
  | bg | `#07090C` | |
  | panel | `#0E1216` | |
  | fg | `#E6EDF3` | 15.91 |
  | muted | `#8B98A5` | 6.39 |
  | dim | `#7D8996` | 5.27 |
  | classical | `#FF7A45` | 7.27 |
  | planck | `#5CC8FF` | 9.99 |

- **Palette, light:**

  | Token | Hex | Ratio on panel |
  |---|---|---|
  | bg | `#EEF1F4` | |
  | panel | `#F8FAFB` | |
  | fg | `#0B0F14` | 18.36 |
  | muted | `#4A5562` | 7.25 |
  | dim | `#5E6A77` | 5.27 |
  | classical | `#C03A0A` | 5.21 |
  | planck | `#0B63A8` | 5.96 |

- **Type:** system sans with uppercase micro-labels; tabular numerals as the hero. Scale 11 / 13 / 15 / 18 / 24 / 36.
- **Spacing:** 4 / 6 / 8 / 12 / 16 / 24 (dense). **Radius:** 2.
- **Mood:** an oscilloscope readout, tense and technical. It looks great dark but washes out on a classroom projector.

### 3. Textbook plate (editorial print): chosen
- **Palette:** full tokens are in the CSS below.

  | Token | Light | Ratio on panel | Dark | Ratio on panel |
  |---|---|---|---|---|
  | bg | `#F7F3EA` | | `#151311` | |
  | panel | `#FFFDF8` | | `#1D1A17` | |
  | fg | `#1C1917` | 17.20 | `#EDE8E0` | 14.20 |
  | muted | `#57534E` | 7.50 | `#A8A29E` | 6.87 |
  | dim | `#6E6862` | 5.41 | `#948D86` | 5.29 |
  | classical | `#B4320C` | 6.07 | `#F59E68` | 8.23 |
  | planck | `#1E40AF` | 8.58 | `#8AB4F8` | 8.22 |
  | ring | `#1E40AF` | 8.58 | `#8AB4F8` | 8.22 |

- **Type:**
  - Headings and the hero figure use a system serif (`ui-serif`, Iowan Old Style, Charter, Georgia).
  - The UI and readouts use system sans with tabular numerals.
  - Scale 12 / 14 / 16 / 20 / 28 / 44.
- **Spacing:** 4 / 8 / 12 / 16 / 24 / 32 / 48. **Radius:** 2 for figure frames; full-round for the slider.
- **Mood:** a figure plate in a physics textbook. Warm paper, ink-blue Planck, a burnt-orange classical curve that runs off the page.

## Why direction 3

The page is used on laptops and classroom projectors by IB students who know physics from textbooks. A light, warm "figure plate" survives projectors and gives the page the product character the audit found missing. It also has the strongest series contrast in light mode: 6.07 for classical and 8.58 for Planck.

## Rules that follow from the direction

- **Hierarchy:** one hero figure (classical vs Stefan–Boltzmann), then the controls, then secondary readouts. Panels read as numbered figures ("Fig. 1", "Fig. 2") with captions, not as dashboard cards.
- **Series:** classical is always `--classical` with a dash pattern on the energy panel. Planck is always `--planck`, solid. Each theory has one name everywhere: "classical" (Rayleigh–Jeans) and "Planck".
- **Canvas:** all canvas colours, fonts and opacities come from the tokens below via `readTheme`. Canvas text is never below `--text-xs` (12px) and gets a `--halo` stroke so it stays legible over lines.
- **Focus:** a 2px `--ring` outline with a 2px offset on every focusable element.
- **Contract:** `--panel`, `--fg`, `--muted`, `--grid`, `--planck`, `--classical` and `--font-ui` keep their names (see SELECTORS.md).

## Tokens (CSS custom properties)

```css
:root {
  /* colour: light */
  --bg: #f7f3ea;            /* paper */
  --panel: #fffdf8;         /* plate */
  --fg: #1c1917;            /* ink, 17.20:1 on panel */
  --muted: #57534e;         /* secondary text and axes, 7.50:1 */
  --dim: #6e6862;           /* greyed readouts, 5.41:1 */
  --grid: #e7e1d5;          /* decorative grid lines */
  --border: #d9d1c2;        /* figure frame */
  --rule: #e7e1d5;          /* hairline separators */
  --classical: #b4320c;     /* 6.07:1 */
  --planck: #1e40af;        /* 8.58:1 */
  --ring: #1e40af;          /* focus, 8.58:1 */
  --halo: #fffdf8;          /* canvas text halo = panel */
  --bar-alpha: 0.72;        /* Planck bar fill opacity */
  --band-alpha: 0.18;       /* visible-band wash */
  --shade-alpha: 0.55;      /* above-cutoff shade */

  /* type: 2 families, system only */
  --font-ui: ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --font-display: ui-serif, 'Iowan Old Style', Charter, 'Palatino Linotype', Georgia, serif;
  --text-xs: 12px;
  --text-sm: 14px;
  --text-md: 16px;
  --text-lg: 20px;
  --text-xl: 28px;
  --text-hero: 44px;
  --leading: 1.5;

  /* space and shape */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
  --space-7: 48px;
  --radius: 2px;
  --radius-round: 999px;
  --sidebar: 340px;
}

/* colour: dark */
:root[data-theme='dark'] {
  --bg: #151311;
  --panel: #1d1a17;         /* 14.20:1 with fg */
  --fg: #ede8e0;
  --muted: #a8a29e;         /* 6.87:1 */
  --dim: #948d86;           /* 5.29:1 */
  --grid: #2e2a25;
  --border: #3a352f;
  --rule: #2e2a25;
  --classical: #f59e68;     /* 8.23:1 */
  --planck: #8ab4f8;        /* 8.22:1 */
  --ring: #8ab4f8;
  --halo: #1d1a17;
  --bar-alpha: 0.62;
  --band-alpha: 0.26;
  --shade-alpha: 0.6;
}
```

In `index.html` the dark block is repeated under `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { … } }`.
