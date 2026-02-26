# Beads JSONL Field Reordering

## Overview

This project uses an **automatic field reordering system** for Beads JSONL files to ensure consistent field order across all issues.

## Field Order Standard

All issues in `.beads/issues.jsonl` and `.beads/closed.jsonl` follow this field order:

```json
{
  "id": "...",
  "status": "...",
  "title": "...",
  "description": "...",
  ... (other fields)
}
```

**Key Rules:**
- ✅ `"id"` is ALWAYS the first field
- ✅ `"status"` is ALWAYS the second field
- ✅ All other fields follow in their original order

## How It Works

### Automatic Reordering via Git Hook

**Location**: `.git/hooks/pre-commit`

**Process**:
1. When you run `git commit`, the pre-commit hook executes
2. Hook runs `bd sync --flush-only` (Beads default behavior)
3. **NEW**: Hook runs field reordering function using `jq`
4. Files are automatically staged with corrected field order
5. Commit proceeds with properly ordered JSONL files

### Implementation Details

**Reorder Function** (in `.git/hooks/pre-commit`):
```bash
reorder_beads_fields() {
    local file="$1"

    # Backup original file
    cp "$file" "$file.bak"

    # Reorder: {id, status} first, then all other fields
    jq -c '{id, status} + del(.id, .status)' "$file.bak" > "$file"

    # Cleanup backup
    rm "$file.bak"
}
```

**jq Command Explanation**:
- `{id, status}` - Extract id and status fields first
- `+ del(.id, .status)` - Add all remaining fields (excluding duplicates)
- Result: `{"id":"...","status":"...",...other fields...}`

## Dependencies

- **jq** - Command-line JSON processor
  - Check installation: `which jq`
  - Install (macOS): `brew install jq`
  - Install (Ubuntu): `sudo apt install jq`

If `jq` is not found, the hook **silently skips reordering** and commits proceed normally.

## Usage

### Normal Workflow (Nothing Changes)

```bash
# 1. Make changes using Beads CLI
bd create --title="New Feature" --type=feature
bd update sm-abc --status=in_progress
bd close sm-xyz --reason="Completed"

# 2. Commit changes (field reordering happens automatically)
git add .
git commit -m "Update issues"

# 3. Push to remote
git push
```

✅ **Field reordering happens automatically** - you don't need to do anything!

### Manual Reorder (If Needed)

If you need to manually reorder files without committing:

```bash
# Reorder issues.jsonl
jq -c '{id, status} + del(.id, .status)' .beads/issues.jsonl > .beads/issues.jsonl.tmp
mv .beads/issues.jsonl.tmp .beads/issues.jsonl

# Reorder closed.jsonl
jq -c '{id, status} + del(.id, .status)' .beads/closed.jsonl > .beads/closed.jsonl.tmp
mv .beads/closed.jsonl.tmp .beads/closed.jsonl
```

## Verification

Check if field order is correct:

```bash
# Check issues.jsonl
head -n 1 .beads/issues.jsonl | grep -o '^{"id":"[^"]*","status":"[^"]*"'

# Check closed.jsonl
head -n 1 .beads/closed.jsonl | grep -o '^{"id":"[^"]*","status":"[^"]*"'
```

Expected output:
```
{"id":"sm-xxx","status":"open"
{"id":"sm-yyy","status":"closed"
```

## Troubleshooting

### Hook Not Running

**Symptom**: Fields are not reordered after commit

**Solutions**:
1. Check hook is executable:
   ```bash
   chmod +x .git/hooks/pre-commit
   ```

2. Verify hook exists:
   ```bash
   ls -la .git/hooks/pre-commit
   ```

### jq Not Found

**Symptom**: Warning message about jq not found

**Solutions**:
1. Install jq:
   ```bash
   brew install jq  # macOS
   sudo apt install jq  # Ubuntu
   ```

2. Verify installation:
   ```bash
   which jq
   jq --version
   ```

### Manual Edit Not Persisting

**Symptom**: Manual edits to `.beads/issues.jsonl` are overridden

**Root Cause**: Beads uses git hooks that regenerate JSONL from internal state

**Solution**:
- ❌ **DON'T** manually edit `.beads/*.jsonl`
- ✅ **DO** use `bd` commands (create, update, close)

## Technical Notes

### Why This Approach?

**Problem**: Beads CLI generates JSONL with unpredictable field order
**Solution**: Post-process JSONL files after Beads flush, before commit

**Benefits**:
- ✅ Consistent field order across all commits
- ✅ Better git diffs (id and status always in same position)
- ✅ Easier code review
- ✅ Automatic - no manual intervention needed

### Performance Impact

- **Negligible** - jq processes JSONL files in milliseconds
- Pre-commit hook adds ~50-100ms per commit
- No impact on Beads CLI commands

## Related Documentation

- **CLAUDE.md** - Beads Issue Management Standards
- **.git/hooks/pre-commit** - Pre-commit hook implementation
- **Beads CLI Docs** - https://github.com/thoughtfull-systems/beads

---

**Last Updated**: 2026-02-22
**Implemented By**: abuabdirohman + Claude Sonnet 4.5
