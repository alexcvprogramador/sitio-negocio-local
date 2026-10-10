"""
Verifica qr.js contra dos librerías independientes.

  1. segno (generador de referencia): cada matriz de casos-comparacion.json debe ser idéntica,
     módulo por módulo, a la que segno produce con la misma versión, nivel, modo y máscara.
  2. zxing-cpp (lector): cada código de casos-lectura.json debe leerse y devolver el texto original.

Preparación:
    pip install segno zxing-cpp pillow numpy
    node pruebas/exportar-casos.js
Uso:
    python3 pruebas/verificar-con-librerias.py
"""
import json
import os
import sys

import numpy as np
import segno
import segno.consts as consts
import segno.encoder as encoder
import zxingcpp

AQUI = os.path.join(os.path.dirname(os.path.abspath(__file__)), "salida")

# segno agrega un byte de ceros de más cuando el flujo de datos ya termina justo en un límite de
# byte (usa 8 - largo % 8, que da 8 si largo % 8 == 0). Es un relleno que los lectores ignoran,
# pero la norma (ISO/IEC 18004, 7.4.10) pide rellenar solo si hace falta. Se corrige aquí para
# comparar contra lo que dice la norma.
def _relleno_segun_la_norma(buff, version, largo):
    if version not in (consts.VERSION_M1, consts.VERSION_M3) and largo % 8:
        buff.extend([0] * (8 - (largo % 8)))

encoder.write_padding_bits = _relleno_segun_la_norma

MODO = {"bytes": "byte", "alfanumerico": "alphanumeric", "numerico": "numeric"}

fallas = 0

casos = json.load(open(os.path.join(AQUI, "casos-comparacion.json")))
distintos = 0
for c in casos:
    q = segno.make(c["texto"], error=c["ecc"], version=c["version"], mask=c["mascara"],
                   mode=MODO[c["modo"]], boost_error=False, micro=False)
    ref = ["".join(str(b) for b in fila) for fila in q.matrix]
    if ref != c["matriz"]:
        distintos += 1
        if distintos <= 5:
            print("DIFIERE: versión", c["version"], c["ecc"], c["modo"], "máscara", c["mascara"])
print("Comparación con segno: %d códigos, %d distintos" % (len(casos), distintos))
fallas += distintos


def imagen(m, escala, margen=4):
    n = len(m)
    t = n + 2 * margen
    a = np.full((t * escala, t * escala), 255, np.uint8)
    for y in range(n):
        for x in range(n):
            if m[y][x] == "1":
                a[(y + margen) * escala:(y + margen + 1) * escala, (x + margen) * escala:(x + margen + 1) * escala] = 0
    return a


casos = json.load(open(os.path.join(AQUI, "casos-lectura.json")))
no_leidos = 0
for c in casos:
    escala = 6 if c["version"] > 10 else 10
    r = zxingcpp.read_barcodes(imagen(c["matriz"], escala), formats=zxingcpp.BarcodeFormat.QRCode)
    if not (len(r) == 1 and r[0].text == c["texto"]):
        no_leidos += 1
        if no_leidos <= 5:
            print("NO SE LEE: versión", c["version"], c["ecc"], c["modo"], repr(c["texto"][:40]))
print("Lectura con zxing-cpp: %d códigos, %d no se leyeron bien" % (len(casos), no_leidos))
fallas += no_leidos

sys.exit(1 if fallas else 0)
