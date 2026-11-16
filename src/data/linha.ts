/**
 * Linha de produtos Letícia Orlandin.
 *
 * Fotos e textos vêm das publicações da profissional no Instagram
 * (@leticiaorlandin.estetica). TODO — confirmar com ela:
 *  - o nome oficial do gloss (a publicação não traz um nome próprio);
 *  - as frases de benefício (alegações de cosméticos devem seguir as
 *    normas da Anvisa) e como os produtos são vendidos.
 * Nenhum preço é exibido: o contato é feito pelo WhatsApp.
 */
import type { ImageMetadata } from 'astro';
import kit from '../assets/images/linha/kit.jpg';
import aurora from '../assets/images/linha/aurora.jpg';
import luce from '../assets/images/linha/luce.jpg';
import gloss from '../assets/images/linha/gloss.jpg';
import glossUso from '../assets/images/linha/gloss-uso.jpg';
import essenza from '../assets/images/linha/essenza.jpg';
import elevare from '../assets/images/linha/elevare.jpg';

export interface Product {
  id: string;
  name: string;
  type: string;
  text?: string;
  image: ImageMetadata;
  imageAlt: string;
  /** object-position da miniatura. */
  focus?: string;
}

export const linha = {
  kit,
  kitAlt:
    'Nécessaire preta com os produtos Essenza, Luce, Elevare e o gloss da linha Letícia Orlandin sobre bancada de mármore',
  lifestyle: glossUso,
  lifestyleAlt: 'Aplicação do gloss labial Letícia Orlandin',
  products: [
    {
      id: 'essenza',
      name: 'Essenza',
      type: 'Espuma Facial',
      text: 'Limpeza delicada que remove impurezas com conforto — o primeiro passo do ritual.',
      image: essenza,
      imageAlt: 'Frasco da Essenza Espuma Facial, 150 ml, sobre bancada de mármore junto à janela',
      focus: '50% 45%',
    },
    {
      id: 'aurora',
      name: 'Aurora',
      type: 'Sérum Vitamina C',
      text: 'Luz, viço e cuidado: ajuda a preservar a luminosidade e a hidratação da pele.',
      image: aurora,
      imageAlt: 'Frasco do Aurora Sérum Vitamina C',
      focus: '50% 45%',
    },
    {
      id: 'luce',
      name: 'Luce',
      type: 'Sérum Regenerador',
      text: 'Algumas gotas pela manhã para devolver a luz própria do rosto, com toque sedoso.',
      image: luce,
      imageAlt: 'Mãos aplicando o Sérum Regenerador Luce com conta-gotas',
      focus: '38% 55%',
    },
    {
      id: 'gloss',
      name: 'Gloss Labial',
      type: 'Nutrição e proteção dos lábios',
      text: 'Hidratação profunda e prolongada para lábios nutridos e protegidos.',
      image: gloss,
      imageAlt: 'Gloss labial Letícia Orlandin sobre mármore',
      focus: '50% 50%',
    },
    {
      id: 'elevare',
      name: 'Elevare',
      type: 'Creme Colo e Pescoço',
      image: elevare,
      imageAlt: 'Frasco do creme para colo e pescoço Elevare',
      focus: '50% 50%',
    },
  ] satisfies Product[],
};
