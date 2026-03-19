# Release Automation System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a reusable `/release` skill that Claude invokes at session close to auto-detect, version-bump, and generate release artifacts (changelog + WA channel text) for any project.

**Architecture:** A global skill at `~/.claude/skills/release/SKILL.md` reads `.release-config.json` from the project root, analyzes git changes since last release, determines semver bump, and generates bilingual release artifacts. Each project opts in via a one-liner in CLAUDE.md pointing to `docs/claude/release-workflow.md`.

**Tech Stack:** Claude Code skills (Markdown), JSON config, git log analysis, no runtime dependencies.

---

## Task 1: Create global release skill

**Files:**
- Create: `~/.claude/skills/release/SKILL.md`

**Step 1: Create the skill file**

```markdown
---
name: release
description: Use at session close when user-facing changes exist since last release. Determines semver bump, updates package.json version, generates changelog entry and bilingual WA channel text. Invoke with /release or automatically at session close.
---

# Release Skill

## When to invoke
Invoke this skill at session close if:
- There are commits since the last release that changed user-facing behavior
- "User-facing" means: new features, bug fixes, UI changes, performance improvements visible to users
- SKIP if only: refactoring, test changes, documentation, dependency updates, config changes

To detect last release: check `"version"` in `package.json` (or `changelog.md` first entry if no package.json).
To detect changes: `git log` from last release commit to HEAD, read diffs with `git diff`.

## Process

### Step 1: Read config
Read `.release-config.json` from project root. If not found, use defaults:
```json
{
  "changelog": "docs/marketing/changelog.md",
  "channel": "docs/marketing/channel.md",
  "versionFile": "package.json",
  "projectName": "[infer from package.json name or directory name]",
  "projectDescription": "[infer from README or package.json description]",
  "language": "bilingual"
}
```

### Step 2: Analyze changes
Run: `git log --oneline` from last release tag/version to HEAD.
Read actual diffs to understand user-facing impact, not just commit labels.

### Step 3: Determine semver bump
Evaluate based on user-facing impact:

| Bump | Criteria |
|---|---|
| **major** (x.0.0) | Breaking change, complete redesign, data migration required |
| **minor** (x.y.0) | New feature visible to user, new page, new filter, new export |
| **patch** (x.y.z) | Bug fix, small UX improvement, performance fix, text change |

### Step 4: Generate artifacts

#### New version string
Increment `version` in `versionFile` according to bump.

#### Changelog entry (prepend to changelog file)
```markdown
## [x.y.z] — YYYY-MM-DD

### Added
- **Feature Name**: Description of what was added

### Fixed
- **Bug Name**: Description of what was fixed

### Improved
- **Item**: Description of improvement
```
Only include sections that have entries. Use English. Be technical but concise.

#### WA channel text (prepend to channel file)
Format based on `language` config:

**bilingual:**
```
*Update vX.Y.Z — [Short Title in English]*

🇮🇩 *[Judul dalam Bahasa Indonesia]*

[Fitur Baru / Perbaikan / Peningkatan]
- Item 1
- Item 2

🇬🇧 *[Title in English]*

[New Features / Fixes / Improvements]
- Item 1
- Item 2
```

**id only:** Indonesian section only (no flag emoji header needed, just `*Update vX.Y.Z*`)
**en only:** English section only

Use friendly, non-technical language for WA text. Use relevant emoji sparingly.

### Step 5: Preview and confirm
Show the user:
1. Proposed version: `1.8.1 → 1.9.0` (with reason: "new X feature")
2. Changelog entry preview
3. WA channel text preview

Ask: "Lanjutkan release? (y/n)"

### Step 6: Write files
On confirmation:
1. Update version in `versionFile`
2. Prepend changelog entry to `changelog` file
3. Prepend WA text to `channel` file

Do NOT commit. Show git status and suggested commit message:
```
git add <versionFile> <changelog> <channel>
git commit -m "chore: release vX.Y.Z"
```

## Error handling
- No `.release-config.json`: use defaults, proceed
- No `versionFile` (non-Node project): track version in changelog only, skip version file update
- No prior changelog entries: treat as first release after v1.0.0
- No user-facing changes found: say "Tidak ada perubahan user-facing sejak vX.Y.Z, skip release." and stop
```

**Step 2: Verify file was created**

Check that `~/.claude/skills/release/SKILL.md` exists and is readable.

**Step 3: Commit design doc**

```
git add docs/plans/2026-03-18-release-automation-design.md
git add docs/plans/2026-03-18-release-automation.md
git commit -m "docs: add release automation design and implementation plan"
```

---

## Task 2: Create `.release-config.json` for school-management

**Files:**
- Create: `.release-config.json`

**Step 1: Create config file**

```json
{
  "changelog": "docs/marketing/changelog.md",
  "channel": "docs/marketing/channel.md",
  "versionFile": "package.json",
  "projectName": "Generus Mandiri",
  "projectDescription": "Sistem manajemen sekolah digital untuk program pendidikan LDII",
  "language": "bilingual"
}
```

**Step 2: Commit**

```
git add .release-config.json
git commit -m "chore: add release config for Generus Mandiri"
```

---

## Task 3: Create `docs/claude/release-workflow.md` for school-management

**Files:**
- Create: `docs/claude/release-workflow.md`

**Step 1: Create file**

```markdown
# Release Workflow

At session close, evaluate whether user-facing changes since the last release
warrant a new version. If yes, invoke the `/release` skill.

## How to check
1. Read current version from `package.json`
2. Run `git log --oneline` to see commits since last session
3. If any commits touch feature code (not tests/docs/config), invoke `/release`

## Project notes
- Target audience: LDII religious education administrators, teachers, students
- WA channel tone: friendly, concise, use relevant emoji
- Avoid technical jargon in WA text (e.g. say "perbaikan tampilan" not "UI bug fix")
- Changelog: English, technical, for developer reference
```

**Step 2: Commit**

```
git add docs/claude/release-workflow.md
git commit -m "docs: add release workflow guide"
```

---

## Task 4: Update CLAUDE.md with release protocol pointer

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Add release protocol section**

Find the `## 🔧 Git Workflow & Commit Protocol` section in CLAUDE.md. Add a new section after it:

```markdown
## 🚀 Release Protocol

At session close, evaluate if changes since last release warrant a new version.
READ [`docs/claude/release-workflow.md`](docs/claude/release-workflow.md)
```

**Step 2: Verify CLAUDE.md stays under 300 lines**

Run: `wc -l CLAUDE.md`
Expected: under 300 lines

**Step 3: Commit**

```
git add CLAUDE.md
git commit -m "docs: add release protocol pointer to CLAUDE.md"
```

---

## Task 5: Test the skill — dry run on school-management

**This is a manual verification step, not code.**

**Step 1: Invoke `/release` skill**

In a new Claude Code session in this project, type `/release`.

**Step 2: Verify Claude:**
- Reads `.release-config.json` ✓
- Reads git log since v1.8.1 ✓
- Analyzes diffs and identifies user-facing changes ✓
- Proposes correct semver bump with reasoning ✓
- Shows changelog entry preview ✓
- Shows WA channel text preview (bilingual) ✓
- Asks for confirmation before writing ✓
- Writes files only after confirmation ✓
- Does NOT commit (shows suggested commit message only) ✓

**Step 3: If output looks wrong**, adjust `SKILL.md` and retry.

---

## Task 6: Document reuse instructions for future projects

**Files:**
- Modify: `~/.claude/skills/release/SKILL.md` (add a "Setup for new project" section)

**Step 1: Add setup section to global skill**

Append to `~/.claude/skills/release/SKILL.md`:

```markdown
---

## Setup for a new project

To enable this skill in any project, add these 3 things:

### 1. `.release-config.json` at project root
```json
{
  "changelog": "docs/marketing/changelog.md",
  "channel": "docs/marketing/channel.md",
  "versionFile": "package.json",
  "projectName": "Your Project Name",
  "projectDescription": "One-line description for WA context",
  "language": "bilingual"
}
```
Adjust paths as needed. For non-Node projects, set `"versionFile": null`.

### 2. `docs/claude/release-workflow.md`
```markdown
# Release Workflow
At session close, invoke `/release` if there are user-facing changes since last release.

## Project notes
- [Tone, audience, any special formatting notes]
```

### 3. One line in `CLAUDE.md`
```markdown
## 🚀 Release Protocol
At session close, evaluate if changes since last release warrant a new version.
READ [`docs/claude/release-workflow.md`](docs/claude/release-workflow.md)
```
```

**Step 2: No commit needed** (global skill file, not in repo)
```
