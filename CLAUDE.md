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

**CRITICAL**: Avoid type fragmentation. For complete rules on centralizing types, checking before creating, and type hierarchy, READ [`docs/claude/type-management.md`](docs/claude/type-management.md)

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
npm run test             # Tests in watch mode
npm run test:run         # Tests once (CI/CD)
npm run test:coverage    # Coverage report
```

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

Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, Supabase (PostgreSQL + Auth + RLS), SWR, Zustand, Vitest, Ant Design, Recharts, @react-pdf/renderer, PWA, TipTap, dnd-kit, Sonner, Flatpickr.

---

## 📖 Additional Documentation

- **Testing**: [`docs/claude/testing-guidelines.md`](docs/claude/testing-guidelines.md)
- **Business Rules**: [`docs/claude/business-rules.md`](docs/claude/business-rules.md)
- **Database Operations**: [`docs/claude/database-operations.md`](docs/claude/database-operations.md)
- **Architecture Patterns**: [`docs/claude/architecture-patterns.md`](docs/claude/architecture-patterns.md)
- **Beads Workflow**: [`docs/claude/beads-workflow.md`](docs/claude/beads-workflow.md)
- **Type Management**: [`docs/claude/type-management.md`](docs/claude/type-management.md)
- **Dashboard Calculation**: [`docs/claude/dashboard-attendance-calculation-id.md`](docs/claude/dashboard-attendance-calculation-id.md)
