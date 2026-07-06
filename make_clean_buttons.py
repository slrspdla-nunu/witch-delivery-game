from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import math


ROOT = Path("D:\\\uAE40\uC8FC\uD718\\\uB9C8\uB140 \uBC30\uB2EC\uBD80 \uAC8C\uC784")
OUT = ROOT / "remade_assets"

FONT_BOLD = r"C:\Windows\Fonts\malgunbd.ttf"
FONT_SERIF = r"C:\Windows\Fonts\NotoSerifKR-VF.ttf"


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.truetype(r"C:\Windows\Fonts\malgunbd.ttf", size)


def star_points(cx, cy, r1, r2, count=5):
    pts = []
    for i in range(count * 2):
        a = -math.pi / 2 + i * math.pi / count
        r = r1 if i % 2 == 0 else r2
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return pts


def draw_text_center(d, xy, text, fnt, fill, stroke=0, stroke_fill=None):
    x, y, w, h = xy
    bb = d.textbbox((0, 0), text, font=fnt, stroke_width=stroke)
    tw, th = bb[2] - bb[0], bb[3] - bb[1]
    d.text(
        (x + (w - tw) / 2, y + (h - th) / 2 - bb[1]),
        text,
        font=fnt,
        fill=fill,
        stroke_width=stroke,
        stroke_fill=stroke_fill or fill,
    )


def save_downscaled(name, im, scale=4):
    w, h = im.size
    im = im.resize((w // scale, h // scale), Image.Resampling.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=0.45, percent=70, threshold=3))
    im.save(OUT / name)


def ornate_panel(width, height, label, icon):
    s = 4
    W, H = width * s, height * s
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    bg = (31, 27, 43, 246)
    edge = (239, 191, 146, 255)
    edge_dark = (116, 80, 105, 255)
    gold = (205, 154, 105, 255)
    cream = (255, 231, 190, 255)
    purple = (94, 66, 145, 255)
    cut = 25 * s
    pad = 8 * s
    poly = [
        (cut, pad), (W - cut, pad), (W - pad, cut),
        (W - pad, H - cut), (W - cut, H - pad),
        (cut, H - pad), (pad, H - cut), (pad, cut),
    ]
    d.polygon(poly, fill=bg)
    d.line(poly + [poly[0]], fill=edge, width=4 * s)
    inner = [(x * 0.92 + W * 0.04, y * 0.92 + H * 0.04) for x, y in poly]
    d.line(inner + [inner[0]], fill=edge_dark, width=1 * s)

    # Original-style clipped corner flourishes.
    l, t, r, b = pad, pad, W - pad, H - pad
    c = cut
    flourish = 18 * s
    corners = [
        [(l, c + flourish), (l, c), (c, t), (c + flourish, t)],
        [(r - c - flourish, t), (r - c, t), (r, c), (r, c + flourish)],
        [(l, b - c - flourish), (l, b - c), (c, b), (c + flourish, b)],
        [(r - c - flourish, b), (r - c, b), (r, b - c), (r, b - c - flourish)],
    ]
    for seg in corners:
        d.line(seg, fill=edge, width=3*s, joint="curve")
    for x, y, flip_x, flip_y in [
        (c, c, 1, 1), (W - c, c, -1, 1), (c, H - c, 1, -1), (W - c, H - c, -1, -1)
    ]:
        d.line((x, y, x + flip_x * 18*s, y), fill=edge_dark, width=1*s)
        d.line((x, y, x, y + flip_y * 18*s), fill=edge_dark, width=1*s)

    cx = W // 2
    iy = 80 * s
    if icon == "broom":
        d.polygon([(cx - 48*s, iy + 14*s), (cx + 24*s, iy - 18*s), (cx + 36*s, iy + 58*s)], fill=(186, 138, 98, 255))
        d.polygon([(cx - 58*s, iy + 45*s), (cx + 54*s, iy + 48*s), (cx + 10*s, iy + 76*s)], fill=gold)
        d.rectangle((cx - 26*s, iy + 36*s, cx + 28*s, iy + 46*s), fill=purple)
        d.line((cx - 34*s, iy + 48*s, cx + 44*s, iy + 50*s), fill=(70, 50, 67, 255), width=2*s)
    elif icon == "shop":
        d.rounded_rectangle((cx - 46*s, iy - 18*s, cx + 46*s, iy + 58*s), radius=8*s, fill=gold)
        d.arc((cx - 28*s, iy - 48*s, cx + 28*s, iy + 16*s), 190, 350, fill=gold, width=7*s)
        d.line((cx - 46*s, iy + 10*s, cx + 46*s, iy + 10*s), fill=(94, 63, 70, 255), width=3*s)
        d.rounded_rectangle((cx - 8*s, iy + 18*s, cx + 8*s, iy + 34*s), radius=2*s, fill=(67, 47, 58, 255))
    elif icon == "book":
        d.polygon([(cx - 28*s, iy - 36*s), (cx + 42*s, iy - 14*s), (cx + 18*s, iy + 72*s), (cx - 54*s, iy + 50*s)], fill=purple)
        d.line((cx - 18*s, iy - 24*s, cx + 32*s, iy - 8*s), fill=(234, 205, 177, 255), width=3*s)
        d.polygon(star_points(cx + 10*s, iy + 10*s, 14*s, 6*s), fill=gold)
        d.rectangle((cx - 48*s, iy + 45*s, cx + 16*s, iy + 58*s), fill=(238, 218, 198, 255))
    elif icon == "trophy":
        d.rounded_rectangle((cx - 42*s, iy - 34*s, cx + 42*s, iy + 34*s), radius=5*s, fill=gold)
        d.arc((cx - 78*s, iy - 18*s, cx - 20*s, iy + 34*s), 270, 70, fill=gold, width=8*s)
        d.arc((cx + 20*s, iy - 18*s, cx + 78*s, iy + 34*s), 110, 270, fill=gold, width=8*s)
        d.rectangle((cx - 10*s, iy + 34*s, cx + 10*s, iy + 62*s), fill=gold)
        d.rounded_rectangle((cx - 42*s, iy + 62*s, cx + 42*s, iy + 78*s), radius=3*s, fill=gold)
        d.polygon(star_points(cx, iy, 13*s, 6*s), fill=(47, 35, 54, 255))
    elif icon == "quest":
        d.rounded_rectangle((cx - 52*s, iy - 24*s, cx + 42*s, iy + 44*s), radius=8*s, fill=gold)
        d.line((cx - 12*s, iy - 24*s, cx - 12*s, iy + 44*s), fill=(92, 59, 66, 255), width=4*s)
        d.line((cx - 52*s, iy + 8*s, cx + 42*s, iy + 8*s), fill=(92, 59, 66, 255), width=4*s)
        d.polygon(star_points(cx + 60*s, iy + 42*s, 29*s, 12*s), fill=(255, 218, 158, 255))

    label_font = font(FONT_BOLD, 37 * s if len(label) <= 3 else 31 * s)
    draw_text_center(d, (0, H - 92*s, W, 58*s), label, label_font, cream, stroke=1*s, stroke_fill=(68, 43, 57, 255))
    save_downscaled(f"button_{icon if icon != 'quest' else 'quest_list'}_hq.png", im, s)


def start_button():
    s = 4
    W, H = 1036 * s, 280 * s
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    edge = (91, 54, 70, 255)
    edge2 = (228, 166, 125, 255)
    fill = (255, 224, 174, 255)
    shadow = (110, 68, 84, 70)
    poly = [(72*s, 8*s), (W - 72*s, 8*s), (W - 15*s, 64*s), (W - 34*s, H - 42*s),
            (W - 88*s, H - 10*s), (88*s, H - 10*s), (34*s, H - 42*s), (15*s, 64*s)]
    d.polygon([(x+5*s, y+5*s) for x, y in poly], fill=shadow)
    d.polygon(poly, fill=fill)
    d.line(poly + [poly[0]], fill=edge, width=5*s)
    inner = [(104*s, 38*s), (W - 104*s, 38*s), (W - 56*s, 82*s), (W - 70*s, H - 70*s),
             (W - 112*s, H - 42*s), (112*s, H - 42*s), (70*s, H - 70*s), (56*s, 82*s)]
    d.line(inner + [inner[0]], fill=edge2, width=2*s)
    for x in [90*s, 244*s, W - 244*s, W - 90*s]:
        d.polygon(star_points(x, H // 2, 21*s, 8*s), fill=(185, 130, 96, 180))
    f = font(FONT_BOLD, 82*s)
    draw_text_center(d, (0, 68*s, W, 120*s), "게임 시작", f, (83, 47, 63, 255), stroke=0)
    save_downscaled("button_game_start_hq.png", im, s)


def round_button(name, kind):
    s = 4
    W, H = (196*s, 196*s) if kind == "settings" else (212*s, 186*s)
    im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    size = min(W, H)
    d.ellipse((8*s, 8*s, size - 8*s, size - 8*s), fill=(30, 27, 43, 246), outline=(189, 122, 146, 255), width=5*s)
    d.ellipse((17*s, 17*s, size - 17*s, size - 17*s), outline=(76, 54, 83, 255), width=2*s)
    cx, cy = size // 2, size // 2
    if kind == "settings":
        for i in range(8):
            a = i * math.pi / 4
            x, y = cx + math.cos(a)*32*s, cy + math.sin(a)*32*s
            d.rounded_rectangle((x-8*s, y-15*s, x+8*s, y+15*s), radius=3*s, fill=(246, 242, 238, 255))
        d.ellipse((cx-34*s, cy-34*s, cx+34*s, cy+34*s), fill=(246, 242, 238, 255))
        d.ellipse((cx-14*s, cy-14*s, cx+14*s, cy+14*s), fill=(30, 27, 43, 255))
    else:
        d.rectangle((48*s, 58*s, 150*s, 124*s), outline=(247, 242, 236, 255), width=6*s)
        d.line((48*s, 58*s, 99*s, 98*s, 150*s, 58*s), fill=(247, 242, 236, 255), width=5*s)
        d.line((48*s, 124*s, 93*s, 92*s), fill=(247, 242, 236, 255), width=5*s)
        d.line((150*s, 124*s, 105*s, 92*s), fill=(247, 242, 236, 255), width=5*s)
        d.ellipse((W - 48*s, 13*s, W - 15*s, 46*s), fill=(226, 61, 70, 255), outline=(255, 230, 229, 255), width=4*s)
    save_downscaled(name, im, s)


def preview():
    names = [
        "button_game_start_hq.png", "button_quest_list_hq.png",
        "button_broom_hq.png", "button_shop_hq.png",
        "button_book_hq.png", "button_trophy_hq.png",
        "button_settings_hq.png", "button_mail_hq.png",
    ]
    rename = {
        "button_book_hq.png": "button_encyclopedia_hq.png",
        "button_trophy_hq.png": "button_achievements_hq.png",
    }
    for src, dst in rename.items():
        p = OUT / src
        if p.exists():
            p.replace(OUT / dst)
    names = [
        "button_game_start_hq.png", "button_quest_list_hq.png",
        "button_broom_hq.png", "button_shop_hq.png",
        "button_encyclopedia_hq.png", "button_achievements_hq.png",
        "button_settings_hq.png", "button_mail_hq.png",
    ]
    try:
        f = ImageFont.truetype(r"C:\Windows\Fonts\malgun.ttf", 14)
    except OSError:
        f = None
    thumbs = []
    for name in names:
        im = Image.open(OUT / name).convert("RGBA")
        im.thumbnail((300, 210), Image.Resampling.LANCZOS)
        c = Image.new("RGBA", (340, 260), (22, 18, 33, 255))
        c.alpha_composite(im, ((340 - im.width) // 2, 18))
        ImageDraw.Draw(c).text((10, 228), name, fill=(245, 225, 190, 255), font=f)
        thumbs.append(c)
    sheet = Image.new("RGBA", (680, 1040), (12, 12, 24, 255))
    for i, t in enumerate(thumbs):
        sheet.alpha_composite(t, ((i % 2) * 340, (i // 2) * 260))
    sheet.save(OUT / "_buttons_clean_preview.png")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    start_button()
    ornate_panel(334, 340, "의뢰 목록", "quest")
    ornate_panel(292, 310, "빗자루", "broom")
    ornate_panel(296, 310, "상점", "shop")
    ornate_panel(298, 310, "도감", "book")
    ornate_panel(298, 310, "업적", "trophy")
    round_button("button_settings_hq.png", "settings")
    round_button("button_mail_hq.png", "mail")
    preview()
    print("created clean redrawn buttons with correct Korean labels")
