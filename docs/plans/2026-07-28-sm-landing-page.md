# Landing Page Route `/landing`

**Beads**: sm-??? (TBD)
**GH**: #??? (TBD)
**Branch**: `feat/sm-???-landing-page`
**Date**: 2026-07-28

---

## Context

Buat halaman marketing statis di route `/landing` yang bisa diakses publik (tanpa login). Route default `/` tetap ke `/login` — tidak berubah. Landing page ini di-share via link ke calon mitra/admin LDII baru.

Target audience: pengurus LDII yang belum kenal sistem, ingin tahu value sebelum minta akses.

---

## Scope

**1 file baru saja**: `src/app/(full-width-pages)/landing/page.tsx`

Tidak ada:
- Server action
- DB fetch
- Auth check
- Update sidebar/quick actions/getPageTitle (bukan protected route)
- Tests (UI presentasional murni — TDD dikecualikan)

---

## Task 1 — Buat `src/app/(full-width-pages)/landing/page.tsx`

File path: `src/app/(full-width-pages)/landing/page.tsx`

Layout grup `(full-width-pages)` sudah ada, layout-nya cuma `<div>{children}</div>`. File ini langsung di-serve di `/landing`.

### Struktur halaman (mobile-first, Tailwind CSS 4)

```
<main>
  1. Hero section (headline + sub + CTA)
  2. Features section (3 pain → 3 solution)
  3. Hierarchy section (visual Daerah → Desa → Kelompok)
  4. CTA bottom (contact/request demo)
  5. Footer minimal
</main>
```

### Kode lengkap

```tsx
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Generus Mandiri — Sistem Digital Generus LDII",
  description:
    "Kelola presensi santri, laporan otomatis, dan rapot digital untuk program pendidikan agama LDII.",
};

const features = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: "Presensi QR Otomatis",
    pain: "Presensi manual pakai kertas, rawan hilang dan susah direkap.",
    solution: "Scan QR dari HP — santri langsung tercatat, rekap otomatis.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Laporan & Rapot Digital",
    pain: "Rekap kehadiran dan nilai dikerjakan manual setiap akhir semester.",
    solution: "Laporan kehadiran dan rapot tersedia otomatis, bisa diunduh PDF.",
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    title: "Manajemen Terpadu",
    pain: "Data siswa, kelas, dan pengajar tersebar di banyak tempat.",
    solution: "Satu sistem untuk siswa, guru, kelas, materi, hingga kenaikan kelas.",
  },
];

const hierarchy = [
  { level: "Daerah", desc: "Pengawas tingkat regional", color: "bg-brand-700" },
  { level: "Desa", desc: "Koordinator tingkat desa", color: "bg-brand-600" },
  { level: "Kelompok", desc: "Pengajar & admin kelas", color: "bg-brand-500" },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Nav minimal */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-5xl mx-auto">
        <span className="font-bold text-lg text-brand-700 dark:text-brand-400">
          Generus Mandiri
        </span>
        <Link
          href="/signin"
          className="text-sm font-medium text-brand-700 dark:text-brand-400 hover:underline"
        >
          Masuk →
        </Link>
      </nav>

      {/* Hero */}
      <section className="px-6 py-16 max-w-5xl mx-auto text-center">
        <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
          Kelola Santri Tanpa{" "}
          <span className="text-brand-700 dark:text-brand-400">Ribet</span>
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-lg max-w-xl mx-auto mb-8">
          Sistem digital untuk program pendidikan agama LDII — presensi QR,
          laporan otomatis, rapot digital, satu platform.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signin"
            className="inline-block bg-brand-700 hover:bg-brand-800 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
          >
            Masuk ke Sistem
          </Link>
          <a
            href="mailto:crewabcdua@gmail.com?subject=Request%20Demo%20Generus%20Mandiri"
            className="inline-block border border-brand-700 text-brand-700 dark:text-brand-400 dark:border-brand-400 font-semibold px-8 py-3 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-950 transition-colors"
          >
            Minta Demo
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12">
            Solusi untuk Masalah yang Sudah Lama Ada
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {features.map((f) => (
              <div
                key={f.title}
                className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm"
              >
                <div className="text-brand-700 dark:text-brand-400 mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 line-through">
                  {f.pain}
                </p>
                <p className="text-gray-700 dark:text-gray-300 text-sm">
                  ✓ {f.solution}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hierarchy */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-4">
          Didesain untuk Struktur LDII
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-center mb-10 max-w-lg mx-auto">
          Setiap level punya akses sesuai wewenangnya — tidak lebih, tidak
          kurang.
        </p>
        <div className="flex flex-col items-center gap-0">
          {hierarchy.map((h, i) => (
            <div key={h.level} className="flex flex-col items-center">
              <div
                className={`${h.color} text-white rounded-xl px-10 py-4 text-center shadow-sm`}
                style={{ width: `${100 - i * 15}%`, maxWidth: 400 }}
              >
                <div className="font-bold text-lg">{h.level}</div>
                <div className="text-sm opacity-90">{h.desc}</div>
              </div>
              {i < hierarchy.length - 1 && (
                <div className="w-0.5 h-4 bg-gray-300 dark:bg-gray-600" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA Bottom */}
      <section className="px-6 py-16 bg-brand-700 text-white text-center">
        <h2 className="text-2xl font-bold mb-3">Siap Memulai?</h2>
        <p className="text-brand-100 mb-8 max-w-md mx-auto">
          Hubungi kami untuk demo atau akses — gratis untuk komunitas LDII.
        </p>
        <a
          href="mailto:crewabcdua@gmail.com?subject=Request%20Akses%20Generus%20Mandiri"
          className="inline-block bg-white text-brand-700 font-semibold px-8 py-3 rounded-lg hover:bg-brand-50 transition-colors"
        >
          Hubungi Kami
        </a>
      </section>

      {/* Footer */}
      <footer className="px-6 py-6 text-center text-sm text-gray-400 dark:text-gray-600">
        © {new Date().getFullYear()} Generus Mandiri · Sistem Digital LDII
      </footer>
    </main>
  );
}
```

---

## CLAUDE.md Check

- [ ] Pattern baru diperkenalkan? → Tidak. Halaman statis di `(full-width-pages)` sudah ada pola (signin, signup).
- [ ] Tabel DB baru? → Tidak.
- [ ] Route baru? → Ya: `/landing` — tapi bukan protected route, tidak perlu update sidebar/QuickActions/getPageTitle.
- [ ] Permission pattern baru? → Tidak.
