import { test, expect } from "@playwright/test";
import { loginAsGuruGandasari } from "./helpers/auth";
import * as path from "path";

const SS = (name: string) =>
  path.resolve(`public/images/docs/siswa/${name}.png`);

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

test("capture siswa flow", async ({ page }) => {
  await loginAsGuruGandasari(page);

  // 01 — halaman daftar siswa
  await page.goto("/users/siswa");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500);
  await hideDevUI(page);
  await page.screenshot({ path: SS("01-daftar-siswa"), fullPage: false });

  // 02 — buka modal tambah siswa
  const btnTambah = page.getByRole("button", { name: "Tambah" }).first();
  await btnTambah.waitFor({ timeout: 20000 });
  await btnTambah.click();
  await page.waitForTimeout(1000);
  await hideDevUI(page);
  await page.screenshot({ path: SS("02-modal-tambah-siswa"), fullPage: false });

  // 03 — isi nama siswa di form (tidak submit)
  const nameInput = page.locator('input[placeholder="Masukkan nama lengkap"]');
  const nameVisible = await nameInput.isVisible().catch(() => false);
  if (nameVisible) {
    await nameInput.fill("Muhammad Contoh");
    await page.waitForTimeout(500);
    await hideDevUI(page);
    await page.screenshot({ path: SS("03-isi-form-siswa"), fullPage: false });
  } else {
    await page.screenshot({ path: SS("03-isi-form-siswa"), fullPage: false });
  }

  // Tutup modal
  const btnBatal = page.getByRole("button", { name: /batal|tutup/i }).first();
  await btnBatal.click().catch(() => page.keyboard.press("Escape"));
  await page.waitForTimeout(500);

  // 04 — klik salah satu siswa untuk lihat detail
  const firstStudentRow = page.locator("table tbody tr").first();
  const rowVisible = await firstStudentRow.isVisible().catch(() => false);
  if (rowVisible) {
    await firstStudentRow.click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
    await hideDevUI(page);
    await page.screenshot({ path: SS("04-detail-siswa"), fullPage: false });
  } else {
    await page.screenshot({ path: SS("04-detail-siswa"), fullPage: false });
  }
});
