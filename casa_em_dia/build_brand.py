#!/usr/bin/env python3
"""Gera todos os recursos da marca Casa em Dia (SVG e PNG) a partir de uma única definição.

Uso, a partir da raiz do repositório:
    pip install fonttools brotli cairosvg pillow
    npm install --no-save @fontsource/lato      # fornece os ficheiros da letra Lato
    python casa_em_dia/build_brand.py

Pode indicar outros ficheiros da letra com LATO_REGULAR e LATO_BOLD (TTF, OTF ou WOFF2).

Decisões de marca (31/10/2026):
- Cores únicas: verde #17261E, branco quente #F8F7F2, dourado #C9A568.
- Símbolo em três variantes: normal (≥ 64 px), reforçada (33–63 px) e simplificada (≤ 32 px, sem a porta).
- Ícones da app em quadrado cheio, sem cantos: o sistema operativo aplica a sua própria máscara.
- Logótipo com nome em Lato («CASA» em negrito, «EM DIA» normal) com espaço entre palavras alargado.
"""
from io import BytesIO
from html import escape
from pathlib import Path
import os

GREEN, PAPER, GOLD = "#17261E", "#F8F7F2", "#C9A568"

ROOT = Path(__file__).resolve().parent
PUBLIC = ROOT / "public"
FONTS = Path(os.environ.get("LATO_DIR", ROOT.parent / "node_modules/@fontsource/lato/files"))
LATO_REGULAR = Path(os.environ.get("LATO_REGULAR", FONTS / "lato-latin-400-normal.woff2"))
LATO_BOLD = Path(os.environ.get("LATO_BOLD", FONTS / "lato-latin-700-normal.woff2"))

# --- Símbolo (coordenadas 0–100) -------------------------------------------------
HOUSE = "M20 46 L50 20 L80 46 L80 67 M20 46 L20 79 L51 79 L51 62"
HOUSE_TINY = "M19 47 L50 20 L81 47 L81 60 M19 47 L19 80 L58 80"


def mark(variant: str, fg: str) -> str:
    if variant == "tiny":
        return (f'<path d="{HOUSE_TINY}" fill="none" stroke="{fg}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>'
                f'<circle cx="76" cy="79" r="9.5" fill="{GOLD}"/>')
    w = 7.7 if variant == "bold" else 6.4
    return (f'<path d="{HOUSE}" fill="none" stroke="{fg}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
            f'<circle cx="76" cy="79" r="{w}" fill="{GOLD}"/>')


def svg_mark(variant: str, fg: str) -> str:
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Casa em Dia">{mark(variant, fg)}</svg>\n'


def svg_tile(variant: str, dark: bool = True) -> str:
    """Quadrado cheio com o símbolo centrado; a escala mantém-no dentro da zona segura (círculo de raio 40)."""
    bg, fg = (GREEN, PAPER) if dark else (PAPER, GREEN)
    k = 0.98 if variant == "tiny" else 0.84
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="Casa em Dia">'
            f'<rect width="100" height="100" fill="{bg}"/>'
            f'<g transform="translate(50 51) scale({k}) translate(-50 -51)">{mark(variant, fg)}</g></svg>\n')


# --- Logótipo com nome (texto convertido em contornos) ----------------------------
def wordmark(fg: str) -> str:
    from fontTools.ttLib import TTFont
    from fontTools.pens.svgPathPen import SVGPathPen
    regular, bold = TTFont(str(LATO_REGULAR)), TTFont(str(LATO_BOLD))
    size, letter_spacing, word_gap = 31, 5, 14
    x, y, parts = 111.0, 63.0, []
    for i, ch in enumerate("CASA EM DIA"):
        font = bold if i < 4 else regular
        glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
        scale = size / font["head"].unitsPerEm
        name = cmap[ord(ch)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(pen)
        if pen.getCommands():
            parts.append(f'<path transform="translate({x:.3f} {y:.3f}) scale({scale:.8f} {-scale:.8f})" d="{escape(pen.getCommands())}"/>')
        x += hmtx[name][0] * scale + letter_spacing + (word_gap if ch == " " else 0)
    width = round(x + 4)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="96" viewBox="0 0 {width} 96" role="img" aria-label="Casa em Dia">'
            f'<g transform="translate(1 2) scale(.9)">{mark("normal", fg)}</g><g fill="{fg}">{"".join(parts)}</g></svg>\n')


def png(svg: str, width: int, height: int | None = None, alpha: bool = False) -> bytes:
    import cairosvg
    from PIL import Image
    raw = cairosvg.svg2png(bytestring=svg.encode(), output_width=width, output_height=height or width)
    im = Image.open(BytesIO(raw)).convert("RGBA" if alpha else "RGB")
    buf = BytesIO()
    im.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def main() -> None:
    files = {
        PUBLIC / "logo-mark.svg": svg_mark("normal", GREEN),
        PUBLIC / "logo-mark-light.svg": svg_mark("normal", PAPER),
        PUBLIC / "icon.svg": svg_tile("tiny"),            # favicon vetorial (separador do browser)
        PUBLIC / "icon-maskable.svg": svg_tile("normal"),
        PUBLIC / "logo-primary-dark.svg": wordmark(GREEN),
        PUBLIC / "logo-primary-light.svg": wordmark(PAPER),
    }
    for path, content in files.items():
        path.write_text(content, encoding="utf-8")
    pngs = {
        PUBLIC / "apple-touch-icon.png": png(svg_tile("normal"), 180),
        PUBLIC / "icon-192.png": png(svg_tile("normal"), 192),
        PUBLIC / "icon-512.png": png(svg_tile("normal"), 512),
        PUBLIC / "icon-maskable-512.png": png(svg_tile("normal"), 512),
        PUBLIC / "favicon-32.png": png(svg_tile("tiny"), 32),
        PUBLIC / "favicon-16.png": png(svg_tile("tiny"), 16),
        ROOT / "icon.png": png(svg_tile("normal"), 256),   # ficha do add-on no Home Assistant
    }
    dark = wordmark(GREEN)
    w = int(dark.split('width="')[1].split('"')[0])
    pngs[ROOT / "logo.png"] = png(dark, 500, round(500 * 96 / w), alpha=True)  # logótipo do add-on
    for path, data in pngs.items():
        path.write_bytes(data)
    print(f"Marca Casa em Dia: {len(files)} SVG e {len(pngs)} PNG gerados.")


if __name__ == "__main__":
    main()
