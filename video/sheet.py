#!/usr/bin/env python3
"""Monta folhas de contato (2 colunas) com os PNGs de preview indicados por tempo."""
import sys, pathlib
from PIL import Image

d = pathlib.Path(__file__).resolve().parent / 'out' / 'preview'
times = [float(t) for t in sys.argv[2:]]
files = [d / f"t{t:06.2f}.png" for t in times]
ims = [Image.open(f).resize((960, 540)) for f in files]
rows = (len(ims) + 1) // 2
W = Image.new('RGB', (1920, 540 * rows))
for i, im in enumerate(ims):
    W.paste(im, ((i % 2) * 960, (i // 2) * 540))
W.save(d / f"{sys.argv[1]}.jpg", quality=85)
print(d / f"{sys.argv[1]}.jpg")
