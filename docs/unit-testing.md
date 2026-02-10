 ---
  📋 Penjelasan Singkat: Rencana Implementasi Unit Testing

  🎯 Tujuan

  Menambahkan unit testing ke aplikasi Generus Mandiri untuk:
  - ✅ Mencegah bug di logic critical (permissions, attendance calculation, class eligibility)
  - ✅ Mempermudah refactoring dengan confidence
  - ✅ Dokumentasi otomatis tentang "how code should behave"
  - ✅ Faster debugging (test fails = tahu langsung mana yang broken)

  🛠️ Tools yang Dipilih

  - Vitest - Test runner modern, cepat, built-in TypeScript support
  - @testing-library/react - Test React components dengan best practices
  - MSW - Mock Supabase API calls (untuk server actions nanti)

  Kenapa Vitest, bukan Jest?
  - ⚡ Lebih cepat (menggunakan Vite)
  - 🔄 Better Next.js 15 + React 19 compatibility
  - 📦 Less configuration needed
  - ✅ Compatible dengan testing-library ecosystem

  📊 Strategi: Test Yang Paling Bernilai Dulu

  Priority 1: Pure Utility Functions ⭐⭐⭐ (Mulai dari sini!)
  src/lib/utils/classHelpers.ts          → Test business logic class eligibility
  src/lib/accessControlServer.ts         → Test permissions (CRITICAL!)
  src/lib/utils/attendanceCalculation.ts → Test perhitungan kehadiran
  src/lib/utils/batchFetching.ts         → Test batch logic

  Kenapa mulai dari sini?
  - ✅ Paling mudah di-test (no mocking needed)
  - ✅ ROI tinggi (salah hitung = laporan salah semua)
  - ✅ Cepat dapat hasil (1-2 jam bisa cover semua)
  - ✅ Foundation untuk TDD ke depannya

  Priority 2: Zustand Stores ⭐⭐
  src/app/(admin)/absensi/stores/attendanceStore.ts
  src/stores/userProfileStore.ts
  - Test state transitions
  - Mock localStorage

  Priority 3: Server Actions ⭐ (Nanti, butuh MSW setup)
  - Mock Supabase dengan MSW
  - Test error handling

  Priority 4: Components (Optional, E2E mungkin lebih baik)

  🗺️ Roadmap Implementasi (3 Fase)

  Fase 1: Foundation (sm-qrt, sm-37l) - Est. 2-3 jam

  1. Install dependencies (Vitest, testing-library)
  2. Setup vitest.config.ts + vitest.setup.ts
  3. Update package.json scripts
  4. Update CLAUDE.md dengan dokumentasi strategi
  5. Test run: npm run test (should work, 0 tests)

  Fase 2: Quick Wins (sm-6gn) - Est. 3-4 jam

  1. Test classHelpers.ts (~20 test cases)
    - isCaberawitClass() dengan berbagai input
    - isTeacherClass() edge cases
    - isSambungDesaEligible() combinations
  2. Test accessControlServer.ts (~15 test cases)
    - canAccessFeature() untuk setiap role
    - getDataFilter() organizational filters
    - canManageMaterials() permissions
  3. Coverage report: npm run test:coverage
  4. Celebrate! 🎉 (sudah punya ~50-70% coverage di utility functions)

  Fase 3: Expand (Future beads) - Ongoing

  - Test attendance calculation logic
  - Test batch fetching
  - Add MSW for server actions
  - Test Zustand stores
  - Consider E2E tests (Playwright) untuk user flows

  📈 Success Metrics

  Short-term (setelah Fase 2):
  - ✅ Utility functions: 90%+ coverage
  - ✅ Access control: 95%+ coverage
  - ✅ CI/CD: Tests run on every push
  - ✅ Team confidence: Bisa refactor tanpa takut break things

  Long-term:
  - ✅ Overall project: 70%+ coverage
  - ✅ New features: Include tests automatically
  - ✅ Bug fixes: Write regression test first (TDD)

  🚀 Kenapa Pendekatan Ini Efektif?

  1. Start Small, Scale Fast - 3-4 jam bisa cover logic paling critical
  2. Immediate Value - Langsung dapat safety net untuk refactoring
  3. Low Risk - Mulai dari pure functions (no API, no DB, no side effects)
  4. Momentum - Quick wins → motivation → expand gradually
  5. Practical - Fokus ke code yang sering berubah/bug-prone

 ---