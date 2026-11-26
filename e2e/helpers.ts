import { expect, type Page } from "@playwright/test";

export const PASSWORD = "senhaSegura123";

export function uniqueEmail(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@teste.dev`;
}

/** Collects console errors and uncaught exceptions for the whole test. */
export function trackErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`console: ${m.text()}`);
  });
  return errors;
}

export async function register(page: Page, email: string, name = "Trader Teste") {
  await page.goto("/cadastro");
  await page.fill('input[name="name"]', name);
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.fill('input[name="confirm"]', PASSWORD);
  await page.click('[data-testid="register-submit"]');
  await page.waitForURL("**/dashboard");
  await expect(page.getByTestId("kpi-balance")).toBeVisible();
}

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', PASSWORD);
  await page.click('[data-testid="login-submit"]');
  await page.waitForURL("**/dashboard");
}

/** Normalizes Intl currency output (narrow no-break spaces, minus signs). */
export function money(text: string | null) {
  return (text ?? "").replace(/\s| | /g, "").replace("−", "-");
}

export async function addTrade(
  page: Page,
  t: { asset: string; direction: "CALL" | "PUT"; stake: string; payout?: string; result: "WIN" | "LOSS" | "EMPATE" },
) {
  await page.getByTestId("new-trade").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.locator('input[name="asset"]').fill(t.asset);
  await dialog.getByRole("radio", { name: t.direction }).click();
  await dialog.getByRole("radio", { name: t.result, exact: true }).click();
  await dialog.locator('input[name="stake"]').fill(t.stake);
  if (t.payout !== undefined) await dialog.locator('input[name="payout"]').fill(t.payout);
  return dialog;
}
