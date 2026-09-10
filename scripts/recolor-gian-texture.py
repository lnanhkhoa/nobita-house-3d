"""Recolour Gian's Rodin texture to the canon palette.

The generated model wears a yellow shirt with a magenta stripe and brown trousers.
Canon Gian wears an orange shirt with a cream stripe and navy trousers. This rewrites
only those three regions of the diffuse map, in HSV, keeping the original shading so the
result still reads as the same sculpt.

Region gates were measured from the source texture (see the histograms in the plan):
the shirt is bright and saturated in the yellow hues, the trousers are the dark saturated
warm pixels, and the stripe is the only magenta in the atlas. Skin stays untouched because
it sits below the saturation gate.

Usage: python3 scripts/recolor-gian-texture.py [--in <png>] [--out <png>]
"""

import argparse
import os

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

parser = argparse.ArgumentParser()
parser.add_argument("--in", dest="src",
                    default=f"{ROOT}/public/models/characters/gian/texture_diffuse.png")
parser.add_argument("--out", dest="dst",
                    default=f"{ROOT}/assets/raw/gian-diffuse-canon.png")
args = parser.parse_args()

rgb = np.asarray(Image.open(args.src).convert("RGB")).astype(np.float32) / 255.0


def to_hsv(arr):
    mx = arr.max(2)
    mn = arr.min(2)
    delta = mx - mn
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    hue = np.zeros_like(mx)
    lit = delta > 1e-6
    safe = np.maximum(delta, 1e-6)
    sel = (mx == r) & lit
    hue[sel] = (60.0 * ((g - b) / safe))[sel] % 360.0
    sel = (mx == g) & lit
    hue[sel] = (60.0 * (2.0 + (b - r) / safe))[sel]
    sel = (mx == b) & lit
    hue[sel] = (60.0 * (4.0 + (r - g) / safe))[sel]
    sat = np.where(mx > 0, delta / np.maximum(mx, 1e-6), 0.0)
    return hue, sat, mx


def to_rgb(hue, sat, val):
    h6 = (hue % 360.0) / 60.0
    i = np.floor(h6).astype(np.int32)
    f = h6 - i
    p = val * (1 - sat)
    q = val * (1 - sat * f)
    t = val * (1 - sat * (1 - f))
    i = i % 6
    r = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [val, q, p, p, t, val])
    g = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [t, val, val, q, p, p])
    b = np.select([i == 0, i == 1, i == 2, i == 3, i == 4, i == 5], [p, p, t, val, val, q])
    return np.clip(np.stack([r, g, b], axis=-1), 0, 1)


hue, sat, val = to_hsv(rgb)

shirt = (sat > 0.60) & (hue >= 25) & (hue <= 75) & (val >= 0.45)
stripe = (sat > 0.20) & (hue >= 280) & (hue <= 345)
trousers = (sat > 0.70) & (hue >= 5) & (hue <= 35) & (val < 0.45)

# Shirt: yellow -> canon orange. Compress the hue spread around the target so shading
# survives without any pixel sliding into red.
SHIRT_HUE = 27.0
if shirt.any():
    centre = float(np.median(hue[shirt]))
    hue[shirt] = SHIRT_HUE + (hue[shirt] - centre) * 0.30
    sat[shirt] = np.clip(sat[shirt] * 1.02, 0, 1)
    val[shirt] = np.clip(val[shirt] * 0.97, 0, 1)

# Stripe: magenta -> pale cream.
if stripe.any():
    hue[stripe] = 46.0
    sat[stripe] = np.clip(sat[stripe] * 0.30, 0, 0.30)
    val[stripe] = np.clip(val[stripe] * 1.30, 0, 1)

# Trousers: warm brown -> navy. Brown is fully saturated, navy is not, so pull saturation
# down and lift value a little or the legs read as a black hole.
if trousers.any():
    hue[trousers] = 219.0
    sat[trousers] = np.clip(sat[trousers] * 0.62, 0.35, 0.75)
    val[trousers] = np.clip(val[trousers] * 1.25, 0, 1)

out = (to_rgb(hue, sat, val) * 255.0).round().astype(np.uint8)
os.makedirs(os.path.dirname(args.dst), exist_ok=True)
Image.fromarray(out).save(args.dst)

total = hue.size
print(f"shirt {shirt.sum() * 100 / total:.1f}%  stripe {stripe.sum() * 100 / total:.1f}%  "
      f"trousers {trousers.sum() * 100 / total:.1f}%")
print(f"wrote {args.dst}")
