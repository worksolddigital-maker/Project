# Vectoriza as letras W (verde) e S (branco) do logo oficial para extrusão 3D
import numpy as np, subprocess, sys
from PIL import Image, ImageFilter
from scipy import ndimage
src='assets/src/ws-logo-tile.png'
im=np.array(Image.open(src).convert('RGB')).astype(int)
R,G,B=im[...,0],im[...,1],im[...,2]
X0,Y0,X1,Y1=280,380,1000,820
masks={
 'w_green': (G>150)&(R<190)&(G-B>90)&(G-R>40),
 's_white': (R>170)&(G>170)&(B>170),
}
SC=4
for name,m in masks.items():
    m=m[Y0:Y1,X0:X1]
    lab,n=ndimage.label(m)
    sizes=ndimage.sum(m,lab,range(1,n+1))
    keep=np.isin(lab,[i+1 for i,s in enumerate(sizes) if s>1500])
    keep=ndimage.binary_closing(keep,iterations=1)
    img=Image.fromarray((keep*255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))
    img=img.resize((img.width*SC,img.height*SC),Image.BICUBIC).filter(ImageFilter.GaussianBlur(2))
    a=np.array(img)>127
    # potrace wants black = shape
    Image.fromarray(((~a)*255).astype(np.uint8)).convert('1').save(f'/tmp/{name}.pbm')
    subprocess.run(['potrace','-s','-t','40','-a','1.1','-O','0.6','--flat','-o',f'assets/img/{name}.svg',f'/tmp/{name}.pbm'],check=True)
    print(name, n, 'kept', keep.sum())
