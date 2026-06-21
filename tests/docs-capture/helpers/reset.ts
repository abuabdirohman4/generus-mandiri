/**
 * Reset demo attendance — idempotent.
 *
 * Hapus attendance_logs untuk meeting demo guru.gandasari sebelum capture run.
 * Tanpa ini, setelah Simpan sukses, capture berikutnya: isDirty=false -> Simpan
 * disabled -> gagal. Dipanggil dari test.beforeAll.
 *
 * Pola sama seperti tests/global-setup.ts (createClient + service role key).
 */

import { createClient } from "@supabase/supabase-js";

const DEMO_GURU_ID = "a1000000-0000-0000-0000-000000000001";

export async function resetDemoAttendance() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error(
      "Missing Supabase credentials! Pastikan .env.test punya NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Ambil semua meeting demo guru.gandasari
  const { data: meetings, error: mErr } = await supabase
    .from("meetings")
    .select("id")
    .eq("teacher_id", DEMO_GURU_ID);

  if (mErr) throw new Error(`Gagal fetch meeting demo: ${mErr.message}`);

  const meetingIds = (meetings ?? []).map((m) => m.id);
  if (meetingIds.length === 0) return;

  const { error: dErr } = await supabase
    .from("attendance_logs")
    .delete()
    .in("meeting_id", meetingIds);

  if (dErr) throw new Error(`Gagal reset attendance demo: ${dErr.message}`);
}
