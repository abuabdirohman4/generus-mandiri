# 🔒 Testing Security Guide

## ⚠️ CRITICAL: Never Commit Credentials!

This document explains how to handle test credentials safely.

## 🚨 What NOT to Do

### ❌ DON'T: Hardcode credentials in test files
```typescript
// ❌ WRONG - This will expose credentials in Git!
await page.fill('input[name="username"]', 'username');
await page.fill('input[name="password"]', 'password');
```

### ❌ DON'T: Commit .env.test file
```bash
# ❌ WRONG - This will expose credentials!
git add .env.test
git commit -m "Add test credentials"
```

### ❌ DON'T: Test against production database
```bash
# ❌ WRONG - This can destroy real data!
TEST_BASE_URL=https://generus.abuabdirohman.com npm run test:e2e
```

## ✅ What TO Do

### ✅ DO: Use environment variables
```typescript
// ✅ CORRECT - Uses .env.test
import { getTestCredentials } from './helpers/auth';

const { username, password } = getTestCredentials();
await page.fill('input[name="username"]', username);
await page.fill('input[name="password"]', password);
```

### ✅ DO: Use the auth helper
```typescript
// ✅ EVEN BETTER - Use helper function
import { loginAsSuperadmin } from './helpers/auth';

test.beforeEach(async ({ page }) => {
  await loginAsSuperadmin(page);
});
```

### ✅ DO: Keep .env.test in .gitignore
```bash
# .gitignore already includes:
.env
.env.*
!.env.example
!.env.test.example
```

## 📋 Setup for New Developers

### 1. Copy the example file
```bash
cp .env.test.example .env.test
```

### 2. Fill with your test credentials
```bash
# .env.test (gitignored - use your actual test credentials)
TEST_SUPERADMIN_USERNAME=<your_test_username>
TEST_SUPERADMIN_PASSWORD=<your_test_password>
TEST_BASE_URL=http://localhost:3000
```

### 3. Verify .env.test is NOT tracked by Git
```bash
git status
# Should NOT show .env.test

git check-ignore .env.test
# Should output: .env.test
```

## 🔐 Environment Files Overview

| File | Purpose | Tracked by Git? | Contains Secrets? |
|------|---------|-----------------|-------------------|
| `.env.test.example` | Template for test env vars | ✅ YES | ❌ NO (placeholders only) |
| `.env.test` | Actual test credentials | ❌ NO (.gitignore) | ✅ YES (real credentials) |
| `.env.local` | Local development vars | ❌ NO (.gitignore) | ✅ YES (API keys, etc.) |

## 🛡️ Best Practices

### 1. **Use Dummy Accounts for Testing**

Don't use real user credentials for tests. Create dedicated test accounts:

```sql
-- Create test superadmin (in your test database only!)
INSERT INTO profiles (id, full_name, role, email)
VALUES (
  'test-superadmin-id',
  'Test Superadmin',
  'superadmin',
  'test@example.com'
);
```

### 2. **Separate Test Database**

**NEVER test against production database!**

Options:
- Use localhost with dummy data
- Use Supabase branch/development project
- Use Docker container for isolated testing

### 3. **Rotate Test Credentials Regularly**

If test credentials leak (e.g., accidentally committed):
1. Immediately change the password
2. Remove from Git history (use `git filter-branch` or BFG Repo-Cleaner)
3. Rotate all related credentials

### 4. **Use .env.test Only Locally**

For CI/CD (GitHub Actions), use **repository secrets** instead:

```yaml
# .github/workflows/playwright.yml
env:
  TEST_SUPERADMIN_USERNAME: ${{ secrets.TEST_SUPERADMIN_USERNAME }}
  TEST_SUPERADMIN_PASSWORD: ${{ secrets.TEST_SUPERADMIN_PASSWORD }}
```

## 🚨 Emergency: Credentials Leaked!

If you accidentally committed credentials to Git:

### 1. Change passwords immediately
```bash
# Login to your app and change password for test user
```

### 2. Remove from Git history
```bash
# Install BFG Repo-Cleaner
brew install bfg

# Remove sensitive data from history
bfg --delete-files .env.test
bfg --replace-text passwords.txt  # Create file with old passwords

# Force push (⚠️ coordinate with team first!)
git push --force
```

### 3. Notify team
If this is a shared repository, notify all team members to:
- Pull latest changes
- Update their local .env.test
- Not use old credentials

## 📖 References

- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub: Removing sensitive data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [Playwright Environment Variables](https://playwright.dev/docs/test-configuration#environment-variables)

## ✅ Pre-Commit Checklist

Before committing test code:

- [ ] No hardcoded credentials in test files
- [ ] Using `getTestCredentials()` or `loginAsSuperadmin()` helpers
- [ ] `.env.test` is in `.gitignore`
- [ ] Only `.env.test.example` is committed
- [ ] Run `git status` to verify .env.test not staged
- [ ] Test files pass locally

---

**Remember: Security is not optional. It's everyone's responsibility!** 🔒
