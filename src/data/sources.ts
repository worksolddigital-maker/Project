/**
 * Fontes oficiais consultadas para o conteúdo do site.
 * Todas as informações de produto foram extraídas destas páginas na data indicada
 * e podem mudar a qualquer momento — o site sempre orienta a conferir as condições
 * vigentes no Super App ou no site oficial.
 */
export const CONSULTED_AT = '13/11/2026'

export const OFFICIAL = {
  home: 'https://inter.co/',
  account: 'https://inter.co/pra-voce/conta-digital/pessoa-fisica/',
  cards: 'https://inter.co/pra-voce/cartoes/',
  loop: 'https://inter.co/pra-voce/cartoes/programa-de-pontos/',
  wallets: 'https://inter.co/pra-voce/cartoes/carteiras-digitais/',
  shop: 'https://shopping.inter.co/',
  investments: 'https://inter.co/pra-voce/investimentos/',
  fixedIncome: 'https://inter.co/pra-voce/investimentos/renda-fixa/',
  cdb: 'https://inter.co/pra-voce/investimentos/renda-fixa/cdb/',
  lci: 'https://inter.co/pra-voce/investimentos/renda-fixa/lci-di/',
  lca: 'https://inter.co/pra-voce/investimentos/renda-fixa/lca/',
  treasury: 'https://inter.co/pra-voce/investimentos/renda-fixa/tesouro-direto/',
  funds: 'https://inter.co/pra-voce/investimentos/fundos-de-investimento/',
  equities: 'https://inter.co/pra-voce/investimentos/renda-variavel/',
  pension: 'https://inter.co/pra-voce/investimentos/previdencia-privada/',
  savings: 'https://inter.co/pra-voce/investimentos/poupanca/',
  coe: 'https://inter.co/pra-voce/investimentos/coe/',
  crypto: 'https://inter.co/pra-voce/investimentos/criptomoedas/',
  piggy: 'https://inter.co/pra-voce/investimentos/meu-porquinho/',
  loansInss: 'https://inter.co/pra-voce/emprestimos/emprestimo-consignado-inss/',
  loansPublic: 'https://inter.co/pra-voce/emprestimos/emprestimo-consignado-publico/',
  loansPrivate: 'https://inter.co/pra-voce/emprestimos/emprestimo-consignado-privado/',
  homeEquity: 'https://inter.co/pra-voce/emprestimos/home-equity/',
  fgts: 'https://inter.co/pra-voce/emprestimos/antecipacao-fgts/',
  investorCredit: 'https://inter.co/pra-voce/emprestimos/credito-para-investidores/',
  overdraft: 'https://inter.co/pra-voce/emprestimos/cheque-especial/',
  story: 'https://investors.inter.co/en/inter-co/our-story/',
  ri: 'https://investors.inter.co/',
} as const

export const SOURCE_LIST: { label: string; url: string }[] = [
  { label: 'Cartões Inter', url: OFFICIAL.cards },
  { label: 'Inter Loop — programa de pontos', url: OFFICIAL.loop },
  { label: 'Shopping do Inter', url: OFFICIAL.shop },
  { label: 'Investimentos', url: OFFICIAL.investments },
  { label: 'Consignado INSS', url: OFFICIAL.loansInss },
  { label: 'Consignado público', url: OFFICIAL.loansPublic },
  { label: 'Crédito do Trabalhador', url: OFFICIAL.loansPrivate },
  { label: 'Home Equity', url: OFFICIAL.homeEquity },
  { label: 'Antecipação FGTS', url: OFFICIAL.fgts },
  { label: 'Crédito para Investidores', url: OFFICIAL.investorCredit },
  { label: 'Cheque Especial', url: OFFICIAL.overdraft },
  { label: 'Relações com Investidores — Our Story', url: OFFICIAL.story },
]
