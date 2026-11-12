/**
 * Dados centrais do negócio.
 * Tudo o que aparece em vários lugares do site (contato, endereço, SEO)
 * vem daqui — altere apenas neste arquivo.
 */

const phoneDigits = '5554999869744';

export const site = {
  name: 'Letícia Orlandin',
  brand: 'Letícia Orlandin | Estética Avançada',
  tagline: 'Estética Avançada',
  slogan: 'Refinar, não transformar.',
  manifesto:
    'Não se trata de mudar quem você é. Trata-se de valorizar sua individualidade.',
  philosophy:
    'Cada pessoa possui características únicas. Por isso, cada tratamento deve respeitar sua individualidade.',

  city: 'Bento Gonçalves',
  state: 'RS',

  address: {
    street: 'Avenida Doutor Antônio Casagrande, 466',
    complement: 'Sala 501',
    district: 'Cidade Alta',
    city: 'Bento Gonçalves',
    state: 'RS',
    country: 'BR',
    // TODO: confirmar CEP antes de publicar (não informado no briefing).
    postalCode: '',
  },

  phone: {
    display: '(54) 99986-9744',
    e164: '+5554999869744',
    digits: phoneDigits,
  },

  instagram: {
    handle: '@leticiaorlandin.estetica',
    url: 'https://www.instagram.com/leticiaorlandin.estetica/',
  },

  /**
   * Horários de atendimento.
   * TODO: preencher após confirmação com a profissional.
   * Enquanto estiver vazio, o site exibe apenas um convite para consultar
   * a disponibilidade pelo WhatsApp (nenhum horário é inventado).
   * Exemplo: [{ days: 'Segunda a sexta', hours: '9h às 19h' }]
   */
  hours: [] as { days: string; hours: string }[],
} as const;

export const fullAddress = `${site.address.street}, ${site.address.complement} — ${site.address.district}, ${site.address.city}/${site.address.state}`;

const mapsQuery = encodeURIComponent(
  `${site.address.street}, ${site.address.district}, ${site.address.city} - ${site.address.state}`,
);

export const links = {
  maps: `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`,
  route: `https://www.google.com/maps/dir/?api=1&destination=${mapsQuery}`,
  mapEmbed: `https://www.google.com/maps?q=${mapsQuery}&z=16&output=embed`,
  tel: `tel:${site.phone.e164}`,
};

/** Link do WhatsApp com mensagem pré-preenchida. */
export function whatsapp(message?: string): string {
  const text =
    message ??
    'Olá, Letícia! Vim pelo site e gostaria de agendar uma avaliação.';
  return `https://wa.me/${phoneDigits}?text=${encodeURIComponent(text)}`;
}

export function whatsappFor(procedure: string): string {
  return whatsapp(
    `Olá, Letícia! Vim pelo site e gostaria de agendar uma avaliação para ${procedure}.`,
  );
}

export const nav = [
  { label: 'Sobre', href: '/#sobre' },
  { label: 'Procedimentos', href: '/#procedimentos' },
  { label: 'Método SER', href: '/#metodo-ser' },
  { label: 'Atendimento', href: '/#atendimento' },
  { label: 'Resultados', href: '/#resultados' },
  { label: 'Dúvidas', href: '/#duvidas' },
  { label: 'Contato', href: '/#contato' },
];

export const seo = {
  defaultTitle: 'Letícia Orlandin | Estética Avançada em Bento Gonçalves/RS',
  titleTemplate: '%s | Letícia Orlandin Estética Avançada',
  description:
    'Estética avançada em Bento Gonçalves/RS com planejamento, tecnologia e respeito à sua individualidade. Toxina botulínica, preenchimentos, mapeamento facial, Método SER, remoção de tatuagem e tratamentos capilares. Agende sua avaliação.',
  locale: 'pt_BR',
};
