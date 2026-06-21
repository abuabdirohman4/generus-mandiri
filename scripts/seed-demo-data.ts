/**
 * Seed demo data: PAC Gandasari (DPD Kab. Bandung -> PC Katapang -> PAC Gandasari)
 *
 * Run: npx tsx scripts/seed-demo-data.ts
 * Idempotent — aman dijalankan ulang (ON CONFLICT DO NOTHING / upsert).
 *
 * Akun demo: guru.gandasari / demo123
 * Org IDs: fixed UUIDs (a1... = guru, b1... = kelompok, c1... = kelas, dst)
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ─── Fixed UUIDs ────────────────────────────────────────────────────────────
const IDS = {
  // Org hierarchy
  daerah:   "d1000000-0000-0000-0000-000000000001", // DPD Kab. Bandung
  desa:     "d2000000-0000-0000-0000-000000000001", // PC Katapang
  kelompok: "d3000000-0000-0000-0000-000000000001", // PAC Gandasari

  // Auth user for guru
  guruAuth: "a1000000-0000-0000-0000-000000000001",

  // Class masters (17 kelas standard)
  classMasters: Array.from({ length: 17 }, (_, i) =>
    `cc${String(i + 1).padStart(6, "0")}-0000-0000-0000-000000000001`
  ),

  // Classes (c1... = seeded classes)
  classes: Array.from({ length: 17 }, (_, i) =>
    `c1${String(i + 1).padStart(6, "0")}-0000-0000-0000-000000000000`
      .replace(/^c1(\d+)-0000-0000-0000-000000000000$/, (_, n) =>
        `c1000000-0000-0000-0000-${n.padStart(12, "0")}`
      )
  ),
};

// Helper: class ID by index (1-based)
function classId(n: number) {
  return `c1000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
}

// Helper: student ID by classIndex + studentIndex (1-based)
function studentId(classIdx: number, studentIdx: number) {
  const classHex = String(classIdx).padStart(2, "0");
  const studentHex = String(studentIdx).padStart(12, "0");
  return `51${classHex}0000-0000-0000-0000-${studentHex}`;
}

// Meeting ID helper (consistent with existing seeded IDs)
function meetingId(classHex: string, weekNum: number) {
  return `ee${classHex}0000-0000-0000-0000-${String(weekNum).padStart(12, "0")}`;
}

// ─── Org hierarchy ───────────────────────────────────────────────────────────
async function seedOrg() {
  await supabase.from("daerah").upsert({
    id: IDS.daerah, name: "DPD Kab. Bandung", created_at: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });

  await supabase.from("desa").upsert({
    id: IDS.desa, name: "PC Katapang", daerah_id: IDS.daerah, created_at: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });

  await supabase.from("kelompok").upsert({
    id: IDS.kelompok, name: "PAC Gandasari", desa_id: IDS.desa, daerah_id: IDS.daerah,
    created_at: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });

  console.log("✓ Org hierarchy");
}

// ─── Guru auth user + profile ─────────────────────────────────────────────
async function seedGuru() {
  // Check if auth user exists
  const { data: existing } = await supabase.auth.admin.getUserById(IDS.guruAuth);
  if (!existing?.user) {
    const { error } = await supabase.auth.admin.createUser({
      user_metadata: {},
      email: `guru.gandasari@demo.local`,
      password: "demo123",
      email_confirm: true,
    });
    if (error && !error.message.includes("already")) {
      console.error("Auth user create error:", error.message);
    }
  }

  await supabase.from("profiles").upsert({
    id: IDS.guruAuth,
    username: "guru.gandasari",
    full_name: "Ustadz Ahmad Fauzi",
    role: "teacher",
    kelompok_id: IDS.kelompok,
    desa_id: IDS.desa,
    daerah_id: IDS.daerah,
    gender: "Laki-laki",
    created_at: new Date().toISOString(),
  }, { onConflict: "id", ignoreDuplicates: true });

  console.log("✓ Guru guru.gandasari");
}

// ─── Class masters + classes ─────────────────────────────────────────────────
const CLASS_MASTER_NAMES = [
  "Caberawit Putra", "Caberawit Putri",
  "Pra Remaja Putra", "Pra Remaja Putri",
  "Remaja Putra", "Remaja Putri",
  "Pra Nikah Putra", "Pra Nikah Putri",
  "Pemuda", "Pemudi",
  "Ibu-Ibu Muda", "Ibu-Ibu",
  "Bapak-Bapak Muda", "Bapak-Bapak",
  "Lansia Putra", "Lansia Putri",
  "Pengajar",
];

async function seedClasses() {
  // Get active academic year
  const { data: ay } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true)
    .single();

  const ayId = ay?.id;

  for (let i = 0; i < 17; i++) {
    const classNum = i + 1;
    const cmId = `cc${String(classNum).padStart(6, "0")}-0000-0000-0000-000000000001`;
    const cId = classId(classNum);

    await supabase.from("class_masters").upsert({
      id: cmId,
      name: CLASS_MASTER_NAMES[i],
      sort_order: classNum,
      kelompok_id: IDS.kelompok,
      created_at: new Date().toISOString(),
    }, { onConflict: "id", ignoreDuplicates: true });

    await supabase.from("classes").upsert({
      id: cId,
      class_master_id: cmId,
      kelompok_id: IDS.kelompok,
      desa_id: IDS.desa,
      daerah_id: IDS.daerah,
      academic_year_id: ayId,
      created_at: new Date().toISOString(),
    }, { onConflict: "id", ignoreDuplicates: true });

    // Teacher assignment
    await supabase.from("teacher_classes").upsert({
      teacher_id: IDS.guruAuth,
      class_id: cId,
    }, { onConflict: "teacher_id,class_id", ignoreDuplicates: true });
  }

  console.log("✓ 17 class masters + classes + teacher assignments");
}

// ─── Students ────────────────────────────────────────────────────────────────
const STUDENT_NAMES_BY_CLASS: string[][] = [
  // Caberawit Putra (class 1) - 8 siswa
  ["Muhammad Fatih", "Ahmad Dzakwan", "Faris Abdullah", "Zaid Mubarak",
   "Hasan Aqil", "Umar Thalib", "Bilal Hafizh", "Salman Rizqi"],
  // Caberawit Putri (class 2) - 8 siswi
  ["Fatimah Azzahra", "Aisyah Nur", "Khadijah Salsabila", "Maryam Putri",
   "Zainab Humaira", "Ruqayyah Nisa", "Ummu Kulsum", "Safiyyah Rahma"],
  // Pra Remaja Putra (class 3) - 9 siswa
  ["Ibrahim Yusuf", "Ismail Hakim", "Idris Tsaqif", "Yahya Faqih",
   "Zakariya Amin", "Dawud Sholeh", "Sulaiman Rafi", "Musa Karim", "Isa Taufiq"],
  // Pra Remaja Putri (class 4) - 9
  ["Asiyah Nadhifa", "Mariam Qorina", "Habibah Wulan", "Raihanah Sari",
   "Jamilah Putri", "Aminah Fitri", "Halimah Dewi", "Latifah Indah", "Zahrah Aulia"],
  // Remaja Putra (class 5) - 9
  ["Khalid Walid", "Muadz Farhan", "Usamah Ghani", "Thariq Bashir",
   "Zubair Nabil", "Saad Waqas", "Amr Siddiq", "Hudzaifah Ilham", "Jabir Rizal"],
  // Remaja Putri (class 6) - 9
  ["Hafshah Nur", "Hindun Rahayu", "Durriyah Lestari", "Sumayyah Firdaus",
   "Lubabah Intan", "Ramlah Sari", "Nailah Azzah", "Fathimah Tsuraya", "Khaulah Siti"],
  // Pra Nikah Putra (class 7) - 8
  ["Abdullah Muhsin", "Abdurrahman Irfan", "Abdurrahim Akbar", "Abdushshamad Faiz",
   "Abdulaziz Hamid", "Abdulmalik Rijal", "Abdulqadir Hilal", "Abdulwahab Yafi"],
  // Pra Nikah Putri (class 8) - 9
  ["Ummu Aiman", "Ummu Habibah Rini", "Ummu Salamah Indri", "Barakah Fitria",
   "Ghufairah Laila", "Shafiyah Melati", "Khairiyah Dewi", "Barirah Cantika", "Maimunah Siti"],
  // Pemuda (class 9) - 8
  ["Anas Malik", "Abu Hurairah Yuda", "Abu Bakr Sidiq", "Utsman Affan",
   "Ali Thalib Reza", "Zaid Haritsah", "Muawiyah Yazid", "Ubay Kaab"],
  // Pemudi (class 10) - 8
  ["Asma Suhailah", "Ummu Kultsum Nadia", "Ruqayyah Rara", "Qailah Nabila",
   "Juwariyah Aini", "Shafiyyah Mira", "Maymunah Desi", "Haulah Tsabitah"],
  // Ibu-Ibu Muda (class 11) - 9
  ["Zulaikha Handayani", "Muthiah Susanti", "Madinah Wati", "Farhah Ratnasari",
   "Basyirah Hartini", "Nashirah Yuliana", "Wahidah Kurniati", "Taqiyyah Supriati", "Mardiyyah Ningsih"],
  // Ibu-Ibu (class 12) - 8
  ["Rodiyyah Suhartini", "Mardhiyyah Sumiyati", "Nafisah Suryani", "Sholihah Wahyuni",
   "Faqihah Mulyati", "Zahidah Rahayu", "Abidah Purwati", "Khasyiah Sari"],
  // Bapak-Bapak Muda (class 13) - 8
  ["Mukhlis Hendra", "Muttaqi Bambang", "Mukhsin Wahyu", "Muttahid Darmawan",
   "Mukhlish Suherman", "Muzakki Supriyadi", "Mujahid Santoso", "Mujib Harjono"],
  // Bapak-Bapak (class 14) - 7
  ["Tholib Slamet", "Tolhah Sutrisno", "Zubaidi Wagiman", "Nafi Sugiyono",
   "Wasi Samino", "Zaki Sukardi", "Hafidh Sarjono"],
  // Lansia Putra (class 15) - 6
  ["Hajam Kasiman", "Hazim Saridin", "Qasim Parman", "Jasim Tarno",
   "Wasim Wagino", "Rashid Sukino"],
  // Lansia Putri (class 16) - 6
  ["Masyitoh Suharti", "Romlah Wagiyem", "Khoiriyah Suminah", "Istiqomah Supinah",
   "Mukarromah Sutini", "Mubarokah Parti"],
  // Pengajar (class 17) - 5
  ["Muallim Ahmad", "Muallimat Siti", "Hafidz Abdillah", "Hafidzah Kamilah", "Ustadz Aziz"],
];

async function seedStudents() {
  const { data: ay } = await supabase
    .from("academic_years")
    .select("id")
    .eq("is_active", true)
    .single();
  const ayId = ay?.id;

  for (let ci = 0; ci < STUDENT_NAMES_BY_CLASS.length; ci++) {
    const classNum = ci + 1;
    const cId = classId(classNum);
    const names = STUDENT_NAMES_BY_CLASS[ci];
    const gender = CLASS_MASTER_NAMES[ci].includes("Putri") || CLASS_MASTER_NAMES[ci].includes("Pemudi") ||
      CLASS_MASTER_NAMES[ci].includes("Ibu") || CLASS_MASTER_NAMES[ci].includes("Lansia Putri") ||
      CLASS_MASTER_NAMES[ci] === "Muallimat Siti" ? "Perempuan" : "Laki-laki";

    for (let si = 0; si < names.length; si++) {
      const sId = studentId(classNum, si + 1);
      const isPerempuan = CLASS_MASTER_NAMES[ci].includes("Putri") ||
        CLASS_MASTER_NAMES[ci] === "Pemudi" ||
        CLASS_MASTER_NAMES[ci].includes("Ibu") ||
        CLASS_MASTER_NAMES[ci] === "Lansia Putri";

      await supabase.from("students").upsert({
        id: sId,
        full_name: names[si],
        gender: isPerempuan ? "Perempuan" : "Laki-laki",
        kelompok_id: IDS.kelompok,
        desa_id: IDS.desa,
        daerah_id: IDS.daerah,
        created_at: new Date().toISOString(),
      }, { onConflict: "id", ignoreDuplicates: true });

      await supabase.from("student_classes").upsert({
        student_id: sId,
        class_id: cId,
      }, { onConflict: "student_id,class_id", ignoreDuplicates: true });

      if (ayId) {
        await supabase.from("student_enrollments").upsert({
          student_id: sId,
          academic_year_id: ayId,
          class_id: cId,
          kelompok_id: IDS.kelompok,
          semester: 1,
          created_at: new Date().toISOString(),
        }, { onConflict: "student_id,academic_year_id,semester", ignoreDuplicates: true });
      }
    }
  }

  console.log(`✓ ${STUDENT_NAMES_BY_CLASS.flat().length} students seeded`);
}

// ─── Meetings (3 classes × 6 minggu Juni 2026) ──────────────────────────────
async function seedMeetings() {
  // Classes used for meetings: 2 (Caberawit Putri), 8 (Pra Nikah Putri), 11 (Ibu-Ibu Muda)
  const meetingClasses = [2, 8, 11];
  const weeks = [
    new Date("2026-06-02T07:00:00+07:00"),
    new Date("2026-06-09T07:00:00+07:00"),
    new Date("2026-06-16T07:00:00+07:00"),
    new Date("2026-06-23T07:00:00+07:00"),
  ];

  for (const classNum of meetingClasses) {
    const cId = classId(classNum);

    // Get current students in this class for snapshot
    const { data: sc } = await supabase
      .from("student_classes")
      .select("student_id")
      .eq("class_id", cId);
    const snapshot = sc?.map((r) => r.student_id) ?? [];

    for (let wi = 0; wi < weeks.length; wi++) {
      const weekNum = wi + 1;
      const classHex = String(classNum).padStart(2, "0");
      const mId = `ee${classHex}0000-0000-0000-0000-${String(weekNum + 9).padStart(12, "0")}`;

      const { error } = await supabase.from("meetings").upsert({
        id: mId,
        title: "Pengajian Rutin",
        teacher_id: IDS.guruAuth,
        class_ids: [cId],
        kelompok_ids: [IDS.kelompok],
        desa_ids: [IDS.desa],
        daerah_ids: [IDS.daerah],
        date: weeks[wi].toISOString(),
        meeting_number: weekNum,
        student_snapshot: snapshot,      // WAJIB — jangan NULL
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "id", ignoreDuplicates: true });

      if (error) console.error(`Meeting ${mId} error:`, error.message);
    }
  }

  console.log("✓ Meetings seeded (student_snapshot populated)");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Seeding demo data: PAC Gandasari...\n");

  await seedOrg();
  await seedGuru();
  await seedClasses();
  await seedStudents();
  await seedMeetings();

  console.log("\nDone. Run twice to verify idempotency.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
