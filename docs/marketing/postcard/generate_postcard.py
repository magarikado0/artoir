from __future__ import annotations

import base64
import io
import os
import sys
from pathlib import Path
from xml.sax.saxutils import escape

TOOLS = Path(r"C:\tmp\artport-postcard-tools")
sys.path.insert(0, str(TOOLS))

import qrcode
from PIL import Image, ImageDraw, ImageFont, ImageOps
from qrcode.constants import ERROR_CORRECT_H


ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
ICON_PATH = ROOT / "app" / "public" / "icon-512.png"
CAPYBARA_PATH = ROOT / "app" / "src" / "assets" / "frame2.png"
IMAGE2_PLATE_PATH = OUT / "artoir-shodo-postcard-image2-plate.png"

WIDTH = 1051
HEIGHT = 1500
TARGET_URL = "https://artoir.net/kushodo/exhibition/137"

PAPER = "#F3EEE5"
CARD = "#FBF8F3"
INK = "#1F1B17"
INK_SOFT = "#4A413A"
LINE_SOFT = "#E4DDD2"
ACCENT = "#BE553D"
GOLD = "#B8923A"

SERIF = Path(r"C:\Windows\Fonts\NotoSerifJP-VF.ttf")
SANS = Path(r"C:\Windows\Fonts\NotoSansJP-VF.ttf")


def font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def named_font(path: Path, size: int, variation: str) -> ImageFont.FreeTypeFont:
    result = font(path, size)
    result.set_variation_by_name(variation)
    return result


def contain(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    copy = image.copy()
    copy.thumbnail(box, Image.Resampling.LANCZOS)
    return copy


def image_data_uri(image: Image.Image) -> str:
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


def make_qr() -> Image.Image:
    qr = qrcode.QRCode(
        version=None,
        error_correction=ERROR_CORRECT_H,
        box_size=12,
        border=4,
    )
    qr.add_data(TARGET_URL)
    qr.make(fit=True)
    image = qr.make_image(fill_color=INK, back_color=PAPER).convert("RGB")
    return image.resize((432, 432), Image.Resampling.NEAREST)


def draw_centered(draw: ImageDraw.ImageDraw, text: str, y: int, fnt: ImageFont.FreeTypeFont, fill: str) -> None:
    bbox = draw.textbbox((0, 0), text, font=fnt)
    x = (WIDTH - (bbox[2] - bbox[0])) // 2
    draw.text((x, y), text, font=fnt, fill=fill)


def build_png() -> tuple[Image.Image, Image.Image, Image.Image, Image.Image]:
    canvas = Image.new("RGB", (WIDTH, HEIGHT), PAPER)
    draw = ImageDraw.Draw(canvas)

    # UI-like outer rule and offset gold edge.
    draw.rounded_rectangle((67, 67, 984, 1433), radius=28, fill=GOLD)
    draw.rounded_rectangle((57, 57, 974, 1423), radius=28, fill=PAPER, outline=INK, width=4)

    icon = contain(Image.open(ICON_PATH).convert("RGBA"), (104, 104))
    canvas.paste(icon, (93, 91), icon)
    draw.text((219, 108), "Artoir", font=font(SERIF, 51), fill=INK)
    draw.line((92, 222, 939, 222), fill=GOLD, width=4)

    headline = font(SERIF, 91)
    draw.text((93, 318), "展示作品を", font=headline, fill=INK)
    draw.text((93, 453), "オンラインでも", font=headline, fill=INK)
    draw.rounded_rectangle((93, 616, 291, 629), radius=7, fill=ACCENT)

    # Capybara frame from the app loading animation.
    description = named_font(SANS, 40, "Bold")
    draw.text((93, 654), "展覧会ごとに作品をまとめて公開できる", font=description, fill=INK_SOFT)
    draw.text((93, 716), "サービス Artoirを始めました", font=description, fill=INK_SOFT)

    capybara_source = Image.open(CAPYBARA_PATH).convert("RGBA")
    capybara = capybara_source.resize(
        (round(capybara_source.width * 1.7), round(capybara_source.height * 1.7)),
        Image.Resampling.LANCZOS,
    )
    cap_x = 600
    cap_y = 760
    canvas.paste(capybara, (cap_x, cap_y), capybara)

    draw_centered(draw, "QRコードからご覧いただけます", 882, font(SANS, 36), INK_SOFT)

    qr = make_qr().resize((340, 340), Image.Resampling.NEAREST)
    draw.rounded_rectangle((340, 955, 730, 1345), radius=22, fill=GOLD)
    draw.rounded_rectangle((330, 945, 720, 1335), radius=22, fill=CARD, outline=INK, width=4)
    draw.rounded_rectangle((330, 945, 487, 958), radius=7, fill=ACCENT)
    qr_x = 355
    qr_y = 970
    canvas.paste(qr, (qr_x, qr_y))

    return canvas, icon, capybara, qr


def build_image2_variant() -> Image.Image:
    """Add exact brand assets, copy, and a working QR over the image2 design plate."""
    plate = Image.open(IMAGE2_PLATE_PATH).convert("RGB")
    canvas = ImageOps.fit(plate, (WIDTH, HEIGHT), method=Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(canvas)

    # Replace the generated icon area with the exact app icon and add the wordmark.
    icon = contain(Image.open(ICON_PATH).convert("RGBA"), (104, 104))
    draw.rectangle((96, 82, 224, 228), fill=PAPER)
    canvas.paste(icon, (108, 94), icon)
    draw.text((225, 112), "Artoir", font=font(SERIF, 51), fill=INK)

    headline = font(SERIF, 84)
    draw.text((100, 332), "展示作品を", font=headline, fill=INK)
    draw.text((100, 458), "オンラインでも", font=headline, fill=INK)
    draw.rounded_rectangle((102, 594, 294, 607), radius=7, fill=ACCENT)

    # The supporting copy and QR are deterministic so the printed card remains usable.
    draw_centered(draw, "QRコードからご覧いただけます", 942, font(SANS, 35), INK_SOFT)
    qr = make_qr().resize((400, 400), Image.Resampling.NEAREST)
    canvas.paste(qr, ((WIDTH - qr.width) // 2, 1018))

    return canvas


def write_svg(icon: Image.Image, capybara: Image.Image, qr: Image.Image) -> None:
    icon_uri = image_data_uri(icon)
    capybara_uri = image_data_uri(capybara)
    qr_uri = image_data_uri(qr)
    svg = f'''<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="89mm" height="127mm" viewBox="0 0 {WIDTH} {HEIGHT}">
  <title>Artoir 書展掲示カード</title>
  <desc>QRコードから京都大学書道部の展示作品をオンラインで閲覧できるL判カード</desc>
  <rect width="{WIDTH}" height="{HEIGHT}" fill="{PAPER}"/>
  <rect x="67" y="67" width="917" height="1366" rx="28" fill="{GOLD}"/>
  <rect x="57" y="57" width="917" height="1366" rx="28" fill="{PAPER}" stroke="{INK}" stroke-width="4"/>
  <image x="93" y="91" width="104" height="104" href="{icon_uri}"/>
  <text x="219" y="159" fill="{INK}" font-family="Noto Serif JP, Yu Mincho, serif" font-size="51">Artoir</text>
  <line x1="92" y1="222" x2="939" y2="222" stroke="{GOLD}" stroke-width="4"/>
  <text x="93" y="407" fill="{INK}" font-family="Noto Serif JP, Yu Mincho, serif" font-size="91" font-weight="600">{escape('展示作品を')}</text>
  <text x="93" y="542" fill="{INK}" font-family="Noto Serif JP, Yu Mincho, serif" font-size="91" font-weight="600">{escape('オンラインでも')}</text>
  <rect x="93" y="616" width="198" height="13" rx="7" fill="{ACCENT}"/>
  <text x="93" y="696" fill="{INK_SOFT}" font-family="Noto Sans JP, Yu Gothic, sans-serif" font-size="40" font-weight="700">{escape('展覧会ごとに作品をまとめて公開できる')}</text>
  <text x="93" y="758" fill="{INK_SOFT}" font-family="Noto Sans JP, Yu Gothic, sans-serif" font-size="40" font-weight="700">{escape('サービス Artoirを始めました')}</text>
  <image x="600" y="760" width="{capybara.width}" height="{capybara.height}" href="{capybara_uri}"/>
  <text x="525.5" y="924" text-anchor="middle" fill="{INK_SOFT}" font-family="Noto Sans JP, Yu Gothic, sans-serif" font-size="36">{escape('QRコードからご覧いただけます')}</text>
  <rect x="340" y="955" width="390" height="390" rx="22" fill="{GOLD}"/>
  <rect x="330" y="945" width="390" height="390" rx="22" fill="{CARD}" stroke="{INK}" stroke-width="4"/>
  <rect x="330" y="945" width="157" height="13" rx="7" fill="{ACCENT}"/>
  <image x="355" y="970" width="340" height="340" href="{qr_uri}"/>
</svg>
'''
    (OUT / "artoir-shodo-postcard.svg").write_text(svg, encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    canvas, icon, capybara, qr = build_png()
    png_path = OUT / "artoir-shodo-postcard.png"
    jpg_path = OUT / "artoir-shodo-postcard.jpg"
    canvas.save(png_path, dpi=(300, 300), optimize=True)
    canvas.save(jpg_path, format="JPEG", quality=96, subsampling=0, dpi=(300, 300), optimize=True)
    write_svg(icon, capybara, qr)
    if IMAGE2_PLATE_PATH.exists():
        image2 = build_image2_variant()
        image2_png = OUT / "artoir-shodo-postcard-image2.png"
        image2_jpg = OUT / "artoir-shodo-postcard-image2.jpg"
        image2.save(image2_png, dpi=(300, 300), optimize=True)
        image2.save(image2_jpg, format="JPEG", quality=96, subsampling=0, dpi=(300, 300), optimize=True)
        print(f"image2 PNG: {image2_png}")
        print(f"image2 JPEG: {image2_jpg}")
    print(f"PNG: {png_path}")
    print(f"JPEG: {jpg_path}")
    print(f"SVG: {OUT / 'artoir-shodo-postcard.svg'}")


if __name__ == "__main__":
    main()
