# Work Sold — Vídeo-convite de sociedade (90s)

Vídeo institucional de 1min30 com **narração em voz (sem música)** apresentando a Work Sold
(sites, landing pages, portfólios e posts, vídeos mobile — marketing digital), os sócios
**Jeferson Tavares** e **Kauê Dutra** e o convite para **Kewin Santos** entrar na sociedade.

- Resultado final: **`out/worksold-convite.mp4`** (1920×1080, 60 fps, H.264 6 Mbps + AAC, ~70 MB — cabe no GitHub e em mensageiros)
- Master em alta (CRF 18, ~160 MB): `out/worksold-convite-master.mp4`, gerado pelo render e fora do git por tamanho.
- Narração: voz "Gabriel" (pt-BR) da ElevenLabs, modelo `eleven_v4`, apenas voz (sem música), comprimida e normalizada.
- Identidade: logo WS (W branco + S ciano `#02B8FF`), wordmark WORKSOLD em Montserrat, fundo preto.

## Roteiro (narração)

1. Toda grande marca começa com uma ideia. Mas só cresce quem sabe transformar essa ideia em presença… em estratégia… e em resultado.
2. Foi para isso que nasceu a Work Sold. Soluções digitais para o seu negócio. Sua presença digital… levada mais longe.
3. Sites. Landing pages. Portfólios e posts. Vídeos mobile. Todo o marketing digital que uma marca precisa para crescer — em um só lugar.
4. Aqui, cada projeto nasce da estratégia, ganha forma com o design e entrega resultado com tecnologia. Sem fórmulas prontas. Com propósito, criatividade e foco no que realmente importa: o crescimento de quem confia na gente.
5. Por trás da Work Sold, estão dois sócios que acreditam nessa visão: Jeferson Tavares… e Kauê Dutra.
6. E agora, chegou a hora de dar o próximo passo. Kewin Santos… este convite é para você. Queremos que você se torne sócio da Work Sold.
7. Três sócios. Uma só visão. Juntos, vamos liderar e gerenciar uma empresa de marketing completa — atendendo clientes, criando projetos que marcam, e construindo uma marca que cresce a cada entrega.
8. Kewin, o seu lugar já está reservado. Aceita o convite?
9. Work Sold. Vamos construir o futuro… juntos.

## Como funciona

| Arquivo | Papel |
| --- | --- |
| `index.html` | Composição 1920×1080: cenas, tipografia, layout (fundo só com luz difusa, sem linhas/texturas). |
| `main.js` | Uma timeline GSAP pausada controla tudo (SplitText, MorphSVG, DrawSVG, CustomEase) + orbe 3D em Three.js (shader próprio). Cada palavra entra no instante exato em que é falada. |
| `cues.js` | Tempo de cada palavra na narração final (gerado). |
| `build_audio.py` | Insere respiros entre os blocos do take original (cortes achados nas pausas reais), trata a voz e gera `audio/narracao-90s.wav` + `cues.js`. |
| `render.js` | Faz *seek* determinístico quadro a quadro no Chromium headless e monta os MP4 com ffmpeg. |
| `tools/extract_logo.py` | Extrai o logo WS em PNGs transparentes (completo, só W, só S, máscara) a partir da arte em fundo preto. |
| `sheet.py` | Junta PNGs de preview numa folha de contato para revisão. |
| `assets/logo/` | Logo WS extraído. |
| `audio/` | Take da ElevenLabs (`narracao.mp3`) e timestamps por palavra (`words.json`). |

## Reproduzir

```bash
cd video
npm install                         # gsap 3.13 + three
python3 build_audio.py              # narração de 90s + cues.js
node render.js preview 12.4 60.5    # PNGs de conferência em out/preview/
node render.js full 60 4            # todos os quadros (60 fps, 4 processos) + master + entrega
node render.js frames 3690 3940     # re-renderiza só um trecho (quadro = segundo × 60)
node render.js encode               # recodifica master + entrega a partir de out/frames/
```

O render completo leva ~11 min de quadros + ~8 min de codificação numa máquina de 4 núcleos (WebGL em software).
Pré-visualização ao vivo com áudio: sirva a pasta (`npx serve video`) e abra `index.html?play`, clique na tela.

## Personalizar

- **Fotos dos sócios**: os cards usam monogramas (JT, KD, KS). Para trocar por fotos, coloque uma
  `<img>` dentro de `.fcard .fbg` / `.ptile .fbg` / `.slot` — as animações de revelação (clip-path + escala) continuam valendo.
- **Logo**: para outra versão da arte, rode `python3 tools/extract_logo.py <arquivo>`.
- **Texto/voz**: ao trocar a narração, gere novos timestamps por palavra (`audio/words.json`), ajuste os blocos em
  `build_audio.py` e rode-o de novo; as animações acompanham as novas marcações automaticamente.
