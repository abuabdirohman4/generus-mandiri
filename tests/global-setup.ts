/**
 * Global Test Setup
 * Creates persistent test users before all E2E tests run.
 * Test users are NOT deleted after runs (see global-teardown.ts).
 * Re-running setup is safe - existing users are skipped via upsert.
 */

import { createClient } from '@supabase/supabase-js';

async function globalSetup() {
  console.log('🔧 Setting up test environment...');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      'Missing Supabase credentials! Make sure .env.test has NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  // Create admin client (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // Hardcoded test organization IDs (persistent, dedicated for testing)
  const TEST_DAERAH_ID = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  const TEST_DESA_ID = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
  const TEST_KELOMPOK_ID = 'dddddddd-dddd-dddd-dddd-dddddddddddd';

  try {
    // Get a class ID from test kelompok for teacher assignment
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('kelompok_id', TEST_KELOMPOK_ID)
      .limit(1)
      .single();

    console.log('📋 Test organization IDs:', {
      daerah: TEST_DAERAH_ID,
      desa: TEST_DESA_ID,
      kelompok: TEST_KELOMPOK_ID,
      class: classData?.id ?? '(none yet)',
    });

    // Define test users to create
    const testUsers = [
      {
        email: 'admin_daerah_test@test.local',
        password: 'admin_daerah_password',
        username: 'admin_daerah_test',
        full_name: 'Admin Daerah Test',
        role: 'admin',
        daerah_id: TEST_DAERAH_ID,
      },
      {
        email: 'admin_desa_test@test.local',
        password: 'admin_desa_password',
        username: 'admin_desa_test',
        full_name: 'Admin Desa Test',
        role: 'admin',
        desa_id: TEST_DESA_ID,
      },
      {
        email: 'admin_kelompok_test@test.local',
        password: 'admin_kelompok_password',
        username: 'admin_kelompok_test',
        full_name: 'Admin Kelompok Test',
        role: 'admin',
        kelompok_id: TEST_KELOMPOK_ID,
      },
      {
        email: 'guru_daerah_test@test.local',
        password: 'guru_daerah_password',
        username: 'guru_daerah_test',
        full_name: 'Guru Daerah Test',
        role: 'teacher',
        daerah_id: TEST_DAERAH_ID,
        assign_to_class: classData?.id,
      },
      {
        email: 'guru_desa_test@test.local',
        password: 'guru_desa_password',
        username: 'guru_desa_test',
        full_name: 'Guru Desa Test',
        role: 'teacher',
        daerah_id: TEST_DAERAH_ID,
        desa_id: TEST_DESA_ID,
        assign_to_class: classData?.id,
      },
      {
        email: 'guru_kelompok_test@test.local',
        password: 'guru_kelompok_password',
        username: 'guru_kelompok_test',
        full_name: 'Guru Kelompok Test',
        role: 'teacher',
        daerah_id: TEST_DAERAH_ID,
        desa_id: TEST_DESA_ID,
        kelompok_id: TEST_KELOMPOK_ID,
        assign_to_class: classData?.id,
      },
    ];

    console.log('👥 Creating test users...');

    for (const user of testUsers) {
      console.log(`  Creating ${user.username}...`);

      try {
        // Check if user already exists
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', user.username)
          .single();

        if (existingProfile) {
          console.log(`  ⏭️  ${user.username} already exists, skipping`);
          continue;
        }

        // Create auth user
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            full_name: user.full_name,
          },
        });

        if (authError) {
          // Check if error is "user already exists"
          if (authError.message?.includes('already been registered')) {
            console.log(`  ⏭️  ${user.username} already exists (auth + profile), skipping`);
            continue;
          }

          throw authError;
        }

        if (!authUser.user) {
          throw new Error(`Failed to create auth user for ${user.username}`);
        }

        // Create/update profile
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: authUser.user.id,
          full_name: user.full_name,
          username: user.username,
          email: user.email,
          role: user.role,
          daerah_id: user.daerah_id || null,
          desa_id: user.desa_id || null,
          kelompok_id: user.kelompok_id || null,
        });

        if (profileError) throw profileError;

        // Assign teacher to class if needed
        if (user.assign_to_class) {
          const { error: teacherClassError } = await supabase
            .from('teacher_classes')
            .upsert({
              teacher_id: authUser.user.id,
              class_id: user.assign_to_class,
            });

          if (teacherClassError) throw teacherClassError;
        }

        console.log(`  ✅ ${user.username} created successfully`);
      } catch (err) {
        console.error(`  ❌ Failed to create ${user.username}:`, err);
        // Continue with other users even if one fails
      }
    }

    // ── Attendance logs for laporan sm-hov regression test ──────────────────
    // These logs are required for getAttendanceReport to return data rows.
    // Without them, detailedRecords is always empty even if meetings exist.
    console.log('📝 Upserting test attendance logs...');

    const TEST_MEETING_1_ID = 'bbbbbbbb-1111-1111-1111-111111111111';
    const TEST_MEETING_2_ID = 'bbbbbbbb-2222-2222-2222-222222222222';
    const TEST_STUDENT_1_ID = 'aaaaaaaa-1111-1111-1111-111111111111';
    const TEST_STUDENT_2_ID = 'aaaaaaaa-2222-2222-2222-222222222222';
    const TEST_STUDENT_3_ID = 'aaaaaaaa-3333-3333-3333-333333333333';
    const TEST_CLASS_1_ID = '11111111-aaaa-aaaa-aaaa-111111111111';

    const testAttendanceLogs = [
      // Meeting 1 (Kelas 1 + Kelas 2): all 3 students present
      {
        id: 'cccccccc-1111-1111-1111-111111111111',
        meeting_id: TEST_MEETING_1_ID,
        student_id: TEST_STUDENT_1_ID,
        status: 'H',
        date: '2026-03-10',
      },
      {
        id: 'cccccccc-2222-2222-2222-222222222222',
        meeting_id: TEST_MEETING_1_ID,
        student_id: TEST_STUDENT_2_ID,
        status: 'H',
        date: '2026-03-10',
      },
      {
        id: 'cccccccc-3333-3333-3333-333333333333',
        meeting_id: TEST_MEETING_1_ID,
        student_id: TEST_STUDENT_3_ID,
        status: 'H',
        date: '2026-03-10',
      },
      // Meeting 2 (Kelas 1 only): 2 students present
      {
        id: 'cccccccc-4444-4444-4444-444444444444',
        meeting_id: TEST_MEETING_2_ID,
        student_id: TEST_STUDENT_1_ID,
        status: 'H',
        date: '2026-03-03',
      },
      {
        id: 'cccccccc-5555-5555-5555-555555555555',
        meeting_id: TEST_MEETING_2_ID,
        student_id: TEST_STUDENT_2_ID,
        status: 'H',
        date: '2026-03-03',
      },
    ];

    const { error: logsError } = await supabase
      .from('attendance_logs')
      .upsert(testAttendanceLogs, { onConflict: 'id' });

    if (logsError) {
      console.error('❌ Failed to upsert attendance logs:', logsError);
      throw logsError;
    }

    console.log(`  ✅ ${testAttendanceLogs.length} attendance logs upserted`);

    // Fix test meetings: set class_id so fetchMeetingsWithFullDetails can join
    // classes:class_id(kelompok_id) — required for classKelompokMap to populate.
    // Without this, filterAttendanceByKelompok returns false for all logs.
    console.log('🔧 Fixing test meetings class_id...');
    const meetingClassIdFixes = [
      { id: TEST_MEETING_1_ID, class_id: TEST_CLASS_1_ID },
      { id: TEST_MEETING_2_ID, class_id: TEST_CLASS_1_ID },
    ]
    for (const fix of meetingClassIdFixes) {
      const { error: meetingFixError } = await supabase
        .from('meetings')
        .update({ class_id: fix.class_id })
        .eq('id', fix.id)
      if (meetingFixError) {
        console.error(`  ❌ Failed to fix meeting ${fix.id}:`, meetingFixError);
        throw meetingFixError;
      }
    }
    console.log('  ✅ Test meetings class_id fixed');
    // ────────────────────────────────────────────────────────────────────────

    console.log('✅ Test setup complete!');
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
}

export default globalSetup;
