# Beads Issue Management & Progress Tracking

This document contains the complete Beads workflow standards for the Generus Mandiri project, including JSONL file structure, Git hooks, tombstone prevention, and progress documentation format.

---

## Beads Issue Management Standards

### JSONL File Structure & Automatic Processing

**Field Order & Status Sorting**: This project uses **custom git hooks** to automatically maintain consistent structure.

**Automatic Field Order** (applied on every commit):
1. `"id"` - Always first
2. `"status"` - Always second
3. All other fields follow (title, description, priority, etc.)

**Automatic Status Sorting** (applied on every commit):
Issues in `issues.jsonl` are automatically sorted by status:
1. **Closed issues** first (status = "closed")
2. **Open issues** second (status = "open")
3. **In Progress issues** third (status = "in_progress")
4. Within each status group, sorted by issue ID

**Example Correct Format**:
```jsonl
{"id":"sm-abc","status":"closed","title":"Feature X","description":"...","priority":2,"issue_type":"feature","created_at":"...","created_by":"...","updated_at":"..."}
{"id":"sm-xyz","status":"open","title":"Bug Y","description":"...","priority":1,"issue_type":"bug","created_at":"...","created_by":"...","updated_at":"..."}
```

### How Git Hooks Work

**Pre-commit hook** (`.git/hooks/pre-commit`):
1. Runs `bd sync --flush-only` to export pending changes
2. Reorders fields: `{id, status} + del(.id, .status)` using `jq`
3. Sorts issues by status (closed -> open -> in_progress)
4. **Filters out tombstones** (beads internal soft-delete markers)
5. Auto-stages modified JSONL files

**Post-merge hook** (`.git/hooks/post-merge`):
1. Imports `issues.jsonl` after git pull/merge
2. Also imports `closed.jsonl` to keep database in sync
3. Ensures database reflects latest git state

### Best Practices

- Use `bd close <id>` to close issues (NEVER `bd delete` for closed issues!)
- Run `bd sync` to commit and push changes
- Closed issues stay in beads database (not deleted)
- **NEVER manually edit** `.beads/*.jsonl` files (hooks will override)
- **NEVER use `bd delete`** on closed issues (creates tombstones)

### Tombstone Prevention

- **What are tombstones?** Beads' internal soft-delete markers (`status: "tombstone"`)
- **Why avoid them?** They clutter issues.jsonl and cause confusion
- **How we prevent them:**
  1. Never delete closed issues from database (keep them with status="closed")
  2. Pre-commit hook filters out any tombstones before git commit
  3. Post-merge hook imports both issues.jsonl and closed.jsonl
- **If tombstones appear:** Run `bd compact --prune --older-than 0` then re-import clean JSONL

### File Separation (Multi-file support)

- `.beads/issues.jsonl` - All issues (closed + open + in_progress)
- `.beads/closed.jsonl` - Backup of closed issues (for reference)
- **Important:** Beads stores ALL issues in `issues.jsonl` sorted by status

### Dependencies

- `jq` command-line JSON processor (already installed)
- If `jq` is not found, hook silently skips processing

---

## Beads Issue Progress Documentation Standard

**MANDATORY for all multi-session work tracked in Beads.**

### When to Create Progress Documentation

Create a progress file in `.beads/progress/` for ANY issue that:
- Spans multiple sessions (can't complete in one sitting)
- Has complex implementation steps (refactoring, architecture changes)
- Involves TDD workflow (track test/implementation progress)
- Has dependencies or blockers
- Needs context preservation across compaction

**Skip for**:
- Simple one-session tasks (quick fixes, single file changes)
- Trivial updates (typo fixes, documentation tweaks)

### File Naming Convention

**Location**: `.beads/progress/`
**Format**: `{issue-id}.md` (e.g., `sm-mln.md`, `sm-8yf.md`)

### Required Sections

```markdown
# {Issue Title} - Progress Summary

**Beads Issue**: {issue-id}
**Status**: {In Progress | Complete | Blocked}
**Total Tests**: {X passing}

## Completed - {Phase Name}

### {Step Number}. {Component Name} ({file-path})
**Purpose**: {What this does}

**Functions/Features Implemented**:
- `functionName()` - Description

**Tests**: {X tests, Y% coverage}

## Current Phase - {Phase Name}

### {Step Number}. {Component Name} - {Status}
**Purpose**: {What this does}

**Functions Implemented**:
- `completedFunction()` - Description
- `inProgressFunction()` - WIP
- `blockedFunction()` - Blocked by {reason}

**Tests**: {X tests (more tests needed)}

## Metrics

- **Lines of Code Created**: ~{X} lines
- **Test Coverage**: {Y}% overall
- **Tests Passing**: {X}/{Y}
- **Files Created**: {N} ({breakdown})

## Next Steps

1. **Current Priority**: {What to do next}
2. **Phase {N}**: {Upcoming work}

## Notes

- **{Key Decision}**: {Rationale}
- **{Blocker}**: {Issue and resolution}

---

**Last Updated**: {YYYY-MM-DD} ({Phase name})
**Next Session**: {What to focus on}
```

### Update Workflow

**When starting work on an issue**:
1. Check if `.beads/progress/{issue-id}.md` exists
2. If NOT, create it with initial structure
3. Update **Status** section with current phase

**During implementation**:
1. Mark completed steps with checkmarks
2. Update "Current Phase" section
3. Update metrics (tests passing, coverage, LOC)
4. Add notes for decisions/blockers

**At end of session**:
1. Update **Last Updated** timestamp
2. Update **Next Session** with clear next steps
3. Commit progress file WITH code changes
4. Run `bd sync` to persist

**Before closing issue**:
1. Change **Status** to Complete
2. Verify all sections are done
3. Add final metrics and summary
4. Commit final progress update

### Example

See `.beads/progress/sm-mln.md` for complete example.
