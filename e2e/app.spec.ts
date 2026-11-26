import { expect, test } from "@playwright/test";
import { addTrade, login, money, PASSWORD, register, trackErrors, uniqueEmail } from "./helpers";

test.describe.configure({ mode: "serial" });

const email = uniqueEmail("fluxo");

test("rotas protegidas redirecionam para o login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  const res = await page.request.get("/api/trades");
  expect(res.status()).toBe(401);
});

test("cadastro valida campos e cria a conta com estados vazios", async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto("/cadastro");
  await page.click('[data-testid="register-submit"]');
  await expect(page.getByText("Informe seu nome.")).toBeVisible();
  await expect(page.getByText("E-mail inválido.")).toBeVisible();

  await register(page, email);
  await expect(page.getByText("Defina seu capital inicial")).toBeVisible();
  await expect(page.getByText("Nenhuma operação registrada", { exact: true })).toBeVisible();
  expect(money(await page.getByTestId("kpi-balance").locator("p.num").textContent())).toBe("R$0,00");
  expect(errors).toEqual([]);
});

test("banca, operações, cálculos e alertas de risco", async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, email);

  // Bankroll parameters
  await page.goto("/banca");
  const form = page.getByTestId("bank-settings");
  await form.locator('input[name="initialCapitalCents"]').fill("1000");
  await form.locator('input[name="maxStakeCents"]').fill("30");
  await form.locator('input[name="dailyLossLimitCents"]').fill("50");
  await form.locator('input[name="dailyProfitGoalCents"]').fill("abc");
  await form.getByRole("button", { name: "Salvar parâmetros" }).click();
  await expect(form.getByText("Valor inválido.")).toBeVisible();
  await form.locator('input[name="dailyProfitGoalCents"]').fill("");
  await form.getByRole("button", { name: "Salvar parâmetros" }).click();
  await expect(page.getByText("Parâmetros salvos")).toBeVisible();
  await expect(page.getByTestId("bank-balance").locator("p.num")).toHaveText(/1\.000,00/);

  // Validation inside the operation form
  let dialog = await addTrade(page, { asset: "", direction: "CALL", stake: "", result: "WIN" });
  await dialog.getByTestId("trade-save").click();
  await expect(dialog.getByText("Informe o ativo.")).toBeVisible();

  // WIN: 20 × 87% = 17,40
  await dialog.locator('input[name="asset"]').fill("eur/usd");
  await dialog.locator('input[name="stake"]').fill("20");
  await dialog.locator('input[name="payout"]').fill("87");
  await expect(dialog.getByTestId("trade-preview-profit")).toHaveText(/\+R\$\s?17,40/);
  await dialog.getByTestId("trade-save").click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Operação registrada")).toBeVisible();

  // LOSS above the max stake: warning shown before saving
  dialog = await addTrade(page, { asset: "GBP/USD", direction: "PUT", stake: "40", result: "LOSS" });
  await expect(dialog.getByText(/acima do máximo por operação/)).toBeVisible();
  await expect(dialog.getByTestId("trade-preview-profit")).toHaveText(/−R\$\s?40,00/);
  await dialog.getByTestId("trade-save").click();
  await expect(dialog).toBeHidden();

  // DRAW
  dialog = await addTrade(page, { asset: "USD/JPY", direction: "CALL", stake: "10", result: "EMPATE" });
  await dialog.getByTestId("trade-save").click();
  await expect(dialog).toBeHidden();

  // Dashboard KPIs: net = 17,40 − 40 = −22,60; balance 977,40; win rate 1/(1+1) = 50%
  await page.goto("/dashboard");
  await expect(page.getByTestId("kpi-net").locator("p.num")).toHaveText(/−R\$\s?22,60/);
  await expect(page.getByTestId("kpi-balance").locator("p.num")).toHaveText(/977,40/);
  await expect(page.getByTestId("kpi-winrate").locator("p.num")).toHaveText("50,0%");
  await expect(page.getByTestId("kpi-count").locator("p.num")).toHaveText("3");
  await expect(page.getByTestId("kpi-best").locator("p.num")).toHaveText(/\+R\$\s?17,40/);
  await expect(page.getByTestId("kpi-worst").locator("p.num")).toHaveText(/−R\$\s?40,00/);
  await expect(page.getByTestId("kpi-return").locator("p.num")).toHaveText("−2,26%");

  // Risk alert for the stake above max
  await page.goto("/risco");
  await expect(page.getByTestId("risk-alert").filter({ hasText: "Operação acima do valor máximo" })).toBeVisible();
  await expect(page.getByTestId("risk-exposure").locator("p.num")).toHaveText(/70,00/);
  await expect(page.getByTestId("risk-loss-used").locator("p.num")).toHaveText(/45,2% usado/);

  // Another loss reaches the daily loss limit (22,60 + 30 = 52,60 ≥ 50)
  dialog = await addTrade(page, { asset: "EUR/USD", direction: "PUT", stake: "30", result: "LOSS" });
  await dialog.getByTestId("trade-save").click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("risk-alert").filter({ hasText: "Limite diário de perda atingido" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("filtros, edição e exclusão com confirmação", async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, email);
  await page.goto("/operacoes");
  const rows = page.getByTestId("trade-row");
  await expect(rows).toHaveCount(4);

  await page.getByRole("radio", { name: "LOSS" }).click();
  await expect(rows).toHaveCount(2);
  await page.getByRole("radio", { name: "Todos" }).click();
  await page.getByTestId("filter-search").fill("gbp");
  await expect(rows).toHaveCount(1);
  await page.getByTestId("filter-search").fill("xyz");
  await expect(page.getByText("Nenhuma operação encontrada")).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(rows).toHaveCount(4);

  // Edit: the GBP/USD LOSS becomes a WIN at 90% → +36,00
  await page.getByTestId("filter-search").fill("gbp");
  await rows.first().getByTestId("edit-trade").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("radio", { name: "WIN", exact: true }).click();
  await dialog.locator('input[name="payout"]').fill("90");
  await expect(dialog.getByTestId("trade-preview-profit")).toHaveText(/\+R\$\s?36,00/);
  await dialog.getByTestId("trade-save").click();
  await expect(dialog).toBeHidden();
  await expect(rows.first()).toContainText("+R$");
  await expect(rows.first()).toContainText("36,00");

  // Delete with confirmation (cancel first, then confirm)
  await rows.first().getByTestId("delete-trade").click();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(rows).toHaveCount(1);
  await rows.first().getByTestId("delete-trade").click();
  await page.getByTestId("confirm-button").click();
  await expect(page.getByText("Operação excluída")).toBeVisible();
  await page.getByRole("button", { name: "Limpar" }).first().click();
  await expect(rows).toHaveCount(3);
  expect(errors).toEqual([]);
});

test("importação de CSV com validação e duplicadas", async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, email);
  await page.goto("/operacoes");
  await page.getByTestId("open-import").click();
  const csv = [
    "Data;Hora;Ativo;Tipo;Valor;Expiração;Resultado;Payout;Lucro;Estratégia",
    "02/11/2026;10:00:00;EUR/USD;CALL;25,00;1m;WIN;80;;Pullback",
    "03/11/2026;11:30;GBP/USD;Venda;15,00;5m;LOSS;;;Pullback",
    "04/11/2026;12:00;BTC/USD;CALL;abc;1m;WIN;80;;",
  ].join("\n");
  await page.getByTestId("import-file").setInputFiles({ name: "historico.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf-8") });
  await expect(page.getByTestId("import-valid-count")).toHaveText("2");
  await expect(page.getByText(/Linha 4:/)).toBeVisible();
  await page.getByTestId("import-commit").click();
  await expect(page.getByTestId("import-result")).toContainText("Importadas");
  await expect(page.getByTestId("import-result")).toContainText("2");
  await page.getByRole("button", { name: "Concluir" }).click();
  await expect(page.getByTestId("trade-row")).toHaveCount(5);

  // Importing the same file again skips duplicates
  await page.getByTestId("open-import").click();
  await page.getByTestId("import-file").setInputFiles({ name: "historico.csv", mimeType: "text/csv", buffer: Buffer.from(csv, "utf-8") });
  await page.getByTestId("import-commit").click();
  await expect(page.getByTestId("import-result")).toContainText("Duplicadas ignoradas");
  await page.getByRole("button", { name: "Concluir" }).click();
  await expect(page.getByTestId("trade-row")).toHaveCount(5);

  // Strategy created from the file
  await page.goto("/configuracoes#estrategias");
  await expect(page.getByTestId("strategy-list")).toContainText("Pullback");
  expect(errors).toEqual([]);
});

test("calendário, diário, metas, estatísticas e relatórios", async ({ page }) => {
  const errors = trackErrors(page);
  await login(page, email);

  await page.goto("/calendario");
  await page.getByTestId("cal-prev").click();
  await page.getByTestId("cal-next").click();
  const today = await page.evaluate(() => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date()));
  const cell = page.getByTestId(`cal-day-${today}`);
  await expect(cell).toContainText("op");
  await cell.click();
  await expect(page.getByTestId("day-trades")).toBeVisible();
  await page.keyboard.press("Escape");

  await page.goto("/diario");
  await page.getByTestId("journal-new").click();
  const dialog = page.getByRole("dialog");
  await dialog.getByTestId("journal-save").click();
  await expect(dialog.getByText("Selecione seu estado emocional.")).toBeVisible();
  await dialog.getByRole("radio", { name: "Focado" }).click();
  await dialog.locator('textarea[name="mainMistake"]').fill("Entrei antes do sinal");
  await dialog.getByTestId("journal-save").click();
  await expect(dialog).toBeHidden();
  await expect(page.getByTestId("journal-list")).toContainText("Entrei antes do sinal");

  await page.goto("/metas");
  const goals = page.getByTestId("goals-settings");
  await goals.locator('input[name="dailyProfitGoalCents"]').fill("100");
  await goals.locator('input[name="maxTradesPerDay"]').fill("5");
  await goals.getByRole("button", { name: "Salvar metas" }).click();
  await expect(page.getByTestId("goal-daily")).toContainText("R$ 100,00");
  await expect(page.getByTestId("goal-maxTrades")).toContainText("/ 5");

  await page.goto("/estatisticas");
  await expect(page.getByTestId("stats-net")).toBeVisible();
  await page.getByRole("tab", { name: "Comparação" }).click();
  await expect(page.getByTestId("comparison-table")).toBeVisible();
  await page.getByRole("tab", { name: "Ativos e estratégias" }).click();
  await expect(page.getByTestId("stats-section-ativos")).toBeVisible();

  await page.goto("/relatorios");
  await page.getByTestId("report-period").locator("select").selectOption("all");
  await expect(page.getByTestId("report-summary")).toContainText("Resultado líquido");
  const download = page.waitForEvent("download");
  await page.getByTestId("export-xlsx").click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^relatorio_.*\.xlsx$/);
  const csvDownload = page.waitForEvent("download");
  await page.getByTestId("export-csv").click();
  expect((await csvDownload).suggestedFilename()).toMatch(/\.csv$/);
  expect(errors).toEqual([]);
});

test("dados persistem após recarregar, sair e entrar de novo; backup", async ({ page }) => {
  await login(page, email);
  const before = await page.getByTestId("kpi-count").locator("p.num").textContent();
  await page.reload();
  await expect(page.getByTestId("kpi-count").locator("p.num")).toHaveText(before ?? "");
  await page.getByTestId("logout").click();
  await page.waitForURL("**/login");
  await login(page, email);
  await expect(page.getByTestId("kpi-count").locator("p.num")).toHaveText(before ?? "");

  const res = await page.request.get("/api/backup");
  expect(res.status()).toBe(200);
  const backup = await res.json();
  expect(backup.format).toBe("trading-desk-backup");
  expect(backup.trades.length).toBe(Number(before));
  expect(backup.journal.length).toBe(1);
});

test("isolamento: outro usuário não vê nem altera dados alheios", async ({ page, browser }) => {
  await login(page, email);
  const trades = await (await page.request.get("/api/trades")).json();
  const targetId = trades.trades[0].id as string;

  const other = await browser.newContext();
  const p2 = await other.newPage();
  await register(p2, uniqueEmail("outro"));
  const list = await (await p2.request.get("/api/trades")).json();
  expect(list.trades).toHaveLength(0);
  const del = await p2.request.delete(`/api/trades/${targetId}`);
  expect(del.status()).toBe(404);
  await other.close();

  const still = await (await page.request.get("/api/trades")).json();
  expect(still.trades.some((t: { id: string }) => t.id === targetId)).toBe(true);
});

test("catálogo de ativos, monitoramento, segurança e confirmação por senha", async ({ page }) => {
  const errors = trackErrors(page);
  const mine = uniqueEmail("seguro");
  await register(page, mine);

  // Asset picker: choosing an asset fills its reference payout.
  await page.goto("/operacoes");
  await page.getByTestId("new-trade").click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[name="asset"]').click();
  await expect(dialog.getByTestId("asset-picker")).toBeVisible();
  await dialog.getByRole("tab", { name: "Commodities" }).click();
  await dialog.getByTestId("asset-option-COBRE").click();
  await expect(dialog.locator('input[name="asset"]')).toHaveValue("COBRE");
  await expect(dialog.locator('input[name="payout"]')).toHaveValue("98");
  await dialog.getByRole("radio", { name: "CALL" }).click();
  await dialog.getByRole("radio", { name: "WIN", exact: true }).click();
  await dialog.locator('input[name="stake"]').fill("10");
  await dialog.getByRole("button", { name: "Registrar operação" }).click();
  await expect(dialog).toBeHidden();

  // Monitoring shows today's result and the change in the activity log.
  await page.goto("/monitoramento");
  await expect(page.getByTestId("live-indicator")).toBeVisible();
  await expect(page.getByTestId("session-status")).toContainText("R$ 9,80");
  await expect(page.getByTestId("activity-log")).toContainText("Registrou operação");
  await expect(page.getByTestId("activity-log")).toContainText("COBRE");

  // Security: current session and sign-in history.
  await page.goto("/seguranca");
  await expect(page.getByTestId("sessions-list")).toContainText("Este dispositivo");
  await expect(page.getByTestId("security-log")).toContainText("Conta criada");

  // Deleting every trade asks for the password again.
  await page.goto("/configuracoes#dados");
  await page.getByRole("button", { name: "Excluir operações" }).click();
  const confirm = page.getByRole("dialog");
  await confirm.locator("#confirm-text").fill("EXCLUIR");
  await confirm.getByTestId("confirm-password").fill("SenhaErrada123");
  await confirm.getByTestId("confirm-button").click();
  await expect(confirm.getByRole("alert")).toHaveText("Senha incorreta.");
  await confirm.getByTestId("confirm-password").fill(PASSWORD);
  await confirm.getByTestId("confirm-button").click();
  await expect(confirm).toBeHidden();
  expect((await (await page.request.get("/api/trades")).json()).trades).toHaveLength(0);
  // The browser logs the intentional 422 (wrong password); nothing else may fail.
  expect(errors.filter((e) => !e.includes("status of 422"))).toEqual([]);
});

test("bloqueio da conta após senhas incorretas", async ({ page, request }) => {
  const victim = uniqueEmail("bloqueio");
  await register(page, victim);
  await page.getByTestId("logout").click();
  await page.waitForURL("**/login");

  const attempt = (password: string) => request.post("/api/auth/login", { data: { email: victim, password }, headers: { Origin: new URL(page.url()).origin } });
  for (let i = 0; i < 4; i++) expect((await attempt("SenhaErrada123")).status()).toBe(401);
  const locked = await attempt("SenhaErrada123");
  expect(locked.status()).toBe(423);
  expect((await locked.json()).error).toContain("bloqueada");
  // The right password is refused while the lock lasts.
  expect((await attempt(PASSWORD)).status()).toBe(423);

  await page.fill('input[name="email"]', victim);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await expect(page.getByText("Conta bloqueada por segurança")).toBeVisible();
});

test("mercado ao vivo: destaques, notícias com filtros e widget no dashboard", async ({ page }) => {
  const errors = trackErrors(page);
  await register(page, uniqueEmail("mercado"));
  await expect(page.getByTestId("market-widget")).toBeVisible();
  await page.getByRole("link", { name: "Abrir mercado" }).click();
  await page.waitForURL("**/mercado");

  await expect(page.getByTestId("market-live")).toBeVisible();
  await expect(page.getByTestId("market-ticker")).toBeVisible();
  await expect(page.getByTestId("highlight").first()).toBeVisible();
  await expect(page.getByTestId("quote-BTC")).toContainText("US$");
  await expect(page.getByTestId("quote-USD/BRL")).toContainText("Banco Central");

  // Topic filter narrows the feed; every external link opens outside the app.
  const feed = page.getByTestId("news-feed");
  const all = await feed.getByTestId("news-item").count();
  await page.getByRole("button", { name: /^Cripto/ }).click();
  const crypto = await feed.getByTestId("news-item").count();
  expect(crypto).toBeGreaterThan(0);
  expect(crypto).toBeLessThanOrEqual(all);
  const link = feed.getByTestId("news-item").first().locator("a").first();
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("href", /^https:\/\//);

  // Without an API key the AI panel says so instead of failing.
  await expect(page.getByTestId("market-ai")).toContainText("não está ativa");
  await expect(page.getByTestId("market-sources")).toContainText("BRAPI_TOKEN");
  const res = await page.request.post("/api/market/explain", { data: { focus: null }, headers: { Origin: new URL(page.url()).origin } });
  expect(res.status()).toBe(503);
  expect(errors.filter((e) => !e.includes("status of 503"))).toEqual([]);
});
