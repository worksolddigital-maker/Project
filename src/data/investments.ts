import { OFFICIAL } from './sources'

export type RiskLevel = 'Baixo' | 'Baixo a moderado' | 'Moderado' | 'Variável' | 'Alto'

export interface InvestmentCategory {
  id: string
  title: string
  kicker: string
  summary: string
  concept: string
  minimum: string
  risk: RiskLevel
  riskScore: number // 1..5, apenas para visualização
  liquidity: string
  liquidityShort: string
  returns: string
  taxes: string
  guarantee: string
  highlights: string[]
  icon: 'layers' | 'bank' | 'leaf' | 'shield' | 'pie' | 'chart' | 'grid'
  source: string
}

export const INVESTMENTS: InvestmentCategory[] = [
  {
    id: 'renda-fixa',
    title: 'Renda fixa',
    kicker: 'A base da carteira',
    summary:
      'Aplicações cuja regra de remuneração é conhecida no momento do investimento: prefixada, pós-fixada ou híbrida.',
    concept:
      'Ao investir em renda fixa você empresta dinheiro a um banco, empresa ou ao governo e recebe juros por isso. No Inter há CDB, LCI, LCA, CRI, CRA, debêntures, Tesouro Direto, poupança e títulos de outros emissores, inclusive no mercado secundário.',
    minimum: 'Varia por produto (ex.: CDB a partir de R$ 1,00).',
    risk: 'Baixo a moderado',
    riskScore: 2,
    liquidityShort: 'Diária ou no vencimento',
    liquidity: 'Diária ou no vencimento, conforme o título escolhido.',
    returns:
      'Prefixada (taxa definida), pós-fixada (atrelada a um indexador como o CDI) ou híbrida (ex.: IPCA + taxa). Rentabilidade passada não garante resultados futuros.',
    taxes: 'Depende do produto: alguns seguem a tabela regressiva de IR, outros (LCI, LCA, CRI, CRA) são isentos para pessoa física.',
    guarantee: 'Títulos bancários elegíveis contam com o FGC; títulos privados como CRI, CRA e debêntures não.',
    highlights: ['CDB, LCI, LCA, CRI, CRA e debêntures', 'Tesouro Direto', 'Mercado secundário'],
    icon: 'layers',
    source: OFFICIAL.fixedIncome,
  },
  {
    id: 'cdb',
    title: 'CDB',
    kicker: 'Certificado de Depósito Bancário',
    summary: 'Título emitido por bancos, com investimento inicial a partir de R$ 1,00 no Inter.',
    concept:
      'Ao comprar um CDB você empresta dinheiro ao banco emissor, que devolve o valor corrigido na data combinada. Existe também o CDB Mais Limite, em que o valor aplicado vira limite no cartão de crédito Inter.',
    minimum: 'A partir de R$ 1,00.',
    risk: 'Baixo',
    riskScore: 1,
    liquidityShort: 'Diária ou no vencimento',
    liquidity: 'Diária ou no vencimento, conforme o título.',
    returns: 'Prefixada, pós-fixada (% do CDI) ou atrelada à inflação, de acordo com o título.',
    taxes:
      'IR regressivo sobre o rendimento: 22,5% (até 180 dias), 20% (181 a 360), 17,5% (361 a 720) e 15% (acima de 720 dias).',
    guarantee: 'Coberto pelo FGC dentro dos limites e regras do fundo.',
    highlights: ['A partir de R$ 1,00', 'IR regressivo', 'Garantia do FGC'],
    icon: 'bank',
    source: OFFICIAL.cdb,
  },
  {
    id: 'lci-lca',
    title: 'LCI e LCA',
    kicker: 'Letras de Crédito Imobiliário e do Agronegócio',
    summary: 'Títulos isentos de IR para pessoa física, lastreados em crédito imobiliário e no agronegócio.',
    concept:
      'A LCI financia operações de crédito imobiliário e a LCA, o agronegócio. Em troca, o investidor recebe uma remuneração sem desconto de Imposto de Renda.',
    minimum: 'LCI a partir de R$ 50,00 · LCA a partir de R$ 100,00.',
    risk: 'Baixo',
    riskScore: 1,
    liquidityShort: 'No vencimento (mín. 90 dias)',
    liquidity: 'No vencimento. Prazo mínimo de 90 dias.',
    returns: 'Prefixada, pós-fixada (% do CDI) ou atrelada a índices como IPCA e IGP-M, conforme o título.',
    taxes: 'Isentas de Imposto de Renda para pessoa física.',
    guarantee: 'Cobertas pelo FGC dentro dos limites e regras do fundo.',
    highlights: ['Isenção de IR', 'Prazo mínimo de 90 dias', 'Garantia do FGC'],
    icon: 'leaf',
    source: OFFICIAL.lci,
  },
  {
    id: 'tesouro-direto',
    title: 'Tesouro Direto',
    kicker: 'Títulos públicos federais',
    summary: 'Programa criado em 2002 que permite a pessoas físicas comprar títulos da dívida pública federal.',
    concept:
      'Ao investir no Tesouro Direto você empresta dinheiro ao Governo Federal. Há títulos como Tesouro Selic, Tesouro Prefixado, Tesouro IPCA+ e Tesouro RendA+, cada um com características, prazos e riscos próprios.',
    minimum: 'Definido pelas regras do Tesouro Direto (fração do preço de cada título).',
    risk: 'Baixo',
    riskScore: 1,
    liquidityShort: 'Diária',
    liquidity:
      'Liquidez diária: resgates solicitados até 13h em dia útil são pagos no mesmo dia; depois disso, no dia útil seguinte. A venda antes do vencimento ocorre a preço de mercado.',
    returns: 'Selic (pós-fixado), prefixado ou IPCA + taxa, conforme o título.',
    taxes:
      'IR regressivo sobre o rendimento. No Inter não há taxa de administração; incidem apenas as cobranças obrigatórias do programa.',
    guarantee: 'Garantido pelo Tesouro Nacional.',
    highlights: ['Garantia do Tesouro Nacional', 'Sem taxa de administração no Inter', 'Liquidez diária'],
    icon: 'shield',
    source: OFFICIAL.treasury,
  },
  {
    id: 'fundos',
    title: 'Fundos de investimento',
    kicker: 'Gestão profissional',
    summary: 'Fundos de diversas gestoras e perfis de risco, a partir de R$ 100,00.',
    concept:
      'Num fundo, vários investidores reúnem recursos que são geridos por profissionais conforme uma política definida em regulamento. Há fundos de renda fixa, multimercado, ações, cambiais e outros.',
    minimum: 'A partir de R$ 100,00 (pode variar por fundo).',
    risk: 'Variável',
    riskScore: 3,
    liquidityShort: 'Conforme o regulamento',
    liquidity: 'Definida no regulamento de cada fundo (prazo de cotização e liquidação).',
    returns:
      'Depende da estratégia do fundo. Clientes Prime e Win podem receber parte do rebate em pontos Loop, conforme regras vigentes.',
    taxes: 'Conforme a classe do fundo e a legislação vigente; consulte a lâmina de cada fundo.',
    guarantee: 'Fundos de investimento não contam com garantia do FGC.',
    highlights: ['A partir de R$ 100,00', 'Diversas gestoras', 'Cashback em pontos Loop para Prime e Win'],
    icon: 'pie',
    source: OFFICIAL.funds,
  },
  {
    id: 'renda-variavel',
    title: 'Renda variável',
    kicker: 'Bolsa de valores',
    summary: 'Ações, fundos imobiliários, ETFs e BDRs com corretagem zero pela Inter DTVM.',
    concept:
      'Na renda variável não é possível saber de antemão o rendimento. O Inter oferece Home Broker e HB Pro no app, além de plataformas como Tryd Trader e Profit, para operações no mercado à vista, mini-índice e mini-dólar.',
    minimum: 'O preço de uma unidade do ativo (ou fração, quando disponível).',
    risk: 'Alto',
    riskScore: 5,
    liquidityShort: 'Negociação em pregão',
    liquidity: 'Negociação em pregão; a liquidação segue as regras da B3.',
    returns: 'Variável — pode haver ganhos ou perdas, inclusive do capital investido.',
    taxes: 'IR sobre ganhos de capital conforme a legislação vigente.',
    guarantee: 'Sem garantia do FGC.',
    highlights: ['Corretagem zero', 'Home Broker e HB Pro', 'Mini-índice e mini-dólar'],
    icon: 'chart',
    source: OFFICIAL.equities,
  },
  {
    id: 'outros',
    title: 'Outros produtos',
    kicker: 'Para cada objetivo',
    summary: 'Previdência, Poupança, COE, criptomoedas e o Meu Porquinho para organizar objetivos.',
    concept:
      'Previdência privada (PGBL ou VGBL) para o longo prazo; Poupança para reservas simples; COE, que combina renda fixa e variável; Inter Cripto para criptoativos; e o Meu Porquinho para guardar dinheiro por objetivos a partir de R$ 1,00.',
    minimum: 'Varia por produto (Meu Porquinho a partir de R$ 1,00).',
    risk: 'Variável',
    riskScore: 3,
    liquidityShort: 'Varia por produto',
    liquidity: 'Varia por produto — de diária (Poupança) a prazos definidos (COE, Previdência).',
    returns: 'Cada produto tem regras próprias; criptoativos têm alta volatilidade.',
    taxes: 'PGBL permite deduzir até 12% da renda bruta na declaração completa do IR; demais conforme legislação.',
    guarantee: 'Poupança conta com o FGC; previdência, COE e criptoativos têm regras e riscos próprios.',
    highlights: ['Previdência PGBL/VGBL', 'COE', 'Inter Cripto', 'Meu Porquinho'],
    icon: 'grid',
    source: OFFICIAL.investments,
  },
]

export const RISK_NOTES = [
  'Rentabilidade passada não é garantia de rentabilidade futura.',
  'Investimentos não contam com garantia do FGC, salvo os produtos expressamente cobertos e dentro dos limites do fundo.',
  'Antes de investir, faça seu teste de perfil de investidor (suitability) no Super App.',
]
