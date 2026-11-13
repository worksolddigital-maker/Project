import { OFFICIAL } from './sources'

export interface Milestone {
  year: string
  title: string
  text: string
  clients?: string
}

/** Linha do tempo baseada na página “Our Story” do site de RI do Inter&Co. */
export const TIMELINE: Milestone[] = [
  {
    year: '1994',
    title: 'O começo em Belo Horizonte',
    text: 'A trajetória começa em Belo Horizonte (MG) como Intermedium Financeira.',
  },
  { year: '1999', title: 'Crédito para empresas', text: 'Passa a oferecer crédito empresarial.' },
  { year: '2001', title: 'Consignado', text: 'Inclui o crédito consignado no portfólio.' },
  { year: '2007', title: 'Crédito imobiliário', text: 'Começa a atuar com financiamento imobiliário.' },
  {
    year: '2008',
    title: 'Banco múltiplo',
    text: 'Recebe do Banco Central a autorização para operar como banco múltiplo.',
  },
  { year: '2012', title: 'Inter Seguros', text: 'Cria a Inter Seguros, sua corretora de seguros.' },
  {
    year: '2013',
    title: 'Inter DTVM',
    text: 'Cria a Inter DTVM, autorizada pelo Banco Central e credenciada pela CVM.',
  },
  {
    year: '2015',
    title: 'Conta 100% digital',
    text: 'Lança a primeira conta corrente 100% digital e gratuita do Brasil.',
  },
  {
    year: '2016',
    title: 'Cartões e app',
    text: 'Chega a 80 mil clientes digitais e lança câmbio, cartões Mastercard e o aplicativo.',
    clients: '80 mil',
  },
  {
    year: '2017',
    title: 'Nasce o Banco Inter',
    text: 'A marca Intermedium dá lugar a Banco Inter, com mais de 370 mil clientes digitais.',
    clients: '370 mil+',
  },
  {
    year: '2018',
    title: 'IPO e nuvem',
    text: 'Primeiro banco digital a abrir capital na B3 e primeiro banco da América Latina a operar 100% na nuvem AWS.',
  },
  {
    year: '2019',
    title: 'Super App e Inter Shop',
    text: 'Follow-on de R$ 1,2 bilhão financia a expansão do Super App e o lançamento do Inter Shop. Mais de 4 milhões de correntistas.',
    clients: '4 mi+',
  },
  {
    year: '2020',
    title: 'Novas verticais',
    text: 'Lança Inter Asset, Wealth Management e Inter Viagens, e realiza o primeiro Inter Day.',
    clients: '8,5 mi',
  },
  {
    year: '2021',
    title: 'Aquisições',
    text: 'Passa de 16 milhões de clientes e adquire participações em Meu Acerto, Granito (futuro Inter Pag) e Usend.',
    clients: '16 mi',
  },
  {
    year: '2022',
    title: 'Nasdaq e Global Account',
    text: 'Migra a base acionária para a Nasdaq (INTR) e lança a Global Account.',
    clients: '24 mi',
  },
  {
    year: '2023',
    title: 'Expansão global',
    text: 'Adquire a YellowFi e obtém licença FINRA para a Inter Securities. 1,5 milhão de contas globais.',
    clients: '26 mi',
  },
  {
    year: '2024',
    title: 'Escala',
    text: 'Mais de R$ 1,2 trilhão em volume entre crédito, débito e Pix; lança o Consignado 100% digital, o Forum e o cartão de crédito em dólar.',
    clients: '36 mi',
  },
  {
    year: '2025',
    title: 'Novos produtos',
    text: 'Supera 43 milhões de clientes e lança Meu Crédito, Meu Porquinho por objetivos e o Consignado Privado.',
    clients: '43 mi+',
  },
]

export const ECOSYSTEM = [
  { title: 'Banking', text: 'Conta digital gratuita, Pix, cartões e cheque especial.' },
  { title: 'Crédito', text: 'Consignado, Home Equity, financiamento imobiliário, FGTS e crédito com garantia.' },
  { title: 'Investimentos', text: 'Renda fixa, Tesouro, fundos, bolsa, previdência e cripto.' },
  { title: 'Seguros', text: 'Seguros e planos de saúde, odontológico e pet pela Inter Seguros.' },
  { title: 'Shopping', text: 'Marketplace com cashback em centenas de lojas parceiras.' },
  { title: 'Global', text: 'Global Account em dólar, cartão em dólar e investimentos nos EUA.' },
]

export const PILLARS = [
  {
    title: 'Tecnologia',
    text: 'Em 2018, o Inter se tornou o primeiro banco da América Latina a operar 100% na nuvem AWS.',
  },
  {
    title: 'Inovação',
    text: 'Pioneiro da conta corrente 100% digital e gratuita no Brasil, lançada em 2015.',
  },
  {
    title: 'Experiência digital',
    text: 'Um Super App que reúne banco, crédito, investimentos, seguros, shopping e conta global.',
  },
]

export const ABOUT_SOURCE = OFFICIAL.story
