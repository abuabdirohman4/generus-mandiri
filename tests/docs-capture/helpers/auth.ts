import { Page } from "@playwright/test";

export async function loginAsGuruGandasari(page: Page) {
  const username =
    process.env.DEMO_GURU_KELOMPOK_USERNAME ?? "guru.gandasari";
  const password =
    process.env.DEMO_GURU_KELOMPOK_PASSWORD ?? "demo123";

  await page.goto("/signin");
  await page.fill('input[name="username"]', username);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/.*home/, { timeout: 45000 });
}
