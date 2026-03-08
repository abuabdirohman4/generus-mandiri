 Baik, saya rangkum plan refactoring dan urutan beads issues yang sudah kita buat:

  📋 Beads Issues - God File Decomposition Refactoring

  Execution Order (by dependency):

  ┌─────────────────────────────────────────────────┐
  │ 1. sm-vpo (PILOT) - Ready to work              │
  │    Split absensi/actions.ts → actions/ folder  │
  │    Priority: P2                                 │
  └─────────────────────────────────────────────────┘
                      ↓ blocks
          ┌───────────┴───────────┐
          ↓                       ↓
  ┌──────────────────┐   ┌──────────────────┐
  │ 2. sm-dsw        │   │ 3. sm-9o0        │
  │ Split siswa      │   │ Split laporan    │
  │ Priority: P2     │   │ Priority: P2     │
  └──────────────────┘   └──────────────────┘
          ↓                       ↓
          └───────────┬───────────┘
                      ↓
          ┌───────────┴───────────┐
          ↓                       ↓
  ┌──────────────────┐   ┌──────────────────┐
  │ 4. sm-uk4        │   │ 5. sm-s3y        │
  │ Split remaining  │   │ Extract types    │
  │ Priority: P3     │   │ Priority: P3     │
  └──────────────────┘   └──────────────────┘
          ↓                       ↓
          └───────────┬───────────┘
                      ↓
          ┌───────────┴───────────┐
          ↓                       ↓
  ┌──────────────────┐   ┌──────────────────┐
  │ 6. sm-4tl        │   │ 7. sm-5nw        │
  │ Update docs      │   │ Type audit       │
  │ Priority: P4     │   │ Priority: P2     │
  └──────────────────┘   └──────────────────┘

  Detailed Execution Plan:

  Session 1: Pilot (sm-vpo)
  bd ready  # Should show sm-vpo
  bd update sm-vpo --status=in_progress
  - Split absensi/actions.ts (2,524 lines) → actions/meetings.ts + actions/attendance.ts
  - Apply 3-layer pattern (queries, business logic, server actions)
  - Create actions/index.ts for re-exports
  - Extract types to src/types/meeting.ts, src/types/attendance.ts
  - Write tests for Layer 2 pure functions
  - Manual test in browser
  bd close sm-vpo

  Session 2: Siswa (sm-dsw)
  bd ready  # sm-dsw now unblocked
  bd update sm-dsw --status=in_progress
  - Split users/siswa/actions.ts (1,682 lines) → actions/students.ts + actions/biodata.ts
  - Consolidate existing actions/classes.ts + actions/management.ts
  - Extract transformStudentsData() to utils/
  - Follow same 3-layer pattern as pilot
  bd close sm-dsw

  Session 3: Laporan (sm-9o0)
  bd update sm-9o0 --status=in_progress
  - Split laporan/actions.ts (1,111 lines, one 950-line function!)
  - Break monster function into sub-functions by period type
  - Create actions/reports.ts with extracted business logic
  bd close sm-9o0

  Session 4: Remaining (sm-uk4)
  bd update sm-uk4 --status=in_progress
  - Split remaining files: materi, rapot/templates, guru, dashboard, admin
  - Apply same 3-layer pattern (now well-established)
  bd close sm-uk4

  Session 5: Type Extraction (sm-s3y)
  bd ready  # sm-s3y unblocked after sm-vpo done
  bd update sm-s3y --status=in_progress
  - Consolidate all types extracted during refactoring
  - Move to src/types/ (meeting.ts, attendance.ts, etc.)
  - Verify no duplicate type definitions remain
  bd close sm-s3y

  Session 6: Documentation (sm-4tl)
  bd ready  # sm-4tl unblocked after all splits done
  bd update sm-4tl --status=in_progress
  - Update docs/claude/architecture-patterns.md with 3-layer pattern
  - Update CLAUDE.md with pointer to pattern
  - Document colocation rules
  bd close sm-4tl

  Session 7: Type Audit (sm-5nw)
  bd ready  # sm-5nw unblocked after sm-s3y
  bd update sm-5nw --status=in_progress
  - Comprehensive audit (User, Class, Organization types)
  - Verify single source of truth for all entity types
  - Update CLAUDE.md with type guidelines
  - Create src/types/README.md
  bd close sm-5nw

  Issues Closed (Already Done):

  - ✅ sm-a0y: Absensi optimization (superseded by sm-vpo)
  - ✅ sm-mln: Siswa repository pattern (superseded by sm-dsw)
  - ✅ sm-ee7: Teacher hierarchy (deferred, focus on refactoring first)

  Reference Document:

  📄 Plan: docs/plan/refactoring-god-file-decomposition.md