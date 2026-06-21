import { test, expect } from "@playwright/test";
import { loginAsGuruGandasari } from "./helpers/auth";
import * as path from "path";

const SS = (name: string) =>
  path.resolve(`public/images/docs/settings/${name}.png`);

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

test("capture settings flow", async ({ page }) => {
  await loginAsGuruGandasari(page);

  // 01 — halaman utama pengaturan (daftar kartu kategori)
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await hideDevUI(page);
  await page.screenshot({ path: SS("01-halaman-pengaturan"), fullPage: false });

  // 02 — klik Keamanan Akun
  const keamananLink = page.getByRole("link", { name: "Keamanan Akun" });
  await keamananLink.waitFor({ timeout: 20000 });
  await keamananLink.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await hideDevUI(page);
  await page.screenshot({ path: SS("02-keamanan-akun"), fullPage: false });

  // 03 — kembali ke settings, klik Install Aplikasi
  await page.goto("/settings");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(500);
  const pwaLink = page.getByRole("link", { name: "Install Aplikasi" });
  await pwaLink.waitFor({ timeout: 10000 });
  await pwaLink.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1000);
  await hideDevUI(page);
  await page.screenshot({ path: SS("03-install-aplikasi"), fullPage: false });
});
