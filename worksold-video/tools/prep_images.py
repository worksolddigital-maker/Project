# Recortes das capturas dos sites para a tela dos celulares 3D (proporção 0.52)
from PIL import Image
A=0.52; OUT_W=1000
jobs={
 'lucindo-hero':      ('assets/src/lucindo-hero.jpg',      (0,166,1170,2212)),
 'lucindo-momentos':  ('assets/src/lucindo-momentos.jpg',  None),
 'sensuale-maquiagem':('assets/src/sensuale-maquiagem.jpg',None),
 'sensuale-marcas':   ('assets/src/sensuale-marcas.jpg',   None),
 'progym-hero':       ('assets/src/progym-hero.jpg',       None),
}
for name,(src,box) in jobs.items():
    im=Image.open(src).convert('RGB')
    if box: im=im.crop(box)
    w,h=im.size
    if w/h>A:   # largo demais: corta laterais (centralizado)
        nw=round(h*A); x=(w-nw)//2; im=im.crop((x,0,x+nw,h))
    else:       # alto demais: corta embaixo (mantém o topo do site)
        nh=round(w/A); im=im.crop((0,0,w,nh))
    im=im.resize((OUT_W,round(OUT_W/A)),Image.LANCZOS)
    im.save(f'assets/img/{name}.jpg',quality=93)
    print(name, im.size)
Image.open('assets/src/ws-hand-photo.png').convert('RGB').save('assets/img/ws-hand-photo.jpg',quality=95)
