# Beads Progress Documentation

This directory contains detailed progress documentation for multi-session Beads issues.

## Purpose

Track implementation progress for complex issues that span multiple sessions, enabling:
- 🔄 **Context recovery** after conversation compaction
- 📈 **Progress tracking** with phase-by-phase completion status
- 🧪 **TDD metrics** (test count, coverage percentage)
- 🤝 **Team collaboration** with clear handoff documentation
- 📚 **Project history** as automatic documentation

## File Naming

**Format**: `{issue-id}.md`

Examples:
- `sm-mln.md` - Student actions refactoring (sm-mln)
- `sm-8yf.md` - Student management with approval workflow (sm-8yf)

## When to Create

Create a progress file for issues that:
- ✅ Span multiple sessions (can't complete in one sitting)
- ✅ Have complex implementation steps (refactoring, architecture)
- ✅ Use TDD workflow (track test/implementation progress)
- ✅ Have dependencies or blockers
- ✅ Need context preservation across compaction

Skip for:
- ❌ Simple one-session tasks
- ❌ Trivial updates (typos, docs)

## Template

See `CLAUDE.md` section "📋 Beads Issue Progress Documentation Standard" for full template.

**Required sections**:
1. **Header** - Issue ID, status, test count
2. **Completed Phases** - What's done (✅)
3. **Current Phase** - What's in progress (⏳)
4. **Metrics** - LOC, tests, coverage
5. **Next Steps** - Clear priorities
6. **Notes** - Decisions, blockers, learnings
7. **Related Files** - Implementation and test files

## Update Workflow

**Starting work**:
1. Check if progress file exists
2. Read "Next Session" for context
3. Update "Status" and "Current Phase"

**During work**:
1. Mark completed items with ✅
2. Update metrics (tests, coverage)
3. Add notes for decisions/blockers

**End of session**:
1. Update "Last Updated" timestamp
2. Write clear "Next Session" steps
3. Commit WITH code changes

**Before closing**:
1. Change status to ✅ Complete
2. Verify all phases are ✅
3. Add final metrics
4. Update Beads issue status

## Examples

See `sm-mln.md` for a complete example of:
- Multi-phase refactoring (4 phases)
- TDD workflow tracking (199 tests)
- Metrics and progress visualization
- Clear next steps per phase

## Integration with Beads

**Beads issue** (`.beads/issues.jsonl`):
- Status, priority, dependencies
- High-level metadata

**Progress file** (`.beads/progress/{id}.md`):
- Implementation details
- Test metrics and coverage
- Phase-by-phase breakdown
- Technical notes and decisions

Both files work together for complete tracking.

## Git Workflow

```bash
# Work on issue
vim src/my-feature.ts
vim .beads/progress/sm-xxx.md

# Commit together
git add src/my-feature.ts .beads/progress/sm-xxx.md
git commit -m "feat: Progress on sm-xxx"

# Sync Beads
bd sync
```

## Benefits

1. **No lost context** - Resume work immediately after compaction
2. **Clear handoff** - Other developers/agents know exact state
3. **TDD tracking** - Test count shows implementation quality
4. **Project history** - Automatic documentation of decisions
5. **Review-friendly** - Easy to verify completion before merge

---

For detailed guidelines, see `CLAUDE.md` → "📋 Beads Issue Progress Documentation Standard"
