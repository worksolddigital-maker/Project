# RECOMEÇO — A construção de uma nova versão de si

E-book digital interativo com um programa guiado de transformação pessoal em 90 dias:
9 capítulos, 4 fases, ferramentas de acompanhamento e certificado simbólico.
São 45 telas navegáveis, com os dados do leitor salvos no próprio dispositivo.

## Como rodar

```bash
npm install
npm run dev       # desenvolvimento em http://localhost:5173
npm run build     # verifica os tipos e gera a versão estática em dist/
npm run preview   # serve a pasta dist/ localmente
```

O resultado de `npm run build` é um site estático (`dist/`) com caminhos relativos e rotas por
hash (`#pagina`), então funciona em qualquer hospedagem estática ou subpasta, sem configuração
de servidor.

### Versão hospedada no claude.ai

`VITE_ARTIFACT=1 npx vite build --outDir dist-artifact` gera a variante publicada como Artifact.
Ela esconde os botões de impressão (o visualizador não abre o diálogo de impressão; o menu oferece
"Leitura contínua") e salva o progresso de cada leitor em um documento privado na conta dele
(`data/users/<id>/estado`), com o navegador como reserva.

## Estrutura

```
public/img/            fotografias otimizadas (WebP, 900 px e 1800 px) e arte de capa
src/
  content/             TODO O TEXTO do e-book (edite aqui)
    types.ts           tipos de bloco e construtores curtos (P, H, Cards, Table, Check…)
    parte1.ts          capítulos 1 a 3
    parte2.ts          capítulos 4 a 6
    parte3.ts          capítulos 7 a 9
    parte4.ts          abertura, programa de 90 dias, ferramentas e encerramento
    index.ts           ordem das páginas, capítulos, imagens e referências
  components/          capa, índice, página, blocos de conteúdo, menu e navegação
  widgets/             ferramentas interativas (rastreador, calendário, painel, timer…)
  lib/
    store.ts           estado do leitor + persistência em localStorage
    router.ts          roteador por hash
    motion.ts          GSAP, ScrollTrigger, SplitText e Lenis
  styles/              base, componentes, ferramentas e impressão
```

## Como atualizar o conteúdo

Cada página é um objeto em `src/content/parte*.ts`, formado por uma lista de blocos:

```ts
{
  id: 'c4-sono', group: 'c4', img: 'sono',
  title: 'Por que o sono vem primeiro',
  lead: 'Resumo exibido abaixo do título.',
  blocks: [
    H('Título da seção', 'Rótulo pequeno'),
    P('Parágrafo com **negrito**, [link interno](c4-ambiente) e [fonte](ref:watson2015).'),
    Steps(['Passo', 'Descrição'], ['Outro passo', 'Descrição']),
    Check('c4:noite', 'Minha rotina noturna', ['Item 1', 'Item 2']),
  ],
}
```

- **Links internos**: `[texto](id-da-pagina)` ou `[texto](id-da-pagina/ancora)`.
- **Citações**: `[texto](ref:chave)` aponta para a referência de mesma chave em `content/index.ts`.
- **Nova página**: adicione o objeto ao arquivo da parte correspondente. Ela entra sozinha no
  índice, no menu, na navegação e no progresso de leitura.
- **Nova imagem**: salve `nome-900.webp` e `nome-1800.webp` em `public/img/`, registre a chave em
  `ImgKey` (`types.ts`) e em `images` (`index.ts`).
- **Novas referências**: inclua apenas fontes realmente consultadas, com link verificável.

## Dados do leitor

Marcações, textos, notas, hábitos e progresso ficam em `localStorage` (chave `recomeco:v1`),
no navegador do leitor. Na versão hospedada no claude.ai, também são sincronizados com um
documento privado da conta do leitor, que nem o dono do e-book consegue ler. O menu oferece "Redefinir meus
dados". As chaves iniciadas por `prog:` pertencem ao ciclo atual e são arquivadas ao iniciar um
novo ciclo de 90 dias.

## Impressão e PDF

O menu lateral tem a opção **Imprimir / PDF**, que abre a versão contínua do e-book
(`#/imprimir`) em tema claro. No diálogo de impressão, escolha "Salvar como PDF". O certificado
e a tabela de rotina têm botões próprios de impressão.

## Animações

- **GSAP + ScrollTrigger + SplitText**: revelação da capa, títulos por máscara de linhas, imagens
  por clip-path, parallax e entrada progressiva do conteúdo.
- **Motion**: transição entre páginas, menu, abas, checklists e microinterações.
- **Lenis**: rolagem suave sincronizada ao ticker do GSAP.

Com `prefers-reduced-motion: reduce`, Lenis, parallax, cortina de transição, cursor personalizado
e animações de rolagem são desativados; o conteúdo aparece imediatamente. O cursor personalizado
e os botões magnéticos só existem em dispositivos com ponteiro fino.

## Aviso

O material tem finalidade educativa e não substitui acompanhamento médico, nutricional ou
psicológico. As fontes estão na página "Referências e fontes" do e-book.

## Créditos das fotografias

A capa é a arte original do projeto. As demais fotografias vêm do [Unsplash](https://unsplash.com),
sob a Licença Unsplash: Marek Piwnicki, Jason Grant, Lucas Favre, Junseong Lee, Brooke Lark,
Iñigo De la Maza, Jp Valery, Luca Bravo, Andrew Neel, Halil Celik, Rui Silvestre,
Priscilla Du Preez, Sage Friedman, Colton Sturgeon, Vadim Matei, Estée Janssens e
Cristina Gottardi.
