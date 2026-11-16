# Letícia Orlandin | Estética Avançada

Site institucional da Letícia Orlandin Estética Avançada — Bento Gonçalves/RS.

> **Refinar, não transformar.**

## Tecnologia

| Camada | Uso |
| --- | --- |
| [Astro 7](https://astro.build) | Site estático, imagens responsivas (AVIF/WebP), SEO |
| GSAP + ScrollTrigger + SplitText | Abertura cinematográfica, revelações tipográficas, parallax, roleta do Instagram ligada à rolagem, transições de página |
| DrawSVG + MorphSVG (GSAP) | Traçado do mapeamento facial e máscara orgânica do Método SER |
| Lenis | Rolagem suave sincronizada ao ScrollTrigger |
| React + Motion | Ilhas interativas: FAQ, galeria de antes e depois, depoimentos, formulário de pré-agendamento |

Regras de movimento: GSAP e Motion nunca controlam o mesmo elemento; com
**movimento reduzido** ativado no sistema, Lenis, parallax, roleta e
abertura são desligados e todo o conteúdo aparece imediatamente (a roleta
vira uma faixa que se arrasta com o dedo). Botões magnéticos, parallax e
efeito de profundidade só existem com mouse/trackpad; o site usa o cursor
padrão do sistema.

Desempenho (alvo de 60 fps):

- Sem desfoque de fundo nem camadas fixas com mistura no celular; cabeçalho
  sólido em telas de toque.
- As ilhas React usam `client:calm` (`src/directives/calm.ts`): ativam depois
  da abertura, com o navegador ocioso e sem rolagem em andamento — ou na
  hora, se a pessoa tocar nelas.
- A camada de movimento é criada em blocos pequenos, no tempo ocioso, para
  não gerar tarefas longas ao abrir a página.
- Imagens em AVIF (qualidade 68) e WebP (86), com larguras até a original
  (`astro.config.mjs`); a nitidez máxima depende da resolução da foto de
  origem.

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
npm run standalone                             # gera standalone/: páginas HTML independentes (pré-visualização sem servidor)
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

- [x] Retratos (abertura e "Sobre"), formação, linha de produtos completa e três casos de antes e depois — integrados.
- [ ] **Fotos dos cards de procedimento** e imagem do Método SER — ainda provisórias (banco de imagens).
- [ ] Confirmar que a foto de **detalhe dos lábios** é da mesma paciente das fotos frontal e três quartos (foram agrupadas no caso do Método SER: mesmas roupas e acessórios).
- [ ] Nome oficial da universidade (ela escreve "Universidade de Santa Maria").
- [ ] **Textos dos procedimentos e respostas do FAQ** (`src/data/procedimentos.ts`, `src/data/faq.ts`).
- [ ] O que é o **Studio Face** e se **SER** é uma sigla.
- [ ] Linha de produtos: nome do **gloss**, frases de benefício (normas da Anvisa) e forma de venda.
- [ ] **Autorização por escrito** das pacientes dos antes e depois para uso no site (LGPD) e regras de publicidade do **Conselho Federal de Farmácia**.
- [ ] **Horários de atendimento** (`site.hours` em `src/data/site.ts`).
- [ ] **CEP** (um diretório informa 95700-342) e **domínio** definitivo.
- [ ] **Depoimentos** reais, com autorização.
- [ ] Logotipo oficial em SVG (o site reproduz o estilo tipográfico dele; o símbolo da marca e o favicon ainda não são os oficiais).

O site não inventa formação, certificações, preços, tecnologias, indicações
clínicas, resultados, nomes ou avaliações.
