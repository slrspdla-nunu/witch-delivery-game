from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import numpy as np


SRC = Path(r"C:\Users\Administrator\Downloads\ChatGPT Image 2026년 7월 6일 오후 02_32_52.png")
OUT = Path(r"D:\김주휘\마녀 배달부 게임\extracted_assets")


def aa_mask(size, draw_fn, scale=4, blur=0.4):
    w, h = size
    mask = Image.new("L", (w * scale, h * scale), 0)
    draw = ImageDraw.Draw(mask)

    def pts(points):
        return [(int(x * scale), int(y * scale)) for x, y in points]

    def box(b):
        x1, y1, x2, y2 = b
        return (int(x1 * scale), int(y1 * scale), int(x2 * scale), int(y2 * scale))

    draw_fn(draw, pts, box, scale)
    if blur:
        mask = mask.filter(ImageFilter.GaussianBlur(blur * scale))
    return mask.resize(size, Image.Resampling.LANCZOS)


def save_rgba(name, crop, mask=None):
    im = source.crop(crop).convert("RGBA")
    if mask is not None:
        im.putalpha(mask)
    im.save(OUT / name)


def threshold_warm_mask(im, min_alpha=0):
    arr = np.asarray(im.convert("RGBA")).copy()
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    lum = (0.299 * r + 0.587 * g + 0.114 * b)
    warm = (r > 150) & (g > 105) & (b > 70) & (r >= b + 18)
    bright = (lum > 180) & (r > 170)
    mask = (warm | bright).astype(np.uint8) * 255
    m = Image.fromarray(mask, "L")
    m = m.filter(ImageFilter.GaussianBlur(0.45))
    m = ImageOps.autocontrast(m)
    if min_alpha:
        a = np.asarray(m).copy()
        a[a < min_alpha] = 0
        m = Image.fromarray(a, "L")
    return m


def threshold_bright_mask(im, threshold=125):
    arr = np.asarray(im.convert("RGBA"))
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    lum = (0.299 * r + 0.587 * g + 0.114 * b)
    mask = ((lum > threshold) & (r > 95) & (g > 70)).astype(np.uint8) * 255
    return Image.fromarray(mask, "L").filter(ImageFilter.GaussianBlur(0.8))


def rect_panel_mask(size, cut=14):
    w, h = size
    return aa_mask(size, lambda d, pts, box, s: d.polygon(pts([
        (cut, 0), (w - cut, 0), (w, cut), (w, h - cut),
        (w - cut, h), (cut, h), (0, h - cut), (0, cut)
    ]), fill=255), blur=0.3)


def start_button_mask(size):
    w, h = size
    return aa_mask(size, lambda d, pts, box, s: d.polygon(pts([
        (40, 5), (w - 40, 5), (w - 8, 32), (w - 18, h - 22),
        (w - 50, h - 5), (50, h - 5), (18, h - 22), (8, 32)
    ]), fill=255), blur=0.5)


OUT.mkdir(parents=True, exist_ok=True)
source = Image.open(SRC).convert("RGB")

# Background layers. The transparent-hole version preserves only visible source pixels;
# covered areas cannot be recovered from the flattened screenshot.
source.save(OUT / "background_full_original.png")
bg_rgba = source.convert("RGBA")
hole = Image.new("L", source.size, 255)

def subtract_hole(crop, mask):
    layer = Image.new("L", source.size, 0)
    layer.paste(mask, crop[:2])
    global hole
    hole = Image.composite(Image.new("L", source.size, 0), hole, layer)


# Logo/title cutout.
logo_crop = (118, 232, 750, 560)
logo_roi = source.crop(logo_crop)
logo_mask = threshold_warm_mask(logo_roi, 22)
save_rgba("logo_title_transparent.png", logo_crop, logo_mask)
subtract_hole(logo_crop, logo_mask)

# Moon.
moon_crop = (78, 65, 280, 225)
moon_roi = source.crop(moon_crop)
moon_mask = threshold_bright_mask(moon_roi, 95)
save_rgba("moon_transparent.png", moon_crop, moon_mask)
subtract_hole(moon_crop, moon_mask)

# Foreground witch girl, broom, and bag.
witch_crop = (0, 715, 535, 1588)
witch_mask = aa_mask((535, 873), lambda d, pts, box, s: (
    d.polygon(pts([
        (7, 610), (34, 524), (82, 478), (80, 390), (55, 300),
        (74, 205), (125, 105), (202, 52), (327, 38), (460, 80),
        (522, 142), (508, 218), (444, 244), (438, 330), (475, 390),
        (509, 487), (494, 563), (463, 618), (520, 720), (491, 792),
        (394, 800), (360, 872), (126, 872), (107, 822), (18, 797)
    ]), fill=255),
    d.polygon(pts([(0, 605), (145, 580), (185, 627), (50, 709), (0, 710)]), fill=255),
    d.polygon(pts([(0, 682), (130, 630), (170, 685), (44, 760), (0, 760)]), fill=255),
    d.ellipse(box((102, 130, 520, 288)), fill=255),
    d.polygon(pts([(87, 65), (185, 30), (222, 118), (94, 150)]), fill=255),
    d.polygon(pts([(0, 548), (170, 535), (160, 660), (0, 724)]), fill=255)
), blur=0.9)
witch_cut = Image.new("L", witch_mask.size, 255)
ImageDraw.Draw(witch_cut).polygon([
    (166, 744), (535, 732), (535, 873), (210, 873)
], fill=0)
witch_mask = Image.composite(Image.new("L", witch_mask.size, 0), witch_mask, ImageOps.invert(witch_cut))
save_rgba("witch_girl_transparent.png", witch_crop, witch_mask)
subtract_hole(witch_crop, witch_mask)

# Cat.
cat_crop = (418, 1078, 612, 1410)
cat_mask = aa_mask((194, 332), lambda d, pts, box, s: (
    d.polygon(pts([(38, 58), (67, 8), (95, 50), (128, 10), (155, 64), (150, 120), (40, 120)]), fill=255),
    d.ellipse(box((33, 48, 160, 166)), fill=255),
    d.ellipse(box((45, 125, 152, 286)), fill=255),
    d.ellipse(box((22, 252, 96, 323)), fill=255),
    d.ellipse(box((103, 252, 178, 322)), fill=255),
    d.polygon(pts([(142, 192), (194, 187), (190, 238), (148, 231)]), fill=255)
), blur=0.8)
save_rgba("black_cat_transparent.png", cat_crop, cat_mask)
subtract_hole(cat_crop, cat_mask)

# Balloons.
large_balloon_crop = (604, 618, 839, 860)
large_balloon_mask = aa_mask((235, 242), lambda d, pts, box, s: (
    d.ellipse(box((18, 18, 212, 130)), fill=255),
    d.polygon(pts([(42, 82), (200, 82), (190, 160), (60, 160)]), fill=255),
    d.polygon(pts([(68, 145), (181, 145), (190, 207), (54, 210)]), fill=255),
    d.rectangle(box((75, 175, 181, 225)), fill=255),
    d.polygon(pts([(200, 35), (235, 55), (215, 120)]), fill=255)
), blur=0.55)
save_rgba("hot_air_balloon_large_transparent.png", large_balloon_crop, large_balloon_mask)
subtract_hole(large_balloon_crop, large_balloon_mask)

mid_balloon_crop = (535, 715, 608, 808)
mid_balloon_mask = aa_mask((73, 93), lambda d, pts, box, s: (
    d.ellipse(box((9, 2, 63, 46)), fill=255),
    d.polygon(pts([(18, 34), (56, 34), (51, 65), (22, 65)]), fill=255),
    d.rectangle(box((25, 61, 51, 88)), fill=255)
), blur=0.4)
save_rgba("hot_air_balloon_mid_transparent.png", mid_balloon_crop, mid_balloon_mask)
subtract_hole(mid_balloon_crop, mid_balloon_mask)

tiny_balloon_crop = (254, 630, 293, 672)
tiny_balloon_mask = aa_mask((39, 42), lambda d, pts, box, s: (
    d.ellipse(box((8, 4, 28, 21)), fill=255),
    d.polygon(pts([(12, 16), (28, 16), (25, 31), (15, 31)]), fill=255),
    d.rectangle(box((16, 29, 26, 38)), fill=255)
), blur=0.35)
save_rgba("hot_air_balloon_tiny_transparent.png", tiny_balloon_crop, tiny_balloon_mask)
subtract_hole(tiny_balloon_crop, tiny_balloon_mask)

# Top buttons.
settings_crop = (723, 54, 821, 150)
settings_mask = aa_mask((98, 96), lambda d, pts, box, s: d.ellipse(box((2, 2, 96, 94)), fill=255), blur=0.4)
save_rgba("button_settings_transparent.png", settings_crop, settings_mask)
subtract_hole(settings_crop, settings_mask)

mail_crop = (722, 166, 828, 259)
mail_mask = aa_mask((106, 93), lambda d, pts, box, s: (
    d.ellipse(box((2, 0, 93, 92)), fill=255),
    d.ellipse(box((84, 6, 105, 27)), fill=255)
), blur=0.4)
save_rgba("button_mail_transparent.png", mail_crop, mail_mask)
subtract_hole(mail_crop, mail_mask)

# Main and side buttons.
start_crop = (178, 1458, 696, 1598)
sm = start_button_mask((518, 140))
save_rgba("button_game_start_transparent.png", start_crop, sm)
subtract_hole(start_crop, sm)

quest_crop = (668, 1268, 835, 1438)
qm = rect_panel_mask((167, 170), 18)
save_rgba("button_quest_list_transparent.png", quest_crop, qm)
subtract_hole(quest_crop, qm)

button_specs = [
    ("button_broom_transparent.png", (54, 1630, 200, 1785)),
    ("button_shop_transparent.png", (254, 1630, 402, 1785)),
    ("button_encyclopedia_transparent.png", (455, 1630, 604, 1785)),
    ("button_achievements_transparent.png", (655, 1630, 804, 1785)),
]
for name, crop in button_specs:
    bm = rect_panel_mask((crop[2] - crop[0], crop[3] - crop[1]), 15)
    save_rgba(name, crop, bm)
    subtract_hole(crop, bm)

bg_rgba.putalpha(hole)
bg_rgba.save(OUT / "background_visible_with_transparent_holes.png")

# A quick contact sheet for visual checking.
files = [p for p in sorted(OUT.glob("*.png")) if p.name != "background_full_original.png" and not p.name.startswith("_")]
thumbs = []
for p in files:
    im = Image.open(p).convert("RGBA")
    im.thumbnail((180, 180), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (200, 220), (30, 25, 42, 255))
    canvas.alpha_composite(im, ((200 - im.width) // 2, 12))
    dd = ImageDraw.Draw(canvas)
    dd.text((8, 190), p.stem[:28], fill=(245, 225, 190, 255))
    thumbs.append(canvas)

cols = 4
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new("RGBA", (cols * 200, rows * 220), (12, 12, 24, 255))
for i, t in enumerate(thumbs):
    sheet.alpha_composite(t, ((i % cols) * 200, (i // cols) * 220))
sheet.save(OUT / "_contact_sheet.png")

print(f"saved {len(list(OUT.glob('*.png')))} png files to {OUT}")
