import { test, expect } from "@playwright/test";
import { loginAsGuruGandasari } from "./helpers/auth";
import { resetDemoAttendance } from "./helpers/reset";
import * as path from "path";

const SS = (name: string) =>
  path.resolve(`public/images/docs/presensi/${name}.png`);

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

test.beforeAll(async () => {
  await resetDemoAttendance();
});

test("capture presensi flow", async ({ page }) => {
  await loginAsGuruGandasari(page);

  // 01 — halaman presensi (list pertemuan)
  await page.goto("/presensi");
  await page.waitForLoadState("networkidle");
  await hideDevUI(page);
  await page.screenshot({ path: SS("01-list-meeting"), fullPage: false });

  // 02 — buka modal buat pertemuan: isi judul + pilih kelas, screenshot, lalu Batal
  const btnBuat = page.getByRole("button", { name: "Buat Pertemuan Baru" });
  await btnBuat.waitFor({ timeout: 20000 });
  await btnBuat.click();
  await page.waitForTimeout(1500);
  await hideDevUI(page);

  // Isi judul pertemuan
  const titleInput = page.locator('input[placeholder="Judul pertemuan..."]');
  await titleInput.waitFor({ timeout: 10000 });
  await titleInput.fill("Pertemuan Rutin Mingguan");

  // Centang kelas Caberawit Putra (checkbox pertama yang tersedia)
  // MultiSelectCheckbox render role=checkbox dengan accessible name = nama kelas
  const kelasCaberawit = page.getByRole("checkbox", { name: "Caberawit Putra" });
  const isVisible = await kelasCaberawit.isVisible().catch(() => false);
  if (isVisible) {
    await kelasCaberawit.check();
  } else {
    // Fallback: centang checkbox pertama yang muncul di modal
    const firstCheckbox = page.locator('.modal-content input[type="checkbox"], [role="dialog"] input[type="checkbox"]').first();
    await firstCheckbox.check().catch(() => {});
  }

  await page.waitForTimeout(800);
  await hideDevUI(page);
  await page.screenshot({ path: SS("02-modal-buat-meeting"), fullPage: false });

  // Tutup modal tanpa submit
  await page.getByRole("button", { name: "Batal" }).click();
  await page.waitForTimeout(500);

  // 03 — klik meeting existing dari list
  const meetingLink = page.locator('a[href^="/presensi/"]').first();
  await meetingLink.waitFor({ timeout: 20000 });
  await meetingLink.click();
  await page.waitForLoadState("networkidle");
  await hideDevUI(page);
  await page.screenshot({ path: SS("03-detail-meeting"), fullPage: false });

  // 04 — isi presensi acak H/S/A per siswa
  await page.waitForSelector("table tbody tr", { timeout: 20000 });
  await page.waitForLoadState("networkidle");
  await hideDevUI(page);

  const statuses = ["H", "S", "A"];
  const allRows = page.locator("table tbody tr");
  const rowCount = await allRows.count();

  for (let i = 0; i < rowCount; i++) {
    const status = statuses[i % statuses.length]; // siklus H, S, A
    const radio = allRows.nth(i).locator(`input[type="radio"][value="${status}"]`);
    const exists = await radio.count();
    if (exists > 0) {
      await radio.click();
    }
  }

  await page.waitForTimeout(600);
  await hideDevUI(page);
  await page.screenshot({ path: SS("04-isi-absensi"), fullPage: false });

  // 05 — klik Simpan (enabled karena ada perubahan A -> H/S)
  const btnSimpan = page.getByRole("button", { name: "Simpan" });
  await expect(btnSimpan).toBeEnabled({ timeout: 10000 });
  await btnSimpan.click();
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(800);
  await hideDevUI(page);
  await page.screenshot({ path: SS("05-setelah-simpan"), fullPage: false });

  // 06 — kembali ke list presensi
  const backBtn = page.getByRole("button", { name: "Go back" });
  await backBtn.click();
  await page.waitForLoadState("networkidle");
  await hideDevUI(page);
  await page.screenshot({ path: SS("06-kembali-list"), fullPage: false });
});
