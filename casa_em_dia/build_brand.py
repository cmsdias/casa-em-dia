from pathlib import Path
import cairosvg
from PIL import Image
from io import BytesIO
p=Path("casa_em_dia/public")
source=(p/"icon.svg").read_bytes()
mask=(p/"icon-maskable.svg").read_bytes()
def png(svg,n):
    im=Image.open(BytesIO(cairosvg.svg2png(bytestring=svg,output_width=n,output_height=n))).convert("RGB")
    buf=BytesIO()
    im.quantize(colors=32).save(buf,format="PNG",optimize=True)
    return buf.getvalue()
for name,n,raw in [
    ("icon-192.png",192,source),
    ("icon-512.png",512,source),
    ("apple-touch-icon.png",180,source),
    ("favicon-32.png",32,source),
    ("favicon-16.png",16,source),
    ("icon-maskable-512.png",512,mask),
]:
    (p/name).write_bytes(png(raw,n))
for name in ("icon.png","logo.png"):
    (Path("casa_em_dia")/name).write_bytes(png(source,512))
print("Identidade Casa em Dia: 8 ícones PNG atualizados")
