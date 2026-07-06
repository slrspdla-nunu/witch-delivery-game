from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps
import numpy as np


ROOT = Path(r"D:\김주휘\마녀 배달부 게임")
SRC_DIR = ROOT / "extracted_assets"
OUT = ROOT / "remade_assets"
MAIN = SRC_DIR / "main_img1.png"
LUNA = SRC_DIR / "Luna.png"
GEN_WITCH = Path(r"C:\Users\Administrator\.codex\generated_images\019f35ea-bf4b-7051-9942-bed45885c582\ig_0161fb8e5da7ea19016a4b41405e18819196dad87710872925.png")
GEN_BG = Path(r"C:\Users\Administrator\.codex\generated_images\019f35ea-bf4b-7051-9942-bed45885c582\ig_05e53af0f1307bc6016a4b425034888191be4fef8087161c5c.png")

FONT_KR = r"C:\Windows\Fonts\NotoSerifKR-VF.ttf"
FONT_KR_BOLD = r"C:\Windows\Fonts\malgunbd.ttf"


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.truetype(r"C:\Windows\Fonts\malgun.ttf", size)


def upscale(im, factor=2):
    im = im.convert("RGBA")
    up = im.resize((im.width * factor, im.height * factor), Image.Resampling.LANCZOS)
    up = up.filter(ImageFilter.UnsharpMask(radius=1.2, percent=115, threshold=2))
    return up


def remove_chroma_green(im):
    rgba = im.convert("RGBA")
    arr = np.asarray(rgba).copy()
    r, g, b = arr[..., 0].astype(np.int16), arr[..., 1].astype(np.int16), arr[..., 2].astype(np.int16)
    green = (g > 150) & (g > r + 45) & (g > b + 45)
    alpha = np.where(green, 0, 255).astype(np.uint8)
    alpha_img = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.7))
    a = np.asarray(alpha_img).copy()
    a[a < 80] = 0
    a[a > 170] = 255
    arr[..., 3] = a
    return Image.fromarray(arr, "RGBA")


def remove_light_background(crop):
    rgba = crop.convert("RGBA")
    arr = np.asarray(rgba).copy()
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    bg = (r > 224) & (g > 218) & (b > 205) & (np.abs(r.astype(int) - g.astype(int)) < 28)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha = Image.fromarray(alpha, "L").filter(ImageFilter.GaussianBlur(0.55))
    arr[..., 3] = np.asarray(alpha)
    out = Image.fromarray(arr, "RGBA")
    bbox = out.getbbox()
    return out.crop(bbox) if bbox else out


def draw_star(draw, cx, cy, r1, r2, fill):
    pts = []
    for i in range(10):
        ang = -np.pi / 2 + i * np.pi / 5
        r = r1 if i % 2 == 0 else r2
        pts.append((cx + np.cos(ang) * r, cy + np.sin(ang) * r))
    draw.polygon(pts, fill=fill)


def panel(size, label, icon):
    w, h = size
    scale = 4
    im = Image.new("RGBA", (w * scale, h * scale), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    W, H = im.size
    bg = (31, 27, 43, 242)
    edge = (237, 189, 145, 255)
    edge2 = (111, 79, 103, 255)
    cut = 18 * scale
    poly = [(cut, 0), (W - cut, 0), (W, cut), (W, H - cut), (W - cut, H), (cut, H), (0, H - cut), (0, cut)]
    d.polygon(poly, fill=bg, outline=edge)
    for off in (7 * scale, 14 * scale):
        d.line([(cut + off, off), (W - cut - off, off), (W - off, cut + off), (W - off, H - cut - off),
                (W - cut - off, H - off), (cut + off, H - off), (off, H - cut - off), (off, cut + off),
                (cut + off, off)], fill=edge2 if off == 7 * scale else edge, width=max(2, scale))
    gold = (204, 153, 105, 255)
    purple = (103, 73, 148, 255)
    cx = W // 2
    iy = 48 * scale
    if icon == "hat":
        d.pieslice((cx - 42*scale, iy - 4*scale, cx + 18*scale, iy + 44*scale), 200, 20, fill=gold)
        d.polygon([(cx - 16*scale, iy + 6*scale), (cx + 22*scale, iy - 18*scale), (cx + 34*scale, iy + 32*scale)], fill=gold)
        d.rectangle((cx - 21*scale, iy + 18*scale, cx + 17*scale, iy + 26*scale), fill=purple)
    elif icon == "bag":
        d.rounded_rectangle((cx - 31*scale, iy + 2*scale, cx + 31*scale, iy + 50*scale), radius=7*scale, fill=gold)
        d.arc((cx - 20*scale, iy - 15*scale, cx + 20*scale, iy + 26*scale), 190, 350, fill=gold, width=5*scale)
        d.rectangle((cx - 6*scale, iy + 21*scale, cx + 6*scale, iy + 31*scale), fill=(66, 48, 61, 255))
    elif icon == "book":
        d.polygon([(cx - 20*scale, iy - 10*scale), (cx + 25*scale, iy + 1*scale), (cx + 11*scale, iy + 61*scale), (cx - 35*scale, iy + 50*scale)], fill=purple)
        draw_star(d, cx + 6*scale, iy + 15*scale, 8*scale, 3*scale, gold)
        d.line((cx - 22*scale, iy - 2*scale, cx + 22*scale, iy + 9*scale), fill=gold, width=2*scale)
    elif icon == "trophy":
        d.rectangle((cx - 8*scale, iy + 46*scale, cx + 8*scale, iy + 62*scale), fill=gold)
        d.rectangle((cx - 25*scale, iy + 62*scale, cx + 25*scale, iy + 70*scale), fill=gold)
        d.rounded_rectangle((cx - 28*scale, iy, cx + 28*scale, iy + 44*scale), radius=4*scale, fill=gold)
        d.arc((cx - 54*scale, iy + 5*scale, cx - 10*scale, iy + 42*scale), 270, 80, fill=gold, width=6*scale)
        d.arc((cx + 10*scale, iy + 5*scale, cx + 54*scale, iy + 42*scale), 100, 270, fill=gold, width=6*scale)
        draw_star(d, cx, iy + 21*scale, 8*scale, 3*scale, (50, 36, 63, 255))
    elif icon == "parcel":
        d.rounded_rectangle((cx - 35*scale, iy + 3*scale, cx + 30*scale, iy + 48*scale), radius=5*scale, fill=gold)
        d.line((cx - 8*scale, iy + 3*scale, cx - 8*scale, iy + 48*scale), fill=(86, 55, 63, 255), width=3*scale)
        d.line((cx - 35*scale, iy + 23*scale, cx + 30*scale, iy + 23*scale), fill=(86, 55, 63, 255), width=3*scale)
        draw_star(d, cx + 35*scale, iy + 45*scale, 20*scale, 8*scale, gold)
    label_font = font(FONT_KR_BOLD, 31 * scale)
    bbox = d.textbbox((0, 0), label, font=label_font)
    d.text(((W - (bbox[2]-bbox[0]))/2, H - 68*scale), label, font=label_font, fill=(255, 227, 184, 255))
    return im.resize(size, Image.Resampling.LANCZOS)


def start_button():
    w, h = 1040, 280
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    edge = (101, 58, 73, 255)
    fill = (255, 219, 166, 255)
    line = (238, 177, 128, 255)
    poly = [(70, 18), (w - 70, 18), (w - 15, 75), (w - 35, h - 45), (w - 88, h - 18),
            (88, h - 18), (35, h - 45), (15, 75)]
    d.polygon(poly, fill=fill, outline=edge)
    d.line(poly + [poly[0]], fill=edge, width=8)
    inner = [(92, 42), (w - 92, 42), (w - 47, 86), (w - 63, h - 65), (w - 110, h - 42),
             (110, h - 42), (63, h - 65), (47, 86)]
    d.line(inner + [inner[0]], fill=line, width=4)
    f = font(FONT_KR_BOLD, 76)
    text = "게임 시작"
    tb = d.textbbox((0, 0), text, font=f)
    d.text(((w - (tb[2]-tb[0]))/2, 91), text, font=f, fill=(79, 44, 61, 255))
    for x in (90, 250, w-250, w-90):
        draw_star(d, x, 138, 21, 8, (190, 131, 95, 210))
    return im.filter(ImageFilter.UnsharpMask(radius=0.8, percent=105, threshold=2))


def round_icon(size, kind):
    w, h = size
    im = Image.new("RGBA", size, (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((6, 6, w-6, h-6), fill=(31, 27, 43, 232), outline=(185, 122, 145, 255), width=4)
    if kind == "settings":
        cx, cy = w//2, h//2
        for a in np.linspace(0, np.pi*2, 8, endpoint=False):
            x, y = cx + np.cos(a)*30, cy + np.sin(a)*30
            d.rounded_rectangle((x-7, y-13, x+7, y+13), radius=3, fill=(245, 240, 234, 255))
        d.ellipse((cx-27, cy-27, cx+27, cy+27), fill=(245, 240, 234, 255))
        d.ellipse((cx-12, cy-12, cx+12, cy+12), fill=(31, 27, 43, 255))
    else:
        d.rectangle((37, 43, w-37, h-42), outline=(245, 240, 234, 255), width=6)
        d.line((37, 43, w//2, h//2+15, w-37, 43), fill=(245, 240, 234, 255), width=5)
        d.line((37, h-42, w//2, h//2+5, w-37, h-42), fill=(245, 240, 234, 255), width=5)
        d.ellipse((w-24, 12, w-5, 31), fill=(224, 66, 73, 255), outline=(255, 230, 230, 255), width=3)
    return im


OUT.mkdir(parents=True, exist_ok=True)
main = Image.open(MAIN).convert("RGBA")
luna = Image.open(LUNA).convert("RGBA")

# Generated Luna sprite from image tool, with chroma removed.
if GEN_WITCH.exists():
    witch = remove_chroma_green(Image.open(GEN_WITCH))
    witch = upscale(witch, 2)
    witch.save(OUT / "luna_main_pose_transparent.png")

# Character-sheet clean cat.
cat_crop = luna.crop((248, 350, 330, 484))
cat = upscale(remove_light_background(cat_crop), 4)
cat.save(OUT / "nero_cat_transparent.png")

# Preserve close-match illustrated assets from main_img1 with higher resolution.
for src, dst, factor in [
    ("logo_title_transparent.png", "logo_title_hq.png", 3),
    ("moon_transparent.png", "moon_hq.png", 3),
    ("hot_air_balloon_large_transparent.png", "hot_air_balloon_large_hq.png", 3),
    ("hot_air_balloon_mid_transparent.png", "hot_air_balloon_mid_hq.png", 4),
    ("hot_air_balloon_tiny_transparent.png", "hot_air_balloon_tiny_hq.png", 5),
]:
    p = SRC_DIR / src
    if p.exists():
        upscale(Image.open(p), factor).save(OUT / dst)

# Full background, cleanly upscaled for game use.
upscale(main, 2).save(OUT / "main_background_hq.png")
if GEN_BG.exists():
    Image.open(GEN_BG).convert("RGBA").save(OUT / "background_clean_no_ui_hq.png")

# Redrawn UI.
start_button().save(OUT / "button_game_start_hq.png")
panel((292, 310), "빗자루", "hat").save(OUT / "button_broom_hq.png")
panel((296, 310), "상점", "bag").save(OUT / "button_shop_hq.png")
panel((298, 310), "도감", "book").save(OUT / "button_encyclopedia_hq.png")
panel((298, 310), "업적", "trophy").save(OUT / "button_achievements_hq.png")
panel((334, 340), "의뢰 목록", "parcel").save(OUT / "button_quest_list_hq.png")
round_icon((196, 196), "settings").save(OUT / "button_settings_hq.png")
round_icon((212, 186), "mail").save(OUT / "button_mail_hq.png")

# Contact sheet.
files = [p for p in sorted(OUT.glob("*.png")) if not p.name.startswith("_")]
thumbs = []
for p in files:
    im = Image.open(p).convert("RGBA")
    im.thumbnail((210, 210), Image.Resampling.LANCZOS)
    c = Image.new("RGBA", (240, 260), (30, 25, 42, 255))
    c.alpha_composite(im, ((240 - im.width) // 2, 14))
    d = ImageDraw.Draw(c)
    d.text((8, 226), p.stem[:32], fill=(245, 225, 190, 255), font=font(r"C:\Windows\Fonts\malgun.ttf", 13))
    thumbs.append(c)
cols = 4
rows = (len(thumbs) + cols - 1) // cols
sheet = Image.new("RGBA", (cols * 240, rows * 260), (12, 12, 24, 255))
for i, t in enumerate(thumbs):
    sheet.alpha_composite(t, ((i % cols) * 240, (i // cols) * 260))
sheet.save(OUT / "_contact_sheet_hq.png")

print(f"saved {len(files)} remade png files to {OUT}")
