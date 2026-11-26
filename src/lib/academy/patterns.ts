import type { Ohlc } from "./candles";

/**
 * Candlestick and chart patterns taught in the academy. Only patterns that are
 * standard in technical-analysis literature are included. None of them
 * predicts the market by itself: each entry says what confirms and what
 * invalidates it.
 */

export type PatternKind =
  | "reversao-alta"
  | "reversao-baixa"
  | "continuacao-alta"
  | "continuacao-baixa"
  | "indecisao";

export const KIND_LABELS: Record<PatternKind, string> = {
  "reversao-alta": "Reversão para alta",
  "reversao-baixa": "Reversão para baixa",
  "continuacao-alta": "Continuação de alta",
  "continuacao-baixa": "Continuação de baixa",
  indecisao: "Indecisão",
};

export const kindBias = (k: PatternKind): "alta" | "baixa" | "neutro" =>
  k.endsWith("alta") ? "alta" : k.endsWith("baixa") ? "baixa" : "neutro";

export interface CandlePattern {
  id: string;
  name: string;
  /** Name in English, as it appears in most charting platforms. */
  en: string;
  kind: PatternKind;
  candlesCount: 1 | 2 | 3;
  /** Context candles first; the pattern itself is the last `candlesCount`. */
  candles: Ohlc[];
  recognize: string[];
  meaning: string;
  where: string;
  confirm: string;
  invalid: string;
}

const k = (o: number, h: number, l: number, c: number): Ohlc => ({
  o,
  h,
  l,
  c,
});

/** Three candles falling into the pattern (context for bullish reversals). */
const FALL = [
  k(110, 110.6, 106.8, 107.4),
  k(107.4, 108, 103.8, 104.4),
  k(104.4, 104.8, 100.6, 101.2),
];
/** Three candles rising into the pattern (context for bearish reversals). */
const RISE = [
  k(90, 93.2, 89.4, 92.6),
  k(92.6, 96.2, 92, 95.6),
  k(95.6, 99.4, 95.2, 98.8),
];

export const CANDLE_PATTERNS: CandlePattern[] = [
  {
    id: "martelo",
    name: "Martelo",
    en: "Hammer",
    kind: "reversao-alta",
    candlesCount: 1,
    candles: [...FALL, k(100.6, 101.4, 96, 101.2)],
    recognize: [
      "Corpo pequeno na parte de cima do candle",
      "Pavio inferior com pelo menos o dobro do tamanho do corpo",
      "Pavio superior pequeno ou inexistente",
      "Aparece depois de uma queda",
    ],
    meaning:
      "Os vendedores derrubaram o preço durante o período, mas os compradores reagiram e recuperaram quase tudo antes do fechamento. A queda encontrou quem quisesse comprar.",
    where:
      "No fim de uma queda, encostado num suporte. No meio de uma lateralização perde quase todo o valor.",
    confirm: "O candle seguinte fecha acima da máxima do martelo.",
    invalid: "Um fechamento abaixo da mínima do martelo (a ponta do pavio).",
  },
  {
    id: "martelo-invertido",
    name: "Martelo invertido",
    en: "Inverted hammer",
    kind: "reversao-alta",
    candlesCount: 1,
    candles: [...FALL, k(100.8, 104.6, 100.4, 101.4)],
    recognize: [
      "Corpo pequeno na parte de baixo do candle",
      "Pavio superior com pelo menos o dobro do corpo",
      "Pavio inferior pequeno",
      "Aparece depois de uma queda",
    ],
    meaning:
      "Os compradores tentaram subir o preço pela primeira vez depois da queda. Não conseguiram segurar, mas mostraram que há interesse de compra.",
    where:
      "No fundo de uma queda, perto de suporte. É mais fraco que o martelo e depende mais da confirmação.",
    confirm:
      "O candle seguinte abre e fecha acima do corpo do martelo invertido.",
    invalid: "Um novo fechamento abaixo da mínima do padrão.",
  },
  {
    id: "enforcado",
    name: "Enforcado",
    en: "Hanging man",
    kind: "reversao-baixa",
    candlesCount: 1,
    candles: [...RISE, k(98.8, 99.8, 95.2, 99.6)],
    recognize: [
      "Mesmo formato do martelo: corpo pequeno em cima e pavio inferior longo",
      "Aparece depois de uma alta",
      "Corpo vermelho deixa o sinal um pouco mais forte",
    ],
    meaning:
      "No meio da alta, apareceu venda forte o bastante para derrubar o preço durante o período. Os compradores recuperaram, mas a pressão vendedora deu as caras.",
    where: "No topo de uma alta, perto de uma resistência.",
    confirm: "O candle seguinte fecha abaixo do corpo do enforcado.",
    invalid: "Um fechamento acima da máxima do enforcado.",
  },
  {
    id: "estrela-cadente",
    name: "Estrela cadente",
    en: "Shooting star",
    kind: "reversao-baixa",
    candlesCount: 1,
    candles: [...RISE, k(99.6, 103.8, 98.6, 98.6)],
    recognize: [
      "Corpo pequeno na parte de baixo do candle",
      "Pavio superior com pelo menos o dobro do corpo",
      "Pavio inferior pequeno ou inexistente",
      "Aparece depois de uma alta",
    ],
    meaning:
      "Os compradores levaram o preço bem para cima, mas os vendedores rejeitaram esses preços e o devolveram para perto da abertura.",
    where:
      "No topo de uma alta, encostado numa resistência ou numa máxima anterior.",
    confirm: "O candle seguinte fecha abaixo da mínima da estrela cadente.",
    invalid: "Um fechamento acima da ponta do pavio superior.",
  },
  {
    id: "doji",
    name: "Doji",
    en: "Doji",
    kind: "indecisao",
    candlesCount: 1,
    candles: [...RISE, k(99, 101.4, 96.8, 99.05)],
    recognize: [
      "Abertura e fechamento praticamente iguais (corpo quase uma linha)",
      "Pavios de qualquer tamanho",
      "Variações: libélula (pavio só embaixo) e lápide (pavio só em cima)",
    ],
    meaning:
      "Compradores e vendedores terminaram o período empatados. Depois de um movimento longo, mostra que quem estava no controle perdeu força.",
    where:
      "Depois de uma alta ou queda prolongada, perto de suporte ou resistência. No meio de um mercado lateral não significa quase nada.",
    confirm:
      "A direção do candle seguinte: fechamento abaixo da mínima do doji (após alta) ou acima da máxima (após queda).",
    invalid: "O preço retoma a tendência anterior com força.",
  },
  {
    id: "marubozu-alta",
    name: "Marubozu de alta",
    en: "Bullish marubozu",
    kind: "continuacao-alta",
    candlesCount: 1,
    candles: [
      k(96, 97, 95.2, 96.6),
      k(96.6, 97.4, 96, 96.4),
      k(96.4, 97.2, 95.8, 96.9),
      k(97, 102.2, 96.95, 102.15),
    ],
    recognize: [
      "Corpo verde grande",
      "Sem pavios ou com pavios mínimos",
      "Abre na mínima e fecha na máxima",
    ],
    meaning:
      "Os compradores dominaram o período do início ao fim, sem deixar os vendedores reagirem.",
    where:
      "Rompendo uma resistência ou saindo de uma lateralização. No fim de uma alta muito esticada pode indicar exaustão.",
    confirm:
      "O candle seguinte não devolve mais da metade do corpo do marubozu.",
    invalid: "Um fechamento abaixo da abertura do marubozu.",
  },
  {
    id: "marubozu-baixa",
    name: "Marubozu de baixa",
    en: "Bearish marubozu",
    kind: "continuacao-baixa",
    candlesCount: 1,
    candles: [
      k(104, 104.8, 103.2, 103.6),
      k(103.6, 104.4, 103, 104),
      k(104, 104.6, 103.4, 103.5),
      k(103.4, 103.45, 98, 98.05),
    ],
    recognize: [
      "Corpo vermelho grande",
      "Sem pavios ou com pavios mínimos",
      "Abre na máxima e fecha na mínima",
    ],
    meaning: "Os vendedores dominaram o período do início ao fim.",
    where: "Perdendo um suporte ou saindo de uma lateralização para baixo.",
    confirm: "O candle seguinte não recupera mais da metade do corpo.",
    invalid: "Um fechamento acima da abertura do marubozu.",
  },
  {
    id: "engolfo-alta",
    name: "Engolfo de alta",
    en: "Bullish engulfing",
    kind: "reversao-alta",
    candlesCount: 2,
    candles: [...FALL, k(101, 101.4, 98.8, 99.4), k(99.2, 102.6, 98.9, 102.3)],
    recognize: [
      "Primeiro candle vermelho, de queda",
      "Segundo candle verde cujo corpo cobre todo o corpo do anterior",
      "Aparece depois de uma queda",
    ],
    meaning:
      "Os compradores não só pararam a queda como recuperaram tudo o que os vendedores tinham feito no período anterior.",
    where:
      "No fundo de uma queda, em suporte. Quanto maior o candle verde em relação ao vermelho, mais forte.",
    confirm: "O candle seguinte fecha acima da máxima do engolfo.",
    invalid: "Um fechamento abaixo da mínima do engolfo.",
  },
  {
    id: "engolfo-baixa",
    name: "Engolfo de baixa",
    en: "Bearish engulfing",
    kind: "reversao-baixa",
    candlesCount: 2,
    candles: [
      ...RISE,
      k(98.8, 101.2, 98.6, 100.6),
      k(100.8, 101.1, 97.4, 97.7),
    ],
    recognize: [
      "Primeiro candle verde, de alta",
      "Segundo candle vermelho cujo corpo cobre todo o corpo do anterior",
      "Aparece depois de uma alta",
    ],
    meaning:
      "Os vendedores apagaram todo o avanço do período anterior: a alta perdeu o controle.",
    where: "No topo de uma alta, numa resistência ou máxima anterior.",
    confirm: "O candle seguinte fecha abaixo da mínima do engolfo.",
    invalid: "Um fechamento acima da máxima do engolfo.",
  },
  {
    id: "harami-alta",
    name: "Harami de alta",
    en: "Bullish harami",
    kind: "reversao-alta",
    candlesCount: 2,
    candles: [...FALL, k(101.4, 101.8, 97, 97.4), k(98.2, 99.8, 97.9, 99.4)],
    recognize: [
      "Primeiro candle vermelho grande",
      "Segundo candle pequeno, com o corpo inteiro dentro do corpo do primeiro",
      "Aparece depois de uma queda",
    ],
    meaning:
      "Depois de um candle forte de queda, o mercado parou e ficou contido: a pressão vendedora diminuiu.",
    where:
      "No fundo de uma queda. É um sinal fraco: indica pausa mais do que reversão.",
    confirm: "Um fechamento acima da máxima do primeiro candle.",
    invalid: "Um fechamento abaixo da mínima do primeiro candle.",
  },
  {
    id: "harami-baixa",
    name: "Harami de baixa",
    en: "Bearish harami",
    kind: "reversao-baixa",
    candlesCount: 2,
    candles: [
      ...RISE,
      k(98.6, 103, 98.2, 102.6),
      k(101.8, 102.1, 100.2, 100.6),
    ],
    recognize: [
      "Primeiro candle verde grande",
      "Segundo candle pequeno, com o corpo dentro do corpo do primeiro",
      "Aparece depois de uma alta",
    ],
    meaning:
      "Depois de um candle forte de alta, o mercado travou: a força compradora diminuiu.",
    where:
      "No topo de uma alta. Sinal fraco: indica pausa mais do que reversão.",
    confirm: "Um fechamento abaixo da mínima do primeiro candle.",
    invalid: "Um fechamento acima da máxima do primeiro candle.",
  },
  {
    id: "perfuracao",
    name: "Linha de perfuração",
    en: "Piercing line",
    kind: "reversao-alta",
    candlesCount: 2,
    candles: [
      ...FALL,
      k(101.4, 101.8, 97.2, 97.6),
      k(97.2, 100.4, 96.8, 100.1),
    ],
    recognize: [
      "Primeiro candle vermelho grande",
      "Segundo candle verde que abre perto da mínima do primeiro",
      "O verde fecha acima da metade do corpo vermelho, sem cobri-lo todo",
    ],
    meaning:
      "Os compradores recuperaram mais da metade da queda anterior. É como um engolfo incompleto.",
    where:
      "No fundo de uma queda. Em mercados 24 horas (forex, cripto) quase não há salto de abertura; o que importa é o fechamento acima do meio do corpo anterior.",
    confirm: "O candle seguinte fecha acima da abertura do candle vermelho.",
    invalid: "Um fechamento abaixo da mínima do padrão.",
  },
  {
    id: "nuvem-negra",
    name: "Nuvem negra",
    en: "Dark cloud cover",
    kind: "reversao-baixa",
    candlesCount: 2,
    candles: [...RISE, k(98.6, 102.8, 98.2, 102.4), k(102.8, 103.2, 99.6, 100)],
    recognize: [
      "Primeiro candle verde grande",
      "Segundo candle vermelho que abre perto da máxima do primeiro",
      "O vermelho fecha abaixo da metade do corpo verde, sem cobri-lo todo",
    ],
    meaning:
      "Os vendedores devolveram mais da metade da alta anterior: a compra perdeu força.",
    where: "No topo de uma alta, numa resistência.",
    confirm: "O candle seguinte fecha abaixo da abertura do candle verde.",
    invalid: "Um fechamento acima da máxima do padrão.",
  },
  {
    id: "estrela-manha",
    name: "Estrela da manhã",
    en: "Morning star",
    kind: "reversao-alta",
    candlesCount: 3,
    candles: [
      FALL[0],
      FALL[1],
      k(104.4, 104.8, 99.6, 100),
      k(99.6, 100.4, 98.4, 99.8),
      k(100.2, 103.8, 100, 103.5),
    ],
    recognize: [
      "Um candle vermelho grande",
      "Um candle pequeno (corpo curto ou doji) abaixo dele",
      "Um candle verde grande que fecha acima da metade do primeiro",
    ],
    meaning:
      "A queda forte perdeu força (candle pequeno) e os compradores assumiram com um candle grande: a sequência mostra a troca de controle.",
    where:
      "No fundo de uma queda, em suporte. É um dos padrões de reversão mais observados.",
    confirm:
      "O candle seguinte mantém o preço acima do fechamento do terceiro candle.",
    invalid: "Um fechamento abaixo da mínima do candle do meio.",
  },
  {
    id: "estrela-tarde",
    name: "Estrela da tarde",
    en: "Evening star",
    kind: "reversao-baixa",
    candlesCount: 3,
    candles: [
      RISE[0],
      RISE[1],
      k(95.6, 100.2, 95.2, 99.8),
      k(100.2, 101.6, 99.6, 100.4),
      k(100, 100.2, 96.2, 96.5),
    ],
    recognize: [
      "Um candle verde grande",
      "Um candle pequeno (corpo curto ou doji) acima dele",
      "Um candle vermelho grande que fecha abaixo da metade do primeiro",
    ],
    meaning:
      "A alta forte travou (candle pequeno) e os vendedores assumiram com um candle grande.",
    where: "No topo de uma alta, em resistência.",
    confirm:
      "O candle seguinte mantém o preço abaixo do fechamento do terceiro candle.",
    invalid: "Um fechamento acima da máxima do candle do meio.",
  },
  {
    id: "tres-soldados",
    name: "Três soldados brancos",
    en: "Three white soldiers",
    kind: "reversao-alta",
    candlesCount: 3,
    candles: [
      FALL[0],
      FALL[1],
      FALL[2],
      k(101, 103.6, 100.8, 103.4),
      k(103, 106, 102.8, 105.8),
      k(105.4, 108.4, 105.2, 108.2),
    ],
    recognize: [
      "Três candles verdes seguidos, de corpo grande",
      "Cada um abre dentro do corpo do anterior e fecha numa nova máxima",
      "Pavios curtos",
    ],
    meaning:
      "Compra firme e constante por três períodos: a tendência virou ou ganhou força.",
    where:
      "Depois de uma queda ou de uma lateralização. Depois de uma alta muito longa pode significar exaustão.",
    confirm:
      "O preço segura acima do meio do terceiro candle nos períodos seguintes.",
    invalid: "Um fechamento abaixo da abertura do primeiro soldado.",
  },
  {
    id: "tres-corvos",
    name: "Três corvos negros",
    en: "Three black crows",
    kind: "reversao-baixa",
    candlesCount: 3,
    candles: [
      RISE[0],
      RISE[1],
      RISE[2],
      k(99, 99.2, 96.4, 96.6),
      k(97, 97.2, 94, 94.2),
      k(94.6, 94.8, 91.6, 91.8),
    ],
    recognize: [
      "Três candles vermelhos seguidos, de corpo grande",
      "Cada um abre dentro do corpo do anterior e fecha numa nova mínima",
      "Pavios curtos",
    ],
    meaning:
      "Venda firme e constante por três períodos: a alta perdeu o controle.",
    where: "Depois de uma alta ou lateralização.",
    confirm:
      "O preço segura abaixo do meio do terceiro candle nos períodos seguintes.",
    invalid: "Um fechamento acima da abertura do primeiro corvo.",
  },
  {
    id: "pinca-fundo",
    name: "Pinça de fundo",
    en: "Tweezer bottom",
    kind: "reversao-alta",
    candlesCount: 2,
    candles: [...FALL, k(101, 101.4, 98, 98.6), k(98.6, 101.2, 98, 100.8)],
    recognize: [
      "Dois candles seguidos com a mesma mínima (ou quase)",
      "Normalmente o primeiro é vermelho e o segundo verde",
      "Aparece depois de uma queda",
    ],
    meaning:
      "O preço testou o mesmo nível duas vezes e foi rejeitado nas duas: ali há compradores defendendo.",
    where: "Num suporte claro, no fundo de uma queda.",
    confirm: "Um fechamento acima da máxima dos dois candles.",
    invalid: "Um fechamento abaixo da mínima comum.",
  },
  {
    id: "pinca-topo",
    name: "Pinça de topo",
    en: "Tweezer top",
    kind: "reversao-baixa",
    candlesCount: 2,
    candles: [...RISE, k(99, 102, 98.6, 101.4), k(101.4, 102, 99.2, 99.4)],
    recognize: [
      "Dois candles seguidos com a mesma máxima (ou quase)",
      "Normalmente o primeiro é verde e o segundo vermelho",
      "Aparece depois de uma alta",
    ],
    meaning:
      "O preço bateu duas vezes no mesmo teto e foi rejeitado: ali há vendedores defendendo.",
    where: "Numa resistência clara, no topo de uma alta.",
    confirm: "Um fechamento abaixo da mínima dos dois candles.",
    invalid: "Um fechamento acima da máxima comum.",
  },
];

/* ------------------------------- Chart patterns ------------------------------ */

export interface ChartPattern {
  id: string;
  name: string;
  en: string;
  kind: PatternKind;
  /** Price path, x and y from 0 to 100 (y up). */
  path: [number, number][];
  /** Reference lines (neckline, trendlines), same scale. */
  lines: { from: [number, number]; to: [number, number]; label?: string }[];
  /** Where the confirmation happens (arrow tip). */
  breakout: [number, number];
  recognize: string;
  confirm: string;
  invalid: string;
}

export const CHART_PATTERNS: ChartPattern[] = [
  {
    id: "fundo-duplo",
    name: "Fundo duplo",
    en: "Double bottom",
    kind: "reversao-alta",
    path: [
      [0, 85],
      [18, 22],
      [38, 62],
      [58, 24],
      [76, 64],
      [90, 80],
    ],
    lines: [{ from: [30, 62], to: [100, 62], label: "pescoço" }],
    breakout: [80, 66],
    recognize:
      "Dois fundos em níveis parecidos, separados por uma alta. A máxima entre eles é a linha do pescoço.",
    confirm: "Fechamento acima da linha do pescoço.",
    invalid: "Fechamento abaixo dos fundos.",
  },
  {
    id: "topo-duplo",
    name: "Topo duplo",
    en: "Double top",
    kind: "reversao-baixa",
    path: [
      [0, 15],
      [18, 78],
      [38, 38],
      [58, 76],
      [76, 36],
      [90, 20],
    ],
    lines: [{ from: [30, 38], to: [100, 38], label: "pescoço" }],
    breakout: [80, 34],
    recognize:
      "Dois topos em níveis parecidos, separados por uma queda. A mínima entre eles é a linha do pescoço.",
    confirm: "Fechamento abaixo da linha do pescoço.",
    invalid: "Fechamento acima dos topos.",
  },
  {
    id: "oco",
    name: "Ombro-cabeça-ombro (OCO)",
    en: "Head and shoulders",
    kind: "reversao-baixa",
    path: [
      [0, 20],
      [14, 62],
      [26, 44],
      [44, 84],
      [60, 44],
      [74, 62],
      [88, 30],
      [96, 22],
    ],
    lines: [{ from: [20, 44], to: [100, 44], label: "pescoço" }],
    breakout: [84, 40],
    recognize:
      "Três topos: o do meio (cabeça) mais alto que os laterais (ombros). Os fundos entre eles formam o pescoço.",
    confirm: "Fechamento abaixo do pescoço depois do ombro direito.",
    invalid: "Fechamento acima do ombro direito.",
  },
  {
    id: "oco-invertido",
    name: "OCO invertido",
    en: "Inverse head and shoulders",
    kind: "reversao-alta",
    path: [
      [0, 80],
      [14, 38],
      [26, 56],
      [44, 16],
      [60, 56],
      [74, 38],
      [88, 70],
      [96, 78],
    ],
    lines: [{ from: [20, 56], to: [100, 56], label: "pescoço" }],
    breakout: [84, 60],
    recognize:
      "Três fundos: o do meio mais baixo que os laterais. Os topos entre eles formam o pescoço.",
    confirm: "Fechamento acima do pescoço depois do ombro direito.",
    invalid: "Fechamento abaixo do ombro direito.",
  },
  {
    id: "triangulo-ascendente",
    name: "Triângulo ascendente",
    en: "Ascending triangle",
    kind: "continuacao-alta",
    path: [
      [0, 20],
      [14, 72],
      [26, 36],
      [40, 72],
      [52, 48],
      [64, 72],
      [74, 58],
      [84, 72],
      [96, 90],
    ],
    lines: [
      { from: [10, 72], to: [100, 72], label: "resistência" },
      { from: [0, 22], to: [90, 66] },
    ],
    breakout: [90, 80],
    recognize:
      "Topos no mesmo nível (resistência) e fundos cada vez mais altos: os compradores pressionam o teto.",
    confirm: "Fechamento acima da resistência.",
    invalid: "Fechamento abaixo da linha dos fundos.",
  },
  {
    id: "triangulo-descendente",
    name: "Triângulo descendente",
    en: "Descending triangle",
    kind: "continuacao-baixa",
    path: [
      [0, 80],
      [14, 28],
      [26, 64],
      [40, 28],
      [52, 52],
      [64, 28],
      [74, 42],
      [84, 28],
      [96, 10],
    ],
    lines: [
      { from: [10, 28], to: [100, 28], label: "suporte" },
      { from: [0, 78], to: [90, 34] },
    ],
    breakout: [90, 20],
    recognize:
      "Fundos no mesmo nível (suporte) e topos cada vez mais baixos: os vendedores pressionam o piso.",
    confirm: "Fechamento abaixo do suporte.",
    invalid: "Fechamento acima da linha dos topos.",
  },
  {
    id: "triangulo-simetrico",
    name: "Triângulo simétrico",
    en: "Symmetrical triangle",
    kind: "indecisao",
    path: [
      [0, 50],
      [12, 82],
      [26, 22],
      [42, 72],
      [56, 34],
      [68, 62],
      [78, 44],
      [86, 54],
    ],
    lines: [
      { from: [6, 86], to: [92, 54] },
      { from: [6, 16], to: [92, 46] },
    ],
    breakout: [94, 50],
    recognize:
      "Topos cada vez mais baixos e fundos cada vez mais altos: o preço se comprime até romper para um dos lados.",
    confirm:
      "Fechamento fora do triângulo; a direção do rompimento define o lado.",
    invalid:
      "Rompimento que volta para dentro do triângulo no candle seguinte (falso rompimento).",
  },
  {
    id: "bandeira-alta",
    name: "Bandeira de alta",
    en: "Bull flag",
    kind: "continuacao-alta",
    path: [
      [0, 10],
      [26, 74],
      [36, 64],
      [44, 70],
      [54, 58],
      [62, 64],
      [72, 54],
      [88, 92],
    ],
    lines: [
      { from: [26, 76], to: [76, 60] },
      { from: [30, 62], to: [76, 50] },
    ],
    breakout: [80, 72],
    recognize:
      "Uma alta forte (o mastro) seguida de uma correção curta e inclinada para baixo, em canal.",
    confirm: "Fechamento acima do canal da bandeira.",
    invalid: "Correção que devolve mais da metade do mastro.",
  },
  {
    id: "bandeira-baixa",
    name: "Bandeira de baixa",
    en: "Bear flag",
    kind: "continuacao-baixa",
    path: [
      [0, 90],
      [26, 26],
      [36, 36],
      [44, 30],
      [54, 42],
      [62, 36],
      [72, 46],
      [88, 8],
    ],
    lines: [
      { from: [26, 24], to: [76, 40] },
      { from: [30, 38], to: [76, 50] },
    ],
    breakout: [80, 28],
    recognize:
      "Uma queda forte seguida de uma recuperação curta e inclinada para cima, em canal.",
    confirm: "Fechamento abaixo do canal da bandeira.",
    invalid: "Recuperação que devolve mais da metade da queda.",
  },
];

/* --------------------------- Buy x Sell cheat sheet -------------------------- */

export interface SetupSide {
  /** Chart pattern id (or "suporte"/"resistencia" for a plain level). */
  chart: string;
  /** Candle pattern id that acts as trigger. */
  candle: string;
  title: string;
  confirm: string;
  invalid: string;
}

/** Mirror pairs: the bullish setup and its bearish counterpart. */
export const SETUP_PAIRS: { buy: SetupSide; sell: SetupSide }[] = [
  {
    buy: {
      chart: "suporte",
      candle: "martelo",
      title: "Martelo no suporte",
      confirm: "Próximo candle fecha acima da máxima do martelo.",
      invalid: "Fechamento abaixo do pavio do martelo.",
    },
    sell: {
      chart: "resistencia",
      candle: "estrela-cadente",
      title: "Estrela cadente na resistência",
      confirm: "Próximo candle fecha abaixo da mínima da estrela.",
      invalid: "Fechamento acima do pavio da estrela.",
    },
  },
  {
    buy: {
      chart: "suporte",
      candle: "engolfo-alta",
      title: "Engolfo de alta no fundo",
      confirm: "Fechamento acima da máxima do engolfo.",
      invalid: "Fechamento abaixo da mínima do engolfo.",
    },
    sell: {
      chart: "resistencia",
      candle: "engolfo-baixa",
      title: "Engolfo de baixa no topo",
      confirm: "Fechamento abaixo da mínima do engolfo.",
      invalid: "Fechamento acima da máxima do engolfo.",
    },
  },
  {
    buy: {
      chart: "fundo-duplo",
      candle: "martelo",
      title: "Fundo duplo + martelo no 2º fundo",
      confirm: "Rompimento da linha do pescoço.",
      invalid: "Perda dos fundos.",
    },
    sell: {
      chart: "topo-duplo",
      candle: "estrela-cadente",
      title: "Topo duplo + estrela cadente no 2º topo",
      confirm: "Perda da linha do pescoço.",
      invalid: "Rompimento dos topos.",
    },
  },
  {
    buy: {
      chart: "oco-invertido",
      candle: "marubozu-alta",
      title: "OCO invertido + candle forte no pescoço",
      confirm: "Fechamento acima do pescoço.",
      invalid: "Volta abaixo do ombro direito.",
    },
    sell: {
      chart: "oco",
      candle: "marubozu-baixa",
      title: "OCO + candle forte no pescoço",
      confirm: "Fechamento abaixo do pescoço.",
      invalid: "Volta acima do ombro direito.",
    },
  },
  {
    buy: {
      chart: "triangulo-ascendente",
      candle: "marubozu-alta",
      title: "Triângulo ascendente + rompimento forte",
      confirm:
        "Fechamento acima da resistência, sem devolver no candle seguinte.",
      invalid: "Volta para dentro do triângulo.",
    },
    sell: {
      chart: "triangulo-descendente",
      candle: "marubozu-baixa",
      title: "Triângulo descendente + rompimento forte",
      confirm:
        "Fechamento abaixo do suporte, sem recuperar no candle seguinte.",
      invalid: "Volta para dentro do triângulo.",
    },
  },
  {
    buy: {
      chart: "bandeira-alta",
      candle: "marubozu-alta",
      title: "Bandeira de alta + saída do canal",
      confirm: "Fechamento acima do canal.",
      invalid: "Correção maior que metade do mastro.",
    },
    sell: {
      chart: "bandeira-baixa",
      candle: "marubozu-baixa",
      title: "Bandeira de baixa + saída do canal",
      confirm: "Fechamento abaixo do canal.",
      invalid: "Recuperação maior que metade da queda.",
    },
  },
  {
    buy: {
      chart: "suporte",
      candle: "estrela-manha",
      title: "Estrela da manhã no suporte",
      confirm: "Preço segura acima do 3º candle.",
      invalid: "Fechamento abaixo do candle do meio.",
    },
    sell: {
      chart: "resistencia",
      candle: "estrela-tarde",
      title: "Estrela da tarde na resistência",
      confirm: "Preço segura abaixo do 3º candle.",
      invalid: "Fechamento acima do candle do meio.",
    },
  },
  {
    buy: {
      chart: "suporte",
      candle: "pinca-fundo",
      title: "Pinça de fundo no suporte",
      confirm: "Fechamento acima das duas máximas.",
      invalid: "Perda da mínima comum.",
    },
    sell: {
      chart: "resistencia",
      candle: "pinca-topo",
      title: "Pinça de topo na resistência",
      confirm: "Fechamento abaixo das duas mínimas.",
      invalid: "Rompimento da máxima comum.",
    },
  },
];

export const findCandlePattern = (id: string) =>
  CANDLE_PATTERNS.find((p) => p.id === id);
export const findChartPattern = (id: string) =>
  CHART_PATTERNS.find((p) => p.id === id);
