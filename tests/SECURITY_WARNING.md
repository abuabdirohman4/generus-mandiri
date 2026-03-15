# ⚠️ CRITICAL SECURITY WARNING

## 🚨 NEVER Expose Usernames or Passwords in Documentation!

### The Problem

Even though we use environment variables to protect credentials, **exposing the USERNAME itself is a security risk**, especially for open source projects:

### Why Exposing Usernames is Dangerous

1. **50% of credentials leaked** - Attacker now knows the username, only needs to brute force the password
2. **Open source = public access** - Anyone can see the documentation
3. **Well-known patterns** - Usernames like "superadmin", "admin", "root" are common attack targets
4. **Social engineering** - Exposed usernames can be used for phishing attacks

### ❌ What NOT to Do in Documentation

```markdown
# DON'T do this in ANY documentation:
TEST_SUPERADMIN_USERNAME=superadmin  ❌ EXPOSED!
TEST_ADMIN_USERNAME=admin            ❌ EXPOSED!
```

```typescript
// DON'T show actual usernames in code examples:
await page.fill('input[name="username"]', 'superadmin'); // ❌ EXPOSED!
```

### ✅ What TO Do Instead

Use **placeholders** or **generic examples**:

```markdown
# Use placeholders:
TEST_SUPERADMIN_USERNAME=<your_test_username>  ✅ SAFE
TEST_ADMIN_USERNAME=<your_admin_username>      ✅ SAFE
```

```typescript
// Use helper functions in examples:
import { loginAsSuperadmin } from './helpers/auth';  ✅ SAFE
await loginAsSuperadmin(page);
```

```typescript
// Or use placeholders in examples:
const { username, password } = getTestCredentials();  ✅ SAFE
await page.fill('input[name="username"]', username);
```

---

## 📋 Files That Must NEVER Expose Credentials

### ✅ Safe to Commit (with placeholders only)
- ✅ `README.md`
- ✅ `QUICK_START.md`
- ✅ `SECURITY.md`
- ✅ `MULTI_ROLE_TESTING.md`
- ✅ `.env.test.example`
- ✅ Test files (`*.spec.ts`)
- ✅ Helper files (`helpers/*.ts`)

### 🚫 Never Commit (contains actual credentials)
- 🚫 `.env.test`
- 🚫 `.env.local`
- 🚫 Any file with real usernames/passwords

---

## 🔍 Pre-Commit Security Checklist

Before committing documentation or code:

```bash
# 1. Search for potential username exposure
grep -r "superadmin\|admin_daerah\|admin_desa" docs/ tests/ --exclude="*.md"

# 2. Search for potential password exposure
grep -r "super354\|password123" . --exclude-dir=node_modules

# 3. Check what's being committed
git diff --staged

# 4. Verify .env.test is not staged
git status | grep ".env.test"  # Should return nothing
```

---

## ✅ Documentation Guidelines

When writing examples in documentation:

### 1. **Use Generic Placeholders**
```markdown
✅ GOOD:
TEST_USERNAME=<your_test_username>
TEST_PASSWORD=<your_test_password>

❌ BAD:
TEST_USERNAME=superadmin
TEST_PASSWORD=super354
```

### 2. **Use Helper Functions in Code Examples**
```typescript
✅ GOOD:
import { loginAsSuperadmin } from './helpers/auth';
await loginAsSuperadmin(page);

❌ BAD:
await page.fill('input[name="username"]', 'superadmin');
await page.fill('input[name="password"]', 'super354');
```

### 3. **Reference Environment Variables, Don't Show Values**
```markdown
✅ GOOD:
"Set TEST_SUPERADMIN_USERNAME in your .env.test file"

❌ BAD:
"Use TEST_SUPERADMIN_USERNAME=superadmin in your .env.test"
```

---

## 🚨 Emergency: Credentials Exposed in Git History

If you accidentally committed real usernames/passwords:

### 1. **Immediately Change Credentials**
```bash
# Change passwords for all exposed accounts ASAP
```

### 2. **Remove from Git History**
```bash
# Use BFG Repo-Cleaner to remove from history
brew install bfg
bfg --replace-text credentials.txt  # List exposed credentials here
git reflog expire --expire=now --all
git gc --prune=now --aggressive
```

### 3. **Force Push (Coordinate with Team!)**
```bash
git push origin --force --all
```

### 4. **Notify Team**
- Inform all team members
- Have them pull latest changes
- Update their local credentials
- Rotate API keys if needed

---

## 📖 References

- [OWASP Secret Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [GitHub: Removing Sensitive Data](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)
- [NIST Password Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

**Remember: In open source projects, assume EVERYTHING you commit will be public forever.** 🔒
