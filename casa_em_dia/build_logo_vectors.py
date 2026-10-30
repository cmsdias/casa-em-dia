#!/usr/bin/env python3
"""Create standalone Casa em Dia logo SVGs with text converted to vector outlines."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from html import escape

p=Path("casa_em_dia/public")
font_path="/usr/share/fonts/truetype/lato/Lato-Regular.ttf"
font=TTFont(font_path)
glyphset=font.getGlyphSet()
cmap=font.getBestCmap()
hmtx=font["hmtx"]
upm=font["head"].unitsPerEm
size=31
scale=size/upm
letter_spacing=5
word="CASA EM DIA"
x=111.0
y=63.0
parts=[]
for ch in word:
    name=cmap[ord(ch)]
    pen=SVGPathPen(glyphset)
    glyphset[name].draw(pen)
    d=pen.getCommands()
    if d:
        parts.append(f'<path transform="translate({x:.3f} {y:.3f}) scale({scale:.8f} {-scale:.8f})" d="{escape(d)}"/>')
    x += hmtx[name][0]*scale + letter_spacing
text_paths="".join(parts)
width=max(320,round(x+9))
d="M20 46 L50 20 L80 46 L80 67 M20 46 L20 79 L51 79 L51 62"
def build(name,fg):
    content=(f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="96" viewBox="0 0 {width} 96" role="img" aria-label="Casa em Dia">'
             f'<g transform="translate(1 2) scale(.9)"><path d="{d}" fill="none" stroke="{fg}" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>'
             f'<circle cx="76" cy="79" r="6.4" fill="#C9A568"/></g>'
             f'<g fill="{fg}">{text_paths}</g></svg>\n')
    (p/name).write_text(content,encoding="utf-8")
    print(name,"width",width,"outlined glyphs",len(parts))
build("logo-primary-dark.svg","#17261E")
build("logo-primary-light.svg","#F8F7F2")
# Keep legacy horizontal reference redirected to the primary dark variant.
(p/"logo-horizontal.svg").write_bytes((p/"logo-primary-dark.svg").read_bytes())
