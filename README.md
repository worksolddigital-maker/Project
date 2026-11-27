# Finance 3D — Gerenciador Financeiro Pessoal

Aplicativo web de finanças pessoais com interface escura em vidro (glassmorphism), profundidade 3D e animações cinematográficas. Roda direto no navegador, sem servidor e sem instalação.

## Como usar

1. Abra o arquivo `index.html` no navegador (Chrome, Edge, Firefox ou Safari, no computador ou no celular).
2. Na primeira visita, escolha **Informar saldo e começar** ou **Explorar com exemplo**. Os dados de exemplo ficam marcados e saem com um clique em *Ajustes → Remover exemplos*.
3. Tudo é salvo automaticamente no LocalStorage do navegador e continua lá depois de fechar a página.

> Os gráficos (Chart.js), as animações (GSAP) e a rolagem suave (Lenis) vêm de CDN. Sem internet, o sistema continua funcionando: cadastros, cálculos, ícones e tabelas seguem disponíveis, e os gráficos mostram um aviso.

## Seções

| Seção | O que faz |
|---|---|
| **Visão geral** | Saldo disponível, valor disponível após pagar todas as contas, saúde financeira (0–100), recebido no mês, despesas, dívidas, empréstimos pendentes, contas a vencer e atrasadas, gráfico de entradas × saídas e evolução do saldo, despesas por categoria, próximos vencimentos e alertas. |
| **Contas da casa** | Aluguel, energia, água, internet, condomínio, gás, mercado, limpeza e outras. Valor, vencimento, categoria, status (pago/pendente; “atrasado” é automático), forma de pagamento e observações. Repetição mensal, cópia para o próximo mês e edição em série. |
| **Entradas** | Salário, renda extra, trabalhos adicionais, recebimentos diversos e outros, como recebido ou previsto. |
| **Empréstimos** | Credor, valor original, parcelas, valor da parcela (ou cálculo pela Tabela Price a partir da taxa), parcelas pagas, vencimento, juros e saldo devedor. Calcula quanto já foi pago, quanto falta, percentual quitado, total comprometido, juros e previsão de término, com barra de progresso 3D e cronograma. |
| **Cartões** | Limite total e disponível, fatura atual, faturas fechadas, futuras e pagas, e compras à vista ou parceladas distribuídas nas faturas pelo dia de fechamento. |
| **Calendário** | Grade mensal com vencimentos, contas pagas, pendentes e atrasadas, parcelas de empréstimos, faturas e recebimentos previstos, cada um com sua cor. |
| **Relatórios** | Filtros de 3, 6 ou 12 meses, ano ou período personalizado. Despesas por categoria, comparação entre meses, renda comprometida, evolução das dívidas e do saldo, e histórico mês a mês. |
| **Inteligência** | Renda comprometida, maiores despesas, contas próximas do vencimento, quanto economizar, sobra após as obrigações, projeção de 6 meses, alertas (por exemplo, quando as despesas passam das entradas) e recomendações. |
| **Ajustes** | Perfil, saldo inicial, meta de economia, dias de alerta, animações, ocultar valores, backup e restauração em JSON, exportação CSV, dados de exemplo e opção de apagar tudo. |

## Como os cálculos funcionam

- **Saldo disponível** = saldo inicial + entradas recebidas − contas pagas − parcelas pagas pelo app − faturas pagas. Use *Ajustar saldo* para alinhar com o saldo real do banco.
- **Disponível após pagar todas as contas** = saldo atual + entradas previstas − tudo o que ainda está em aberto até o fim do mês selecionado (atrasados incluídos).
- **Despesas do mês** = contas da casa + parcelas de empréstimos + faturas de cartão que vencem no mês.
- **Empréstimos**: sem taxa informada, o sistema estima a taxa implícita a partir do valor original, da parcela e do prazo. O saldo devedor é o valor presente das parcelas restantes, a menos que você informe o valor dado pelo credor.
- **Cartões**: compras feitas a partir do dia de fechamento entram na fatura seguinte. O limite disponível desconta todas as parcelas ainda não pagas. Os centavos de arredondamento ficam na 1ª parcela.
- **Projeção**: meses sem lançamentos usam a média dos últimos 3 meses, e esses valores aparecem marcados com `*`.

## Dados e privacidade

- Os dados ficam só neste navegador (LocalStorage, chave `finance3d:data:v1`). Limpar os dados do navegador apaga as informações, por isso faça backups periódicos em *Ajustes*.
- O **backup** é um arquivo `.json`. A restauração valida o arquivo e guarda uma cópia dos dados atuais para você poder desfazer.
- O **CSV** usa `;`, decimal com vírgula e datas DD/MM/AAAA, compatível com Excel e Google Planilhas em português.

## Atalhos

`Ctrl/⌘ + K` pesquisar · `N` novo registro · `Alt + ←/→` mês anterior/próximo · `Esc` fechar janelas.

## Estrutura

```
index.html   estrutura da aplicação (sidebar, topbar, navegação inferior)
style.css    design system: tokens, vidro, botões e barras 3D, layouts responsivos
script.js    store, motor financeiro, views, formulários, gráficos e animações
```

Bibliotecas: [Chart.js 4.6.1](https://www.chartjs.org/), [Lucide Icons](https://lucide.dev/) (subconjunto embutido em `script.js`, licença ISC, funciona offline), [GSAP 3.15](https://gsap.com/) com ScrollTrigger e SplitText, e [Lenis 1.3](https://lenis.darkroom.engineering/).

## Acessibilidade e movimento

- Respeita `prefers-reduced-motion`. Em *Ajustes → Animações* dá para forçar animações reduzidas ou completas.
- Com movimento reduzido, a rolagem suave, o parallax e as revelações no scroll ficam desligados.
- Efeitos de profundidade (inclinação, botões magnéticos, luz que segue o cursor) só aparecem em dispositivos com mouse.
- Navegação por teclado com foco visível, `Esc` para fechar e foco preso dentro dos modais.
- Os gráficos também oferecem os valores em tabela (“Ver tabela”).
