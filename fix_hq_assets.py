from pathlib import Path
from PIL import Image, ImageFilter, ImageOps
import numpy as np


ROOT = Path("D:\\\uAE40\uC8FC\uD718\\\uB9C8\uB140 \uBC30\uB2EC\uBD80 \uAC8C\uC784")
SRC = ROOT / "extracted_assets"
OUT = ROOT / "remade_assets"


def trim(im, pad=4):
    bbox = im.getbbox()
    if not bbox:
        return im
    x1, y1, x2, y2 = bbox
    x1 = max(0, x1 - pad)
    y1 = max(0, y1 - pad)
    x2 = min(im.width, x2 + pad)
    y2 = min(im.height, y2 + pad)
    return im.crop((x1, y1, x2, y2))


def clean_green_edge(path):
    im = Image.open(path).convert("RGBA")
    arr = np.asarray(im).copy()
    r = arr[..., 0].astype(np.int16)
    g = arr[..., 1].astype(np.int16)
    b = arr[..., 2].astype(np.int16)
    a = arr[..., 3]

    green = (g > 70) & (g > r + 18) & (g > b + 18)
    strong_green = (g > 105) & (g > r + 28) & (g > b + 28)

    # Remove the visible chroma fringe, then despill softer edge pixels.
    a[strong_green] = 0
    spill = green & (a > 0)
    arr[..., 1][spill] = np.maximum(arr[..., 0][spill], arr[..., 2][spill])

    alpha = Image.fromarray(a, "L")
    # Slightly contract then feather the edge to hide any single-pixel halo.
    contracted = alpha.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.35))
    arr[..., 3] = np.asarray(contracted)
    out = Image.fromarray(arr, "RGBA")
    out = trim(out, 6)
    out.save(path)


def clean_white_sheet_cutout(src_crop, out_path, scale=4):
    im = Image.open(SRC / "Luna.png").convert("RGBA").crop(src_crop)
    arr = np.asarray(im).copy()
    r = arr[..., 0].astype(np.int16)
    g = arr[..., 1].astype(np.int16)
    b = arr[..., 2].astype(np.int16)
    white_bg = (r > 218) & (g > 212) & (b > 202) & ((r - b) < 42)
    line_bg = (r > 180) & (g > 165) & (b > 160) & (np.abs(r - g) < 30) & (np.abs(g - b) < 45)
    alpha = np.where(white_bg | line_bg, 0, 255).astype(np.uint8)
    alpha = Image.fromarray(alpha, "L").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.45))
    arr[..., 3] = np.asarray(alpha)
    out = trim(Image.fromarray(arr, "RGBA"), 2)
    out = out.resize((out.width * scale, out.height * scale), Image.Resampling.LANCZOS)
    out = out.filter(ImageFilter.UnsharpMask(radius=0.6, percent=80, threshold=3))
    out.save(out_path)


def color_distance_logo_mask(crop):
    arr = np.asarray(crop.convert("RGBA")).copy()
    rgb = arr[..., :3].astype(np.int16)
    # Main logo sits on deep blue/purple sky. Preserve warm logo, white subtitle,
    # dark stroke/shadow immediately attached to letters, and decorative sparkles.
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = (0.299 * r + 0.587 * g + 0.114 * b)
    warm = (r > 135) & (g > 92) & (b > 55) & (r > b + 14)
    pale = (r > 185) & (g > 175) & (b > 155)
    white_text = (lum > 175) & (r > 150) & (g > 145) & (b > 135)
    raw = (warm | pale | white_text).astype(np.uint8) * 255
    mask = Image.fromarray(raw, "L")
    mask = mask.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.65))
    mask = ImageOps.autocontrast(mask)
    a = np.asarray(mask).copy()
    a[a < 34] = 0
    return Image.fromarray(a, "L")


def rebuild_logo():
    main = Image.open(SRC / "main_img1.png").convert("RGBA")
    crop = main.crop((105, 205, 760, 575))
    mask = color_distance_logo_mask(crop)
    crop.putalpha(mask)
    out = trim(crop, 6)
    out = out.resize((out.width * 3, out.height * 3), Image.Resampling.LANCZOS)
    out = out.filter(ImageFilter.UnsharpMask(radius=0.7, percent=70, threshold=4))
    out.save(OUT / "logo_title_hq.png")


def rebuild_moon():
    main = Image.open(SRC / "main_img1.png").convert("RGBA")
    crop = main.crop((80, 55, 286, 230))
    arr = np.asarray(crop).copy()
    r = arr[..., 0].astype(np.int16)
    g = arr[..., 1].astype(np.int16)
    b = arr[..., 2].astype(np.int16)
    lum = (0.299 * r + 0.587 * g + 0.114 * b)
    moon = (lum > 118) & (r > 112) & (g > 95) & (b > 86) & (r >= b + 8)
    alpha = Image.fromarray((moon.astype(np.uint8) * 255), "L")
    alpha = alpha.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(1.05))
    crop.putalpha(alpha)
    out = trim(crop, 8)
    out = out.resize((out.width * 4, out.height * 4), Image.Resampling.LANCZOS)
    out = out.filter(ImageFilter.UnsharpMask(radius=0.6, percent=60, threshold=4))
    out.save(OUT / "moon_hq.png")


def make_preview():
    names = [
        "logo_title_hq.png",
        "luna_main_pose_transparent.png",
        "nero_cat_transparent.png",
        "moon_hq.png",
    ]
    thumbs = []
    for name in names:
        im = Image.open(OUT / name).convert("RGBA")
        im.thumbnail((360, 360), Image.Resampling.LANCZOS)
        c = Image.new("RGBA", (420, 430), (22, 18, 33, 255))
        c.alpha_composite(im, ((420 - im.width) // 2, 20))
        thumbs.append(c)
    sheet = Image.new("RGBA", (840, 860), (12, 12, 24, 255))
    for i, t in enumerate(thumbs):
        sheet.alpha_composite(t, ((i % 2) * 420, (i // 2) * 430))
    sheet.save(OUT / "_fixed_four_preview.png")


clean_green_edge(OUT / "luna_main_pose_transparent.png")
clean_white_sheet_cutout((1088, 1015, 1235, 1122), OUT / "nero_cat_transparent.png", 4)
rebuild_logo()
rebuild_moon()
make_preview()
print("fixed logo_title_hq, luna_main_pose_transparent, nero_cat_transparent, moon_hq")
