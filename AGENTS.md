## 🔧 Git Workflow & Commit Protocol

**CRITICAL**: Claude Code MUST NOT execute git operations that modify repository state.

**Allowed (Read-Only)**: `git status`, `git diff`, `git log`, `git show`, `git branch`

**NEVER execute**: `git add`, `git commit`, `git push`, `git pull`, `git merge`, `git rebase`, or anything that modifies `.git/` or working tree.

**After code changes**: Show `git status`/`git diff`, provide suggested commit message (with `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`), and inform user to run git commands manually.
