CONTEXT:
Saya mengerjakan Generus Mandiri - Next.js 15 school management system dengan Supabase backend.

CRITICAL: Baca @CLAUDE.md untuk SEMUA coding rules, patterns, dan constraints.

TASK:
Eksekusi implementation plan di @docs/plans/2026-07-28-sm-g5pj-rich-editor-font-arabic-materi.md

Ubah konten Sub Materi (`MaterialItem.content`) dari flat plain-text jadi rich editor dengan font picker. Reuse komponen `RichTextEditor` (TipTap) yang sudah dipakai di pengumuman/notifikasi — extend dengan prop opt-in `enableFontFamily`, JANGAN bikin komponen baru dan JANGAN ubah perilaku pengumuman. Font: Default (Outfit), Amiri, Scheherazade New (keduanya OFL, via next/font/google). Sekaligus perbaiki bug `font-arabic` yang dipakai di MaterialCard.tsx:39 tapi tak pernah didefinisikan.

ISSUE: sm-g5pj / GH-#157
BRANCH: feat/sm-g5pj-rich-editor-font-arabic-materi

REQUIREMENTS:
1. Ikuti plan task-by-task secara berurutan (Task 1 → Task 9)
2. Terapkan TDD ketat pada Task 5 (sanitizer): RED → GREEN → REFACTOR
3. Jalankan test setelah task yang menyentuh logika: npm run test:run
4. Jangan lanjut jika ada test FAIL
5. JANGAN raw HTML untuk form — dropdown font pakai komponen existing (InputFilter/Select di components/form/input/), bukan raw <select>
6. Setelah semua task: npm run type-check
7. Output per task: "✅ Task N complete: [ringkasan]"
8. JANGAN deviate dari plan tanpa approval user
9. JANGAN bundle font "International Arabic" (proprietary Microsoft) — hanya Amiri + Scheherazade New (OFL)

REFERENCE FILES:
- Plan: @docs/plans/2026-07-28-sm-g5pj-rich-editor-font-arabic-materi.md
- Rules: @CLAUDE.md
- Architecture (Material naming, permissions): @docs/claude/architecture-patterns.md
- UI components rules: @docs/claude/ui-components.md
- Komponen yang di-reuse: @src/components/ui/rich-text-editor/RichTextEditor.tsx
- Sanitizer: @src/lib/htmlText.ts
- Form materi: @src/app/(admin)/materi/components/modals/ItemModal.tsx
- View materi: @src/app/(admin)/materi/components/modals/ContentViewModal.tsx

Mulai dari Task 1.
