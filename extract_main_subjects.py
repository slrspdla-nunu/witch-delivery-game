from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import numpy as np


ROOT = Path("D:\\\uAE40\uC8FC\uD718\\\uB9C8\uB140 \uBC30\uB2EC\uBD80 \uAC8C\uC784")
OUT = ROOT / "remade_assets"
SRC = OUT / "main_background_hq.png"


def aa_mask(size, draw_fn, scale=3, blur=0.65):
    w, h = size
    mask = Image.new("L", (w * scale, h * scale), 0)
    draw = ImageDraw.Draw(mask)

    def pts(points):
        return [(int(x * scale), int(y * scale)) for x, y in points]

    def box(b):
        x1, y1, x2, y2 = b
        return (int(x1 * scale), int(y1 * scale), int(x2 * scale), int(y2 * scale))

    draw_fn(draw, pts, box)
    if blur:
        mask = mask.filter(ImageFilter.GaussianBlur(blur * scale))
    return mask.resize(size, Image.Resampling.LANCZOS)


def trim(im, pad=10):
    bbox = im.getbbox()
    if not bbox:
        return im
    x1, y1, x2, y2 = bbox
    return im.crop((max(0, x1 - pad), max(0, y1 - pad), min(im.width, x2 + pad), min(im.height, y2 + pad)))


def refine_edge_alpha(im):
    arr = np.asarray(im.convert("RGBA")).copy()
    alpha = Image.fromarray(arr[..., 3], "L")
    alpha = alpha.filter(ImageFilter.MedianFilter(3)).filter(ImageFilter.GaussianBlur(0.28))
    arr[..., 3] = np.asarray(alpha)
    out = Image.fromarray(arr, "RGBA")
    # Keep original colors, only make the already-upscaled source a little crisper.
    return out.filter(ImageFilter.UnsharpMask(radius=0.55, percent=65, threshold=4))


def save_subject(name, crop_box, mask):
    src = Image.open(SRC).convert("RGBA")
    crop = src.crop(crop_box)
    crop.putalpha(mask)
    if name.startswith("luna"):
        arr = np.asarray(crop).copy()
        r = arr[..., 0].astype(np.int16)
        g = arr[..., 1].astype(np.int16)
        b = arr[..., 2].astype(np.int16)
        a = arr[..., 3]
        lum = (0.299 * r + 0.587 * g + 0.114 * b)
        dark_cloth = lum < 72
        skin = (r > 132) & (g > 88) & (b > 70) & (r > b + 18)
        hair_bag_broom = (r > 64) & (g > 38) & (r > b + 14) & (lum < 166)
        purple_details = (b > 45) & (r > 35) & (g < 88) & (lum < 126)
        gold = (r > 130) & (g > 88) & (b < 90) & (r > b + 24)
        pale_envelope = (r > 145) & (g > 125) & (b > 110) & (r > b + 4)
        keep = dark_cloth | skin | hair_bag_broom | purple_details | gold | pale_envelope
        # Sky/city purple tends to be brighter and blue-heavy. Drop it even when
        # the rough silhouette included it.
        sky_purple = (b > r + 10) & (b > g + 8) & (lum > 72)
        keep &= ~sky_purple
        a[(a > 0) & ~keep] = 0
        arr[..., 3] = a
        crop = Image.fromarray(arr, "RGBA")
    if name.startswith("nero"):
        arr = np.asarray(crop).copy()
        r = arr[..., 0].astype(np.int16)
        g = arr[..., 1].astype(np.int16)
        b = arr[..., 2].astype(np.int16)
        a = arr[..., 3]
        lum = (0.299 * r + 0.587 * g + 0.114 * b)
        dark_fur = lum < 92
        gold_eyes = (r > 118) & (g > 82) & (b < 88) & (r > b + 32)
        purple_bow = (b > 52) & (r > 38) & (r < 130) & (g < 95) & (lum < 125)
        pale_tag = (r > 150) & (g > 130) & (b > 120)
        keep = dark_fur | gold_eyes | purple_bow | pale_tag
        a[(a > 0) & ~keep] = 0
        arr[..., 3] = a
        crop = Image.fromarray(arr, "RGBA")
    out = refine_edge_alpha(trim(crop, 8))
    out.save(OUT / name)


def luna_mask(size):
    # Coordinates are local to the 2x main screen crop. This mask follows only
    # the visible Luna+broom pixels in main_background_hq, not the generated Luna.
    mask = aa_mask(size, lambda d, pts, box: (
        # hat brim and cone, following the visible silhouette closely.
        d.ellipse(box((120, 254, 1040, 590)), fill=255),
        d.polygon(pts([(136, 132), (302, 48), (458, 78), (538, 286), (190, 348)]), fill=255),
        d.polygon(pts([(276, 80), (508, 26), (626, 206), (438, 318)]), fill=255),
        d.polygon(pts([(116, 268), (170, 208), (206, 292), (160, 364)]), fill=255),
        # head, hair, face, and braids.
        d.ellipse(box((374, 376, 792, 720)), fill=255),
        d.polygon(pts([(292, 530), (506, 470), (548, 596), (358, 704), (188, 720), (130, 664)]), fill=255),
        d.polygon(pts([(724, 574), (902, 650), (956, 766), (818, 806), (690, 700)]), fill=255),
        d.ellipse(box((8, 616, 170, 756)), fill=255),
        d.polygon(pts([(90, 654), (310, 604), (350, 702), (118, 808), (0, 772)]), fill=255),
        # cloak/body and arm.
        d.polygon(pts([
            (90, 756), (254, 690), (432, 704), (622, 690), (808, 760),
            (924, 942), (930, 1150), (810, 1266), (626, 1330),
            (388, 1286), (170, 1160), (24, 1040), (50, 888)
        ]), fill=255),
        d.polygon(pts([(130, 1040), (420, 1020), (520, 1232), (282, 1372), (64, 1288)]), fill=255),
        # broom tail and handle.
        d.polygon(pts([(0, 1210), (330, 1124), (394, 1268), (96, 1470), (0, 1508)]), fill=255),
        d.polygon(pts([(0, 1340), (300, 1230), (368, 1350), (70, 1548), (0, 1570)]), fill=255),
        d.polygon(pts([(520, 1214), (1070, 1016), (1070, 1098), (546, 1310)]), fill=255),
        # satchel, hand, visible leg/boot.
        d.rounded_rectangle(box((410, 1108, 828, 1466)), radius=46, fill=255),
        d.polygon(pts([(325, 1432), (512, 1428), (560, 1708), (314, 1708)]), fill=255),
        d.polygon(pts([(188, 1408), (368, 1406), (410, 1580), (230, 1642)]), fill=255)
    ), blur=0.38)

    # Remove Nero and the start button from the Luna extraction.
    cut = Image.new("L", size, 0)
    d = ImageDraw.Draw(cut)
    d.ellipse((800, 830, 1048, 1380), fill=255)
    d.polygon([(742, 1422), (1070, 1422), (1070, 1746), (410, 1746), (420, 1500)], fill=255)
    return Image.composite(Image.new("L", size, 0), mask, cut)


def cat_mask(size):
    return aa_mask(size, lambda d, pts, box: (
        d.polygon(pts([(68, 112), (136, 8), (192, 98), (256, 12), (320, 128), (304, 234), (82, 236)]), fill=255),
        d.ellipse(box((60, 84, 324, 330)), fill=255),
        d.ellipse(box((88, 266, 292, 604)), fill=255),
        d.ellipse(box((42, 532, 178, 666)), fill=255),
        d.ellipse(box((212, 524, 356, 664)), fill=255),
        d.polygon(pts([(292, 390), (394, 374), (376, 486), (292, 468)]), fill=255),
        d.ellipse(box((318, 342, 398, 506)), fill=255),
        d.polygon(pts([(56, 326), (184, 318), (226, 404), (76, 424)]), fill=255)
    ), blur=0.38)


def make_preview():
    names = ["luna_main_pose_transparent.png", "nero_cat_transparent.png"]
    thumbs = []
    for name in names:
        im = Image.open(OUT / name).convert("RGBA")
        im.thumbnail((520, 520), Image.Resampling.LANCZOS)
        c = Image.new("RGBA", (620, 620), (22, 18, 33, 255))
        c.alpha_composite(im, ((620 - im.width) // 2, (600 - im.height) // 2))
        ImageDraw.Draw(c).text((14, 586), name, fill=(245, 225, 190, 255))
        thumbs.append(c)
    sheet = Image.new("RGBA", (1240, 620), (12, 12, 24, 255))
    sheet.alpha_composite(thumbs[0], (0, 0))
    sheet.alpha_composite(thumbs[1], (620, 0))
    sheet.save(OUT / "_main_exact_subjects_preview.png")


if __name__ == "__main__":
    main = Image.open(SRC).convert("RGBA")

    luna_crop = (0, 1430, 1070, 3176)
    save_subject(
        "luna_main_pose_transparent.png",
        luna_crop,
        luna_mask((luna_crop[2] - luna_crop[0], luna_crop[3] - luna_crop[1])),
    )

    cat_crop = (830, 2140, 1232, 2828)
    save_subject(
        "nero_cat_transparent.png",
        cat_crop,
        cat_mask((cat_crop[2] - cat_crop[0], cat_crop[3] - cat_crop[1])),
    )

    make_preview()
    print("extracted Luna and Nero from main_background_hq with original colors")
