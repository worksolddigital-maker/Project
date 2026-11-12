/**
 * Galeria de antes e depois.
 *
 * REGRAS (não negociáveis):
 *  - Somente imagens REAIS, de pacientes que AUTORIZARAM por escrito o uso
 *    da imagem no site (LGPD — dado pessoal sensível).
 *  - Nunca editar, retocar, recolorir ou "simular" resultados. As duas fotos
 *    devem ter enquadramento e luz semelhantes, sem filtros.
 *  - Informar o tratamento apenas quando confirmado pela profissional.
 *  - Verificar as regras de publicidade do conselho profissional da
 *    profissional quanto à divulgação de antes e depois.
 *
 * COMO ADICIONAR:
 *  1. Coloque as fotos em src/assets/images/resultados/
 *     (ex.: caso-01-antes.jpg e caso-01-depois.jpg).
 *  2. Importe-as abaixo e adicione um item ao array `results`.
 *
 * Exemplo:
 *   import caso01Antes from '../assets/images/resultados/caso-01-antes.jpg';
 *   import caso01Depois from '../assets/images/resultados/caso-01-depois.jpg';
 *   {
 *     id: 'caso-01',
 *     before: caso01Antes,
 *     after: caso01Depois,
 *     alt: 'Região frontal antes e depois',
 *     treatment: 'Toxina botulínica',   // somente se confirmado
 *     note: 'Registro de 15 dias após o procedimento', // opcional, se confirmado
 *     authorized: true,
 *   },
 *
 * Enquanto a lista estiver vazia, o site mostra um aviso elegante de
 * "galeria em curadoria" — nenhuma imagem é inventada.
 */
import type { ImageMetadata } from 'astro';

export interface ResultItem {
  id: string;
  before: ImageMetadata;
  after: ImageMetadata;
  /** Descrição neutra da região fotografada (acessibilidade). */
  alt: string;
  treatment?: string;
  note?: string;
  /** Confirmação explícita de autorização de uso de imagem. */
  authorized: true;
}

export const results: ResultItem[] = [];
