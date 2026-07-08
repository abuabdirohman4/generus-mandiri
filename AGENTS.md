## 🔧 Git Workflow & Commit Protocol

**CRITICAL**: Claude Code MUST NOT execute git operations that modify repository state.

**Allowed (Read-Only)**: `git status`, `git diff`, `git log`, `git show`, `git branch`

**NEVER execute**: `git add`, `git commit`, `git push`, `git pull`, `git merge`, `git rebase`, or anything that modifies `.git/` or working tree.

**After code changes**: Show `git status`/`git diff`, provide suggested commit message (with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`), and inform user to run git commands manually.

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

## Backend & Supabase Conventions

- **Supabase Querying**: "Two-query pattern wajib". Avoid nested PostgREST joins (e.g., deep `.select('..., relation(..., nested(...))')`). Instead, fetch the primary data first, extract the necessary IDs, and fetch the related data in a second separate query.
- **Server Actions**: Must always return a standard object format: `{ success: boolean, data?: any, message?: string, error?: string }`.
- **Role Literals**: User roles are strictly defined as literals: `'superadmin'`, `'admin'`, `'teacher'`. The concept of `isAdmin` implies `'admin'` or `'superadmin'`.
- **Security & Authorization**: Security fixes and authorization gates MUST be implemented alongside the feature in the same PR, never deferred.
- **TDD Requirement**: All business logic and security-related changes require strict TDD (RED -> GREEN -> REFACTOR).
