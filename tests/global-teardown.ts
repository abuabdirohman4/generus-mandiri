/**
 * Global Test Teardown
 * Test users are PERSISTENT - they are NOT deleted after each run.
 * This speeds up test runs and avoids Supabase rate limits.
 *
 * To manually remove test users, run:
 *   npx ts-node tests/cleanup-test-users.ts
 */

async function globalTeardown() {
  console.log('✅ Test teardown complete (test users are persistent, no cleanup needed)');
}

export default globalTeardown;
