import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

// Curvas da identidade — iguais às variáveis CSS --ease-out / --ease-in-out.
CustomEase.create('lo', 'M0,0 C0.16,1 0.3,1 1,1');
CustomEase.create('loInOut', 'M0,0 C0.65,0 0.35,1 1,1');
CustomEase.create('loSoft', 'M0,0 C0.33,1 0.68,1 1,1');

gsap.defaults({ ease: 'lo', duration: 1.2 });

// Evita recalcular tudo quando a barra de endereço do celular aparece/some.
ScrollTrigger.config({ ignoreMobileResize: true });

/** MorphSVG só é baixado quando a seção do Método SER existe na página. */
export async function loadMorphSVG() {
  const { MorphSVGPlugin } = await import('gsap/MorphSVGPlugin');
  gsap.registerPlugin(MorphSVGPlugin);
  return MorphSVGPlugin;
}

/**
 * Prepara um traço SVG para ser "desenhado" (sem plugin): devolve o
 * comprimento e deixa o traço oculto via stroke-dashoffset.
 */
export function prepareStroke(path: SVGGeometryElement) {
  const length = path.getTotalLength();
  gsap.set(path, { strokeDasharray: length, strokeDashoffset: length });
  return length;
}

export { gsap, ScrollTrigger, SplitText };
