# Release Workflow

At session close, evaluate whether user-facing changes since the last release
warrant a new version. If yes, invoke the `/release` skill.

## How to check
1. Read current version from `package.json`
2. Run `git log --oneline` to see commits since last release
3. If any commits touch feature code (not tests/docs/config), invoke `/release`

## Project notes
- Target audience: LDII religious education administrators, teachers, students
- WA channel tone: friendly, concise, use relevant emoji
- Avoid technical jargon in WA text (e.g. say "perbaikan tampilan" not "UI bug fix")
- Changelog: English, technical, for developer reference
