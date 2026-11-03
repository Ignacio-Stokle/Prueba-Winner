#!/usr/bin/env python3
"""
Normaliza los escudos de IMG/escudos para que todos se vean del mismo tamaño.

Qué hace con cada PNG:
  1. Borra el fondo casi transparente (restos de recortes).
  2. Recorta los márgenes vacíos.
  3. Lo escala para que pese visualmente lo mismo que los demás
     (un escudo ancho y uno alto ocupan una superficie parecida).
  4. Lo centra en un lienzo cuadrado de 256 x 256 con fondo transparente.

Uso (necesita Pillow: pip install pillow):
    python herramientas/normalizar-escudos.py IMG/escudos
    python herramientas/normalizar-escudos.py IMG/escudos nuevo-club.png otro-club.png   # solo esos archivos

Es seguro correrlo más de una vez sobre el mismo escudo.
"""
import sys
from pathlib import Path
from PIL import Image

LIENZO = 256          # lado del cuadrado final
LADO_OPTICO = 214     # lado del cuadrado "de superficie equivalente"
UMBRAL_ALFA = 24      # por debajo de esto, el píxel se considera vacío
ESCALA_MAXIMA = 2.0   # no agrandar de más los escudos chicos


def normalizar(ruta: Path) -> None:
    img = Image.open(ruta).convert("RGBA")

    alfa = img.getchannel("A").point(lambda a: 0 if a <= UMBRAL_ALFA else a)
    img.putalpha(alfa)

    caja = alfa.getbbox()
    if not caja:
        print(f"  (vacío, se omite) {ruta.name}")
        return
    img = img.crop(caja)
    ancho, alto = img.size

    escala = min(LIENZO / max(ancho, alto), LADO_OPTICO / (ancho * alto) ** 0.5, ESCALA_MAXIMA)
    nuevo = (max(1, round(ancho * escala)), max(1, round(alto * escala)))
    img = img.resize(nuevo, Image.LANCZOS)

    lienzo = Image.new("RGBA", (LIENZO, LIENZO), (0, 0, 0, 0))
    lienzo.paste(img, ((LIENZO - nuevo[0]) // 2, (LIENZO - nuevo[1]) // 2), img)
    lienzo.save(ruta, optimize=True)
    print(f"  ok {ruta.name}")


def main() -> None:
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    carpeta = Path(sys.argv[1])
    archivos = [carpeta / n for n in sys.argv[2:]] if len(sys.argv) > 2 else sorted(carpeta.glob("*.png"))
    for archivo in archivos:
        normalizar(archivo)


if __name__ == "__main__":
    main()
