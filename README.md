# Banco Inter — Experiência Digital 3D (conceito)

Site institucional **conceitual** inspirado no ecossistema do Banco Inter, com abertura cinematográfica em 3D controlada
pelo scroll, cartões 3D interativos, botões *Liquid Glass* e seis páginas independentes com rotas reais.

> **Projeto não oficial.** Não é o site do Banco Inter S.A., não possui vínculo com a instituição, não oferece produtos,
> não tem área de login e não solicita dados pessoais ou bancários. As informações de produtos foram consultadas nas
> páginas oficiais em **13/11/2026** e podem mudar — o site sempre orienta a conferir as condições vigentes.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # typecheck + build de produção em dist/ (gera 404.html para hosts estáticos)
npm run preview    # serve o build em http://localhost:4173
```

Requer Node 20+.

## Stack

| Camada | Tecnologia |
| --- | --- |
| UI | React 19 + TypeScript, Vite 8, Tailwind CSS 4 |
| 3D | Three.js, React Three Fiber, Drei (Environment/Lightformers, ContactShadows, PerformanceMonitor) |
| Scroll | GSAP ScrollTrigger + Lenis (smooth scroll sincronizado ao ticker do GSAP) |
| Animações de UI | Framer Motion (transições de página, reveals, modais) |
| Rotas | React Router 7 (`BrowserRouter`) |

## Páginas

| Rota | Conteúdo |
| --- | --- |
| `/` | Herói “BANCO INTER” com cartão 3D girando + narrativa cinematográfica em 10 etapas, ecossistema, Inter Loop, números |
| `/cartoes` | Vitrine 3D em carrossel (Gold, Platinum, Prime, Win): clique gira 180° e mostra o verso; painel lateral e “Ver detalhes” |
| `/shopping` | Inter Shop: o que é, como comprar, regras e prazos de cashback, calculadora, ofertas, categorias, dicas |
| `/emprestimos` | 7 modalidades, contratação, quem pode, taxas divulgadas, prazos, simulador ilustrativo (Tabela Price), FAQ |
| `/investimentos` | 7 categorias com risco, liquidez, rentabilidade, IR e garantia; comparativo; glossário |
| `/sobre` | Linha do tempo 1994–2025 (ligada ao scroll), crescimento de clientes, ecossistema, tecnologia e inovação |

Qualquer outra rota exibe uma página 404. Refresh e botões voltar/avançar funcionam em todas as rotas.

## Arquitetura

```
src/
├── App.tsx, routes.ts           # rotas reais com code-splitting e pré-carregamento
├── data/                        # fonte única de conteúdo (com URLs oficiais consultadas)
├── lib/                         # gsap, smooth scroll, keyframes, math, media queries, fontes
├── components/
│   ├── brand/                   # logotipo (SVG + geometria compartilhada com as texturas 3D)
│   ├── layout/                  # Navbar (tema claro/escuro automático), menu mobile, Footer, PageHero
│   ├── ui/                      # LiquidButton, Modal, Accordion, TiltCard, Reveal, LoanSimulator…
│   └── three/                   # CardMesh, PhoneMesh, Bokeh, StudioLights, SceneCanvas, cenas
│       └── cinematic/           # timeline.ts, CinematicScene.tsx, CinematicExperience.tsx
└── pages/                       # uma página por rota
```

### Animação cinematográfica reversível

1. Uma seção alta (≈10 telas) contém um palco `sticky` de `100svh`.
2. O **ScrollTrigger** converte a posição do scroll em um **progresso normalizado** `0..1` (`progress.target`).
3. Um único `useFrame` suaviza esse valor (`damp`, mesma regra nos dois sentidos) e calcula **câmera, posição,
   rotação, escala e opacidades** a partir de keyframes puros (`src/components/three/cinematic/timeline.ts`).
4. O mesmo valor é repassado, no mesmo frame, às camadas DOM (herói, legendas, overlay do logotipo, HUD de etapas,
   CTA final).

Como todo o estado visual é função do progresso, rolar para cima devolve exatamente o quadro anterior — sem reinícios,
sem animações independentes e sem saltos. As 10 etapas do briefing estão mapeadas em `PHASES`.

### Liquid Glass

`LiquidButton` (`src/components/ui/LiquidButton.tsx`) + CSS em `src/styles/index.css` (`@layer components`):
fundo translúcido com `backdrop-filter`, aro em gradiente por máscara, reflexo especular que acompanha o ponteiro,
brilho que atravessa o vidro no hover e elevação ao clicar. Variantes `glass`, `light` e `orange`; renderiza
`<Link>` (rota interna), `<a target="_blank">` (site oficial) ou `<button>`.

### Performance

- Texturas dos cartões e do app desenhadas em canvas (sem downloads de imagem) com cache por contagem de referências e
  `dispose` automático; geometrias compartilhadas.
- Iluminação por *Lightformers* renderizados uma vez num cubemap (sem HDRI externo).
- Canvas pausa fora da viewport, DPR adaptativo (`PerformanceMonitor`) e menor no celular; menos partículas no mobile.
- Vendors em chunks estáveis (`vendor-3d`, `vendor-gsap`, `vendor-motion`, `vendor-react`) e páginas com lazy loading.
- Fallbacks: sem WebGL (cartão estático + camadas DOM sincronizadas) e `prefers-reduced-motion`.

## Testes

`tests/e2e.mjs` (Playwright) verifica 93 itens: todas as rotas (acesso direto, refresh, 404), menu, voltar/avançar,
botões contextuais, **reversibilidade numérica** da animação em 6 pontos da timeline (descendo e subindo), giro de 180°
dos cartões, painéis de detalhes, simulador conferido com a Tabela Price, calculadora de cashback, links internos,
imagens, ausência de rolagem horizontal, menu mobile e console sem erros.

```bash
npm run build && npm run preview &
BASE_URL=http://localhost:4173 npm run test:e2e
```

Requer `playwright` com Chromium (`npm i -D playwright && npx playwright install chromium`).

## Deploy

O build é estático. Para que o refresh funcione em qualquer rota, o projeto inclui `public/_redirects` (Netlify),
`vercel.json` (Vercel) e gera `dist/404.html` (GitHub Pages).

## Fontes e critérios de conteúdo

As URLs oficiais consultadas estão em `src/data/sources.ts` e no rodapé do site. Critérios adotados:

- Nenhuma taxa, limite, cashback ou benefício foi inventado. Onde o Inter não publica um valor (ex.: taxa do
  consignado, limites de crédito, percentual de cashback por cartão), o site diz isso explicitamente.
- Taxas “a partir de” são exibidas como mínimas divulgadas. O simulador de empréstimos é rotulado como ilustrativo e
  diferencia taxa mínima divulgada de taxa hipotética.
- Preços de produtos do Shop não são reproduzidos (mudam em tempo real); percentuais de cashback aparecem apenas como
  retrato datado de ofertas vistas no site oficial.
- Logotipo, cartões e tela do app são representações artísticas; a tela do app não simula login e não exibe dados reais.
