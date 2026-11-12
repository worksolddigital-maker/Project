/**
 * Depoimentos de pacientes.
 *
 * Use SOMENTE relatos reais e autorizados. Não invente nomes nem avaliações.
 * Se a paciente preferir, use apenas as iniciais (ex.: "M. S.").
 *
 * Exemplo:
 *   {
 *     name: 'M. S.',
 *     text: 'Texto do depoimento, exatamente como enviado pela paciente.',
 *     treatment: 'Toxina botulínica',   // opcional
 *     source: 'Google',                 // de onde veio o relato (opcional)
 *     authorized: true,
 *   },
 *
 * Enquanto a lista estiver vazia, a seção convida pacientes a compartilharem
 * sua experiência pelo WhatsApp — uma forma honesta de reunir relatos reais.
 */
export interface Testimonial {
  name: string;
  text: string;
  treatment?: string;
  source?: 'Google' | 'Instagram' | 'WhatsApp' | 'Pessoalmente';
  authorized: true;
}

export const testimonials: Testimonial[] = [];
