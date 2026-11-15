/**
 * Galeria de antes e depois — organizada por PACIENTE (caso), com um ou
 * mais ângulos (views) por caso.
 *
 * REGRAS (não negociáveis):
 *  - Somente imagens REAIS, de pacientes que AUTORIZARAM por escrito o uso
 *    da imagem no site (LGPD — dado pessoal sensível).
 *  - Nunca editar, retocar, recolorir ou "simular" resultados. O "antes" e o
 *    "depois" de cada ângulo devem ter exatamente o mesmo tamanho e recorte.
 *  - Informar o tratamento apenas quando confirmado pela profissional.
 *  - Verificar as regras de publicidade do conselho profissional
 *    (Conselho Federal de Farmácia) quanto à divulgação de antes e depois.
 *
 * COMO ADICIONAR UM CASO:
 *  1. Coloque as fotos em src/assets/images/resultados/
 *     (ex.: caso-novo-frontal-antes.jpg e caso-novo-frontal-depois.jpg).
 *  2. Importe-as abaixo e adicione um item ao array `results`.
 *  O primeiro caso da lista aparece em destaque na página inicial.
 *
 * Enquanto a lista estiver vazia, o site mostra um aviso de
 * "galeria em curadoria" — nenhuma imagem é inventada.
 *
 * ORIGEM DAS IMAGENS ATUAIS: publicações da própria profissional no
 * Instagram (@leticiaorlandin.estetica), enviadas por ela. As montagens
 * originais foram apenas separadas em "antes" e "depois", com recorte
 * idêntico nas duas metades — sem nenhum ajuste de imagem. Os textos são
 * trechos das legendas dessas publicações.
 * TODO: confirmar a autorização por escrito das pacientes para o site.
 */
import type { ImageMetadata } from 'astro';
import s1FrontalAntes from '../assets/images/resultados/metodo-ser-1-frontal-antes.jpg';
import s1FrontalDepois from '../assets/images/resultados/metodo-ser-1-frontal-depois.jpg';
import s1TresQuartosAntes from '../assets/images/resultados/metodo-ser-1-tres-quartos-antes.jpg';
import s1TresQuartosDepois from '../assets/images/resultados/metodo-ser-1-tres-quartos-depois.jpg';
import s1DetalheAntes from '../assets/images/resultados/metodo-ser-1-detalhe-antes.jpg';
import s1DetalheDepois from '../assets/images/resultados/metodo-ser-1-detalhe-depois.jpg';
import s2PerfilAntes from '../assets/images/resultados/metodo-ser-2-perfil-antes.jpg';
import s2PerfilDepois from '../assets/images/resultados/metodo-ser-2-perfil-depois.jpg';
import t1Antes from '../assets/images/resultados/tatuagem-1-antes.jpg';
import t1Depois from '../assets/images/resultados/tatuagem-1-depois.jpg';

export interface ResultView {
  id: string;
  /** Rótulo do ângulo (ex.: "Frontal"). */
  label: string;
  before: ImageMetadata;
  after: ImageMetadata;
  /** Descrição neutra da região fotografada (acessibilidade). */
  alt: string;
  /** Enquadramento (object-position) quando o quadro tem outra proporção. */
  focus?: string;
}

export interface ResultItem {
  id: string;
  treatment?: string;
  note?: string;
  /** Frase de abertura da legenda publicada pela profissional. */
  quote?: string;
  /** Trechos da legenda, na voz da profissional. */
  story?: string[];
  /** Slug do procedimento relacionado (exibe o caso também na página dele). */
  procedure?: string;
  views: ResultView[];
  /** Confirmação explícita de autorização de uso de imagem. */
  authorized: true;
}

export const results: ResultItem[] = [
  {
    // As três fotos são da mesma paciente (mesmas roupas e acessórios no
    // antes e no depois). A legenda identifica o Método SER.
    id: 'metodo-ser-1',
    treatment: 'Método SER',
    note: 'Planejamento, estratégia e respeito à individualidade',
    quote: 'Às vezes, o que buscamos na estética não é parecer diferente. É voltar a se reconhecer.',
    story: [
      'Essa paciente chegou com um desejo muito claro: recuperar a autoestima e voltar a se sentir bem diante do espelho.',
      'Através do Método SER, construímos esse resultado com planejamento, estratégia e respeito à sua individualidade.',
      'Sem apagar seus traços. Sem transformar sua identidade. Apenas refinando, equilibrando e valorizando o que já era dela.',
    ],
    procedure: 'metodo-ser',
    views: [
      {
        id: 'frontal',
        label: 'Frontal',
        before: s1FrontalAntes,
        after: s1FrontalDepois,
        alt: 'Rosto de frente',
      },
      {
        id: 'tres-quartos',
        label: 'Três quartos',
        before: s1TresQuartosAntes,
        after: s1TresQuartosDepois,
        alt: 'Rosto em ângulo de três quartos',
      },
      {
        id: 'detalhe',
        label: 'Detalhe',
        before: s1DetalheAntes,
        after: s1DetalheDepois,
        alt: 'Terço inferior do rosto — lábios, região perioral e mandíbula',
        focus: '52% 50%',
      },
    ],
    authorized: true,
  },
  {
    id: 'metodo-ser-2',
    treatment: 'Método SER',
    note: 'Ultraformer MPT e bioestimuladores de colágeno, em plano individualizado',
    quote: 'A harmonia do perfil facial depende diretamente da clareza dos seus contornos.',
    story: [
      'Com a combinação estratégica do Método SER, aliando tecnologias como o Ultraformer MPT e bioestimuladores de colágeno, o plano trabalhou a definição da linha da mandíbula e a região da papada.',
      'O resultado apresentado é fruto de um plano individualizado, focado na estrutura anatômica e nos objetivos únicos de cada paciente.',
    ],
    procedure: 'metodo-ser',
    views: [
      {
        id: 'perfil',
        label: 'Perfil',
        before: s2PerfilAntes,
        after: s2PerfilDepois,
        alt: 'Perfil do rosto — contorno da mandíbula e região da papada',
      },
    ],
    authorized: true,
  },
  {
    id: 'tatuagem-1',
    treatment: 'Remoção de tatuagem',
    note: 'Clareamento progressivo — evolução, não imediatismo',
    quote: 'Cada sessão é um passo em direção ao resultado.',
    story: [
      'A remoção de tatuagem é um processo que exige técnica, tecnologia e, principalmente, respeito ao tempo da pele. Os resultados acontecem de forma gradual, permitindo que o organismo elimine os pigmentos de maneira progressiva.',
      'Este antes e depois mostra exatamente isso: evolução, não imediatismo.',
    ],
    procedure: 'remocao-de-tatuagem',
    views: [
      {
        id: 'tatuagem',
        label: 'Tatuagem',
        before: t1Antes,
        after: t1Depois,
        alt: 'Tatuagem de texto na pele',
      },
    ],
    authorized: true,
  },
];
