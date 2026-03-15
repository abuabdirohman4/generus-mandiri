# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🚨 CRITICAL: CLAUDE.md MAINTENANCE RULES (PREVENT BLOAT)

**NEVER append feature-specific documentation, long code snippets, or detailed business logic directly to this file.** This file is strictly a **Master Index** and must remain under 300 lines to optimize the AI context window. When instructed to document new knowledge, you MUST route it to the correct external file:

- ❌ **DON'T** add business rules here. ✅ **DO** update `docs/claude/business-rules.md`
- ❌ **DON'T** add testing/TDD examples here. ✅ **DO** update `docs/claude/testing-guidelines.md`
- ❌ **DON'T** add architecture edge cases here. ✅ **DO** update `docs/claude/architecture-patterns.md`
- ❌ **DON'T** add SQL/Supabase queries here. ✅ **DO** update `docs/claude/database-operations.md`
- ❌ **DON'T** add beads/git workflow details here. ✅ **DO** update `docs/claude/beads-workflow.md`

**How to update this file correctly:** If you must document a completely new domain, create a new file in `docs/claude/` and add exactly ONE pointer line here (e.g., *"For [Topic], READ `docs/claude/new-topic.md`"*). **Do not dump the content here.**

## 🚨 MANDATORY: Test-Driven Development (TDD)

**ALL new features, business logic, and permission systems MUST be developed using TDD.**

- **Zero bugs on first implementation** - Tests catch issues before production
- **Clear requirements** - Tests serve as executable specifications
- **Safe refactoring** - Change code with confidence
- **Better design** - TDD forces modular, testable code

**TDD Workflow**: RED (write failing tests) → GREEN (implement minimal code) → REFACTOR (clean up)

**REQUIRED for**: Business logic, permission systems, data transformations, complex algorithms, integration points, critical features.
**SKIP for**: Pure presentational UI, trivial getters/setters, config files, type definitions.

**Commands**: `npm run test:watch` | `npm run test:coverage` | `npm run test:ui`

**📖 For detailed TDD examples and workflow, READ [`docs/claude/testing-guidelines.md`](docs/claude/testing-guidelines.md)**

---

## 🤖 Execution Mode Selection (MANDATORY)

**BEFORE implementing ANY feature/refactoring/task**, you MUST ask user:

> "Apakah Anda ingin saya yang langsung mengerjakan kode ini, atau menggunakan Google Antigravity untuk eksekusi?"

**Option A: Claude Code Direct Execution**
- Claude Code writes code immediately in this session
- Faster for small changes (1-3 files, <200 lines)
- Real-time feedback and iteration

**Option B: Google Antigravity Execution**
- Claude Code creates design doc + implementation plan (like `docs/plans/REFACTORING-QUICK-GUIDE.md`)
- User executes plan in Google Antigravity (parallel processing, longer context)
- Claude Code reviews results after completion
- Better for: Refactoring (3+ files), type extraction, large features

### Antigravity Execution Workflow

**1. Planning Phase (Claude Code):**
- Create design document: `docs/plans/YYYY-MM-DD-<topic>-design.md`
- Create implementation plan: `docs/plans/YYYY-MM-DD-<topic>-implementation-plan.md`
- Provide prompt templates below

**2. Execution Phase (User → Google Antigravity):**

Use this prompt template:
```
CONTEXT:
I'm working on [project name] - a Next.js 15 school management system.

CRITICAL: Read @CLAUDE.md in the repository for ALL coding rules, patterns, and constraints.

TASK:
Execute the implementation plan at @docs/plans/YYYY-MM-DD-<topic>-implementation-plan.md

REQUIREMENTS:
1. Follow the plan task-by-task sequentially
2. Verify each step before proceeding (run commands shown in plan)
3. Adhere to patterns in @CLAUDE.md (3-layer architecture, type management, TDD)
4. DO NOT deviate from the plan without explicit approval
5. After each major phase, output: "Phase N complete, proceeding to Phase N+1"

REFERENCE FILES:
- Design: @docs/plans/YYYY-MM-DD-<topic>-design.md
- Plan: @docs/plans/YYYY-MM-DD-<topic>-implementation-plan.md
- Rules: @CLAUDE.md
- Patterns: @docs/claude/architecture-patterns.md

Begin with Task 1 from the implementation plan.
```

**3. Review Phase (User → Claude Code):**

After Antigravity completes, use this prompt:
```
Google Antigravity sudah selesai mengeksekusi plan di @docs/plans/YYYY-MM-DD-<topic>-implementation-plan.md

Tolong review hasilnya menggunakan review checklist di design document (@docs/plans/YYYY-MM-DD-<topic>-design.md).

Fokus pada:
1. File structure - apakah semua file yang diharapkan ada?
2. Type completeness - apakah ada types yang terlewat?
3. Import updates - apakah semua imports sudah benar?
4. Build verification - jalankan npm run type-check dan npm run build
5. Documentation - apakah docs sudah di-update?

Jika ada masalah, berikan feedback spesifik untuk diperbaiki.
```

---

## 🔧 Git Workflow & Commit Protocol

**CRITICAL**: Claude Code MUST NOT execute git operations that modify repository state.

**Allowed (Read-Only)**: `git status`, `git diff`, `git log`, `git show`, `git branch`

**NEVER execute**: `git add`, `git commit`, `git push`, `git pull`, `git merge`, `git rebase`, or anything that modifies `.git/` or working tree.

**After code changes**: Show `git status`/`git diff`, provide suggested commit message (with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`), and inform user to run git commands manually.

**Exception**: `bd sync` (beads issue tracker) is allowed.

**Beads & Git Integration:**
- Beads syncs to `beads-sync` branch (dedicated sync branch, managed via worktree)
- Master is normal working branch - user can checkout/merge normally
- Feature branches work as expected - beads doesn't interfere
- `bd sync` commits to beads-sync automatically, NOT to user's current branch
- Never manually checkout or modify beads-sync branch

---

## 📚 Documentation Strategy

**Inline limit**: Keep CLAUDE.md under **300 lines**. Use "READ [`file.md`]" pointers for external docs.

**Inline when**: High-frequency (>50% tasks), short & critical (<50 lines), quick lookup, core conventions.
**External when**: Low-frequency (<20% tasks), long & detailed (>50 lines), specialized, reference material.

---

## 📋 Beads Issue Management

**Beads Sync Branch:** `beads-sync` (NOT master)
- Master is normal working branch - checkout anytime without conflicts
- Beads syncs to dedicated `beads-sync` branch automatically via worktree
- Work on feature branches normally, beads operates independently

**Key Commands:**
- `bd close <id>` - Close issue (never use `bd delete`)
- `bd sync` - Sync to remote (commits to beads-sync, not your branch)
- `bd ready` - Find ready tasks

**Critical Rules:**
- Never manually edit `.beads/*.jsonl` files
- Never change `sync-branch` config in `.beads/config.yaml`
- Progress files go in `.beads/progress/{issue-id}.md`

**For complete Beads workflow including JSONL structure, Git hooks, tombstone prevention, and progress documentation format, READ [`docs/claude/beads-workflow.md`](docs/claude/beads-workflow.md)**

---

## 🚨 CRITICAL: MCP Connection Check

**BEFORE running ANY Supabase operations**, check MCP connection using `mcp__generus-mandiri-v2__list_tables` or `mcp__better-planner__list_tables`. If it fails, inform user: "MCP Supabase belum terkoneksi. Silakan aktifkan MCP di settings Claude Code." Do NOT ask to restart.

---

## 📐 Type/Interface Management

**CRITICAL**: All domain types centralized in `src/types/`. For extraction rules and organization patterns, READ [`docs/claude/architecture-patterns.md#type-management--organization`](docs/claude/architecture-patterns.md#type-management--organization). For advanced type patterns (extends hierarchy, pre-flight checks), READ [`docs/claude/type-management.md`](docs/claude/type-management.md)

---

## 📚 Project Overview

**Generus Mandiri** is a Next.js 15 school management system for LDII religious education programs. It manages students, teachers, classes, attendance, reports, report cards (rapot), and materials (materi) with role-based access control using Supabase (PostgreSQL + Auth + RLS).

**Organizational Hierarchy**: Daerah (Region) → Desa (Village) → Kelompok (Group). Each admin level has access restricted to their scope and below.

---

## 🔧 Development Commands

```bash
npm run dev              # Dev server at localhost:3000
npm run build            # Production build
npm run type-check       # TypeScript check (no emit)
npm run format           # Format with Prettier
npm run fix:all          # Format + type-check

# Unit Tests (Vitest)
npm run test             # Tests in watch mode
npm run test:run         # Tests once (CI/CD)
npm run test:coverage    # Coverage report

# E2E Tests (Playwright)
npm run test:e2e         # Run E2E tests (headless)
npm run test:e2e:ui      # Run E2E tests (UI mode)
npm run test:e2e:headed  # Run E2E tests (headed browser)
npm run test:e2e:debug   # Run E2E tests (debug mode)
```

**📖 For E2E testing setup, multi-role authentication, and security best practices, READ [`tests/QUICK_START.md`](tests/QUICK_START.md)**

---

## 🏗️ Architecture Overview

### App Router Structure

Two layout groups: `(full-width-pages)` for auth pages, `(admin)` for protected pages (`/home`, `/absensi`, `/laporan`, `/users/*`, `/kelas`, `/organisasi`, `/rapot`, `/materi`, `/settings`). Each feature directory co-locates `page.tsx`, `actions.ts`, `hooks/`, `stores/`, `components/`.

### Database & Supabase

**Key Tables**: `profiles`, `students`, `classes`, `class_masters`, `class_master_mappings`, `meetings` (supports `class_ids` array), `attendance_logs`, `student_classes`, `teacher_classes`, `daerah`/`desa`/`kelompok`, `rapot_templates`, `rapot_data`, `materials`.

**Supabase Clients**: `createClient()` from `client` (browser) or `server` (server actions with cookies), `createAdminClient()` from `server` (bypass RLS).

### Access Control

**Role Hierarchy**: superadmin → admin (daerah/desa/kelompok) → teacher → student.
- **Client**: Use `import { isSuperAdmin, ... } from '@/lib/userUtils'`
- **Server**: Use `import { canAccessFeature, getDataFilter } from '@/lib/accessControlServer'`
- **NEVER** import directly from `@/lib/accessControl.ts`

**For Hierarchical Teachers, Dashboard Metrics, Meeting Deduplication, READ [`docs/claude/architecture-patterns.md`](docs/claude/architecture-patterns.md)**

### State Management

**Zustand Stores** (persisted to localStorage): `userProfileStore`, `sidebarStore`, `themeStore`, `languageStore`, `attendanceStore`, `absensiUIStore`, `siswaStore`, `kelasStore`, `guruStore`, `adminStore`, `laporanStore`, `organisasiStore`.

**CRITICAL**: NEVER hardcode dates/months — always use `new Date()`. Default values should use helper functions. SWR keys centralized in `@/lib/swr.ts`. Cache cleared on login/logout via `clearUserCache()`.

### Data Fetching

Three patterns: (1) Server Action + SWR Hook for reads, (2) Direct Server Action for mutations with `mutate()` + `revalidatePath()`, (3) Custom SWR config with `revalidateOnFocus: false` and longer `dedupingInterval` for stable data.

### UI Components & Utilities

**Components**: `components/ui/` (base), `components/form/input/`, `components/layouts/`, `components/charts/`, `components/shared/DataFilter.tsx` (centralized filter). Add to DataFilter only if reused across 2+ pages.

**Key Utilities**: `classHelpers.ts` (isCaberawitClass, isTeacherClass, isSambungDesaEligible), `utils.ts` (cn, isMobile, etc.), `userUtils.ts` (getCurrentUserId, clearUserCache), `batchFetching.ts` (fetchAttendanceLogsInBatches — use for large datasets).

**Class Sort Order**: ALL class lists sorted by `class_master.sort_order`. NEVER use PostgREST nested join for this (silently fails). Use the two-query pattern — see `users/siswa/actions/classes.ts`.

---

## ⚠️ Important Business Rules

**YOU MUST READ [`docs/claude/business-rules.md`](docs/claude/business-rules.md)** before implementing features related to Students, Attendance, Transfers, or Meetings.

---

## 🔒 Security & Cache Management

All sensitive operations in server actions with permission checks. Use RLS for defense in depth. `createAdminClient()` only for cross-org admin ops. Use `revalidatePath()` after server mutations, `mutate()` for SWR, and `clearUserCache()` on login/logout.

---

## 🗄️ Database Operations

**READ [`docs/claude/database-operations.md`](docs/claude/database-operations.md)** for bulk user creation, auth user setup, migrations, and debugging queries.

Key: NEVER INSERT into `auth.users` without `auth.identities`. Use `''` for tokens, not NULL.

---

## 🌍 Environment & Configuration

**Required** `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
**Optional**: `NEXT_PUBLIC_USE_DUMMY_DATA=false`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID`
**Path Alias**: `@/*` maps to `src/*` — always use `@/` imports.

---

## 🛠️ Key Technologies

Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, Supabase (PostgreSQL + Auth + RLS), SWR, Zustand, Vitest, Playwright, Ant Design, Recharts, @react-pdf/renderer, PWA, TipTap, dnd-kit, Sonner, Flatpickr.

---

## 📖 Additional Documentation

- **Testing**: [`docs/claude/testing-guidelines.md`](docs/claude/testing-guidelines.md)
- **E2E Testing**: [`tests/QUICK_START.md`](tests/QUICK_START.md) | [`tests/MULTI_ROLE_TESTING.md`](tests/MULTI_ROLE_TESTING.md)
- **Business Rules**: [`docs/claude/business-rules.md`](docs/claude/business-rules.md)
- **Database Operations**: [`docs/claude/database-operations.md`](docs/claude/database-operations.md)
- **Architecture Patterns**: [`docs/claude/architecture-patterns.md`](docs/claude/architecture-patterns.md)
- **Beads Workflow**: [`docs/claude/beads-workflow.md`](docs/claude/beads-workflow.md)
- **Type Management**: [`docs/claude/type-management.md`](docs/claude/type-management.md)
- **Dashboard Calculation**: [`docs/claude/dashboard-attendance-calculation-id.md`](docs/claude/dashboard-attendance-calculation-id.md)
