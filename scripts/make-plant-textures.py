"""Turn the generated plant source images into game textures.

- leaf-cluster / blossom-cluster: key the background out (sampled from the image corners, so
  a white or black backdrop both work), soften the edge, write RGBA with the foreground
  colour bled outward so bilinear filtering never fringes. Output 1024 px.
- bark: derive a tangent-space normal map from luminance with a Sobel filter, plus a
  downscaled albedo.

Outputs land in assets/raw/textures/ and are read by scripts/blender/plants_build.py.

    python3 scripts/make-plant-textures.py
"""

import os

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


key_cluster("leaf-cluster")
key_cluster("blossom-cluster")
bark_maps()
