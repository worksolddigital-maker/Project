# Fotos e vídeos do site

**Já são reais** (enviadas pela profissional): os retratos da abertura e da
seção "Sobre", a linha de produtos, a faixa do Instagram e os três casos de
antes e depois (organizados por paciente, com troca de ângulo).

**Ainda provisórias** (banco de imagens com licença livre — ver
[CREDITOS-IMAGENS.md](CREDITOS-IMAGENS.md)): as fotos dos cards de
procedimento, a imagem do Método SER e os detalhes decorativos. O ideal é
substituí-las por fotografias da própria Letícia, do Instagram
[@leticiaorlandin.estetica](https://www.instagram.com/leticiaorlandin.estetica/)
ou de uma sessão no consultório.

> Fotos tiradas como captura de tela do Instagram trazem a barrinha de
> rolagem do celular na borda direita: corte cerca de 24 px dessa borda antes
> de usar (o importador e o comando de slot não fazem isso sozinhos).

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
| `hero`                  | Abertura da página inicial (já em uso)         | vertical 4:5  |
| `sobre-retrato`         | Retrato da Letícia (já em uso)                 | vertical 3:4  |
| `sobre-ambiente`        | Detalhe sobreposto na seção Sobre              | vertical 3:4  |
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

Os casos são organizados **por paciente**, cada um com um ou mais ângulos
(ex.: Frontal, Três quartos, Detalhe). O primeiro caso da lista aparece em
destaque na página inicial, com a legenda da publicação. Montagens do
Instagram (antes | depois lado a lado, ou em cima/embaixo) devem ser
separadas em dois arquivos com **o mesmo recorte e o mesmo tamanho**.

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
