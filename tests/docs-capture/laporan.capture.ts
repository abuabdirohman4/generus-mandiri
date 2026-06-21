import { test, expect } from "@playwright/test";
import { loginAsGuruGandasari } from "./helpers/auth";
import * as path from "path";

const SS = (name: string) =>
  path.resolve(`public/images/docs/laporan/${name}.png`);

async function hideDevUI(page: any) {
  await page.addStyleTag({
    content: `
      #__next-build-watcher,
      nextjs-portal,
      [data-nextjs-dialog-overlay],
      [data-nextjs-toast] { display: none !important; }
    `,
  });
}

test.describe.configure({ mode: "serial" });
test.setTimeout(180000);

test("capture laporan flow", async ({ page }) => {
  await loginAsGuruGandasari(page);

  // 01 — halaman laporan (default tab presensi)
  await page.goto("/laporan");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000); // Tunggu chart/data render
  await hideDevUI(page);
  await page.screenshot({ path: SS("01-halaman-laporan"), fullPage: false });

  // 02 — scroll ke chart jika ada
  const chart = page.locator(".recharts-wrapper, canvas").first();
  const chartVisible = await chart.isVisible().catch(() => false);
  if (chartVisible) {
    await chart.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await hideDevUI(page);
  }
  await page.screenshot({ path: SS("02-chart-presensi"), fullPage: false });

  // 03 — scroll ke tabel data
  const table = page.locator("table").first();
  const tableVisible = await table.isVisible().catch(() => false);
  if (tableVisible) {
    await table.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await hideDevUI(page);
    await page.screenshot({ path: SS("03-tabel-laporan"), fullPage: false });
  } else {
    // Screenshot halaman bawah jika tidak ada tabel
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await page.waitForTimeout(500);
    await hideDevUI(page);
    await page.screenshot({ path: SS("03-tabel-laporan"), fullPage: false });
  }

  // 04 — kembali ke atas: filter section
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  await hideDevUI(page);
  await page.screenshot({ path: SS("04-filter-section"), fullPage: false });
});
