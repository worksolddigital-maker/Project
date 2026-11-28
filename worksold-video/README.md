# Work Sold — vídeo publicitário 3D

Filme de 43 s (16:9, 1920×1080) com narração em português, cenas 3D em tempo real e os sites do portfólio
(Lucindo Café e Doceria, Sensuale Cosméticos, ProGym Fitness) exibidos em celulares 3D.

## Entregas (`out/`)

| Arquivo | Uso |
|---|---|
| `worksold_comercial_16x9_30fps.mp4` | Versão principal (YouTube, site, WhatsApp, LinkedIn). H.264 + AAC, −14 LUFS, com motion blur. |
| `worksold_comercial_16x9_60fps.mp4` | Mesma edição em 60 fps (movimento mais fluido em telas que suportam). |
| `worksold_thumbnail.jpg` | Capa/miniatura (quadro do encerramento). |

## Roteiro e estrutura

| Tempo | Cena | Locução |
|---|---|---|
| 0–6 s | Barra de busca 3D de vidro digitando "seu negócio" | "Seu cliente está procurando por você na internet... O que ele encontra?" |
| 6–11 s | Foto oficial da marca + título do banner | "Na Work Sold, a gente transforma a sua presença digital em resultados." |
| 11–16 s | Três celulares 3D sobem do chão refletivo | "Criamos sites profissionais, sob medida, com um design que valoriza a sua marca." |
| 16–24 s | Portfólio: Lucindo → Sensuale → ProGym (câmera em travelling) | "Como a Lucindo, Café e Doceria... a Sensuale Cosméticos... e a ProGym Fitness." |
| 24–28 s | Os 5 celulares em arco | "Projetos pensados para cada tela, e para o seu público." |
| 28–34 s | Ladrilhos de vidro com ícones dos valores | "Inovação. Resultados. Confiança. Parceria." |
| 34–43 s | Logo 3D extrudado (impacto) + encerramento com CTA | "Work Sold. Estratégia, inovação e tecnologia para o seu negócio crescer. Fale com a gente." |

## Como foi feito

- **3D**: Three.js (`scene/`), renderizado quadro a quadro no Chromium headless (`tools/render.js`).
  Toda animação é função do tempo, então o render é determinístico.
- **Logo 3D**: as letras W e S foram vetorizadas do arquivo oficial do logo (`tools/vectorize_logo.py`, potrace)
  e extrudadas — não é um redesenho.
- **Sites**: capturas enviadas pelo cliente, recortadas para a tela dos celulares (`tools/prep_images.py`).
- **Locução**: ElevenLabs, voz "Gabriel — Friendly Brazilian Ad Voice", modelo eleven_v4 (`audio/vo_raw.mp3`).
  A fala foi cortada nas pausas e reposicionada para respirar com as cenas (`tools/audio.py`, lista `SEGS`).
- **Trilha e efeitos**: compostos e sintetizados do zero em Python (`tools/audio.py`), sem samples de terceiros.
- **Mix**: ducking da trilha sob a voz, EQ/compressão na voz, master em −14 LUFS / −1 dBTP (`tools/mix.sh`).

## Reproduzir

```bash
npm install                                   # three, fontes Poppins, ícones Lucide
python3 tools/prep_images.py && python3 tools/vectorize_logo.py
NODE_PATH=$(npm root -g) node tools/render.js frames 60 0 2580 out/frames60
python3 tools/audio.py && tools/mix.sh
tools/encode.sh out/frames60
```

## Licenças

- Fonte Poppins (SIL OFL), ícones Lucide (ISC), Three.js (MIT).
- Música e efeitos: originais, gerados neste projeto.
- Logo, foto e capturas de sites: materiais fornecidos pela Work Sold.
