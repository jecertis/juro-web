#!/usr/bin/env python3
"""Generate OG images for Jurocompliant blog posts.

Usage: python3 og/generate_og.py
Produces 1200x630 PNG files in the og/ directory.
"""

from PIL import Image, ImageDraw, ImageFont
import os
import textwrap

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

# Brand colours
BG        = (17, 17, 17)          # #111111
BORDER    = (38, 38, 38)          # ~rgba(255,255,255,0.10) on #111
YELLOW    = (245, 196, 0)         # #F5C400
WHITE     = (255, 255, 255)
GREY      = (161, 161, 161)       # subdued text
DOMAIN_BG = (26, 26, 26)          # #1A1A1A card-like

# Font paths
FONT_SANS = "/System/Library/Fonts/SFNS.ttf"
FONT_MONO = "/System/Library/Fonts/SFNSMono.ttf"


def wrap_title(draw, text, font, max_width):
    """Word-wrap text to fit max_width, return list of lines."""
    words = text.split()
    lines = []
    current = []
    for word in words:
        test = " ".join(current + [word])
        w = draw.textlength(test, font=font)
        if w <= max_width or not current:
            current.append(word)
        else:
            lines.append(" ".join(current))
            current = [word]
    if current:
        lines.append(" ".join(current))
    return lines


def make_og(filename, title, tag, output_dir=SCRIPT_DIR):
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), BG)
    draw = ImageDraw.Draw(img)

    # Subtle border around entire canvas
    draw.rectangle([0, 0, W - 1, H - 1], outline=BORDER, width=1)

    # Horizontal accent line at top
    draw.rectangle([0, 0, W, 4], fill=YELLOW)

    # Load fonts — fallback to default if path missing
    try:
        font_eyebrow = ImageFont.truetype(FONT_MONO, 22)
        font_title   = ImageFont.truetype(FONT_SANS, 64)
        font_title_sm = ImageFont.truetype(FONT_SANS, 52)
        font_domain  = ImageFont.truetype(FONT_MONO, 24)
    except OSError:
        font_eyebrow  = ImageFont.load_default()
        font_title    = ImageFont.load_default()
        font_title_sm = ImageFont.load_default()
        font_domain   = ImageFont.load_default()

    PADDING_X = 80
    PADDING_Y = 72

    # Tag / eyebrow label
    tag_text = tag.upper()
    tag_w = draw.textlength(tag_text, font=font_eyebrow)
    draw.rectangle(
        [PADDING_X - 1, PADDING_Y - 1, PADDING_X + tag_w + 24, PADDING_Y + 36],
        fill=(38, 31, 0),
        outline=(92, 73, 0),
    )
    draw.text((PADDING_X + 12, PADDING_Y + 6), tag_text, font=font_eyebrow, fill=YELLOW)

    # Title — try large font first, fall back to smaller if it won't fit in 3 lines
    MAX_TEXT_W = W - PADDING_X * 2
    title_y_start = PADDING_Y + 60

    lines = wrap_title(draw, title, font_title, MAX_TEXT_W)
    font_use = font_title
    line_h = 78
    if len(lines) > 3:
        lines = wrap_title(draw, title, font_title_sm, MAX_TEXT_W)
        font_use = font_title_sm
        line_h = 64

    for i, line in enumerate(lines[:3]):
        draw.text((PADDING_X, title_y_start + i * line_h), line, font=font_use, fill=WHITE)

    # Bottom bar: domain pill
    bar_y = H - 80
    domain_text = "jurocompliant.com"
    dom_w = draw.textlength(domain_text, font=font_domain)
    pill_x = PADDING_X
    pill_y = bar_y
    draw.rectangle(
        [pill_x - 1, pill_y, pill_x + dom_w + 28, pill_y + 38],
        fill=DOMAIN_BG,
        outline=BORDER,
    )
    draw.text((pill_x + 14, pill_y + 8), domain_text, font=font_domain, fill=GREY)

    # "Compliance you can prove." tagline on right
    try:
        font_tag = ImageFont.truetype(FONT_MONO, 20)
    except OSError:
        font_tag = font_domain
    tagline = "Compliance you can prove."
    tl_w = draw.textlength(tagline, font=font_tag)
    draw.text((W - PADDING_X - tl_w, bar_y + 10), tagline, font=font_tag, fill=(80, 80, 80))

    out_path = os.path.join(output_dir, filename)
    img.save(out_path, "PNG", optimize=True)
    print(f"  Wrote {out_path}  ({W}x{H})")


if __name__ == "__main__":
    posts = [
        (
            "dora-gdpr-scanner-india.png",
            "DORA, GDPR, and DPDP compliance scanning India 2026",
            "DORA",
        ),
        (
            "gdpr-dpdp-compliance-tools-compared.png",
            "GDPR and DPDP Compliance Tools Compared for India SaaS",
            "GDPR",
        ),
        (
            "compliance-scan-insurance-premium.png",
            "Compliance scans and cyber insurance pricing in India",
            "Cyber Insurance",
        ),
    ]

    print("Generating OG images...")
    for filename, title, tag in posts:
        make_og(filename, title, tag)
    print("Done.")
