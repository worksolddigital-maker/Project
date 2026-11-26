# Trading Desk — Painel profissional de gerenciamento de trading

Sistema completo para **registrar operações, controlar a banca, gerenciar risco, analisar desempenho, acompanhar metas e manter um diário de disciplina**. Interface de terminal financeiro (preto/grafite, verde para resultados positivos, vermelho para perdas e alertas), com gráficos interativos e persistência real em banco de dados.

> O painel é **independente da Hezilex** e serve apenas para **gerenciamento e análise** — não executa ordens.

## Integração com a Hezilex

Foi verificado se existe API pública ou documentação de integração para a plataforma `app.hezilex.com/traderoom`: **não foi encontrada nenhuma API oficial ou forma autorizada de integração**. Por isso o sistema **não** acessa a conta, não automatiza login e não lê dados privados. O histórico entra de duas formas:

1. **Cadastro manual** de cada operação (com cálculo automático do resultado);
2. **Importação de CSV ou Excel (.xlsx)** — o assistente reconhece as colunas automaticamente (português ou inglês), permite ajustar o mapeamento, mostra pré-visualização com erros por linha e ignora duplicadas. Há modelos de planilha para download.

Se a Hezilex publicar uma API oficial no futuro, basta criar um novo serviço em `src/server/services/` que produza o mesmo formato usado pela importação (`ImportedTrade`).

## Funcionalidades

| Seção | O que faz |
|---|---|
| **Mercado ao vivo** | O que está acontecendo agora na bolsa, no câmbio e em cripto: faixa de cotações animada, **destaques do que mais subiu ou caiu com as manchetes que citam cada ativo** ("por que?"), cotações com minigráficos (ações B3, dólar e euro PTAX, câmbio do BCE, Selic, 10 criptomoedas), notícias filtráveis por tema (bolsa, câmbio, juros, exterior, commodities, cripto, empresas) e, opcionalmente, **explicação com IA** que resume o motivo dos movimentos citando as manchetes. Atualiza a cada minuto. Também aparece como "Mercado agora" no dashboard. |
| **Monitoramento** | Acompanhamento ao vivo da sessão do dia (atualiza a cada 20 s enquanto a página está aberta): status dentro/fora dos parâmetros, resultado acumulado operação a operação com a meta e o limite de perda como referência, consumo dos limites em tempo real, alertas ativos, operações de hoje, resumo de segurança e **registro de atividades** (tudo o que foi criado, alterado ou excluído na conta). |
| **Dashboard** | Saldo total, capital inicial, lucro e prejuízo acumulados, resultado líquido, rentabilidade, taxa de acerto, total de operações, vencedoras/perdedoras, média de lucro e de perda, melhor e pior operação. Evolução do saldo, distribuição WIN/LOSS, P&L dos últimos 30 dias, alertas ativos e operações recentes. Atualiza a cada operação registrada. |
| **Operações** | Cadastro, edição e exclusão (com confirmação). **Seletor de ativos** com o catálogo da corretora (Cripto, Forex, Ações, Commodities), favoritos, recentes e busca; ao escolher o ativo o payout de referência é preenchido (editável). Pesquisa por ativo, filtros por período, resultado, estratégia e tipo; ordenação; paginação; resumo do filtro; exportação CSV; importação CSV/Excel. Lucro/prejuízo e retorno calculados automaticamente (WIN = valor × payout; LOSS = −valor; EMPATE = 0), com opção de informar o valor manualmente quando a corretora creditar outro valor. |
| **Gerenciamento de banca** | Capital inicial, depósitos e retiradas (CRUD), saldo atualizado, valor máximo por operação, risco %, limite diário de perda, metas diária/semanal/mensal, payout padrão. Situação do dia com barras de consumo. |
| **Gestão de risco** | Risco por operação (médio e último), exposição diária, capital comprometido, drawdown máximo e atual (curva submersa), sequência de perdas, relação lucro/prejuízo, fator de lucro, limite de perda diário. Alertas e detecção de comportamentos de risco (aumento de valor após LOSS, operações após o limite diário, excesso de operações). Não recomenda operações. |
| **Estatísticas** | Evolução do saldo, P&L diário, semanal e mensal, taxa de acerto no tempo, distribuição WIN/LOSS, desempenho por ativo e por estratégia (gráfico + tabela), horários mais rentáveis, mapa de calor dia × hora e comparação entre dois períodos. Tooltips detalhados em todos os gráficos. |
| **Calendário** | Mês completo com resultado, quantidade de operações, WIN/LOSS e rentabilidade de cada dia; verde/vermelho por resultado; total semanal; clique abre os detalhes do dia (operações e anotações). |
| **Diário de trading** | Emocional, estratégia, seguiu o gerenciamento, impulso, principal erro, acertos e melhorias. Vínculo com uma operação ou com a sessão (data). Histórico filtrável e indicadores de disciplina cruzados com o resultado real dos dias. |
| **Metas** | Metas diária/semanal/mensal, máximo de operações por dia e de perdas consecutivas, com anéis de progresso, histórico de 30 dias e 12 semanas contra a meta e aproveitamento. |
| **Relatórios** | Relatório por período (resumo, por ativo, por estratégia, por dia, movimentações), exportação **CSV** e **Excel** (7 abas formatadas) e impressão/PDF. |
| **Academia de velas** | Aula interativa de leitura de velas. **Anatomia em 3D** (Three.js): corpo, pavios, abertura, fechamento, máxima e mínima rotulados; você mexe nos preços e o painel diz na hora que vela é aquela e o que ela significa. **19 padrões clássicos** (martelo, estrela cadente, engolfos, harami, estrelas da manhã e da tarde, três soldados/corvos, pinças, doji, marubozu...) em 3D, com como reconhecer, onde vale, o que confirma e o que invalida, e 9 formações gráficas (topo/fundo duplo, OCO, triângulos, bandeiras). Tabela **Compra × Venda** no formato "lugar + vela = sinal", sem notas de estrelas. **Sessões do mercado** (Sydney, Tóquio, Londres, Nova York) convertidas para o seu fuso com horário de verão, e o que observar em cada tempo gráfico. **Operar com consciência**: seu plano do dia com os seus limites reais, o acerto mínimo para empatar com o seu payout médio, tamanho de entrada por % do saldo, o custo do martingale e checklist antes de cada entrada. Treino com perguntas. |
| **Segurança** | Troca de senha, sessões abertas (dispositivo, IP, último acesso) com encerramento individual ou de todas as outras, registro de acessos (entradas, tentativas com senha errada, bloqueios, trocas de senha) e exclusão da conta. |
| **Configurações** | Perfil, moeda, fuso horário, payout padrão, animações reduzidas, rolagem suave, **ativos e payouts** (seu payout por ativo e favoritos), estratégias, importação/exportação, **backup e restauração (JSON)** e exclusão de todas as operações. |

O menu lateral é agrupado em **Visão geral, Operacional, Capital e risco, Análise e Conta**, e as Estatísticas são divididas em abas (Desempenho, Ativos e estratégias, Horários, Comparação).

### Mercado ao vivo: fontes

Todas as fontes são serviços públicos documentados ou feeds RSS oferecidos pelos próprios veículos; nenhuma exige login e nada é raspado de páginas.

| Dado | Fonte | Observação |
|---|---|---|
| Ações B3 (PETR4, VALE3, ITUB4, MGLU3) | [brapi](https://brapi.dev) | Sem token; pode ter atraso. |
| Ibovespa | brapi | Exige `BRAPI_TOKEN` (gratuito). |
| Dólar e euro (PTAX), Selic | API oficial do **Banco Central** (Olinda/PTAX e SGS 432) | Boletins de abertura, intermediários e fechamento. |
| EUR/USD, GBP/USD, USD/JPY, AUD/USD | Frankfurter (taxas de referência do **BCE**) | Uma vez por dia útil. |
| 10 criptomoedas | [CoinGecko](https://www.coingecko.com/en/api) | Variação de 24 h e gráfico de 7 dias. |
| Notícias | RSS de Money Times, InfoMoney, Investing.com Brasil e buscas do Google Notícias | Título, fonte e link para o site original (uso pessoal). |

Cada fonte tem cache próprio no servidor (1 a 10 min) e, se uma falhar, o restante continua aparecendo com o último dado bom. O "por que?" de cada destaque mostra as manchetes recentes que citam o ativo, ordenadas pelas que descrevem o movimento e o motivo; isso indica o que a imprensa associou ao movimento, sem afirmar causa. Com `ANTHROPIC_API_KEY`, o botão **Explicar com IA** envia ao Claude (modelo `claude-opus-5-5`) apenas as cotações e as manchetes numeradas; a resposta precisa citar os números das manchetes, diz quando elas não explicam o movimento e não faz previsões nem recomendações. Se o modelo recusar o pedido, a API repete a chamada num modelo alternativo (`fallbacks: "default"`).

### Catálogo de ativos

`src/lib/domain/assets.ts` traz os ativos e payouts que apareceram nas telas da corretora em 25/11/2026 (12 cripto, 29 forex, 4 commodities). O payout é só **referência**: a corretora altera esses valores, então cada conta pode gravar o seu próprio payout por ativo em Configurações › Ativos e payouts, e o formulário sempre permite editar. EUR/NZD, AUD/CHF e EUR/AUD aparecem sem payout porque o valor não estava visível; a categoria Ações estava vazia nas telas.

Alertas aparecem no sino do topo, no dashboard e na página de risco; quando um limite é atingido após salvar uma operação, uma notificação é exibida. O formulário de operação avisa **antes de salvar** se o valor ultrapassa seus parâmetros (sem bloquear).

## Tecnologias

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4**, **Lucide Icons**, fontes **Geist**
- **Recharts 3** (gráficos), **TanStack Query** (cache e sincronização)
- **Drizzle ORM** + **PostgreSQL** — embarcado (**PGlite**) por padrão ou externo (**Supabase**/qualquer Postgres) via `DATABASE_URL`
- **Zod** (validação compartilhada entre cliente e servidor)
- **ExcelJS** e **Papa Parse** (importação/exportação)
- Animações: **GSAP** (ScrollTrigger, SplitText, DrawSVG), **Motion** (`motion/react`) e **Lenis**; **Three.js** para as velas em 3D da Academia (sombras, rótulos, giro; pausa fora da tela e libera a memória ao sair)
- Testes: **Vitest** (unitários e integração) e **Playwright** (E2E)

### Por que não Supabase Auth?

O sistema funciona **sem depender de nenhum serviço externo**: a autenticação é própria (senhas com `scrypt`, sessões em banco com token aleatório guardado apenas como hash SHA-256, cookie `HttpOnly` + `SameSite=Lax` + `Secure` em produção, expiração deslizante de 30 dias, limitação de tentativas de login). O **Supabase pode ser usado como banco de dados** (veja abaixo) sem mudar nada no código.

## Como executar

Requisitos: **Node.js 20.9+** (testado com Node 22).

```bash
npm install
npm run dev
```

Acesse http://localhost:3000, crie sua conta e comece. Sem configuração extra, os dados ficam em um PostgreSQL embarcado em `.data/pglite` (as migrações rodam sozinhas).

Produção (servidor próprio, uma instância):

```bash
npm run build
npm start            # porta 3000; use PGLITE_DATA_DIR para escolher onde salvar os dados
```

### Usando Supabase (ou outro PostgreSQL)

1. Crie um projeto no Supabase e copie a *connection string* (Project Settings → Database). Prefira o **Session pooler**; com o **Transaction pooler** (porta 6543) mantenha `DATABASE_PREPARE=false` (padrão).
2. Crie `.env.local` a partir de `.env.example` e defina `DATABASE_URL`.
3. Aplique as migrações: `DATABASE_URL=... npm run db:migrate`
4. `npm run build && npm start` (ou deploy na Vercel/Render/Railway com a mesma variável).

A migração `0001_enable_rls` ativa **Row Level Security** em todas as tabelas (a `0002_security_monitoring`, que cria o registro de auditoria e os campos de bloqueio/sessão, faz o mesmo na tabela nova): como o Supabase expõe o schema `public` pela API REST, isso bloqueia o acesso via chave `anon`; o app conecta como dono das tabelas e não é afetado.

> Em plataformas serverless (Vercel etc.) use sempre `DATABASE_URL`: o banco embarcado precisa de disco persistente.

## Versão de demonstração em HTML

`npm run demo:build` gera **um único arquivo HTML** (`dist-demo/index.html`, ~2,4 MB) com o sistema inteiro rodando no navegador, sem servidor: as mesmas telas, validações e cálculos, com a API substituída por um motor local (`demo/`). Serve para testar e apresentar o painel.

- Os dados ficam no navegador (ou, quando aberto dentro do visualizador do Claude, no armazenamento privado da conta de quem abre).
- Há uma **conta de exemplo com dados fictícios**, claramente identificada, para explorar os gráficos. A senha dela (`Exemplo2026`) aparece no painel da demo, porque ações sensíveis pedem a senha também lá.
- Bloqueio por tentativas, registro de atividades e confirmação por senha funcionam como na versão instalada; como a demo roda em um único navegador, a lista de sessões mostra só a atual.
- **Mercado ao vivo na demo:** a demo não tem servidor para consultar as fontes, então o build grava um retrato real das cotações e manchetes (`demo/market-snapshot.json`, com data e hora na tela) e a página avisa que ele não se atualiza. Dentro do Claude, "Explicar com IA" funciona usando a conta de quem abre a página.
- `dist-demo/artifact.html` é a mesma página no formato usado para publicação como Artifact do Claude.
- Não substitui a versão instalada: não há banco de dados compartilhado nem login real entre dispositivos.

## Scripts

| Comando | Descrição |
|---|---|
| `npm run dev` | Desenvolvimento |
| `npm run build` / `npm start` | Build e servidor de produção |
| `npm run typecheck` | Verificação de tipos |
| `npm run lint` | ESLint |
| `npm test` | Testes unitários e de integração (Vitest, banco em memória) |
| `npm run test:e2e` | Testes ponta a ponta (Playwright; faz o build e sobe um servidor com banco novo) |
| `npm run db:generate` | Gera nova migração após alterar `src/server/db/schema.ts` |
| `npm run db:migrate` | Aplica migrações (PGlite ou `DATABASE_URL`) |
| `npm run demo:build` | Grava um retrato do mercado e gera a versão de demonstração em um único arquivo HTML |
| `npm run market:snapshot -- arquivo.json` | Grava as cotações e manchetes atuais (fixture offline / demo) |

## Arquitetura

```
src/
  app/                    Rotas (App Router)
    (auth)/               login e cadastro
    (app)/                12 seções do painel (layout com sidebar/topbar)
    api/                  Route Handlers REST (auth, conta, sessões, auditoria, trades, banca, estratégias, diário, importação, exportação, backup)
  features/               Telas por domínio (dashboard, monitoring, trades, bankroll, risk, stats, calendar, journal, goals, reports, security, settings, activity)
  components/
    ui/                   Botões, formulários, modal, cards, toasts, seletor de período...
    charts/               Gráficos (Recharts) com padrão visual único
    layout/               Shell, sidebar, topbar, central de alertas
    motion/               CountUp, SplitHeading, Reveal (ScrollTrigger), Magnetic, SmoothScroll (Lenis)
  hooks/                  AppDataProvider (calcula todas as métricas uma única vez), stores do cliente
  lib/
    domain/               Regras de negócio puras e testadas: dinheiro, datas/fuso, cálculo de operação,
                          analytics, risco, metas, mapeamento de importação, catálogo de ativos
    market/               Leitor de RSS, temas das notícias, destaques e "por quê", prompt da IA, formatação
    academy/              Leitura de velas, catálogo de padrões, tabela Compra × Venda, sessões e tempos gráficos
    security.ts           Política de segurança e vocabulário do registro de atividades
    validation/           Schemas Zod compartilhados
    api/                  Cliente HTTP e hooks de dados
  server/
    db/                   Schema Drizzle e conexão (PGlite ou Postgres)
    auth/                 Senhas, sessões, rate limit
    repositories/         Acesso a dados sempre filtrado por usuário (inclui o registro de auditoria)
    services/             Importação, exportação (CSV/XLSX) e backup
    market/               Fontes de cotações e notícias, cache por fonte, explicação com IA (Anthropic SDK)
drizzle/                  Migrações SQL
tests/                    Vitest (domínio + integração do servidor)
e2e/                      Playwright (desktop e celular)
```

## Regras de cálculo

Todos os valores monetários são armazenados em **centavos inteiros** (sem erro de ponto flutuante).

- **Lucro da operação**: WIN = `round(valor × payout%)`; LOSS = `−valor`; EMPATE = `0`. Retorno % = lucro ÷ valor.
- **Saldo** = capital inicial + depósitos − retiradas + resultado das operações.
- **Rentabilidade** = resultado líquido ÷ (capital inicial + depósitos).
- **Taxa de acerto** = WIN ÷ (WIN + LOSS) — empates não contam.
- **Média de lucro/perda por operação** = média das operações WIN / LOSS.
- **Fator de lucro** = lucro bruto ÷ prejuízo bruto; **relação lucro/prejuízo** = lucro médio ÷ perda média.
- **Drawdown** medido sobre o resultado acumulado das operações (depósitos e retiradas não criam nem escondem drawdown); % = queda ÷ (saldo + queda).
- **Rentabilidade do dia** = resultado do dia ÷ saldo no início do dia.
- **Exposição diária** = total investido no dia; **capital comprometido** = exposição ÷ saldo no início do dia.
- **Sequências**: empates não interrompem nem estendem sequências. Perdas consecutivas para alertas são contadas dentro do dia.
- Dias, semanas (segunda a domingo) e meses seguem o **fuso horário** configurado.

## Animações e acessibilidade

- Revelação tipográfica com **SplitText** nos títulos e na tela de login; linha do gráfico desenhada com **DrawSVG**; parallax de profundidade e botão magnético (`gsap.quickTo`) no login.
- **Motion** para transições de página, modais, toasts, indicador ativo da navegação e entrada em cascata dos indicadores; **GSAP** para contagem animada dos valores; **ScrollTrigger** revela os painéis com *clip-path*; **Lenis** para rolagem suave sincronizada ao ticker do GSAP.
- Respeita `prefers-reduced-motion` e a opção “Reduzir animações” (desliga Lenis, revelações e transições). Lenis fica desativado em telas de toque. Cursor customizado e rolagem horizontal foram deixados de fora de propósito: num terminal de dados eles atrapalham a leitura e a precisão.
- Cores de lucro/prejuízo nunca são o único sinal: valores sempre têm sinal (+/−), barras ficam acima/abaixo do zero e os gráficos têm legenda e tooltip. Verde × vermelho validados para daltonismo (ΔE 10,3).

## Segurança

- Todas as rotas da API exigem sessão válida e filtram os dados pelo usuário (testado: outro usuário recebe 404).
- Validação Zod no cliente **e** no servidor; o servidor recalcula o resultado financeiro.
- Proteção CSRF (cookies `SameSite=Lax` + verificação de `Origin`), cabeçalhos de segurança, limite de tentativas de login/cadastro por dispositivo.
- **Bloqueio da conta** por 15 minutos após 5 senhas erradas seguidas (mesmo a senha certa é recusada durante o bloqueio); mensagens genéricas para não revelar se um e-mail existe.
- **Política de senha**: mínimo de 10 caracteres, com maiúsculas, minúsculas e números, sem conter o nome da pessoa. Senhas com hash scrypt; o cookie guarda um token cujo hash SHA-256 é o que fica no banco.
- **Sessões**: expiram após 2 h sem uso e, em qualquer caso, 7 dias após o login; podem ser listadas e encerradas. Trocar a senha encerra as outras sessões.
- **Confirmação por senha** para ações destrutivas: excluir todas as operações, restaurar backup e excluir a conta.
- **Registro de auditoria** (`audit_events`): acessos, falhas, bloqueios, trocas de senha e toda criação/alteração/exclusão de dados, com IP e horário, visível em Segurança e Monitoramento.
- RLS habilitado em todas as tabelas (protege contra a Data API do Supabase); o app acessa o banco apenas pelo servidor.
- Exportações protegidas contra injeção de fórmulas em planilhas.

## Testes executados

- `npm test`: 102 testes (leitura automática das velas e presets, consistência dos padrões e da tabela Compra × Venda, sessões com horário de verão de Londres e Nova York, ponto de equilíbrio do payout, leitura de RSS e datas dos feeds, temas das notícias, PTAX, destaques e manchetes relacionadas, prompt e validação da explicação com IA, fontes falhando sem derrubar o painel, cálculos financeiros, datas com fuso/horário de verão, importação, risco, metas, catálogo de ativos e payouts, política de senha, bloqueio por tentativas e registro de auditoria, repositórios, importação Excel real, ida e volta CSV, conteúdo do XLSX, backup/restauração entre contas).
- `npm run test:e2e`: 13 cenários no navegador (academia com 3D, leitura automática, padrões, sessões, plano e checklist, mercado ao vivo com retrato gravado, cadastro, banca, operações e cálculos, alertas, filtros, edição, exclusão, importação com duplicadas, calendário, diário, metas, estatísticas por abas, relatórios, persistência após recarregar/sair, isolamento entre usuários, seletor de ativos com payout, monitoramento, sessões, confirmação por senha, bloqueio da conta, navegação no celular sem rolagem horizontal) — aprovados tanto no PGlite quanto em PostgreSQL 16.
