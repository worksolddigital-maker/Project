import { expect, test } from "@playwright/test";
import { register, trackErrors, uniqueEmail } from "./helpers";

test("navegação e cadastro de operação no celular", async ({ page }) => {
  const errors = trackErrors(page);
  await register(page, uniqueEmail("mobile"));

  // No horizontal overflow on the dashboard
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.getByTestId("mobile-menu").click();
  await page.getByRole("link", { name: "Operações" }).click();
  await page.waitForURL("**/operacoes");

  await page.getByTestId("new-trade").click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[name="asset"]').fill("EUR/USD");
  await dialog.locator('input[name="stake"]').fill("10");
  await dialog.locator('input[name="payout"]').fill("80");
  await dialog.getByTestId("trade-save").click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("+R$ 8,00").filter({ visible: true }).first()).toBeVisible();

  for (const path of ["/calendario", "/estatisticas", "/risco", "/metas", "/banca"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    const o = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(o, `overflow em ${path}`).toBeLessThanOrEqual(1);
  }
  expect(errors).toEqual([]);
});
