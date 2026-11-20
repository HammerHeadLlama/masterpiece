#!/usr/bin/env python3
"""Render the README demo GIF from the live page.

Every frame is a headless-Chrome screenshot of the real page at ?T=..&rc=..,
so every number in the GIF comes from the simulation. Needs Google Chrome and Pillow.

    python3 scripts/make_gif.py --base http://localhost:8080/uv-catastrophe/ --out demo.gif
"""

import argparse
import math
import os
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor

from PIL import Image

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
WINDOW = (1280, 900)
OUT_WIDTH = 960
STEP_MS = 110


def ease(t: float) -> float:
    """Cubic ease-in-out on [0, 1]."""
    return 4 * t**3 if t < 0.5 else 1 - (-2 * t + 2) ** 3 / 2


def ramp(a: float, b: float, n: int) -> list[int]:
    return [round(a + (b - a) * ease(i / (n - 1))) for i in range(n)]


def sequence() -> list[tuple[int, int, int]]:
    """(T, rc, duration ms) per frame: cutoff sweep, then a temperature sweep at full cutoff."""
    frames: list[tuple[int, int, int]] = []
    for i, rc in enumerate(ramp(5, 160, 28)):
        frames.append((5772, rc, 700 if i == 0 else STEP_MS))
    frames[-1] = (5772, 160, 1300)
    for a, b, n in [(5772, 9500, 10), (9500, 3000, 16), (3000, 5772, 7)]:
        for T in ramp(a, b, n)[1:]:
            frames.append((T, 160, STEP_MS))
    frames[-1] = (frames[-1][0], 160, 1600)
    return frames


def shoot(args: tuple[int, str, str, int, int]) -> str:
    i, base, outdir, T, rc = args
    path = os.path.join(outdir, f"f{i:03d}.png")
    with tempfile.TemporaryDirectory() as profile:
        subprocess.run(
            [
                CHROME,
                "--headless=new",
                "--disable-gpu",
                "--hide-scrollbars",
                "--no-first-run",
                "--no-default-browser-check",
                f"--user-data-dir={profile}",
                f"--window-size={WINDOW[0]},{WINDOW[1]}",
                "--force-device-scale-factor=1",
                "--blink-settings=preferredColorScheme=1",  # light
                "--virtual-time-budget=4000",
                f"--screenshot={path}",
                f"{base}?T={T}&rc={rc}",
            ],
            check=True,
            capture_output=True,
            timeout=60,
        )
    return path


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, help="page URL without query, e.g. http://localhost:8080/uv-catastrophe/")
    ap.add_argument("--out", required=True)
    ap.add_argument("--workers", type=int, default=4)
    a = ap.parse_args()

    seq = sequence()
    with tempfile.TemporaryDirectory() as outdir:
        jobs = [(i, a.base, outdir, T, rc) for i, (T, rc, _) in enumerate(seq)]
        with ThreadPoolExecutor(a.workers) as pool:
            paths = list(pool.map(shoot, jobs))

        frames = []
        for p in paths:
            im = Image.open(p).convert("RGB")
            h = round(im.height * OUT_WIDTH / im.width)
            frames.append(im.resize((OUT_WIDTH, h), Image.LANCZOS))

    # One shared palette from a strip of sampled frames, no dithering (flat UI colours).
    picks = frames[:: max(1, len(frames) // 8)]
    strip = Image.new("RGB", (OUT_WIDTH, frames[0].height * len(picks)))
    for k, im in enumerate(picks):
        strip.paste(im, (0, k * im.height))
    palette = strip.quantize(colors=255, method=Image.Quantize.MEDIANCUT)
    pal_frames = [im.quantize(palette=palette, dither=Image.Dither.NONE) for im in frames]

    pal_frames[0].save(
        a.out,
        save_all=True,
        append_images=pal_frames[1:],
        duration=[d for _, _, d in seq],
        loop=0,
        optimize=True,
    )
    total = sum(d for _, _, d in seq) / 1000
    size = os.path.getsize(a.out) / 1e6
    print(f"{len(seq)} frames, {total:.1f} s, {OUT_WIDTH}x{frames[0].height}, {size:.2f} MB -> {a.out}")


if __name__ == "__main__":
    main()
