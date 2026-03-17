-- ========================================
-- Test Users Setup Script
-- ========================================
-- Creates test users for E2E testing
-- Run this script ONCE before running E2E tests
--
-- IMPORTANT: This should ONLY be run on a TEST database!
-- DO NOT run on production!
-- ========================================

-- Clean up existing test users first (if any)
DELETE FROM profiles WHERE username IN (
  'admin_daerah_test',
  'admin_desa_test',
  'admin_kelompok_test',
  'guru_daerah_test',
  'guru_desa_test',
  'guru_kelompok_test'
);

-- Get required organization IDs
-- Assuming you have at least one daerah, desa, and kelompok in your test database
DO $$
DECLARE
  v_daerah_id UUID;
  v_desa_id UUID;
  v_kelompok_id UUID;
  v_class_id UUID;
BEGIN
  -- Get first available daerah
  SELECT id INTO v_daerah_id FROM daerah LIMIT 1;
  IF v_daerah_id IS NULL THEN
    RAISE EXCEPTION 'No daerah found! Please create at least one daerah first.';
  END IF;

  -- Get first available desa
  SELECT id INTO v_desa_id FROM desa LIMIT 1;
  IF v_desa_id IS NULL THEN
    RAISE EXCEPTION 'No desa found! Please create at least one desa first.';
  END IF;

  -- Get first available kelompok
  SELECT id INTO v_kelompok_id FROM kelompok LIMIT 1;
  IF v_kelompok_id IS NULL THEN
    RAISE EXCEPTION 'No kelompok found! Please create at least one kelompok first.';
  END IF;

  -- Get first available class
  SELECT id INTO v_class_id FROM classes LIMIT 1;
  IF v_class_id IS NULL THEN
    RAISE EXCEPTION 'No class found! Please create at least one class first.';
  END IF;

  RAISE NOTICE 'Using daerah_id: %, desa_id: %, kelompok_id: %, class_id: %',
    v_daerah_id, v_desa_id, v_kelompok_id, v_class_id;

  -- ==========================================
  -- 1. Admin Daerah Test User
  -- ==========================================
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin_daerah_test@test.com',
    crypt('admin_daerah_password', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING
  RETURNING id INTO v_class_id; -- Reusing variable

  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    id
  ) SELECT
    auth.users.id::text,
    auth.users.id,
    jsonb_build_object('sub', auth.users.id::text, 'email', 'admin_daerah_test@test.com'),
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
  FROM auth.users
  WHERE email = 'admin_daerah_test@test.com'
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO profiles (id, full_name, username, role, daerah_id)
  SELECT id, 'Admin Daerah Test', 'admin_daerah_test', 'admin', v_daerah_id
  FROM auth.users
  WHERE email = 'admin_daerah_test@test.com'
  ON CONFLICT (id) DO UPDATE
  SET username = 'admin_daerah_test', role = 'admin', daerah_id = v_daerah_id;

  -- ==========================================
  -- 2. Admin Desa Test User
  -- ==========================================
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin_desa_test@test.com',
    crypt('admin_desa_password', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    id
  ) SELECT
    auth.users.id::text,
    auth.users.id,
    jsonb_build_object('sub', auth.users.id::text, 'email', 'admin_desa_test@test.com'),
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
  FROM auth.users
  WHERE email = 'admin_desa_test@test.com'
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO profiles (id, full_name, username, role, desa_id)
  SELECT id, 'Admin Desa Test', 'admin_desa_test', 'admin', v_desa_id
  FROM auth.users
  WHERE email = 'admin_desa_test@test.com'
  ON CONFLICT (id) DO UPDATE
  SET username = 'admin_desa_test', role = 'admin', desa_id = v_desa_id;

  -- ==========================================
  -- 3. Admin Kelompok Test User
  -- ==========================================
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin_kelompok_test@test.com',
    crypt('admin_kelompok_password', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    id
  ) SELECT
    auth.users.id::text,
    auth.users.id,
    jsonb_build_object('sub', auth.users.id::text, 'email', 'admin_kelompok_test@test.com'),
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
  FROM auth.users
  WHERE email = 'admin_kelompok_test@test.com'
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO profiles (id, full_name, username, role, kelompok_id)
  SELECT id, 'Admin Kelompok Test', 'admin_kelompok_test', 'admin', v_kelompok_id
  FROM auth.users
  WHERE email = 'admin_kelompok_test@test.com'
  ON CONFLICT (id) DO UPDATE
  SET username = 'admin_kelompok_test', role = 'admin', kelompok_id = v_kelompok_id;

  -- ==========================================
  -- 4. Guru Daerah Test User
  -- ==========================================
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'guru_daerah_test@test.com',
    crypt('guru_daerah_password', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    id
  ) SELECT
    auth.users.id::text,
    auth.users.id,
    jsonb_build_object('sub', auth.users.id::text, 'email', 'guru_daerah_test@test.com'),
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
  FROM auth.users
  WHERE email = 'guru_daerah_test@test.com'
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO profiles (id, full_name, username, role, daerah_id)
  SELECT id, 'Guru Daerah Test', 'guru_daerah_test', 'teacher', v_daerah_id
  FROM auth.users
  WHERE email = 'guru_daerah_test@test.com'
  ON CONFLICT (id) DO UPDATE
  SET username = 'guru_daerah_test', role = 'teacher', daerah_id = v_daerah_id;

  -- Assign to first available class
  INSERT INTO teacher_classes (teacher_id, class_id)
  SELECT profiles.id, v_class_id
  FROM profiles
  WHERE username = 'guru_daerah_test'
  ON CONFLICT (teacher_id, class_id) DO NOTHING;

  -- ==========================================
  -- 5. Guru Desa Test User
  -- ==========================================
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'guru_desa_test@test.com',
    crypt('guru_desa_password', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    id
  ) SELECT
    auth.users.id::text,
    auth.users.id,
    jsonb_build_object('sub', auth.users.id::text, 'email', 'guru_desa_test@test.com'),
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
  FROM auth.users
  WHERE email = 'guru_desa_test@test.com'
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO profiles (id, full_name, username, role, desa_id)
  SELECT id, 'Guru Desa Test', 'guru_desa_test', 'teacher', v_desa_id
  FROM auth.users
  WHERE email = 'guru_desa_test@test.com'
  ON CONFLICT (id) DO UPDATE
  SET username = 'guru_desa_test', role = 'teacher', desa_id = v_desa_id;

  -- Assign to first available class
  INSERT INTO teacher_classes (teacher_id, class_id)
  SELECT profiles.id, v_class_id
  FROM profiles
  WHERE username = 'guru_desa_test'
  ON CONFLICT (teacher_id, class_id) DO NOTHING;

  -- ==========================================
  -- 6. Guru Kelompok Test User
  -- ==========================================
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'guru_kelompok_test@test.com',
    crypt('guru_kelompok_password', gen_salt('bf')),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
  )
  ON CONFLICT (email) DO NOTHING;

  INSERT INTO auth.identities (
    provider_id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at,
    id
  ) SELECT
    auth.users.id::text,
    auth.users.id,
    jsonb_build_object('sub', auth.users.id::text, 'email', 'guru_kelompok_test@test.com'),
    'email',
    NOW(),
    NOW(),
    NOW(),
    gen_random_uuid()
  FROM auth.users
  WHERE email = 'guru_kelompok_test@test.com'
  ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO profiles (id, full_name, username, role, kelompok_id)
  SELECT id, 'Guru Kelompok Test', 'guru_kelompok_test', 'teacher', v_kelompok_id
  FROM auth.users
  WHERE email = 'guru_kelompok_test@test.com'
  ON CONFLICT (id) DO UPDATE
  SET username = 'guru_kelompok_test', role = 'teacher', kelompok_id = v_kelompok_id;

  -- Assign to first available class
  INSERT INTO teacher_classes (teacher_id, class_id)
  SELECT profiles.id, v_class_id
  FROM profiles
  WHERE username = 'guru_kelompok_test'
  ON CONFLICT (teacher_id, class_id) DO NOTHING;

END $$;

-- Verify creation
SELECT
  username,
  role,
  CASE
    WHEN daerah_id IS NOT NULL THEN 'daerah'
    WHEN desa_id IS NOT NULL THEN 'desa'
    WHEN kelompok_id IS NOT NULL THEN 'kelompok'
    ELSE 'none'
  END as scope
FROM profiles
WHERE username IN (
  'superadmin',
  'admin_daerah_test',
  'admin_desa_test',
  'admin_kelompok_test',
  'guru_daerah_test',
  'guru_desa_test',
  'guru_kelompok_test'
)
ORDER BY
  CASE role
    WHEN 'superadmin' THEN 1
    WHEN 'admin' THEN 2
    WHEN 'teacher' THEN 3
    ELSE 4
  END,
  username;
