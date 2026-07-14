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

**TDD WAJIB** untuk business logic, permission, data transformation, algoritma, integrasi, fitur kritis. **SKIP** untuk: UI presentasional murni, getter/setter trivial, config, type definitions.

**Workflow**: RED (test gagal) → GREEN (kode minimal) → REFACTOR. **P0/P1 bug**: tulis E2E reproduksi (RED) → fix → verify (GREEN) → test jadi regression guard.

**Commands**: `npm run test:watch` | `npm run test:coverage` | `npm run test:ui`
**📖 Detail + contoh: READ [`docs/claude/testing-guidelines.md`](docs/claude/testing-guidelines.md)**

---

## 📦 Centralized Types (MANDATORY)

**ALL domain type definitions MUST live in `src/types/`.**
- Never redefine domain types inline in action files, components, or stores.
- Types must follow the **Base → Extended → Full** hierarchy pattern.
- **📖 For detailed type rules and architecture, READ [`src/types/README.md`](src/types/README.md)**

---

## 🦸 Superpowers (MANDATORY when using Claude Code)

**ALL relevant skills MUST be invoked via the `Skill` tool BEFORE any response or action.** Even a 1% chance a skill applies means you MUST invoke it first — this is non-negotiable.

**📖 For the full skill list, mandatory trigger table, and red flags, READ [`docs/claude/superpowers-workflow.md`](docs/claude/superpowers-workflow.md)**

---

## 🤖 Execution Mode Selection (MANDATORY)

**Tiap fitur/bug baru, urutan WAJIB:** (1) explore → (2) plan file `docs/plans/YYYY-MM-DD-<sm-id>-<feature>.md` (1 issue=1 file, JANGAN `~/.claude/plans/`) → (3) `bd create` + rename sesi `/rename <sm-id> <slug>` → (4) `gh issue create` title `[sm-id] type: desc` → (5) `bd update <id> --notes "GH-#XX: <url>"` → (6) prompt file `docs/prompts/YYYY-MM-DD-<sm-id>-<feature>.md` → (7) output pilihan **A** (Antigravity, ≥3 file/≥100 baris) / **B** (direct, ≤2 file & <100 baris).

> `bd` & `gh` BOLEH dieksekusi langsung (beda dari git — lihat Git Workflow). JANGAN pakai EnterPlanMode untuk plan (simpan ke `~/.claude/plans/`, salah lokasi) — pakai Read/Write/Edit langsung.

> **WAJIB prefix tanggal (`YYYY-MM-DD-`) untuk SEMUA file di `docs/plans/` & `docs/prompts/`** — termasuk file infra/DevOps/non-fitur yang dibuat MANUAL di luar new-feature-workflow (mis. cutover VM, self-host). Tanpa prefix = file tercecer, tak urut kronologis. Ambil tanggal dari hari pembuatan.

**Roles**: Claude Code = plan + issue + review · Antigravity = TDD + implementasi · User = git.
**📖 Full SOP + format A/B + plan format: READ [`docs/claude/antigravity-workflow.md`](docs/claude/antigravity-workflow.md)**

---

## 🔧 Git Workflow & Commit Protocol

**Claude Code TIDAK BOLEH** modifikasi repo state. **Read-only OK**: `git status/diff/log/show/branch`. **JANGAN**: `git add/commit/push/pull/merge/rebase`.

Setelah ubah kode: tampilkan `git status`/`git diff` + saran commit message (`Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`), user yang eksekusi git.

**Exception (boleh langsung)**: semua `bd` (`bd sync/create/update/close`) + `gh` (`gh issue/pr create/edit`). (Beads sync ke branch `beads-sync` otomatis — lihat Beads Management.)

---

## 🚀 Release Protocol

At session close, evaluate if changes since last release warrant a new version.
READ [`docs/claude/release-workflow.md`](docs/claude/release-workflow.md)

---

## 📚 Documentation Strategy

- **Roadmap**: [`docs/roadmap.md`](docs/roadmap.md) — status fitur + next up. Update tiap akhir sesi.
- **Realtime Presence**: Architecture (Zustand) and maintenance guidelines.
  - Technical: [`docs/technical/realtime-presence.md`](docs/technical/realtime-presence.md)
  - Claude Rules: [`docs/claude/realtime-presence.md`](docs/claude/realtime-presence.md)
**Inline limit**: Keep CLAUDE.md under **300 lines**. Use "READ [`file.md`]" pointers for external docs.

**Inline when**: High-frequency (>50% tasks), short & critical (<50 lines), quick lookup, core conventions.
**External when**: Low-frequency (<20% tasks), long & detailed (>50 lines), specialized, reference material.

---

## 📋 Beads Issue Management

Sync ke branch `beads-sync` otomatis (via worktree, BUKAN master) — master/feature branch aman, beads independen.

**Commands**: `bd ready` (cari task) · `bd close <id>` (jangan `bd delete`) · `bd sync`.
**JANGAN**: edit `.beads/*.jsonl` manual · ubah `sync-branch` di `.beads/config.yaml`. Progress → `.beads/progress/{id}.md`.

**📖 Full workflow (JSONL, git hooks, progress format): READ [`docs/claude/beads-workflow.md`](docs/claude/beads-workflow.md)**

---

## 🚨 CRITICAL: MCP Connection Check

**BEFORE running ANY Supabase operations**, check MCP connection using `mcp__generus-mandiri-v2__list_tables` or `mcp__better-planner__list_tables`. If it fails, inform user: "MCP Supabase belum terkoneksi. Silakan aktifkan MCP di settings Claude Code." Do NOT ask to restart.

---

## 📐 Type/Interface Management

**CRITICAL**: All domain types centralized in `src/types/`. For complete consolidation process, examples, and anti-patterns, READ [`docs/claude/architecture-patterns.md#type-management--organization`](docs/claude/architecture-patterns.md#type-management--organization)

**Quick Reference:**
- Search before creating: `grep -r "interface MyType" src/`
- Import canonical: `import type { MyType } from '@/types/[domain]'`
- Hierarchy pattern: EntityBase → EntityWithOrg → Entity
- See `src/types/README.md` for detailed guidelines

---

## 📚 Project Overview

**Generus Mandiri** is a Next.js 15 school management system for LDII religious education programs. It manages students, teachers, classes, attendance, reports, report cards (rapot), and materials (materi) with role-based access control using Supabase (PostgreSQL + Auth + RLS).

**Organizational Hierarchy**: Daerah (Region) → Desa (Village) → Kelompok (Group). Each admin level has access restricted to their scope and below.

---

## 🔧 Development Commands

```bash
npm run dev          # Dev server localhost:3000
npm run build        # Production build
npm run type-check   # TS check (no emit)
npm run fix:all      # Format + type-check
npm run test:run     # Unit tests once (Vitest); :watch :coverage :ui juga ada
npm run test:e2e     # E2E (Playwright); :ui :headed :debug juga ada
```

**📖 E2E setup + multi-role auth: READ [`tests/QUICK_START.md`](tests/QUICK_START.md)**

---

## 🏗️ Architecture Overview

### App Router Structure

Two layout groups: `(full-width-pages)` for auth pages, `(admin)` for protected pages (`/home`, `/presensi`, `/laporan`, `/users/*` (incl. `/users/siswa/qr-cards/template` for ID-card templates, `/users/siswa/[studentId]/qr` for per-student QR), `/kelas`, `/organisasi`, `/rapot`, `/materi`, `/kegiatan`, `/tracking`, `/naik-kelas`, `/tahun-ajaran`, `/notifikasi`, `/settings`, `/settings/grade-promotion`, `/onboarding`). Each feature directory co-locates `page.tsx`, `actions.ts`, `hooks/`, `stores/`, `components/`. `/naik-kelas` menu is toggle-gated (visible only when `app_settings.grade_promotion_enabled`).

### Database & Supabase

**Key Tables**: `profiles`, `students`, `classes`, `class_masters` (incl. `promote_to_class_master_id` for grade promotion; NULL = stopper), `class_master_mappings`, `meetings` (supports `class_ids` array; `start_time` + `check_time_enabled` gate late detection), `attendance_logs` (`check_in_time` — late = check_in_time > meeting.start_time when check_time_enabled), `id_card_templates` (QR/ID-card layouts, `TemplatePositions` JSON), `student_classes`, `student_enrollments` (per academic_year, UNIQUE student_id+academic_year_id+semester), `academic_years`, `teacher_classes`, `teacher_class_masters`, `teacher_kelompok_access`, `daerah`/`desa`/`kelompok`, `rapot_templates`, `rapot_data`, `materials`, `activity_logs`, `activity_types`, `activity_levels`, `teacher_activity_types`, `monthly_targets`, `app_settings` (key/value jsonb feature flags), `grade_promotion_logs` (immutable audit, RLS no UPDATE/DELETE), `notifications` (1 row per broadcast, fan-out storage), `notification_recipients` (1 row per recipient per notif, tracks is_read/is_dismissed).

**Supabase Clients**: `createClient()` from `client` (browser) or `server` (server actions with cookies), `createAdminClient()` from `server` (bypass RLS).

### Access Control

**Role Hierarchy**: superadmin → admin (daerah/desa/kelompok) → teacher → student.
- **Client**: Use `import { isSuperAdmin, ... } from '@/lib/userUtils'`
- **Server**: Use `import { canAccessFeature, getDataFilter } from '@/lib/accessControlServer'`
- **NEVER** import directly from `@/lib/accessControl.ts`

**For Hierarchical Teachers, Dashboard Metrics, Meeting Deduplication, READ [`docs/claude/architecture-patterns.md`](docs/claude/architecture-patterns.md)**

### State Management

**Zustand Stores** (some persisted to localStorage): `userProfileStore`, `sidebarStore`, `themeStore`, `languageStore`, `attendanceStore`, `absensiUIStore`, `siswaStore`, `kelasStore`, `guruStore`, `adminStore`, `laporanStore`, `organisasiStore`, `presenceStore` (realtime presence — use `usePresenceStore`, NEVER create Supabase channel directly).

**CRITICAL**: NEVER hardcode dates/months — always use `new Date()`. Default values should use helper functions. SWR keys centralized in `@/lib/swr.ts`. Cache cleared on login/logout via `clearUserCache()`.

### Data Fetching

Three patterns: (1) Server Action + SWR Hook for reads, (2) Direct Server Action for mutations with `mutate()` + `revalidatePath()`, (3) Custom SWR config with `revalidateOnFocus: false` and longer `dedupingInterval` for stable data.

**Standardized Responses**: ALL Server Actions MUST return `{ success, data, message }`. READ [`docs/claude/server-actions-conventions.md`](docs/claude/server-actions-conventions.md)

### UI Components & Utilities

**Components**: `components/ui/` (base), `components/form/input/`, `components/layouts/`, `components/charts/`, `components/shared/DataFilter.tsx` (centralized filter). Add to DataFilter only if reused across 2+ pages.

**🚨 JANGAN raw HTML untuk form.** Sebelum tulis `<input>`/`<select>`/`<button>`/`<input type=checkbox>`, WAJIB cek + pakai komponen existing: `InputFilter` (dropdown), `Checkbox` / `MultiSelectCheckbox`, `Button` (semua di `components/form/input/` & `components/ui/button/`). Raw HTML = inkonsisten styling/dark-mode.

**🚨 Halaman/route BARU WAJIB update 3 tempat navigasi** (sering terlupa): (1) `AppSidebar.tsx` `allNavItems[]`, (2) `home/components/QuickActions.tsx` `quickActions[]`, (3) `AppHeader.tsx` `getPageTitle()` switch. Lupa salah satu = menu/judul hilang.

**Key Utilities**: `classHelpers.ts` (isCaberawitClass, isTeacherClass, isSambungDesaEligible), `utils.ts` (cn, isMobile, etc.), `userUtils.ts` (getCurrentUserId, clearUserCache), `batchFetching.ts` (fetchAttendanceLogsInBatches — use for large datasets).

**Class Sort Order**: ALL class lists sorted by `class_master.sort_order`. NEVER use PostgREST nested join for this (silently fails). Use the two-query pattern — see `users/siswa/actions/classes.ts`.

---

## ⚠️ Important Business Rules

**YOU MUST READ [`docs/claude/business-rules.md`](docs/claude/business-rules.md)** before implementing features related to Students, Attendance (incl. jam-masuk/telat via `start_time`+`check_time_enabled`, QR scan-to-hadir), Transfers, Meetings, or Grade Promotion (deadline + pra-nikah bypass).

---

## 🔒 Security & Cache Management

All sensitive operations in server actions with permission checks. Use RLS for defense in depth. `createAdminClient()` only for cross-org admin ops. Use `revalidatePath()` after server mutations, `mutate()` for SWR, and `clearUserCache()` on login/logout.

---

## 🗄️ Database Operations

**READ [`docs/claude/database-operations.md`](docs/claude/database-operations.md)** for bulk user creation, auth user setup, migrations, and debugging queries.

Key: NEVER INSERT into `auth.users` without `auth.identities`. Use `''` for tokens, not NULL.

**Egress/bandwidth cost**: Supabase Free tier bills egress (5GB/mo). Before adding data-fetching code (new hooks, `revalidateOnFocus`, polling, realtime), READ [`docs/claude/egress-cost-optimization.md`](docs/claude/egress-cost-optimization.md) — egress scales with fetch size × frequency, not DB size.

---

## 🌍 Environment & Configuration

**Required** `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
**Optional**: `NEXT_PUBLIC_USE_DUMMY_DATA=false`, `NEXT_PUBLIC_UMAMI_WEBSITE_ID`, `NEXT_PUBLIC_SENTRY_DSN`
**Path Alias**: `@/*` maps to `src/*` — always use `@/` imports.

---

## 🛠️ Key Technologies

Next.js 15, React 19, TypeScript 5, Tailwind CSS 4, Supabase (PostgreSQL + Auth + RLS), SWR, Zustand, Vitest, Playwright, Ant Design, Recharts, @react-pdf/renderer, PWA, TipTap, dnd-kit, Sonner, Flatpickr, @sentry/nextjs.

---

## 📖 Additional Documentation

- **Testing**: [`docs/claude/testing-guidelines.md`](docs/claude/testing-guidelines.md)
- **E2E Testing**: [`tests/QUICK_START.md`](tests/QUICK_START.md) | [`tests/MULTI_ROLE_TESTING.md`](tests/MULTI_ROLE_TESTING.md) | [`docs/claude/e2e-testing-patterns.md`](docs/claude/e2e-testing-patterns.md)
- **Business Rules**: [`docs/claude/business-rules.md`](docs/claude/business-rules.md)
- **Database Operations**: [`docs/claude/database-operations.md`](docs/claude/database-operations.md)
- **Egress Cost Optimization**: [`docs/claude/egress-cost-optimization.md`](docs/claude/egress-cost-optimization.md)
- **Egress Story** (narasi lengkap investigasi dari awal → biang → 7 fix): [`docs/claude/egress-story.md`](docs/claude/egress-story.md)
- **Egress Register** (problems/fixes table + daily activity snapshots): [`docs/claude/egress-register.md`](docs/claude/egress-register.md)
- **Egress Daily Users** (per-user per-day activity 7-10 Jul + biang egress): [`docs/claude/egress-daily-users.md`](docs/claude/egress-daily-users.md)
- **Egress Previous Cycle** (per-day + per-user breakdown 7 Jun-7 Jul, spike analysis): [`docs/claude/egress-previous-cycle.md`](docs/claude/egress-previous-cycle.md)
- **Egress Tracking** (perkembangan MB/hari + MB/view dari data dashboard real): [`docs/claude/egress-tracking.md`](docs/claude/egress-tracking.md)
- **Egress MB per Day** (angka MB PASTI hover + MB/view + pembanding Sabtu-vs-Sabtu): [`docs/claude/egress-mb-per-day.md`](docs/claude/egress-mb-per-day.md)
- **Egress Audit Fase 2** (sweep 18 route: monitoring+materi = biang, naik-kelas aman rilis): [`docs/claude/egress-audit-phase2.md`](docs/claude/egress-audit-phase2.md)
- **Architecture Patterns**: [`docs/claude/architecture-patterns.md`](docs/claude/architecture-patterns.md)
- **Beads Workflow**: [`docs/claude/beads-workflow.md`](docs/claude/beads-workflow.md)
- **Type Management**: [`docs/claude/type-management.md`](docs/claude/type-management.md)
- **Antigravity Workflow**: [`docs/claude/antigravity-workflow.md`](docs/claude/antigravity-workflow.md)
- **Superpowers Workflow**: [`docs/claude/superpowers-workflow.md`](docs/claude/superpowers-workflow.md)
- **Dashboard Calculation**: [`docs/claude/dashboard-attendance-calculation-id.md`](docs/claude/dashboard-attendance-calculation-id.md)
- [x] Standardized Responses: [`docs/claude/server-actions-conventions.md`](docs/claude/server-actions-conventions.md)
- **Activity Logging**: [`docs/claude/activity-logging.md`](docs/claude/activity-logging.md)
- **UI Components & Icons**: READ [`docs/claude/ui-components.md`](docs/claude/ui-components.md) — icon system, form components, NotificationBanner, DropdownItem rules
- **Page Structure**: READ [`docs/claude/page-structure-conventions.md`](docs/claude/page-structure-conventions.md) — outer div pattern, mobile padding, new-page checklist


<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:7510c1e2 -->
## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Session Completion

**When ending a work session**, you MUST complete ALL steps below. Work is NOT complete until `git push` succeeds.

**MANDATORY WORKFLOW:**

1. **File issues for remaining work** - Create issues for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **PUSH TO REMOTE** - This is MANDATORY:
   ```bash
   git pull --rebase
   git push
   git status  # MUST show "up to date with origin"
   ```
5. **Clean up** - Clear stashes, prune remote branches
6. **Verify** - All changes committed AND pushed
7. **Hand off** - Provide context for next session

**CRITICAL RULES:**
- Work is NOT complete until `git push` succeeds
- NEVER stop before pushing - that leaves work stranded locally
- NEVER say "ready to push when you are" - YOU must push
- If push fails, resolve and retry until it succeeds
<!-- END BEADS INTEGRATION -->
