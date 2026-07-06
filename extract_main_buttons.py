from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path("D:\\\uAE40\uC8FC\uD718\\\uB9C8\uB140 \uBC30\uB2EC\uBD80 \uAC8C\uC784")
OUT = ROOT / "remade_assets"
SRC = OUT / "main_background_hq.png"


def aa_mask(size, draw_fn, scale=4, blur=0.35):
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


def trim(im, pad=4):
    bbox = im.getbbox()
    if not bbox:
        return im
    x1, y1, x2, y2 = bbox
    return im.crop((max(0, x1 - pad), max(0, y1 - pad), min(im.width, x2 + pad), min(im.height, y2 + pad)))


def panel_mask(size, cut=26):
    w, h = size
    return aa_mask(size, lambda d, pts, box, s: d.polygon(pts([
        (cut, 2), (w - cut, 2), (w - 3, cut), (w - 3, h - cut),
        (w - cut, h - 3), (cut, h - 3), (3, h - cut), (3, cut)
    ]), fill=255), blur=0.28)


def start_mask(size):
    w, h = size
    return aa_mask(size, lambda d, pts, box, s: d.polygon(pts([
        (72, 8), (w - 72, 8), (w - 14, 62), (w - 34, h - 42),
        (w - 88, h - 9), (88, h - 9), (34, h - 42), (14, 62)
    ]), fill=255), blur=0.38)


def circle_mask(size, extra_dot=False):
    w, h = size
    return aa_mask(size, lambda d, pts, box, s: (
        d.ellipse(box((4, 4, min(w, h) - 4, min(w, h) - 4)), fill=255),
        d.ellipse(box((w - 48, 14, w - 8, 54)), fill=255) if extra_dot else None
    ), blur=0.32)


def save_button(src, name, crop, mask):
    im = src.crop(crop).convert("RGBA")
    im.putalpha(mask)
    im = trim(im, 3)
    im = im.filter(ImageFilter.UnsharpMask(radius=0.45, percent=45, threshold=4))
    im.save(OUT / name)


def make_preview():
    names = [
        "button_game_start_hq.png",
        "button_quest_list_hq.png",
        "button_broom_hq.png",
        "button_shop_hq.png",
        "button_encyclopedia_hq.png",
        "button_achievements_hq.png",
        "button_settings_hq.png",
        "button_mail_hq.png",
    ]
    try:
        font = ImageFont.truetype(r"C:\Windows\Fonts\malgun.ttf", 14)
    except OSError:
        font = None
    thumbs = []
    for name in names:
        im = Image.open(OUT / name).convert("RGBA")
        im.thumbnail((300, 210), Image.Resampling.LANCZOS)
        canvas = Image.new("RGBA", (340, 260), (22, 18, 33, 255))
        canvas.alpha_composite(im, ((340 - im.width) // 2, 18))
        ImageDraw.Draw(canvas).text((10, 228), name, fill=(245, 225, 190, 255), font=font)
        thumbs.append(canvas)
    sheet = Image.new("RGBA", (680, 1040), (12, 12, 24, 255))
    for i, thumb in enumerate(thumbs):
        sheet.alpha_composite(thumb, ((i % 2) * 340, (i // 2) * 260))
    sheet.save(OUT / "_buttons_exact_preview.png")


if __name__ == "__main__":
    src = Image.open(SRC).convert("RGBA")
    specs = [
        ("button_game_start_hq.png", (356, 2916, 1392, 3196), start_mask((1036, 280))),
        ("button_quest_list_hq.png", (1348, 2548, 1644, 2868), panel_mask((296, 320), 30)),
        ("button_broom_hq.png", (108, 3260, 400, 3570), panel_mask((292, 310), 28)),
        ("button_shop_hq.png", (508, 3260, 804, 3570), panel_mask((296, 310), 28)),
        ("button_encyclopedia_hq.png", (910, 3260, 1208, 3570), panel_mask((298, 310), 28)),
        ("button_achievements_hq.png", (1318, 3274, 1596, 3564), panel_mask((278, 290), 26)),
        ("button_settings_hq.png", (1446, 108, 1642, 300), circle_mask((196, 192))),
        ("button_mail_hq.png", (1444, 332, 1656, 518), circle_mask((212, 186), extra_dot=True)),
    ]
    for name, crop, mask in specs:
        save_button(src, name, crop, mask)
    make_preview()
    print("extracted exact buttons from main_background_hq")
