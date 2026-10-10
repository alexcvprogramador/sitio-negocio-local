"""
Lee con zxing-cpp los PNG/SVG que dejó pruebas/navegador.js y comprueba que dicen lo esperado.
Uso:  python3 pruebas/decodificar-descargas.py     (después de node pruebas/navegador.js)
Requiere:  pip install zxing-cpp pillow numpy
"""
import json
import os
import sys

import numpy as np
import zxingcpp
from PIL import Image

CARPETA = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida", "navegador")
evidencias = json.load(open(os.path.join(CARPETA, "evidencias.json")))

fallas = 0
for e in evidencias:
    im = Image.open(e["archivo"]).convert("RGB")
    borde = im.width // 12  # por si la captura recortó el margen
    lienzo = Image.new("RGB", (im.width + 2 * borde, im.height + 2 * borde), (255, 255, 255))
    lienzo.paste(im, (borde, borde))
    r = zxingcpp.read_barcodes(np.array(lienzo), formats=zxingcpp.BarcodeFormat.QRCode)
    leido = r[0].text if r else None
    bien = len(r) == 1 and leido == e["esperado"]
    fallas += 0 if bien else 1
    print(("OK    " if bien else "FALLA ") + os.path.basename(e["archivo"]))

# El PNG descargado con colores propios debe tener exactamente dos colores: el código y el fondo.
im = Image.open(os.path.join(CARPETA, "descarga_png.png")).convert("RGB")
colores = {c for _, c in im.getcolors(maxcolors=100000)}
bien = colores == {(255, 243, 196), (29, 53, 87)}
fallas += 0 if bien else 1
print(("OK    " if bien else "FALLA ") + "el PNG descargado usa solo los dos colores elegidos")

print("\n%d códigos leídos, %d fallas" % (len(evidencias), fallas))
sys.exit(1 if fallas else 0)
