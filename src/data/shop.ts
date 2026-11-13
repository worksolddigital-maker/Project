import { CONSULTED_AT, OFFICIAL } from './sources'

export const SHOP_INTRO = {
  what: 'O Shopping do Inter (Inter Shop) é o marketplace do Super App: você compra em centenas de lojas — direto pelo app ou em sites parceiros — e recebe parte do valor de volta como cashback na conta.',
  since: 'Lançado em 2019, segundo a linha do tempo de Relações com Investidores do Inter.',
  partners:
    'Mais de 400 lojas parceiras, incluindo grandes e-commerces como Amazon, Magalu, Ponto, Carrefour, Netshoes e Nike (segundo o próprio Shopping do Inter).',
}

export const SHOP_STEPS = [
  {
    title: 'Compre pelo app',
    text: 'No Super App, toque em “Shopping” na tela inicial, busque o produto e finalize a compra dentro do app.',
  },
  {
    title: 'Ou vá ao site parceiro',
    text: 'Escolha a loja, toque em “Comprar agora”, preencha seus dados e “Ir para a loja”. A compra é concluída no site do parceiro aberto pelo redirecionamento do Inter.',
  },
  {
    title: 'Receba o cashback',
    text: 'O cashback é calculado sobre o valor líquido do produto e cai direto na sua conta.',
  },
]

export const CASHBACK_RULES = [
  { label: 'Compra direto no app/web com cartão Inter, Pix ou débito', value: 'Em até 1 dia útil' },
  { label: 'Compra direto no app/web com outros cartões', value: '30 dias após a compra' },
  { label: 'Sites parceiros · correntistas', value: 'Em até 30 dias (excepcionalmente até 120)' },
  { label: 'Sites parceiros · não correntistas', value: 'De 45 a 120 dias' },
]

export const CASHBACK_EXAMPLE = {
  price: 1000,
  percent: 12,
  text: 'Se o produto custa R$ 1.000 e tem 12% de cashback, você recebe R$ 120 de volta — na prática, o produto sai por R$ 880. Frete e juros não entram no cálculo.',
}

export const SHOP_BENEFITS = [
  { title: 'Cashback na conta', text: 'Dinheiro de volta direto na conta para usar como quiser.' },
  { title: 'Pontos Loop', text: 'Compras no Shop também podem render pontos Loop — e dá para pagar compras com pontos.' },
  { title: 'Gift Cards', text: 'Gift cards e Shell Box com cashback extra via Loop.' },
  { title: 'Não correntistas', text: 'Quem não tem conta também pode comprar e receber cashback em outra conta bancária.' },
]

export const SHOP_TIPS = [
  'Não use cupons ou promoções que não sejam oferecidos pelo Shopping do Inter.',
  'Conclua o pagamento dentro do prazo da loja e não altere a forma de pagamento.',
  'Não cancele nem troque itens do pedido.',
  'Faça a compra do início ao fim no site parceiro aberto pelo redirecionamento do Inter.',
  'Os percentuais de cashback podem variar sem aviso prévio e não são fixos.',
]

export type ProductArt =
  | 'phone'
  | 'laptop'
  | 'tv'
  | 'console'
  | 'appliance'
  | 'perfume'
  | 'sneaker'
  | 'sofa'
  | 'gift'

export interface ShopCategory {
  id: string
  name: string
  description: string
  art: ProductArt
  /** Preço só é exibido quando confirmado; aqui as vitrines são dinâmicas. */
  price: null
  cashback: string
  url: string
}

/** Departamentos exibidos em shopping.inter.co. Preço e cashback são dinâmicos. */
export const SHOP_CATEGORIES: ShopCategory[] = [
  {
    id: 'iphones',
    name: 'iPhones',
    description: 'Modelos da Apple vendidos por lojas parceiras e direto no app.',
    art: 'phone',
    price: null,
    cashback: 'Varia por loja e campanha',
    url: OFFICIAL.shop,
  },
  {
    id: 'notebooks',
    name: 'Notebooks',
    description: 'Para estudo, trabalho e criação — de diversas marcas e lojas.',
    art: 'laptop',
    price: null,
    cashback: 'Varia por loja e campanha',
    url: OFFICIAL.shop,
  },
  {
    id: 'smart-tvs',
    name: 'Smart TVs',
    description: 'TVs conectadas em vários tamanhos e tecnologias de tela.',
    art: 'tv',
    price: null,
    cashback: 'Varia por loja e campanha',
    url: OFFICIAL.shop,
  },
  {
    id: 'consoles',
    name: 'Consoles e jogos',
    description: 'Videogames, acessórios e jogos das principais plataformas.',
    art: 'console',
    price: null,
    cashback: 'Varia por loja e campanha',
    url: OFFICIAL.shop,
  },
  {
    id: 'eletrodomesticos',
    name: 'Eletrodomésticos',
    description: 'Geladeiras, lavadoras, fogões e muito mais para a casa.',
    art: 'appliance',
    price: null,
    cashback: 'Varia por loja e campanha',
    url: OFFICIAL.shop,
  },
  {
    id: 'beleza',
    name: 'Beleza e Perfumaria',
    description: 'Perfumes, cosméticos e cuidados pessoais de marcas parceiras.',
    art: 'perfume',
    price: null,
    cashback: 'Varia por loja e campanha',
    url: OFFICIAL.shop,
  },
  {
    id: 'moda',
    name: 'Esporte e Moda',
    description: 'Tênis, roupas e acessórios esportivos de lojas parceiras.',
    art: 'sneaker',
    price: null,
    cashback: 'Varia por loja e campanha',
    url: OFFICIAL.shop,
  },
  {
    id: 'moveis',
    name: 'Móveis e Decoração',
    description: 'Do sofá à luminária: itens para renovar os ambientes.',
    art: 'sofa',
    price: null,
    cashback: 'Varia por loja e campanha',
    url: OFFICIAL.shop,
  },
  {
    id: 'gift-cards',
    name: 'Gift Cards',
    description: 'Cartões-presente de apps, jogos e serviços, com entrega digital.',
    art: 'gift',
    price: null,
    cashback: 'Varia por produto',
    url: OFFICIAL.shop,
  },
]

/**
 * Exemplos de percentuais "até X% de cashback" exibidos nas ofertas relâmpago de
 * shopping.inter.co na data de consulta. São apenas um retrato daquele momento.
 */
export const CASHBACK_SNAPSHOT = {
  date: CONSULTED_AT,
  items: [
    { store: 'Época Cosméticos', value: 'Até 30%' },
    { store: 'Natura', value: 'Até 20%' },
    { store: 'Netshoes', value: 'Até 6%' },
  ],
}

export const SHOP_DEPARTMENTS = [
  'Ar e Ventilação',
  'Áudio',
  'Automotivo',
  'Bebês e Infantil',
  'Beleza e Perfumaria',
  'Casa e Construção',
  'Computadores e Informática',
  'Eletrodomésticos',
  'Eletroportáteis',
  'Esporte e Lazer',
  'Farmácia e Saúde',
  'Games e Consoles',
  'Livros e Revistas',
  'Mercado e Alimentos',
  'Moda e Acessórios',
  'Móveis e Decoração',
  'Pet Shop',
  'Smartphones',
  'Smart TVs',
  'Viagem',
]
