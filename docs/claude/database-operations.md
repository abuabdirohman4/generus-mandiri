# Database Operations Guide

This document provides guidance for complex database operations including bulk data creation, user account management, and migration patterns.

---

## 🚨 CRITICAL: Creating Supabase Auth Users

**NEVER manually INSERT into `auth.users` without ALL required fields.**

### ❌ Common Mistakes When Creating Users

1. **Missing `auth.identities` record** - Causes "Database error querying schema"
2. **Empty `raw_user_meta_data`** - Display name won't show in UI
3. **NULL vs Empty String** - Use `''` for tokens, not `NULL`
4. **Inconsistent email domains** - Check existing convention first

### ✅ Proper User Creation Pattern

When creating users via migration/SQL, you MUST include:

```sql
DO $$
DECLARE
  new_user_id UUID := gen_random_uuid();
  hashed_password TEXT := crypt('password123', gen_salt('bf'));
BEGIN
  -- 1. Insert into auth.users with ALL fields
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    recovery_sent_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token,
    is_sso_user,
    is_super_admin,
    is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    'user@example.com',
    hashed_password,
    now(),
    null,
    null,
    jsonb_build_object('provider', 'email', 'providers', ARRAY['email']),
    jsonb_build_object('name', 'Full Name', 'username', 'username', 'full_name', 'Full Name'),
    now(),
    now(),
    '',  -- Empty string, NOT NULL
    '',  -- Empty string, NOT NULL
    '',  -- Empty string, NOT NULL
    '',  -- Empty string, NOT NULL
    false,
    null,
    false
  );

  -- 2. Insert into auth.identities (CRITICAL!)
  INSERT INTO auth.identities (
    id,
    user_id,
    provider_id,
    provider,
    identity_data,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    new_user_id,
    new_user_id::text,
    'email',
    jsonb_build_object(
      'sub', new_user_id::text,
      'email', 'user@example.com',
      'email_verified', true,
      'phone_verified', false
    ),
    null,
    now(),
    now()
  );

  -- 3. Insert into profiles
  INSERT INTO profiles (
    id,
    username,
    email,
    full_name,
    role,
    kelompok_id,
    desa_id,
    daerah_id,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    'username',
    'user@example.com',
    'Full Name',
    'teacher',
    kelompok_id_value,
    desa_id_value,
    daerah_id_value,
    now(),
    now()
  );
END $$;
```

### 🔍 Debugging Auth Issues

If users can't login with error "Database error querying schema":

1. **Check auth.identities exists**:
   ```sql
   SELECT u.email, i.id IS NOT NULL as has_identity
   FROM auth.users u
   LEFT JOIN auth.identities i ON i.user_id = u.id
   WHERE u.email = 'problematic@email.com';
   ```

2. **Check raw_user_meta_data is populated**:
   ```sql
   SELECT email, raw_user_meta_data->>'name' as display_name
   FROM auth.users
   WHERE email = 'problematic@email.com';
   ```

3. **Compare with working account**:
   ```sql
   SELECT email,
          raw_user_meta_data,
          confirmation_token IS NULL as token_is_null
   FROM auth.users
   WHERE email IN ('working@email.com', 'broken@email.com');
   ```

### 📋 Checklist for Bulk User Creation

- [ ] Pre-hash password once (don't rehash in loop for performance)
- [ ] Check existing email domain convention (`@generus.com` vs `@generusmandiri.com`)
- [ ] Set ALL token fields to `''` (empty string), not NULL
- [ ] Include `raw_user_meta_data` with name/username/full_name
- [ ] Create `auth.identities` record for EVERY user
- [ ] Verify with sample query before committing

---

## 📚 Bulk Class Creation Pattern

When creating classes for multiple kelompok (groups):

### Pattern: Class Creation with Mappings

```sql
DO $$
DECLARE
  kelompok_record RECORD;
  class_master_record RECORD;
  new_class_id UUID;
  class_master_ids UUID[] := ARRAY[
    'uuid-for-paud',
    'uuid-for-kelas-1',
    -- ... etc
  ];
  current_class_master_id UUID;
BEGIN
  FOR kelompok_record IN
    SELECT id, name FROM kelompok WHERE conditions
  LOOP
    FOREACH current_class_master_id IN ARRAY class_master_ids
    LOOP
      SELECT name INTO class_master_record
      FROM class_masters WHERE id = current_class_master_id;

      -- Check if class already exists (prevent duplicates)
      IF NOT EXISTS (
        SELECT 1 FROM classes c
        JOIN class_master_mappings cmm ON cmm.class_id = c.id
        WHERE c.kelompok_id = kelompok_record.id
          AND cmm.class_master_id = current_class_master_id
      ) THEN
        -- Create class
        INSERT INTO classes (name, kelompok_id, created_at, updated_at)
        VALUES (
          class_master_record.name,
          kelompok_record.id,
          timezone('Asia/Jakarta', now()),
          timezone('Asia/Jakarta', now())
        )
        RETURNING id INTO new_class_id;

        -- Create mapping
        INSERT INTO class_master_mappings (class_id, class_master_id, created_at)
        VALUES (new_class_id, current_class_master_id, timezone('Asia/Jakarta', now()));
      END IF;
    END LOOP;
  END LOOP;
END $$;
```

### Tips for Bulk Operations

1. **Use ARRAY for class masters** - Easier to maintain than hardcoded conditions
2. **Check for existing records** - Prevent duplicates with IF NOT EXISTS
3. **Use timezone('Asia/Jakarta', now())** - Consistent with app timezone
4. **RAISE NOTICE for debugging** - Log progress during migration
5. **Transaction safety** - DO $$ blocks run in single transaction

---

## 🔗 Related Documentation

- See [CLAUDE.md](../../CLAUDE.md) for database structure and Supabase client usage
- See [business-rules.md](./business-rules.md) for business logic constraints
