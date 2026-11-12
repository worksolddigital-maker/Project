/**
 * Procedimentos e tratamentos.
 *
 * IMPORTANTE: todo o conteúdo abaixo é informativo e deve ser revisado e
 * aprovado pela profissional antes da publicação definitiva. Não há preços,
 * tecnologias, garantias de resultado nem indicações clínicas específicas.
 *
 * As fotos importadas aqui são temporárias (banco de imagens licenciado) e
 * devem ser substituídas por fotografias próprias — basta trocar o arquivo
 * em src/assets/images/site/ mantendo o mesmo nome. Veja MIDIAS.md.
 */
import type { ImageMetadata } from 'astro';
import toxinaImg from '../assets/images/site/toxina-botulinica.jpg';
import preenchimentosImg from '../assets/images/site/preenchimentos.jpg';
import mapeamentoImg from '../assets/images/site/mapeamento-facial.jpg';
import protocolosImg from '../assets/images/site/protocolos-faciais.jpg';
import metodoImg from '../assets/images/site/metodo-ser.jpg';
import tatuagemImg from '../assets/images/site/remocao-de-tatuagem.jpg';
import capilarImg from '../assets/images/site/tratamentos-capilares.jpg';

export type CategoryId = 'facial' | 'metodo' | 'tatuagem' | 'capilar';

export interface Category {
  id: CategoryId;
  number: string;
  name: string;
  description: string;
  anchor: string;
}

export interface Procedure {
  slug: string;
  category: CategoryId;
  name: string;
  /** Nome curto usado na mensagem do WhatsApp. */
  whatsappName: string;
  badge?: string;
  short: string;
  objective: string;
  image: ImageMetadata;
  imageAlt: string;
  /** object-position usado nos recortes de card. */
  focus: string;
  intro: string[];
  steps: { title: string; text: string }[];
  notes: string[];
  faq: { q: string; a: string }[];
  seoTitle: string;
  seoDescription: string;
}

export const categories: Category[] = [
  {
    id: 'facial',
    number: '01',
    name: 'Estética facial',
    description:
      'Procedimentos que refinam traços e cuidam da pele, sempre a partir de uma leitura atenta do seu rosto.',
    anchor: 'estetica-facial',
  },
  {
    id: 'metodo',
    number: '02',
    name: 'Método SER',
    description:
      'Uma forma de planejar o cuidado por etapas, com acompanhamento e respeito ao tempo de cada paciente.',
    anchor: 'metodo-ser',
  },
  {
    id: 'tatuagem',
    number: '03',
    name: 'Remoção de tatuagem',
    description:
      'Um processo progressivo, conduzido com cautela e planejado a partir de uma avaliação individual.',
    anchor: 'remocao-de-tatuagem',
  },
  {
    id: 'capilar',
    number: '04',
    name: 'Tratamentos capilares',
    description:
      'Cuidados voltados ao fortalecimento dos fios e às necessidades do couro cabeludo.',
    anchor: 'tratamentos-capilares',
  },
];

const avaliacaoPadrao = {
  title: 'Avaliação individual',
  text: 'Uma conversa sem pressa sobre sua história, suas expectativas e o que você deseja preservar.',
};

const acompanhamentoPadrao = {
  title: 'Acompanhamento',
  text: 'Retornos e orientações para observar a evolução e ajustar o plano sempre que necessário.',
};

export const procedures: Procedure[] = [
  {
    slug: 'toxina-botulinica',
    category: 'facial',
    name: 'Toxina botulínica',
    whatsappName: 'toxina botulínica',
    short:
      'Aplicação precisa para suavizar linhas de expressão, preservando a naturalidade dos movimentos do rosto.',
    objective:
      'Suavizar linhas de expressão e trazer um aspecto mais descansado, sem abrir mão da sua expressividade.',
    image: toxinaImg,
    imageAlt:
      'Paciente de olhos fechados recebendo aplicação na testa por profissional de luvas',
    focus: '38% 30%',
    intro: [
      'A toxina botulínica é um dos procedimentos mais conhecidos da estética facial. Quando bem indicada e aplicada com precisão, atua na musculatura responsável pelas linhas de expressão, com o objetivo de suavizar marcas preservando a expressividade do rosto.',
      'Cada aplicação parte de uma avaliação individual: a observação da sua mímica facial, das assimetrias naturais e daquilo que você deseja manter. É assim que o refinamento acontece sem transformar quem você é.',
    ],
    steps: [
      avaliacaoPadrao,
      {
        title: 'Leitura da expressão',
        text: 'Análise dos movimentos do seu rosto em repouso e em expressão, para entender onde atuar — e onde não atuar.',
      },
      {
        title: 'Aplicação cuidadosa',
        text: 'Pontos definidos de forma individual, com técnica precisa e orientações claras para os dias seguintes.',
      },
      acompanhamentoPadrao,
    ],
    notes: [
      'A indicação é sempre individual e definida após avaliação.',
      'A duração dos efeitos varia de pessoa para pessoa.',
      'Os resultados não são imediatos nem idênticos para todos — cada organismo responde no seu tempo.',
    ],
    faq: [
      {
        q: 'Vou ficar com o rosto “congelado”?',
        a: 'A proposta é justamente o oposto: refinar, não transformar. O planejamento busca suavizar as linhas preservando a naturalidade dos seus movimentos. Na avaliação, conversamos com transparência sobre o que esperar no seu caso.',
      },
      {
        q: 'Quanto tempo dura o efeito?',
        a: 'A duração varia de pessoa para pessoa. Durante a avaliação, você recebe orientações sobre o tempo esperado e sobre o acompanhamento mais adequado para você.',
      },
    ],
    seoTitle: 'Toxina botulínica em Bento Gonçalves',
    seoDescription:
      'Toxina botulínica em Bento Gonçalves/RS com avaliação individual e foco em naturalidade: suavizar linhas de expressão preservando sua expressividade.',
  },
  {
    slug: 'preenchimentos',
    category: 'facial',
    name: 'Preenchimentos',
    whatsappName: 'preenchimentos',
    short:
      'Reposição de volume e definição de contornos de forma criteriosa, respeitando a harmonia do seu rosto.',
    objective:
      'Valorizar contornos e proporções, devolvendo suporte e equilíbrio com foco em resultados naturais.',
    image: preenchimentosImg,
    imageAlt:
      'Detalhe de procedimento estético nos lábios realizado por profissional de luvas',
    focus: '58% 50%',
    intro: [
      'Os preenchimentos permitem cuidar de volumes, contornos e proporções do rosto. O segredo está na medida: cada indicação considera a anatomia, o equilíbrio entre as regiões da face e a sua identidade.',
      'Mais do que preencher, o objetivo é harmonizar — com planejamento, critério e a sensibilidade de saber quando parar.',
    ],
    steps: [
      avaliacaoPadrao,
      {
        title: 'Planejamento das proporções',
        text: 'Definição das regiões e das prioridades de acordo com a estrutura do seu rosto, sem excessos.',
      },
      {
        title: 'Procedimento',
        text: 'Realização com técnica e cuidado, seguida de orientações para a recuperação.',
      },
      acompanhamentoPadrao,
    ],
    notes: [
      'As regiões tratadas dependem da avaliação individual.',
      'O planejamento prioriza proporção e naturalidade, nunca volume pelo volume.',
      'Os resultados variam de pessoa para pessoa.',
    ],
    faq: [
      {
        q: 'O resultado fica artificial?',
        a: 'A proposta é valorizar sem exageros. As quantidades e as regiões são definidas no planejamento individual, sempre em busca de proporção e naturalidade.',
      },
      {
        q: 'Em quais regiões o preenchimento pode ser feito?',
        a: 'Depende das características do seu rosto e dos seus objetivos. As possibilidades indicadas para você são apresentadas durante a avaliação.',
      },
    ],
    seoTitle: 'Preenchimentos faciais em Bento Gonçalves',
    seoDescription:
      'Preenchimentos faciais em Bento Gonçalves/RS com planejamento individual: contornos e proporções valorizados com critério e naturalidade.',
  },
  {
    slug: 'avaliacao-e-mapeamento-facial',
    category: 'facial',
    name: 'Avaliação e mapeamento facial',
    whatsappName: 'avaliação e mapeamento facial (Studio Face)',
    badge: 'Studio Face',
    short:
      'Uma leitura detalhada das proporções e das características do seu rosto, base de um planejamento preciso.',
    objective:
      'Compreender seu rosto em profundidade para indicar apenas o que faz sentido — e na ordem certa.',
    image: mapeamentoImg,
    imageAlt: 'Perfil de mulher de olhos fechados sob luz natural suave',
    focus: '45% 32%',
    intro: [
      'Antes de qualquer procedimento, vem o olhar. A avaliação e o mapeamento facial reúnem escuta, análise das proporções, da qualidade da pele e das particularidades de cada região do rosto.',
      'É a partir dessa leitura que nasce um planejamento coerente com quem você é: o que priorizar, o que esperar e o que, simplesmente, não precisa ser feito.',
    ],
    steps: [
      {
        title: 'Escuta',
        text: 'Seus incômodos, sua rotina, seu histórico e o que você deseja — ou não deseja — mudar.',
      },
      {
        title: 'Mapeamento',
        text: 'Observação detalhada das proporções, dos volumes, da pele e das assimetrias naturais do rosto.',
      },
      {
        title: 'Plano por etapas',
        text: 'Indicação das prioridades e da sequência mais adequada, com transparência sobre cada passo.',
      },
      acompanhamentoPadrao,
    ],
    notes: [
      'É o ponto de partida de todos os tratamentos faciais.',
      'Você sai da avaliação entendendo o porquê de cada indicação.',
      'Nenhum procedimento é indicado sem essa etapa.',
    ],
    faq: [
      {
        q: 'Preciso saber o que quero fazer antes da avaliação?',
        a: 'Não. Você pode chegar apenas com suas dúvidas e incômodos. A indicação é construída em conjunto, a partir do mapeamento do seu rosto.',
      },
      // TODO: confirmar com a profissional o que é o Studio Face (nome do
      // serviço, equipamento ou sistema?) antes de descrevê-lo no site.
    ],
    seoTitle: 'Avaliação e mapeamento facial (Studio Face) em Bento Gonçalves',
    seoDescription:
      'Avaliação e mapeamento facial em Bento Gonçalves/RS: uma leitura detalhada do seu rosto para um planejamento estético individual e preciso.',
  },
  {
    slug: 'protocolos-faciais',
    category: 'facial',
    name: 'Protocolos faciais personalizados',
    whatsappName: 'protocolos faciais personalizados',
    short:
      'Cuidados para a qualidade da pele, combinados de acordo com as necessidades de cada fase.',
    objective:
      'Cuidar da qualidade da pele de forma contínua, com protocolos ajustados às suas necessidades.',
    image: protocolosImg,
    imageAlt:
      'Mulher relaxada de olhos fechados recebendo cuidados faciais com faixa no cabelo',
    focus: '66% 40%',
    intro: [
      'Nem toda pele precisa da mesma coisa — e nem a mesma pele precisa da mesma coisa o ano inteiro. Os protocolos faciais personalizados combinam cuidados de acordo com as características e o momento da sua pele.',
      'Eles são definidos após avaliação e ajustados ao longo do acompanhamento, para que o cuidado evolua junto com você.',
    ],
    steps: [
      avaliacaoPadrao,
      {
        title: 'Protocolo sob medida',
        text: 'Combinação de cuidados definida a partir das necessidades e do momento da sua pele.',
      },
      {
        title: 'Sessões',
        text: 'Atendimentos em um ambiente tranquilo, com orientações de cuidado para o dia a dia.',
      },
      acompanhamentoPadrao,
    ],
    notes: [
      'O protocolo é ajustado conforme a resposta da sua pele.',
      'A frequência das sessões é definida individualmente.',
      'Os resultados variam de pessoa para pessoa.',
    ],
    faq: [
      {
        q: 'Os protocolos combinam com outros procedimentos?',
        a: 'Podem fazer parte de um planejamento mais amplo. A combinação e a ordem dos cuidados são definidas na avaliação, respeitando o tempo da sua pele.',
      },
    ],
    seoTitle: 'Protocolos faciais personalizados em Bento Gonçalves',
    seoDescription:
      'Protocolos faciais personalizados em Bento Gonçalves/RS: cuidados para a qualidade da pele definidos a partir de avaliação individual.',
  },
  {
    slug: 'metodo-ser',
    category: 'metodo',
    name: 'Método SER',
    whatsappName: 'o Método SER',
    short:
      'Uma proposta de planejamento de tratamentos por etapas, com acompanhamento e respeito ao tempo de evolução de cada paciente.',
    objective:
      'Construir resultados com planejamento — sem pressa e sem excessos.',
    image: metodoImg,
    imageAlt:
      'Retrato em tons de verde de mulher de olhos fechados com a mão no rosto',
    focus: '50% 30%',
    intro: [
      'O Método SER organiza o cuidado em etapas. Em vez de concentrar tudo em um único momento, o tratamento é planejado ao longo do tempo, com prioridades claras, acompanhamento próximo e respeito ao ritmo de resposta de cada organismo.',
      'É uma escolha consciente: resultados construídos com planejamento, sem pressa e sem excessos — para que a mudança seja percebida como cuidado, não como transformação.',
    ],
    steps: [
      avaliacaoPadrao,
      {
        title: 'Planejamento por etapas',
        text: 'O cuidado é distribuído ao longo do tempo, com prioridades e uma sequência pensada para você.',
      },
      {
        title: 'Execução no tempo certo',
        text: 'Cada etapa acontece quando faz sentido, respeitando a resposta e a recuperação do seu organismo.',
      },
      {
        title: 'Acompanhamento da evolução',
        text: 'Retornos para observar os resultados e ajustar os próximos passos com segurança e transparência.',
      },
    ],
    notes: [
      'Sem pressa: o tempo de evolução de cada paciente é respeitado.',
      'Sem excessos: apenas o que foi indicado no planejamento.',
      'Com acompanhamento: o plano evolui junto com você.',
    ],
    faq: [
      {
        q: 'O Método SER é um procedimento?',
        a: 'Não exatamente. É uma forma de planejar e conduzir os tratamentos por etapas, com acompanhamento e respeito ao tempo de evolução de cada paciente.',
      },
      {
        q: 'Quanto tempo dura o planejamento?',
        a: 'Depende dos seus objetivos e da resposta do seu organismo. O cronograma é apresentado e conversado com você após a avaliação.',
      },
    ],
    seoTitle: 'Método SER — planejamento estético por etapas',
    seoDescription:
      'Conheça o Método SER: planejamento de tratamentos estéticos por etapas, com acompanhamento e respeito ao tempo de cada paciente. Bento Gonçalves/RS.',
  },
  {
    slug: 'remocao-de-tatuagem',
    category: 'tatuagem',
    name: 'Remoção de tatuagem',
    whatsappName: 'remoção de tatuagem',
    short:
      'Um processo progressivo de clareamento, planejado a partir das características da tatuagem e da sua pele.',
    objective:
      'Clarear a tatuagem de forma gradual e cuidadosa, buscando o melhor resultado possível para cada caso.',
    image: tatuagemImg,
    imageAlt: 'Punho com tatuagem de traço fino sobre fundo verde-escuro',
    focus: '50% 84%',
    intro: [
      'A remoção de tatuagem é um processo progressivo: acontece ao longo de sessões, com intervalos que respeitam a recuperação da pele.',
      'A resposta ao tratamento depende de diversos fatores — como as características da tatuagem (cores, densidade e tempo de aplicação dos pigmentos), a região do corpo e as particularidades da sua pele. Por isso, tudo começa com uma avaliação individual, que orienta expectativas reais desde o início.',
    ],
    steps: [
      {
        title: 'Avaliação da tatuagem e da pele',
        text: 'Análise das características da tatuagem e da sua pele para entender as possibilidades do seu caso.',
      },
      {
        title: 'Plano de sessões',
        text: 'Estimativa do processo e dos intervalos, conversada com transparência antes do início.',
      },
      {
        title: 'Sessões progressivas',
        text: 'O clareamento acontece de forma gradual, sessão após sessão, com orientações de cuidado.',
      },
      acompanhamentoPadrao,
    ],
    notes: [
      'O número de sessões só pode ser estimado após a avaliação.',
      'Os intervalos entre as sessões respeitam a recuperação da pele.',
      'Cada tatuagem responde de um jeito — os resultados variam de caso para caso.',
    ],
    faq: [
      {
        q: 'Quantas sessões são necessárias?',
        a: 'Não é possível definir antes de avaliar. O número de sessões depende das características da tatuagem e da sua pele, e é estimado com transparência na avaliação.',
      },
      {
        q: 'A tatuagem sai completamente?',
        a: 'Cada caso é único. O processo é progressivo e a resposta varia conforme a tatuagem e a pele. Na avaliação, você recebe uma orientação realista sobre o que esperar.',
      },
    ],
    seoTitle: 'Remoção de tatuagem em Bento Gonçalves',
    seoDescription:
      'Remoção de tatuagem em Bento Gonçalves/RS: processo progressivo, planejado a partir das características da tatuagem e da pele, com avaliação individual.',
  },
  {
    slug: 'tratamentos-capilares',
    category: 'capilar',
    name: 'Tratamentos capilares',
    whatsappName: 'tratamentos capilares',
    short:
      'Cuidados voltados ao fortalecimento dos fios e às necessidades do couro cabeludo, mediante avaliação individual.',
    objective:
      'Fortalecer os fios e cuidar do couro cabeludo com um plano adequado às suas necessidades.',
    image: capilarImg,
    imageAlt:
      'Aplicação de sérum com conta-gotas na raiz dos cabelos, sobre fundo verde-sálvia',
    focus: '50% 55%',
    intro: [
      'Os fios refletem muito do que acontece no couro cabeludo. Os tratamentos capilares partem de uma avaliação individual, que observa as características dos fios e do couro cabeludo para definir os cuidados mais adequados.',
      'O plano é acompanhado de perto e ajustado conforme a evolução — porque cuidar do cabelo também é uma questão de constância.',
    ],
    steps: [
      avaliacaoPadrao,
      {
        title: 'Análise dos fios e do couro cabeludo',
        text: 'Observação das características e das necessidades específicas para orientar o tratamento.',
      },
      {
        title: 'Plano de cuidados',
        text: 'Sessões e orientações definidas de forma individual, com foco no fortalecimento dos fios.',
      },
      acompanhamentoPadrao,
    ],
    notes: [
      'A indicação depende da avaliação individual.',
      'Constância e acompanhamento fazem parte do processo.',
      'Os resultados variam de pessoa para pessoa.',
    ],
    faq: [
      {
        q: 'Para quem são os tratamentos capilares?',
        a: 'Para quem deseja cuidar do fortalecimento dos fios e da saúde do couro cabeludo. A indicação é feita após avaliação individual.',
      },
    ],
    seoTitle: 'Tratamentos capilares em Bento Gonçalves',
    seoDescription:
      'Tratamentos capilares em Bento Gonçalves/RS voltados ao fortalecimento dos fios e às necessidades do couro cabeludo, com avaliação individual.',
  },
];

export const proceduresByCategory = (id: CategoryId) =>
  procedures.filter((p) => p.category === id);

export const getProcedure = (slug: string) =>
  procedures.find((p) => p.slug === slug);
