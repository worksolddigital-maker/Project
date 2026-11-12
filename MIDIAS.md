# Fotos e vídeos do site

As fotos atuais são **provisórias** (banco de imagens com licença livre — ver
[CREDITOS-IMAGENS.md](CREDITOS-IMAGENS.md)). O ideal é substituí-las pelas
fotografias e vídeos da própria Letícia, a partir do Instagram
[@leticiaorlandin.estetica](https://www.instagram.com/leticiaorlandin.estetica/).

## 1. Obter as mídias do Instagram (forma oficial e em alta qualidade)

Na conta da profissional:

1. Instagram → **Configurações** → **Central de Contas**
2. **Suas informações e permissões** → **Baixar suas informações**
3. Escolher a conta → **Algumas das suas informações** → **Conteúdo**
4. Formato **JSON**, qualidade de mídia **Alta** → enviar
5. Baixar o arquivo `.zip` quando o Instagram avisar que está pronto

> Também funciona com uma pasta comum de fotos/vídeos (por exemplo, arquivos
> enviados pela profissional por WhatsApp ou Google Drive).

## 2. Importar

```bash
npm run media:import -- ~/Downloads/instagram-leticiaorlandin.zip
```

O importador:

- extrai o `.zip` em `media-raw/` (pasta não versionada);
- lê as legendas e datas do export, corrigindo a codificação dos acentos
  (o Instagram grava "Ã©" no lugar de "é");
- ignora stories e foto de perfil (use `--stories` para incluir stories);
- otimiza as fotos em `src/assets/images/instagram/`;
- converte os vídeos para web (MP4 H.264, sem áudio, até 1280 px) em
  `public/media/instagram/`, com poster — requer **ffmpeg** instalado;
- gera `src/data/instagram.generated.ts`, que alimenta a faixa do Instagram;
- cria `media-raw/curadoria.html`, uma folha com todas as mídias para escolher
  as fotos de cada seção.

Revise `src/data/instagram.generated.ts` antes de publicar e apague as linhas
das mídias que não devem aparecer (a faixa mostra as 10 primeiras).

## 3. Colocar fotos nas seções do site

```bash
npm run media:slot                                  # lista as posições
npm run media:slot -- hero caminho/da/foto.jpg      # foto principal
npm run media:slot -- sobre-retrato caminho/do/retrato.jpg
```

| Posição (slot)          | Onde aparece                                   | Formato ideal |
| ----------------------- | ---------------------------------------------- | ------------- |
| `hero`                  | Abertura da página inicial                     | vertical 4:5  |
| `sobre-retrato`         | Retrato da Letícia (substitui a ambientação)   | vertical 4:5  |
| `serenidade`            | Detalhe sobreposto na seção Sobre              | vertical 3:4  |
| `toque`, `detalhe-folhas` | Imagens pequenas do manifesto/contato        | vertical      |
| `toxina-botulinica`     | Card e página do procedimento                  | horizontal    |
| `preenchimentos`        | Card e página do procedimento                  | horizontal    |
| `mapeamento-facial`     | Card e página (recebe o traçado animado)       | qualquer      |
| `protocolos-faciais`    | Card e página do procedimento                  | horizontal    |
| `metodo-ser`            | Bloco do Método SER (máscara orgânica)         | vertical      |
| `remocao-de-tatuagem`   | Card e página do procedimento                  | qualquer      |
| `tratamentos-capilares` | Card e página do procedimento                  | horizontal    |

Depois de trocar as fotos, ajuste o enquadramento de cada procedimento (campo
`focus`, ex.: `'50% 30%'`) em `src/data/procedimentos.ts`, atualize os textos
alternativos (`imageAlt`) e regenere as imagens de compartilhamento:

```bash
npm run og      # requer Playwright: npx playwright install chromium
npm run build
```

`--grade` aplica o tratamento de cor sutil da identidade. Use só em fotos de
ambientação — **nunca** em antes e depois.

## 4. Antes e depois

Siga as instruções no topo de [`src/data/resultados.ts`](src/data/resultados.ts):

- somente imagens **reais**, com **autorização por escrito** da paciente (LGPD);
- **sem** filtros, retoques ou alterações de cor;
- informe o tratamento apenas quando confirmado pela profissional;
- confirme as regras de publicidade do conselho profissional da Letícia sobre
  divulgação de antes e depois.

Enquanto a lista estiver vazia, o site exibe "Galeria em curadoria".

## 5. Depoimentos

Adicione em [`src/data/depoimentos.ts`](src/data/depoimentos.ts) apenas relatos
reais e autorizados (pode usar iniciais). Enquanto estiver vazio, a seção
convida pacientes a enviarem seu relato pelo WhatsApp.

## 6. Vídeo avulso (ex.: vídeo de apresentação)

```bash
npm run media:video -- caminho/do/video.mov apresentacao
# → public/media/apresentacao.mp4 + poster em src/assets/images/videos/
```
