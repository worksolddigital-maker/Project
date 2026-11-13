import { OFFICIAL } from './sources'

export interface LoanModality {
  id: string
  name: string
  short: string
  summary: string
  who: string[]
  conditions: string[]
  rates: string[]
  terms: string
  howTo: string[]
  source: string
}

export const LOANS: LoanModality[] = [
  {
    id: 'consignado-inss',
    name: 'Consignado INSS',
    short: 'INSS',
    summary:
      'Empréstimo para aposentados e pensionistas do INSS com parcelas descontadas diretamente do benefício.',
    who: ['Aposentados e pensionistas do INSS.', 'Não é preciso ter conta no Inter para contratar.'],
    conditions: [
      'Contratação 100% digital ou com apoio de especialistas.',
      'Parcelas descontadas diretamente no benefício do INSS, respeitando a margem consignável.',
      'Portabilidade disponível: traga seu consignado de outra instituição para reduzir parcelas ou receber troco.',
    ],
    rates: [
      'A taxa varia de acordo com o convênio e é apresentada na simulação oficial.',
      'Os valores podem variar de acordo com o convênio (aviso do simulador oficial).',
    ],
    terms: 'O simulador oficial oferece prazos de 24 a 84 parcelas.',
    howTo: [
      'Faça a simulação no app ou no site.',
      'Preencha seus dados pessoais.',
      'Analise a oferta e entenda a melhor condição.',
      'Aguarde a aprovação dos dados.',
      'Revise os termos da contratação.',
      'Receba o dinheiro na conta.',
    ],
    source: OFFICIAL.loansInss,
  },
  {
    id: 'consignado-publico',
    name: 'Consignado Público',
    short: 'Servidores',
    summary:
      'Crédito com desconto em folha para servidores públicos federais, estaduais e municipais, Forças Armadas e outros convênios.',
    who: [
      'Servidores federais (SIAPE), estaduais e municipais de convênios atendidos.',
      'Forças Armadas (Marinha, Aeronáutica e Exército), tribunais e ministérios públicos conveniados.',
      'Aposentados e pensionistas do INSS.',
    ],
    conditions: [
      'Valor mínimo de contratação: R$ 1.600,00.',
      'Parcelas descontadas do salário ou benefício, respeitando a margem consignável de cada convênio.',
      'Portabilidade e refinanciamento disponíveis.',
    ],
    rates: ['A taxa de juros varia de acordo com o valor solicitado e o convênio.'],
    terms:
      'O simulador oficial oferece de 24 a 120 parcelas; o prazo máximo depende do convênio.',
    howTo: [
      'Simule pelo site ou app do Inter.',
      'Envie seus documentos e aguarde a análise.',
      'Conclua a contratação de forma digital ou com um consultor.',
    ],
    source: OFFICIAL.loansPublic,
  },
  {
    id: 'credito-trabalhador',
    name: 'Crédito do Trabalhador',
    short: 'CLT',
    summary:
      'Consignado privado para trabalhadores com carteira assinada, com parcelas descontadas da folha de pagamento.',
    who: [
      'Trabalhadores com carteira assinada: empresas privadas, rurais, domésticos e MEIs com vínculo empregatício.',
      'Não disponível em licença médica, licença maternidade/paternidade, período de experiência ou aviso prévio.',
    ],
    conditions: [
      'Margem consignável máxima de 35% da renda líquida.',
      'Possibilidade de usar até 10% do saldo do FGTS e 100% da multa rescisória como garantia.',
      'Contratação pelo Super App, WhatsApp do Inter ou Carteira de Trabalho Digital.',
      'Não é necessário ter conta no Inter.',
    ],
    rates: [
      'Taxas personalizadas conforme o perfil e o valor das parcelas — consulte na simulação oficial.',
    ],
    terms: 'Prazos entre 12 e 60 meses, sujeitos à análise.',
    howTo: [
      'No app, acesse “Empréstimos” › “Consignado Privado”.',
      'Simule, envie os documentos solicitados e assine digitalmente.',
      'Acompanhe as notificações sobre o andamento da contratação.',
    ],
    source: OFFICIAL.loansPrivate,
  },
  {
    id: 'home-equity',
    name: 'Home Equity',
    short: 'Garantia de imóvel',
    summary:
      'Empréstimo com garantia de imóvel (alienação fiduciária) para valores mais altos e prazos longos.',
    who: [
      'Proprietários de imóvel regularizado.',
      'A parcela pode comprometer até 30% da renda familiar bruta.',
    ],
    conditions: [
      'A partir de R$ 50 mil, limitado a 60% do valor do imóvel.',
      'Custos: avaliação do imóvel e taxa cartorial de registro.',
      'Processo: simulação, análise de crédito, avaliação do imóvel, emissão do contrato, registro eletrônico e liberação.',
    ],
    rates: [
      'Pós-fixada: a partir de 1,19% a.m. + IPCA, em até 240 meses.',
      'Pré-fixada: a partir de 1,5% a.m., em até 120 meses.',
    ],
    terms: 'Até 240 meses (pós-fixado) ou até 120 meses (pré-fixado).',
    howTo: [
      'Simule online informando o valor desejado.',
      'Passe pela análise de crédito e avaliação do imóvel.',
      'Assine o contrato, faça o registro eletrônico e receba o valor.',
    ],
    source: OFFICIAL.homeEquity,
  },
  {
    id: 'fgts',
    name: 'Antecipação do Saque-Aniversário FGTS',
    short: 'FGTS',
    summary:
      'Antecipe parcelas do Saque-Aniversário do FGTS e receba em parcela única, sem prestações mensais.',
    who: [
      'Maiores de 18 anos que optaram pelo Saque-Aniversário.',
      'Ter saldo de FGTS em conta ativa ou inativa e autorizar o Inter a consultá-lo.',
      'Ser correntista do Inter. Negativados também podem solicitar.',
    ],
    conditions: [
      'Antecipação a partir de R$ 100,00, sem valor máximo definido.',
      'Antecipação de até 5 parcelas do Saque-Aniversário.',
      'Desconto feito diretamente no saldo do FGTS — sem prestações mensais.',
      'Cancelamento possível em até 7 dias corridos após a contratação.',
      'O governo definiu mudanças nas regras da antecipação — confira as condições vigentes antes de contratar.',
    ],
    rates: ['Taxa a partir de 1,39% a.m., aplicada sobre o valor total antecipado.'],
    terms: 'Pagamento em dias úteis em até 30 minutos após a assinatura do contrato, sem restrições.',
    howTo: [
      'No app do FGTS, adira ao Saque-Aniversário.',
      'Autorize o Inter em “Autorizar bancos a consultar seu FGTS”.',
      'Simule e contrate a antecipação no Super App do Inter.',
    ],
    source: OFFICIAL.fgts,
  },
  {
    id: 'investidores',
    name: 'Crédito para Investidores',
    short: 'Investimentos como garantia',
    summary:
      'Use seus investimentos de renda fixa do Inter como garantia e tenha crédito sem resgatar o dinheiro.',
    who: [
      'Pessoas físicas maiores de 18 anos.',
      'Investimentos há mais de 3 meses e ativos elegíveis em carteira.',
    ],
    conditions: [
      'Garantias elegíveis: CDB, LCI, LCA, LF e LIG de emissão do Inter, com vencimento a partir de 60 dias.',
      'O investimento em garantia continua rendendo.',
      'Dinheiro disponível em até 2 dias úteis; pagamento no vencimento.',
    ],
    rates: ['Além dos juros, incidem IOF e taxa de análise de crédito, exibidos na tela de contratação.'],
    terms: 'Quitação antecipada a qualquer momento, pagando juros proporcionais.',
    howTo: [
      'No Super App, acesse Investimentos › Outros › Crédito para Investidores.',
      'Verifique a elegibilidade e escolha o valor.',
      'Confirme a contratação — o recurso cai na conta em até 2 dias úteis.',
    ],
    source: OFFICIAL.investorCredit,
  },
  {
    id: 'cheque-especial',
    name: 'Cheque Especial',
    short: 'Emergências',
    summary: 'Limite extra na conta digital para emergências e uso de curto prazo.',
    who: ['Correntistas com limite aprovado após análise de crédito mensal.'],
    conditions: [
      'Ativação pelo Super App em “Ver Extrato” › “Ativar Cheque Especial”.',
      'Recomenda-se quitar o valor utilizado em até 30 dias.',
    ],
    rates: [
      'Juros de 7,99% ao mês.',
      'IOF de 0,0082% ao dia sobre a variação do saldo devedor + 0,38% sobre o valor total do período.',
    ],
    terms: 'Uso emergencial e de curto prazo.',
    howTo: ['Consulte o limite pré-aprovado no extrato do Super App e aceite a ativação.'],
    source: OFFICIAL.overdraft,
  },
]

/* ── Simulador ilustrativo ─────────────────────────────────────── */

export type RateKind = 'official-from' | 'hypothetical'

export interface SimulatorPreset {
  id: string
  label: string
  minAmount: number
  maxAmount: number
  step: number
  defaultAmount: number
  terms: number[]
  defaultTerm: number
  rateKind: RateKind
  rate: number
  rateMin: number
  rateMax: number
  rateNote: string
}

export const SIMULATOR_PRESETS: SimulatorPreset[] = [
  {
    id: 'home-equity-pre',
    label: 'Home Equity · pré-fixado',
    minAmount: 50_000,
    maxAmount: 2_000_000,
    step: 5_000,
    defaultAmount: 200_000,
    terms: [24, 36, 48, 60, 72, 84, 96, 108, 120],
    defaultTerm: 120,
    rateKind: 'official-from',
    rate: 1.5,
    rateMin: 1.5,
    rateMax: 3,
    rateNote:
      'Taxa inicial igual à mínima divulgada pelo Inter (“a partir de 1,5% a.m.”). A taxa real depende da análise.',
  },
  {
    id: 'consignado',
    label: 'Consignado (INSS, público ou CLT)',
    minAmount: 1_600,
    maxAmount: 150_000,
    step: 100,
    defaultAmount: 10_000,
    terms: [12, 24, 36, 48, 60, 72, 84, 96, 120],
    defaultTerm: 48,
    rateKind: 'hypothetical',
    rate: 1.8,
    rateMin: 0.8,
    rateMax: 4,
    rateNote:
      'O Inter não divulga uma taxa única para o consignado: ela é personalizada. Ajuste a taxa hipotética para explorar cenários.',
  },
  {
    id: 'livre',
    label: 'Cenário livre (taxa hipotética)',
    minAmount: 1_000,
    maxAmount: 500_000,
    step: 500,
    defaultAmount: 25_000,
    terms: [6, 12, 18, 24, 36, 48, 60],
    defaultTerm: 24,
    rateKind: 'hypothetical',
    rate: 2.5,
    rateMin: 0.5,
    rateMax: 8,
    rateNote: 'Taxa definida por você apenas para fins educativos — não representa oferta do Inter.',
  },
]

export const LOAN_FAQ = [
  {
    q: 'Os valores do simulador são uma proposta do Inter?',
    a: 'Não. O simulador desta página é ilustrativo e usa a Tabela Price com a taxa exibida. Não inclui IOF, tarifas, seguros, correção por IPCA nem o Custo Efetivo Total (CET). A condição real depende da análise de crédito e da oferta apresentada pelo Inter no momento da contratação.',
  },
  {
    q: 'O que é margem consignável?',
    a: 'É a porcentagem do salário ou benefício que pode ser usada para pagar as parcelas do consignado. Ela é definida pelo regulamento de cada convênio — no Crédito do Trabalhador (CLT), o limite é de 35% da renda líquida.',
  },
  {
    q: 'Preciso ter conta no Inter para contratar?',
    a: 'Para o Consignado INSS e o Crédito do Trabalhador, não é necessário ter conta. Já a Antecipação do Saque-Aniversário FGTS exige ser correntista.',
  },
  {
    q: 'Quais documentos são pedidos?',
    a: 'No Crédito do Trabalhador, o Inter cita CPF, RG, comprovante de residência, comprovante de renda e conta bancária para receber o valor — na contratação pelo Super App ou site pode ser solicitado apenas o documento de identificação.',
  },
  {
    q: 'O que é alienação fiduciária no Home Equity?',
    a: 'É a transferência do imóvel dado em garantia para o nome do credor até a quitação da dívida. É esse mecanismo que permite ao empréstimo com garantia ter taxas menores.',
  },
  {
    q: 'Posso quitar antes do prazo?',
    a: 'Sim. No Crédito do Trabalhador é possível antecipar parcelas, amortizar ou liquidar o contrato. No Crédito para Investidores, a quitação antecipada paga apenas os juros proporcionais ao tempo decorrido.',
  },
]
