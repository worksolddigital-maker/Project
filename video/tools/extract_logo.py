#!/usr/bin/env python3
"""Extrai o logo WS (branco + ciano sobre preto) em PNGs transparentes.

Gera em assets/logo/:
  ws.png       logo completo
  ws-w.png     só o W (branco)
  ws-s.png     só o S (ciano)
  ws-mask.png  silhueta branca (para usar como máscara / versão monocromática)
Uso: python3 tools/extract_logo.py <logo.jpg|png>
"""
import sys, pathlib, json
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'logo'
OUT.mkdir(parents=True, exist_ok=True)

src = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(np.float32) / 255.0
# fundo preto vira transparência: alpha = canal mais forte; cor = rgb / alpha (unpremultiply)
alpha = src.max(axis=2)
alpha = np.clip((alpha - 0.06) / 0.88, 0, 1)            # limpa o ruído de JPEG no preto
rgb = np.where(alpha[..., None] > 1e-3, src / np.maximum(src.max(axis=2, keepdims=True), 1e-3), 0)

# W branco: R ~ B ; S ciano: R << B
r, b = src[..., 0], src[..., 2]
is_white = r > b * 0.55

ys, xs = np.where(alpha > 0.05)
pad = 8
y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad, src.shape[0])
x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad, src.shape[1])

def save(name, a, color=None):
    c = rgb if color is None else np.broadcast_to(np.array(color, np.float32), rgb.shape)
    img = np.dstack([c, a])[y0:y1, x0:x1]
    Image.fromarray((img * 255).round().astype(np.uint8), 'RGBA').save(OUT / name, optimize=True)

# cores de marca limpas (remove o "sujo" do JPEG)
white = np.array([1.0, 1.0, 1.0], np.float32)
cyan = rgb[(~is_white) & (alpha > 0.9)].mean(axis=0)
clean = np.where(is_white[..., None], white, cyan)
rgb = clean
save('ws.png', alpha)
save('ws-w.png', alpha * is_white)
save('ws-s.png', alpha * (~is_white))
save('ws-mask.png', alpha, color=(1, 1, 1))
info = {'width': int(x1 - x0), 'height': int(y1 - y0), 'cyan': '#%02X%02X%02X' % tuple((cyan * 255).round().astype(int))}
(OUT / 'logo.json').write_text(json.dumps(info))
print(info)
