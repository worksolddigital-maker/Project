# Letícia Orlandin | Estética Avançada

Site institucional da Letícia Orlandin Estética Avançada — Bento Gonçalves/RS.

> **Refinar, não transformar.**

## Tecnologia

| Camada | Uso |
| --- | --- |
| [Astro 7](https://astro.build) | Site estático, imagens responsivas (AVIF/WebP), SEO |
| GSAP + ScrollTrigger + SplitText | Abertura cinematográfica, revelações tipográficas, parallax, jornada horizontal, transições de página |
| DrawSVG + MorphSVG (GSAP) | Traçado do mapeamento facial e máscara orgânica do Método SER |
| Lenis | Rolagem suave sincronizada ao ScrollTrigger |
| React + Motion | Ilhas interativas: FAQ, galeria de antes e depois, depoimentos, formulário de pré-agendamento |

Regras de movimento: GSAP e Motion nunca controlam o mesmo elemento; com
**movimento reduzido** ativado no sistema, Lenis, parallax, fixações e
abertura são desligados e todo o conteúdo aparece imediatamente. Cursor
personalizado, botões magnéticos e efeito de profundidade só existem com
mouse/trackpad.

## Comandos

```bash
npm install
npm run dev        # desenvolvimento em http://localhost:4321
npm run build      # gera o site em dist/
npm run preview    # serve o build localmente
```

Mídias (detalhes em [MIDIAS.md](MIDIAS.md)):

```bash
npm run media:import -- export-instagram.zip   # importa fotos/vídeos do Instagram
npm run media:slot -- hero foto.jpg            # troca a foto de uma seção
npm run media:video -- video.mov nome          # converte vídeo para web
npm run og                                     # regenera imagens de compartilhamento
```

## Publicação

O build é 100% estático (`dist/`) e pode ser hospedado em Netlify, Vercel,
Cloudflare Pages, GitHub Pages ou qualquer hospedagem comum.

Defina o domínio definitivo antes de publicar (URLs canônicas, Open Graph e
sitemap dependem dele):

```bash
SITE_URL=https://www.seudominio.com.br npm run build
```

## Estrutura

```
src/
  data/            conteúdo editável (site, procedimentos, FAQ, resultados, depoimentos)
  pages/           / · /procedimentos/ · /procedimentos/<slug>/ · 404
  components/      seções e componentes (home/, react/)
  scripts/         camada de movimento (GSAP, Lenis, transições)
  styles/          tokens da identidade e base tipográfica
  assets/images/   fotos (otimizadas no build)
scripts/           importação de mídia e geração de imagens OG
public/            ícones, imagens de compartilhamento
```

## Antes de publicar — confirmar com a profissional

- [ ] **Fotos próprias** (hero, retrato da Letícia, procedimentos) — as atuais são provisórias.
- [ ] **Textos dos procedimentos e respostas do FAQ** (`src/data/procedimentos.ts`, `src/data/faq.ts`).
- [ ] O que é o **Studio Face** e o significado do **Método SER**, se houver.
- [ ] **Horários de atendimento** (`site.hours` em `src/data/site.ts`).
- [ ] **CEP** do endereço e **domínio** definitivo.
- [ ] **Antes e depois** e **depoimentos** reais, com autorização por escrito.
- [ ] Regras de publicidade do **conselho profissional** da Letícia.
- [ ] Logotipo oficial (hoje o site usa uma assinatura tipográfica e o monograma "LO").

O site não inventa formação, certificações, preços, tecnologias, indicações
clínicas, resultados, nomes ou avaliações.
