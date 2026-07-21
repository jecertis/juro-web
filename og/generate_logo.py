#!/usr/bin/env python3
"""Generate the canonical Organization JSON-LD logo asset (square, 512x512 PNG).

Usage: python3 og/generate_logo.py
Produces og/logo.png — referenced by index.html's #organization JSON-LD node.
"""

from PIL import Image, ImageDraw, ImageFont
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

BG = (10, 10, 10)       # #0A0A0A — matches theme-color
YELLOW = (245, 196, 0)   # #F5C400 — brand accent
WHITE = (255, 255, 255)

FONT_SANS = "/System/Library/Fonts/SFNS.ttf"


def make_logo(size=512, output_dir=SCRIPT_DIR, filename="logo.png"):
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)

    try:
        font = ImageFont.truetype(FONT_SANS, int(size * 0.20))
    except OSError:
        font = ImageFont.load_default()

    # "juro" in white, "compliant" in yellow — stacked, centered
    line1, line2 = "juro", "compliant"
    w1 = draw.textlength(line1, font=font)
    w2 = draw.textlength(line2, font=font)
    line_h = int(size * 0.24)
    total_h = line_h * 2
    y0 = (size - total_h) / 2

    draw.text(((size - w1) / 2, y0), line1, font=font, fill=WHITE)
    draw.text(((size - w2) / 2, y0 + line_h), line2, font=font, fill=YELLOW)

    out_path = os.path.join(output_dir, filename)
    img.save(out_path, "PNG", optimize=True)
    print(f"Wrote {out_path} ({size}x{size})")


if __name__ == "__main__":
    make_logo()
