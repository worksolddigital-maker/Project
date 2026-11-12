#!/usr/bin/env node
/**
 * Coloca uma foto em uma posição ("slot") do site, já otimizada.
 *
 * Uso:
 *   npm run media:slot -- <slot> <arquivo> [--grade]
 *
 * Exemplos:
 *   npm run media:slot -- hero media-raw/minha-foto.jpg
 *   npm run media:slot -- sobre-retrato src/assets/images/instagram/ig-20260301-01.jpg
 *
 * --grade aplica o tratamento de cor sutil da identidade (dessatura levemente
 * e aproxima as sombras do verde-petróleo). NUNCA use em antes e depois.
 */
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import sharp from 'sharp';

const SLOTS = {
  hero: 'Foto principal da página inicial (vertical, 4:5)',
  'sobre-retrato': 'Retrato da profissional na seção Sobre (vertical, 4:5)',
  'sobre-ambiente': 'Imagem de ambientação da seção Sobre (usada sem retrato)',
  serenidade: 'Detalhe sobreposto na seção Sobre',
  toque: 'Imagem pequena do manifesto (esquerda)',
  'detalhe-folhas': 'Imagem pequena do manifesto (direita) e do contato',
  'toxina-botulinica': 'Card e página de Toxina botulínica',
  preenchimentos: 'Card e página de Preenchimentos',
  'mapeamento-facial': 'Card e página de Avaliação e mapeamento facial',
  'protocolos-faciais': 'Card e página de Protocolos faciais',
  'metodo-ser': 'Imagem do Método SER (recebe máscara orgânica)',
  'remocao-de-tatuagem': 'Card e página de Remoção de tatuagem',
  'tratamentos-capilares': 'Card e página de Tratamentos capilares',
};

const [slot, file] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const grade = process.argv.includes('--grade');

if (!slot || !file || !SLOTS[slot]) {
  console.log('Uso: npm run media:slot -- <slot> <arquivo> [--grade]\n\nSlots disponíveis:');
  for (const [name, desc] of Object.entries(SLOTS)) console.log(`  ${name.padEnd(24)} ${desc}`);
  process.exit(slot ? 1 : 0);
}
const src = resolve(file);
if (!existsSync(src)) {
  console.error('Arquivo não encontrado:', src);
  process.exit(1);
}

const dir = resolve(import.meta.dirname, '../src/assets/images/site');
const out = join(dir, `${slot}.jpg`);

let img = sharp(src).rotate().resize({ width: 2600, height: 2600, fit: 'inside', withoutEnlargement: true });
if (grade) {
  // Aproximação do tratamento usado nas fotos provisórias.
  img = img.modulate({ saturation: 0.9 }).linear(0.96, 7).recomb([
    [0.985, 0.01, 0.005],
    [0.005, 0.99, 0.005],
    [0.005, 0.012, 0.983],
  ]);
}
await img.jpeg({ quality: 90, mozjpeg: true }).toFile(out);

const others = readdirSync(dir).filter((f) => f.startsWith(`${slot}.`) && f !== `${slot}.jpg`);
if (others.length) console.warn('⚠ Existem outros arquivos para este slot:', others.join(', '));
console.log(`✓ ${slot} atualizado → src/assets/images/site/${slot}.jpg`);
console.log('  Rode "npm run build" para gerar as versões responsivas.');
if (slot === 'sobre-retrato') console.log('  O retrato substitui automaticamente a imagem de ambientação da seção Sobre.');
