import { OFFICIAL } from './sources'

export type CardFinish = 'orange' | 'white' | 'graphite' | 'black'
export type CardId = 'gold' | 'platinum' | 'prime' | 'win'

export interface InterCard {
  id: CardId
  name: string
  shortName: string
  finish: CardFinish
  finishLabel: string
  category: string
  tagline: string
  annualFee: string
  points: string
  pointsPerReal: number
  cashback: string
  benefits: string[]
  mastercard: string
  eligibility: string[]
  limit: string[]
  howTo: string[]
  extras?: string[]
  accent: string
  source: string
}

/** Formas de troca dos pontos Loop listadas na página oficial de cartões. */
export const LOOP_REDEMPTIONS = [
  'Milhas para viajar mais barato',
  'Cashback direto na conta',
  'Acesso a Salas VIP com buffet completo e bebidas à vontade',
  'Dólares na conta global',
  'Descontos na fatura',
  'Investimentos',
]

const HOW_TO = [
  'Abra sua conta Inter gratuitamente pelo Super App — você já recebe um cartão de débito.',
  'No Super App, acesse o menu “Cartão” e toque em “Solicitar função crédito”.',
  'Aguarde a análise do seu perfil: a avaliação leva até 7 dias úteis.',
]

const LIMIT = [
  'Liberação de crédito sujeita a análise — o site oficial não divulga valores fixos de limite.',
  'É possível ampliar o limite investindo no CDB Mais Limite ou na Poupança Mais Limite: o valor aplicado continua guardado e vira limite no cartão.',
]

const MASTERCARD =
  'Os cartões Inter são da bandeira Mastercard. Os benefícios da bandeira variam conforme a categoria do cartão e as regras vigentes da Mastercard — confira as condições atualizadas no Super App antes de utilizá-los.'

const CASHBACK =
  'Não há percentual fixo de cashback por cartão divulgado na página oficial: o cashback vem da troca de pontos Loop por dinheiro na conta e das compras com cashback no Shopping do Inter.'

export const CARDS: InterCard[] = [
  {
    id: 'gold',
    name: 'Inter Gold',
    shortName: 'Gold',
    finish: 'orange',
    finishLabel: 'Laranja',
    category: 'Cartão de entrada · conta digital gratuita',
    tagline: 'O cartão que já vem com a sua conta.',
    annualFee: 'Sem anuidade',
    points: '1 ponto Loop a cada R$ 10,00 gastos no crédito',
    pointsPerReal: 10,
    cashback: CASHBACK,
    benefits: [
      'Programa de pontos Inter Loop',
      'Compras internacionais no crédito',
      'Pagamento por aproximação e carteiras digitais (Apple Pay, Google Pay, Samsung Pay e WhatsApp)',
      'Cartão virtual para compras online mais seguras',
      'Parcelamento de compras à vista em até 8 vezes',
      'Antecipação de parcelas pelo Super App',
    ],
    mastercard: MASTERCARD,
    eligibility: [
      'Ser maior de 18 anos e ter um CPF válido.',
      'Ao abrir a conta gratuita, você já ganha o Inter Gold (crédito sujeito à análise).',
    ],
    limit: LIMIT,
    howTo: HOW_TO,
    extras: [
      'Para acumular pontos nos cartões Gold, Platinum e Prime é necessário ter o Débito Automático da fatura ativo.',
    ],
    accent: '#FF7A00',
    source: OFFICIAL.cards,
  },
  {
    id: 'platinum',
    name: 'Inter Platinum',
    shortName: 'Platinum',
    finish: 'white',
    finishLabel: 'Branco',
    category: 'Cartão intermediário',
    tagline: 'Pontuação em dobro em relação ao Gold.',
    annualFee: 'Sem anuidade',
    points: '1 ponto Loop a cada R$ 5,00 gastos no crédito',
    pointsPerReal: 5,
    cashback: CASHBACK,
    benefits: [
      'Programa de pontos Inter Loop',
      'Compras internacionais no crédito',
      'Pagamento por aproximação e carteiras digitais',
      'Cartão virtual para compras online mais seguras',
      'Parcelamento de compras à vista em até 8 vezes',
      'Antecipação de parcelas pelo Super App',
    ],
    mastercard: MASTERCARD,
    eligibility: [
      'Receber salário de R$ 6 mil ou mais via portabilidade, por 3 meses consecutivos; ou',
      'Gastar em média R$ 5.000 em 4 faturas consecutivas.',
    ],
    limit: LIMIT,
    howTo: HOW_TO,
    extras: [
      'Para acumular pontos nos cartões Gold, Platinum e Prime é necessário ter o Débito Automático da fatura ativo.',
    ],
    accent: '#D9D4CC',
    source: OFFICIAL.cards,
  },
  {
    id: 'prime',
    name: 'Inter Prime',
    shortName: 'Prime',
    finish: 'graphite',
    finishLabel: 'Grafite',
    category: 'Cartão premium · relacionamento Prime',
    tagline: 'Mais pontos e acesso à Smiles pelo Loop.',
    annualFee: 'Sem anuidade',
    points: '1 ponto Loop a cada R$ 2,50 gastos no crédito',
    pointsPerReal: 2.5,
    cashback: CASHBACK,
    benefits: [
      'Programa de pontos Inter Loop',
      'Transferência de pontos para a Smiles (exclusiva para clientes Inter Prime e Win)',
      'Compras internacionais no crédito',
      'Pagamento por aproximação e carteiras digitais',
      'Cartão virtual para compras online mais seguras',
      'Parcelamento de compras à vista em até 8 vezes',
    ],
    mastercard: MASTERCARD,
    eligibility: [
      'Assinar o plano anual do Duo Gourmet; ou',
      'Gastar em média R$ 7.000 em 4 faturas consecutivas.',
    ],
    limit: LIMIT,
    howTo: HOW_TO,
    extras: [
      'Clientes com o antigo cartão Inter Black seguem com pontuação de 1 ponto a cada R$ 2,50.',
      'Para acumular pontos nos cartões Gold, Platinum e Prime é necessário ter o Débito Automático da fatura ativo.',
    ],
    accent: '#5B5B60',
    source: OFFICIAL.cards,
  },
  {
    id: 'win',
    name: 'Inter Win',
    shortName: 'Win',
    finish: 'black',
    finishLabel: 'Preto',
    category: 'Cartão exclusivo para investidores · relacionamento Win',
    tagline: 'A maior pontuação do Loop.',
    annualFee: 'Sem anuidade',
    points: '1 ponto Loop a cada R$ 2,00 gastos no crédito',
    pointsPerReal: 2,
    cashback: CASHBACK,
    benefits: [
      'Programa de pontos Inter Loop com a maior taxa de acúmulo',
      'Transferência de pontos para a Smiles (exclusiva para clientes Inter Prime e Win)',
      'Compras internacionais no crédito',
      'Pagamento por aproximação e carteiras digitais',
      'Cartão virtual para compras online mais seguras',
      'Parcelamento de compras à vista em até 8 vezes',
    ],
    mastercard: MASTERCARD,
    eligibility: ['Ter investimentos a partir de R$ 1 milhão no Banco Inter.'],
    limit: LIMIT,
    howTo: HOW_TO,
    accent: '#111111',
    source: OFFICIAL.cards,
  },
]

export const CARD_FEATURES = [
  { title: 'Compras internacionais', text: 'Use o crédito em compras no exterior e em sites internacionais.' },
  { title: 'Aproximação', text: 'Pague por aproximação com o cartão, celular, relógio ou pulseira.' },
  { title: 'Categorias', text: 'Organize suas compras por categorias direto no Super App.' },
  { title: 'Parcelamento', text: 'Parcele compras à vista em até 8 vezes.' },
  { title: 'Antecipação', text: 'Antecipe o pagamento das parcelas no Super App.' },
  { title: 'Cartão virtual', text: 'Crie um cartão virtual para comprar online com mais segurança.' },
]

export const WALLETS = ['Apple Pay', 'Google Pay', 'Samsung Pay', 'Pagamentos no WhatsApp']

export const LOOP_FACTS = [
  'Cada ponto Loop vale 1 ponto no programa de fidelidade parceiro (ex.: Azul; Smiles para clientes Prime e Win).',
  'Com 50 pontos Loop você já pode trocar por a partir de R$ 1,00 guardado no Meu Porquinho.',
  'Com o aceite dos Termos e Condições, os pontos valem por 6 meses a partir do último acúmulo.',
  'Acesso ao VIP Lounge Inter em Guarulhos, Curitiba e Confins pode ser trocado por pontos.',
]
