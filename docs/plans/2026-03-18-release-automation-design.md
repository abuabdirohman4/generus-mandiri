# Release Automation System — Design Doc

**Date**: 2026-03-18
**Status**: Approved
**Scope**: Global (reusable across all projects)

---

## Problem

Version releases are done manually and inconsistently. Marketing artifacts (changelog, WA channel text) get out of sync with actual code changes. No standard process exists across projects.

## Goal

A reusable release automation system where Claude:
1. Detects at session close whether changes warrant a new release
2. Determines the correct semver bump (major/minor/patch)
3. Generates all release artifacts automatically
4. Works across any project type (Next.js, mobile, backend, etc.)

---

## Architecture

### Components

| Component | Location | Scope |
|---|---|---|
| `SKILL.md` | `~/.claude/skills/release/SKILL.md` | Global — all projects |
| `.release-config.json` | `<project-root>/` | Per project |
| `release-workflow.md` | `docs/claude/release-workflow.md` | Per project |
| 1-line pointer | `CLAUDE.md` | Per project |

### Flow

```
Session close
    → Claude evaluates: any user-facing changes since last release?
    → If yes: invoke /release skill
        → Read .release-config.json (or use defaults)
        → Read git log + diff since last release
        → Analyze change impact
        → Determine semver bump
        → Generate: package.json bump, changelog entry, WA channel text
        → Show preview to user
        → User confirms → write files
    → If no: skip silently
```

---

## Semver Rules (AI-determined)

Claude evaluates based on **user-facing impact**, not commit labels:

| Change Type | Bump | Examples |
|---|---|---|
| Breaking change, major UI overhaul, data migration | **major** (x.0.0) | New auth system, complete page redesign |
| New feature visible to user | **minor** (x.y.0) | New filter, new page, new export format |
| Bug fix, performance improvement, small UX tweak | **patch** (x.y.z) | Fix crash, fix wrong data display |

**Skip release** (no version bump) for:
- Pure refactoring (no user impact)
- Test additions/changes
- Documentation only
- Internal config/dependency updates

---

## Config File: `.release-config.json`

```json
{
  "changelog": "docs/marketing/changelog.md",
  "channel": "docs/marketing/channel.md",
  "versionFile": "package.json",
  "projectName": "Project Name",
  "projectDescription": "One-line description for WA channel context",
  "language": "bilingual"
}
```

**Defaults** (if file not present):
- `changelog`: `docs/marketing/changelog.md`
- `channel`: `docs/marketing/channel.md`
- `versionFile`: `package.json` (if exists), else version tracked in changelog
- `language`: `bilingual`

**`language` options**:
- `bilingual` — generate WA text in both ID and EN
- `id` — Indonesian only
- `en` — English only

---

## Output Artifacts

### 1. `package.json` version bump
Simple semver increment in `"version"` field.

### 2. `changelog.md` entry (English, technical)

```markdown
## [x.y.z] — YYYY-MM-DD

### Added
- **Feature Name**: Description

### Fixed
- **Bug Name**: Description

### Improved
- **Improvement Name**: Description
```

### 3. `channel.md` entry (WA bilingual, friendly)

```
*Update vX.Y.Z — [Short Title]*

🇮🇩 Bahasa Indonesia:
[Fitur Baru / Perbaikan / Peningkatan in friendly tone with emoji]

🇬🇧 English:
[Same content in English, friendly tone with emoji]
```

---

## CLAUDE.md Integration (per project)

Add to each project's CLAUDE.md:

```markdown
## 🚀 Release Protocol
At session close, evaluate if changes since last release warrant a new version.
READ [`docs/claude/release-workflow.md`](docs/claude/release-workflow.md)
```

---

## `release-workflow.md` (per project)

Minimal file, just pointers + project-specific overrides:

```markdown
# Release Workflow

Invoke the `/release` skill at session close if there are user-facing changes
since the last release (check `package.json` version and `changelog.md`).

## Project-Specific Notes
- [Any overrides, e.g. tone, emoji style, target audience]
```

---

## Decisions

- **Why global skill, not per-project script**: Reusable across all projects without duplication. Skills live in `~/.claude/skills/`.
- **Why `.release-config.json` not in CLAUDE.md**: Keeps CLAUDE.md clean. Config is structured data, better as JSON.
- **Why AI determines semver**: Commit message discipline is inconsistent. AI reading actual diffs is more reliable.
- **Why bilingual WA**: User's projects serve Indonesian-speaking community but may have English-speaking contributors.
- **Why preview before write**: Release is irreversible once pushed. User must confirm.
