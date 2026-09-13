"""Turn the generated source images into game textures.

- tile-*: seamless material tiles for the house, wall, road, lawn and wood. Mean luminance
  is normalised to a light target so the palette colour that multiplies them in the shader
  still decides the final hue; a Sobel normal map is derived from each.

- leaf-cluster / blossom-cluster: key the background out (sampled from the image corners, so
  a white or black backdrop both work), soften the edge, write RGBA with the foreground
  colour bled outward so bilinear filtering never fringes. Output 1024 px.
- bark: derive a tangent-space normal map from luminance with a Sobel filter, plus a
  downscaled albedo.

Outputs land in assets/raw/textures/ and are read by scripts/blender/plants_build.py.

    python3 scripts/make-textures.py              # everything
    python3 scripts/make-textures.py tile-grass   # only the named tiles
"""

import os
import sys
import zlib

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets/ref")
OUT = os.path.join(ROOT, "assets/raw/textures")
os.makedirs(OUT, exist_ok=True)


def key_cluster(name, size=1024):
    img = Image.open(os.path.join(SRC, name, "front.png")).convert("RGB").resize((size, size), Image.LANCZOS)
    rgb = np.asarray(img).astype(np.float32) / 255.0
    corners = np.concatenate([rgb[:24, :24].reshape(-1, 3), rgb[:24, -24:].reshape(-1, 3),
                              rgb[-24:, :24].reshape(-1, 3), rgb[-24:, -24:].reshape(-1, 3)])
    bg = np.median(corners, axis=0)
    delta = np.linalg.norm(rgb - bg, axis=2)
    # Anything within `lo` of the backdrop is background; fully opaque beyond `hi`.
    lo, hi = 0.10, 0.32
    alpha = np.clip((delta - lo) / (hi - lo), 0.0, 1.0)
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))) / 255.0
    # Bleed foreground colour into transparent texels so mip/bilinear edges stay clean.
    fg = rgb.copy()
    mask = alpha > 0.05
    for _ in range(6):
        blurred = np.asarray(Image.fromarray((fg * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))) / 255.0
        fg = np.where(mask[..., None], fg, blurred)
    rgba = np.dstack([fg, alpha])
    Image.fromarray((rgba * 255).round().astype(np.uint8), "RGBA").save(os.path.join(OUT, f"{name}.png"))
    print(f"{name}: keyed, bg={np.round(bg, 2)}, opaque {mask.mean() * 100:.1f}%")


def bark_maps(size=1024, strength=2.4):
    img = Image.open(os.path.join(SRC, "bark", "front.png")).convert("RGB").resize((size, size), Image.LANCZOS)
    img.save(os.path.join(OUT, "bark-albedo.jpg"), quality=88)
    lum = np.asarray(img.convert("L")).astype(np.float32) / 255.0
    lum = np.asarray(Image.fromarray((lum * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))) / 255.0
    gx = np.roll(lum, -1, axis=1) - np.roll(lum, 1, axis=1)
    gy = np.roll(lum, -1, axis=0) - np.roll(lum, 1, axis=0)
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(lum)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    normal = np.dstack([nx / length, ny / length, nz / length]) * 0.5 + 0.5
    Image.fromarray((normal * 255).round().astype(np.uint8)).save(os.path.join(OUT, "bark-normal.png"))
    print("bark: albedo + normal written")


def sobel_normal(lum, strength):
    gx = np.roll(lum, -1, axis=1) - np.roll(lum, 1, axis=1)
    gy = np.roll(lum, -1, axis=0) - np.roll(lum, 1, axis=0)
    nx, ny, nz = -gx * strength, gy * strength, np.ones_like(lum)
    length = np.sqrt(nx * nx + ny * ny + nz * nz)
    return np.dstack([nx / length, ny / length, nz / length]) * 0.5 + 0.5


def periodic_noise(size, cells, rng, stretch=1.0):
    """Smooth value noise that wraps at the tile edge, so every repeat is seamless.

    A plain resize clamps at the border, so the last texel row never blends back into the
    first and every repeat shows a seam. The grid is padded with its own opposite edge and
    only the original cell span is resampled, which makes the result exactly periodic."""
    rows, cols = cells, max(1, int(cells / stretch))
    pad = 3
    grid = np.pad(rng.random((rows, cols)).astype(np.float32), pad, mode="wrap")
    up = Image.fromarray(grid).resize((size, size), Image.BICUBIC,
                                      box=(pad, pad, pad + cols, pad + rows))
    return np.asarray(up).astype(np.float32)


def fractal(size, rng, base_cells=8, octaves=5, gain=0.5, stretch=1.0):
    out = np.zeros((size, size), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        cells = base_cells * (2 ** o)
        if cells > size:
            break
        out += periodic_noise(size, cells, rng, stretch) * amp
        total += amp
        amp *= gain
    return out / total


def procedural_tile(name, size=1024):
    """Seamless material tiles built from wrapped noise; used when no generated source exists."""
    # crc32, not hash(): str hashing is salted per process, so the tile changed on every run.
    rng = np.random.default_rng(zlib.crc32(name.encode()))
    if name == "tile-stucco":
        n = fractal(size, rng, 32, 5, 0.55)
        rgb = np.dstack([n * 0.10 + 0.86, n * 0.10 + 0.85, n * 0.10 + 0.82])
    elif name == "tile-concrete":
        n = fractal(size, rng, 8, 6, 0.5)
        pores = (fractal(size, rng, 128, 2, 0.5) > 0.78).astype(np.float32) * 0.08
        v = 0.78 + (n - 0.5) * 0.16 - pores
        rgb = np.dstack([v, v * 0.995, v * 0.98])
    elif name == "tile-asphalt":
        speck = fractal(size, rng, 256, 2, 0.6)
        mottle = fractal(size, rng, 6, 3, 0.5)
        v = 0.60 + (speck - 0.5) * 0.30 + (mottle - 0.5) * 0.10
        rgb = np.dstack([v, v, v * 1.02])
    elif name == "tile-grass":
        # A kept lawn: soft darker drifts carry the variation, blades are only a faint grain.
        # Variation only darkens from a ceiling whose green sits at 1.0, so no texel clips and
        # the bright areas stay green instead of washing out to yellow.
        mottle = fractal(size, rng, 3, 3, 0.5)
        m = (mottle - mottle.min()) / np.ptp(mottle)
        grain = fractal(size, rng, 128, 2, 0.5, stretch=0.5)
        v = 1.0 - 0.16 * m ** 2 - (grain - grain.min()) / np.ptp(grain) * 0.05
        rgb = np.dstack([v * 0.83, v, v * 0.58])
    elif name == "tile-wood":
        grain = fractal(size, rng, 6, 5, 0.55, stretch=0.06)
        rings = np.sin((grain * 14.0 + np.linspace(0, 6.0, size)[None, :]) * np.pi) * 0.5 + 0.5
        v = 0.74 + (grain - 0.5) * 0.18 - rings * 0.07
        rgb = np.dstack([v * 1.06, v * 0.93, v * 0.76])
    else:
        raise ValueError(name)
    return np.clip(rgb, 0, 1)


def tile(name, size=1024, target_mean=0.80, strength=2.0):
    src = os.path.join(SRC, name, "front.png")
    if os.path.exists(src):
        img = Image.open(src).convert("RGB").resize((size, size), Image.LANCZOS)
        rgb = np.asarray(img).astype(np.float32) / 255.0
    else:
        rgb = procedural_tile(name, size)
    lum = rgb.mean()
    rgb = np.clip(rgb * (target_mean / max(lum, 1e-3)), 0, 1)
    Image.fromarray((rgb * 255).round().astype(np.uint8)).save(os.path.join(OUT, f"{name}-albedo.jpg"), quality=86)
    grey = np.asarray(Image.fromarray((rgb * 255).astype(np.uint8)).convert("L")
                      .filter(ImageFilter.GaussianBlur(1.0))).astype(np.float32) / 255.0
    Image.fromarray((sobel_normal(grey, strength) * 255).round().astype(np.uint8)).save(
        os.path.join(OUT, f"{name}-normal.png"))
    print(f"{name}: albedo normalised from mean {lum:.2f} to {target_mean}, normal written")


TILE_NAMES = ("tile-stucco", "tile-concrete", "tile-asphalt", "tile-grass", "tile-wood")
# Grass is strongly green, so the shared 0.80 luminance target would push its green channel
# past 1.0 and clip; 0.75 is the highest target at which its ceiling stays unclipped.
TARGET_MEAN = {"tile-grass": 0.75}

# Named tiles regenerate just those; no arguments rebuilds every texture.
requested = sys.argv[1:]
if not requested:
    key_cluster("leaf-cluster")
    key_cluster("blossom-cluster")
    bark_maps()
for tile_name in requested or TILE_NAMES:
    tile(tile_name, target_mean=TARGET_MEAN.get(tile_name, 0.80))
