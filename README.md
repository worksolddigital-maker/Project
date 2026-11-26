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
| **Dashboard** | Saldo total, capital inicial, lucro e prejuízo acumulados, resultado líquido, rentabilidade, taxa de acerto, total de operações, vencedoras/perdedoras, média de lucro e de perda, melhor e pior operação. Evolução do saldo, distribuição WIN/LOSS, P&L dos últimos 30 dias, alertas ativos e operações recentes. Atualiza a cada operação registrada. |
| **Operações** | Cadastro, edição e exclusão (com confirmação). Pesquisa por ativo, filtros por período, resultado, estratégia e tipo; ordenação; paginação; resumo do filtro; exportação CSV; importação CSV/Excel. Lucro/prejuízo e retorno calculados automaticamente (WIN = valor × payout; LOSS = −valor; EMPATE = 0), com opção de informar o valor manualmente quando a corretora creditar outro valor. |
| **Gerenciamento de banca** | Capital inicial, depósitos e retiradas (CRUD), saldo atualizado, valor máximo por operação, risco %, limite diário de perda, metas diária/semanal/mensal, payout padrão. Situação do dia com barras de consumo. |
| **Gestão de risco** | Risco por operação (médio e último), exposição diária, capital comprometido, drawdown máximo e atual (curva submersa), sequência de perdas, relação lucro/prejuízo, fator de lucro, limite de perda diário. Alertas e detecção de comportamentos de risco (aumento de valor após LOSS, operações após o limite diário, excesso de operações). Não recomenda operações. |
| **Estatísticas** | Evolução do saldo, P&L diário, semanal e mensal, taxa de acerto no tempo, distribuição WIN/LOSS, desempenho por ativo e por estratégia (gráfico + tabela), horários mais rentáveis, mapa de calor dia × hora e comparação entre dois períodos. Tooltips detalhados em todos os gráficos. |
| **Calendário** | Mês completo com resultado, quantidade de operações, WIN/LOSS e rentabilidade de cada dia; verde/vermelho por resultado; total semanal; clique abre os detalhes do dia (operações e anotações). |
| **Diário de trading** | Emocional, estratégia, seguiu o gerenciamento, impulso, principal erro, acertos e melhorias. Vínculo com uma operação ou com a sessão (data). Histórico filtrável e indicadores de disciplina cruzados com o resultado real dos dias. |
| **Metas** | Metas diária/semanal/mensal, máximo de operações por dia e de perdas consecutivas, com anéis de progresso, histórico de 30 dias e 12 semanas contra a meta e aproveitamento. |
| **Relatórios** | Relatório por período (resumo, por ativo, por estratégia, por dia, movimentações), exportação **CSV** e **Excel** (7 abas formatadas) e impressão/PDF. |
| **Configurações** | Perfil, moeda, fuso horário, payout padrão, animações reduzidas, rolagem suave, estratégias, importação/exportação, **backup e restauração (JSON)**, exclusão de todas as operações, troca de senha, encerramento de sessões e exclusão de conta. |

Alertas aparecem no sino do topo, no dashboard e na página de risco; quando um limite é atingido após salvar uma operação, uma notificação é exibida. O formulário de operação avisa **antes de salvar** se o valor ultrapassa seus parâmetros (sem bloquear).

## Tecnologias

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS 4**, **Lucide Icons**, fontes **Geist**
- **Recharts 3** (gráficos), **TanStack Query** (cache e sincronização)
- **Drizzle ORM** + **PostgreSQL** — embarcado (**PGlite**) por padrão ou externo (**Supabase**/qualquer Postgres) via `DATABASE_URL`
- **Zod** (validação compartilhada entre cliente e servidor)
- **ExcelJS** e **Papa Parse** (importação/exportação)
- Animações: **GSAP** (ScrollTrigger, SplitText, DrawSVG), **Motion** (`motion/react`) e **Lenis**
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

A migração `0001_enable_rls` ativa **Row Level Security** em todas as tabelas: como o Supabase expõe o schema `public` pela API REST, isso bloqueia o acesso via chave `anon`; o app conecta como dono das tabelas e não é afetado.

> Em plataformas serverless (Vercel etc.) use sempre `DATABASE_URL`: o banco embarcado precisa de disco persistente.

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

## Arquitetura

```
src/
  app/                    Rotas (App Router)
    (auth)/               login e cadastro
    (app)/                10 seções do painel (layout com sidebar/topbar)
    api/                  Route Handlers REST (auth, trades, banca, estratégias, diário, importação, exportação, backup)
  features/               Telas por domínio (dashboard, trades, bankroll, risk, stats, calendar, journal, goals, reports, settings)
  components/
    ui/                   Botões, formulários, modal, cards, toasts, seletor de período...
    charts/               Gráficos (Recharts) com padrão visual único
    layout/               Shell, sidebar, topbar, central de alertas
    motion/               CountUp, SplitHeading, Reveal (ScrollTrigger), Magnetic, SmoothScroll (Lenis)
  hooks/                  AppDataProvider (calcula todas as métricas uma única vez), stores do cliente
  lib/
    domain/               Regras de negócio puras e testadas: dinheiro, datas/fuso, cálculo de operação,
                          analytics, risco, metas, mapeamento de importação
    validation/           Schemas Zod compartilhados
    api/                  Cliente HTTP e hooks de dados
  server/
    db/                   Schema Drizzle e conexão (PGlite ou Postgres)
    auth/                 Senhas, sessões, rate limit
    repositories/         Acesso a dados sempre filtrado por usuário
    services/             Importação, exportação (CSV/XLSX) e backup
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
- Proteção CSRF (cookies `SameSite=Lax` + verificação de `Origin`), cabeçalhos de segurança, limite de tentativas de login/cadastro.
- Exportações protegidas contra injeção de fórmulas em planilhas.
- Troca de senha encerra as outras sessões.

## Testes executados

- `npm test`: 67 testes (cálculos financeiros, datas com fuso/horário de verão, importação, risco, metas, repositórios, importação Excel real, ida e volta CSV, conteúdo do XLSX, backup/restauração entre contas).
- `npm run test:e2e`: 9 cenários no navegador (cadastro, banca, operações e cálculos, alertas, filtros, edição, exclusão, importação com duplicadas, calendário, diário, metas, relatórios, persistência após recarregar/sair, isolamento entre usuários, navegação no celular sem rolagem horizontal) — aprovados tanto no PGlite quanto em PostgreSQL 16.
