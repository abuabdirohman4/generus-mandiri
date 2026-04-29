# Activity Logging & Audit System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Membangun sistem activity logging lengkap — action events, page view tracking, online presence via Supabase Realtime, dan dashboard `/audit` dengan akses berbasis role.

**Architecture:** Tabel `activity_logs` di Supabase menyimpan semua mutasi dan page views. Logger utility `activityLogger.ts` dipanggil di setiap server action. Supabase Realtime Presence (WebSocket) digunakan untuk online status — tidak membebani Vercel edge requests. Dashboard `/audit` menampilkan activity feed, user summary, dan siapa yang sedang online.

**Tech Stack:** Next.js 15 server actions, Supabase PostgreSQL + RLS, Supabase Realtime Presence, SWR, Zustand, Ant Design, TypeScript.

---

## Task 1: Database — Tabel `activity_logs` + RLS

**Files:**
- Create: `supabase/activity_logs_migration.sql` (jalankan manual via Supabase dashboard SQL editor)

**Step 1: Tulis SQL migration**

Buat file `supabase/activity_logs_migration.sql`:

```sql
-- Tabel activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         uuid REFERENCES profiles(id) ON DELETE SET NULL,
  user_role       text,
  org_daerah_id   uuid REFERENCES daerah(id) ON DELETE SET NULL,
  org_desa_id     uuid REFERENCES desa(id) ON DELETE SET NULL,
  org_kelompok_id uuid REFERENCES kelompok(id) ON DELETE SET NULL,
  action          text NOT NULL,
  entity_type     text,
  entity_id       text,
  entity_label    text,
  metadata        jsonb DEFAULT '{}',
  page_path       text,
  created_at      timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_daerah ON activity_logs(org_daerah_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_desa ON activity_logs(org_desa_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_kelompok ON activity_logs(org_kelompok_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Superadmin: lihat semua
CREATE POLICY "superadmin_read_all_logs"
ON activity_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'superadmin'
  )
);

-- Admin/Teacher: lihat berdasarkan scope org
CREATE POLICY "scoped_read_logs"
ON activity_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND (
      -- Admin/Teacher Daerah
      (p.daerah_id IS NOT NULL AND p.desa_id IS NULL AND activity_logs.org_daerah_id = p.daerah_id)
      OR
      -- Admin/Teacher Desa
      (p.desa_id IS NOT NULL AND p.kelompok_id IS NULL AND activity_logs.org_desa_id = p.desa_id)
      OR
      -- Admin/Teacher Kelompok
      (p.kelompok_id IS NOT NULL AND activity_logs.org_kelompok_id = p.kelompok_id)
    )
  )
);

-- Insert: hanya service role (via createAdminClient) — tidak ada user-level insert
-- Retention: delete log > 6 bulan (jalankan via Supabase scheduled atau manual)
-- DELETE FROM activity_logs WHERE created_at < now() - interval '6 months';
```

**Step 2: Jalankan di Supabase Dashboard**

Buka Supabase dashboard → SQL Editor → paste dan run seluruh SQL di atas.

**Step 3: Verifikasi tabel ada**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'activity_logs'
ORDER BY ordinal_position;
```

Expected: Muncul semua kolom yang didefinisikan.

---

## Task 2: Type Definition — `ActivityLog`

**Files:**
- Create: `src/types/activityLog.ts`

**Step 1: Tulis tipe**

```typescript
// src/types/activityLog.ts

export interface ActivityLog {
  id: string
  user_id: string | null
  user_role: string | null
  org_daerah_id: string | null
  org_desa_id: string | null
  org_kelompok_id: string | null
  action: string
  entity_type: string | null
  entity_id: string | null
  entity_label: string | null
  metadata: Record<string, unknown>
  page_path: string | null
  created_at: string
}

export interface ActivityLogWithProfile extends ActivityLog {
  profiles: {
    full_name: string
    username: string
    role: string
  } | null
}

export type LogAction =
  // Siswa
  | 'create_student'
  | 'update_student'
  | 'soft_delete_student'
  | 'hard_delete_student'
  | 'transfer_student'
  | 'archive_student'
  // Guru
  | 'create_teacher'
  | 'update_teacher'
  | 'delete_teacher'
  | 'reset_teacher_password'
  | 'assign_class_teacher'
  | 'unassign_class_teacher'
  // Admin
  | 'create_admin'
  | 'update_admin'
  | 'delete_admin'
  | 'reset_admin_password'
  // Absensi
  | 'save_attendance'
  | 'delete_attendance'
  | 'create_meeting'
  | 'delete_meeting'
  // Rapot
  | 'input_grade'
  | 'bulk_upsert_grade'
  | 'publish_rapot'
  | 'create_rapot_template'
  // Materi
  | 'create_material'
  | 'update_material'
  | 'delete_material'
  | 'assign_material_to_class'
  | 'update_monthly_target'
  // Kegiatan
  | 'create_activity_type'
  | 'update_activity_type'
  | 'delete_activity_type'
  // Navigation
  | 'open_page'
  // Auth
  | 'login'
  | 'logout'

export interface LogActivityParams {
  userId: string
  action: LogAction | string
  entityType?: string
  entityId?: string
  entityLabel?: string
  metadata?: Record<string, unknown>
  pagePath?: string
}
```

**Step 2: Tidak ada test untuk type definitions — langsung commit**

```bash
git add src/types/activityLog.ts
git commit -m "feat: add ActivityLog type definitions"
```

---

## Task 3: Logger Utility — `activityLogger.ts`

**Files:**
- Create: `src/lib/activityLogger.ts`
- Test: `src/lib/__tests__/activityLogger.test.ts`

**Step 1: Tulis failing test**

```typescript
// src/lib/__tests__/activityLogger.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase admin client
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(),
}))

// Mock getCurrentUserProfile
vi.mock('@/lib/accessControlServer', () => ({
  getCurrentUserProfile: vi.fn(),
}))

import { logActivity } from '../activityLogger'
import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'

describe('logActivity', () => {
  const mockInsert = vi.fn().mockResolvedValue({ error: null })
  const mockFrom = vi.fn().mockReturnValue({ insert: mockInsert })
  const mockAdminClient = { from: mockFrom }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createAdminClient).mockResolvedValue(mockAdminClient as any)
    vi.mocked(getCurrentUserProfile).mockResolvedValue({
      id: 'user-123',
      role: 'teacher',
      daerah_id: 'daerah-1',
      desa_id: 'desa-1',
      kelompok_id: 'kelompok-1',
    } as any)
  })

  it('inserts log record with correct fields', async () => {
    await logActivity({
      userId: 'user-123',
      action: 'create_student',
      entityType: 'student',
      entityId: 'student-456',
      entityLabel: 'Ahmad Fauzi',
      pagePath: '/users/siswa',
    })

    expect(mockFrom).toHaveBeenCalledWith('activity_logs')
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        action: 'create_student',
        entity_type: 'student',
        entity_id: 'student-456',
        entity_label: 'Ahmad Fauzi',
        page_path: '/users/siswa',
        user_role: 'teacher',
        org_daerah_id: 'daerah-1',
        org_desa_id: 'desa-1',
        org_kelompok_id: 'kelompok-1',
      })
    )
  })

  it('does not throw if insert fails — fire and forget', async () => {
    mockInsert.mockResolvedValue({ error: new Error('DB error') })

    await expect(
      logActivity({ userId: 'user-123', action: 'create_student' })
    ).resolves.not.toThrow()
  })
})
```

**Step 2: Jalankan test — pastikan FAIL**

```bash
npm run test:run -- src/lib/__tests__/activityLogger.test.ts
```

Expected: FAIL dengan "Cannot find module '../activityLogger'"

**Step 3: Implementasi minimal**

```typescript
// src/lib/activityLogger.ts
'use server'

import { createAdminClient } from '@/lib/supabase/server'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import type { LogActivityParams } from '@/types/activityLog'

export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    const supabase = await createAdminClient()
    const profile = await getCurrentUserProfile()

    await supabase.from('activity_logs').insert({
      user_id: params.userId,
      user_role: profile?.role ?? null,
      org_daerah_id: profile?.daerah_id ?? null,
      org_desa_id: profile?.desa_id ?? null,
      org_kelompok_id: profile?.kelompok_id ?? null,
      action: params.action,
      entity_type: params.entityType ?? null,
      entity_id: params.entityId ?? null,
      entity_label: params.entityLabel ?? null,
      metadata: params.metadata ?? {},
      page_path: params.pagePath ?? null,
    })
  } catch {
    // Fire-and-forget: jangan throw error ke caller
  }
}
```

**Step 4: Jalankan test — pastikan PASS**

```bash
npm run test:run -- src/lib/__tests__/activityLogger.test.ts
```

Expected: PASS semua test.

**Step 5: Commit**

```bash
git add src/lib/activityLogger.ts src/lib/__tests__/activityLogger.test.ts
git commit -m "feat: add activityLogger utility with fire-and-forget logging"
```

---

## Task 4: Integrate Logger ke Server Actions — Siswa & Guru

**Files:**
- Modify: `src/app/(admin)/users/siswa/actions/students/actions.ts`
- Modify: `src/app/(admin)/users/guru/actions.ts` (atau path serupa)

**Step 1: Tambah import di siswa/actions.ts**

Cari baris import di bagian atas file, tambahkan:

```typescript
import { logActivity } from '@/lib/activityLogger'
```

**Step 2: Tambah logActivity setelah setiap mutasi berhasil**

Pattern yang digunakan — tambah setelah operasi sukses, sebelum return:

```typescript
// Contoh di createStudent()
// ... existing code yang insert student ...
await logActivity({
  userId: currentUser.id,
  action: 'create_student',
  entityType: 'student',
  entityId: result.id,
  entityLabel: data.full_name,
  pagePath: '/users/siswa',
})
return result

// Contoh di softDeleteStudent()
await logActivity({
  userId: currentUser.id,
  action: 'soft_delete_student',
  entityType: 'student',
  entityId: studentId,
  entityLabel: student.full_name,
})

// Contoh di transferStudent()
await logActivity({
  userId: currentUser.id,
  action: 'transfer_student',
  entityType: 'student',
  entityId: studentId,
  entityLabel: student.full_name,
  metadata: { from_class_id: fromClassId, to_class_id: toClassId },
})
```

**Actions yang harus di-log di siswa/actions.ts:**
- `createStudent` → `'create_student'`
- `updateStudent` → `'update_student'`
- `softDeleteStudent` → `'soft_delete_student'`
- `hardDeleteStudent` → `'hard_delete_student'`
- `transferStudent` → `'transfer_student'`
- `archiveStudent` → `'archive_student'`

**Actions yang harus di-log di guru/actions.ts:**
- `createTeacher` → `'create_teacher'`
- `updateTeacher` → `'update_teacher'`
- `deleteTeacher` → `'delete_teacher'`
- `resetTeacherPassword` → `'reset_teacher_password'`
- `assignClassesToTeacher` → `'assign_class_teacher'`
- `unassignClassFromTeacher` → `'unassign_class_teacher'`

**Step 3: Manual test — jalankan dev server dan lakukan satu action**

```bash
npm run dev
```

Buka `/users/siswa`, buat siswa baru, lalu cek di Supabase dashboard:
```sql
SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 5;
```

Expected: Ada record baru dengan `action = 'create_student'`.

**Step 4: Commit**

```bash
git add src/app/(admin)/users/siswa/actions/students/actions.ts
git add src/app/(admin)/users/guru/actions.ts
git commit -m "feat: integrate activity logging into student and teacher mutations"
```

---

## Task 5: Integrate Logger ke Actions Lainnya

**Files:**
- Modify: `src/app/(admin)/absensi/actions.ts`
- Modify: `src/app/(admin)/rapot/actions.ts`
- Modify: `src/app/(admin)/materi/actions.ts`
- Modify: `src/app/(admin)/kegiatan/actions.ts`
- Modify: `src/app/(admin)/users/admin/actions.ts`

**Step 1: Tambah import `logActivity` di setiap file**

```typescript
import { logActivity } from '@/lib/activityLogger'
```

**Step 2: Tambah logActivity per action**

**Absensi:**
```typescript
// saveAttendance / saveAttendanceForMeeting
await logActivity({ userId, action: 'save_attendance', entityType: 'meeting', entityId: meetingId, entityLabel: `Meeting ${date}` })

// deleteAttendanceLog
await logActivity({ userId, action: 'delete_attendance', entityType: 'attendance', entityId: logId })

// createMeeting
await logActivity({ userId, action: 'create_meeting', entityType: 'meeting', entityId: result.id })
```

**Rapot:**
```typescript
// bulkUpsertSectionGrades / updateGrade
await logActivity({ userId, action: 'input_grade', entityType: 'rapot', entityId: rapotId })

// publishRapot
await logActivity({ userId, action: 'publish_rapot', entityType: 'rapot', entityId: rapotId })

// createTemplate
await logActivity({ userId, action: 'create_rapot_template', entityType: 'template', entityId: result.id, entityLabel: templateName })
```

**Materi:**
```typescript
await logActivity({ userId, action: 'create_material', entityType: 'material', entityId: result.id, entityLabel: materialName })
await logActivity({ userId, action: 'update_monthly_target', entityType: 'monthly_target', metadata: { class_id, month, year } })
```

**Kegiatan:**
```typescript
await logActivity({ userId, action: 'create_activity_type', entityType: 'activity_type', entityId: result.id, entityLabel: name })
await logActivity({ userId, action: 'update_activity_type', entityType: 'activity_type', entityId: id })
await logActivity({ userId, action: 'delete_activity_type', entityType: 'activity_type', entityId: id })
```

**Step 3: Commit**

```bash
git add src/app/(admin)/absensi/actions.ts
git add src/app/(admin)/rapot/actions.ts
git add src/app/(admin)/materi/actions.ts
git add src/app/(admin)/kegiatan/actions.ts
git add src/app/(admin)/users/admin/actions.ts
git commit -m "feat: integrate activity logging into absensi, rapot, materi, kegiatan, admin mutations"
```

---

## Task 6: Page View Tracking via Middleware

**Files:**
- Modify: `src/middleware.ts`

**Step 1: Baca middleware saat ini**

Baca full content `src/middleware.ts` sebelum edit.

**Step 2: Tambah page view logging**

Tambah helper function dan panggil di dalam middleware, setelah session berhasil didapat:

```typescript
// Tambah di dalam middleware function, setelah auth check berhasil
// dan sebelum NextResponse.next()

// Helper: log page view async (fire-and-forget, tidak block response)
const logPageView = async (userId: string, pathname: string) => {
  try {
    const { createAdminClient } = await import('@/lib/supabase/server')
    const supabase = await createAdminClient()
    
    // Ambil profile untuk org scope
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, daerah_id, desa_id, kelompok_id')
      .eq('id', userId)
      .single()

    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_role: profile?.role ?? null,
      org_daerah_id: profile?.daerah_id ?? null,
      org_desa_id: profile?.desa_id ?? null,
      org_kelompok_id: profile?.kelompok_id ?? null,
      action: 'open_page',
      entity_type: 'page',
      page_path: pathname,
    })
  } catch {
    // Silent fail
  }
}

// Panggil untuk halaman admin saja (skip API routes, assets)
const isAdminPage = request.nextUrl.pathname.startsWith('/') 
  && !request.nextUrl.pathname.startsWith('/api')
  && !request.nextUrl.pathname.startsWith('/_next')
  && !request.nextUrl.pathname.startsWith('/signin')

if (isAdminPage && user?.id) {
  // Fire and forget — tidak await agar tidak delay halaman
  logPageView(user.id, request.nextUrl.pathname)
}
```

**PENTING:** Jangan `await` pemanggilan `logPageView` — ini harus fire-and-forget agar tidak menambah latency ke setiap page load.

**Step 3: Jalankan dev server dan navigasi ke beberapa halaman**

```bash
npm run dev
```

Buka beberapa halaman, lalu cek:
```sql
SELECT action, page_path, created_at FROM activity_logs 
WHERE action = 'open_page' 
ORDER BY created_at DESC LIMIT 10;
```

Expected: Ada record untuk setiap halaman yang dibuka.

**Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add page view tracking in middleware"
```

---

## Task 7: Online Presence Hook — Supabase Realtime

**Files:**
- Create: `src/hooks/usePresence.ts`

**Step 1: Tulis hook**

```typescript
// src/hooks/usePresence.ts
'use client'

import { useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePathname } from 'next/navigation'

export interface PresenceState {
  user_id: string
  full_name: string
  role: string
  page_path: string
  online_at: string
}

const CHANNEL_NAME = 'online-users'

export function usePresence(user: { id: string; full_name: string; role: string } | null) {
  const pathname = usePathname()
  const channelRef = useRef<ReturnType<typeof createClient>['channel'] extends (...args: any[]) => infer R ? R : never | null>(null)
  const supabaseRef = useRef(createClient())

  useEffect(() => {
    if (!user) return

    const supabase = supabaseRef.current
    const channel = supabase.channel(CHANNEL_NAME, {
      config: { presence: { key: user.id } },
    })

    channelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        // State dikelola di level component yang subscribe
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            full_name: user.full_name,
            role: user.role,
            page_path: pathname,
            online_at: new Date().toISOString(),
          } satisfies PresenceState)
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [user])

  // Update page_path ketika navigasi
  useEffect(() => {
    if (!channelRef.current || !user) return
    channelRef.current.track({
      user_id: user.id,
      full_name: user.full_name,
      role: user.role,
      page_path: pathname,
      online_at: new Date().toISOString(),
    } satisfies PresenceState)
  }, [pathname, user])
}
```

**Step 2: Mount hook di admin layout**

Buka `src/app/(admin)/layout.tsx`, tambah import dan panggil hook:

```typescript
// Tambah import
import { usePresence } from '@/hooks/usePresence'
import { useUserProfileStore } from '@/stores/userProfileStore' // atau store yang ada

// Di dalam komponen layout, tambah:
const { profile } = useUserProfileStore()
usePresence(profile ? { id: profile.id, full_name: profile.full_name, role: profile.role } : null)
```

**Step 3: Test manual**

Buka dua tab browser dengan user berbeda. Nanti bisa diverifikasi di Task 9 saat dashboard sudah ada.

**Step 4: Commit**

```bash
git add src/hooks/usePresence.ts src/app/(admin)/layout.tsx
git commit -m "feat: add Supabase Realtime Presence hook for online status tracking"
```

---

## Task 8: Dashboard `/audit` — Server Actions

**Files:**
- Create: `src/app/(admin)/audit/actions.ts`

**Step 1: Tulis actions**

```typescript
// src/app/(admin)/audit/actions.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUserProfile, getDataFilter } from '@/lib/accessControlServer'
import type { ActivityLogWithProfile } from '@/types/activityLog'

export interface GetActivityLogsParams {
  page?: number
  limit?: number
  userId?: string
  action?: string
  dateFrom?: string
  dateTo?: string
}

export async function getActivityLogs(params: GetActivityLogsParams = {}) {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) return { data: [], count: 0 }

  const { page = 1, limit = 50, userId, action, dateFrom, dateTo } = params

  let query = supabase
    .from('activity_logs')
    .select('*, profiles(full_name, username, role)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  // RLS sudah handle scope, tapi tambah filter opsional
  if (userId) query = query.eq('user_id', userId)
  if (action) query = query.eq('action', action)
  if (dateFrom) query = query.gte('created_at', dateFrom)
  if (dateTo) query = query.lte('created_at', dateTo)

  const { data, error, count } = await query

  if (error) throw error
  return { data: (data ?? []) as ActivityLogWithProfile[], count: count ?? 0 }
}

export async function getUserActivitySummary() {
  const supabase = await createClient()
  const profile = await getCurrentUserProfile()
  if (!profile) return []

  // Ambil semua user dalam scope + last activity + total actions (30 hari)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id, full_name, username, role,
      activity_logs(created_at, action)
    `)
    .neq('role', 'superadmin')
    .order('full_name')

  if (error) throw error

  return (data ?? []).map((user) => {
    const logs = (user.activity_logs ?? []) as { created_at: string; action: string }[]
    const recentLogs = logs.filter(
      (l) => new Date(l.created_at) >= thirtyDaysAgo && l.action !== 'open_page'
    )
    const lastLog = logs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]

    return {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      last_active: lastLog?.created_at ?? null,
      total_actions_30d: recentLogs.length,
    }
  })
}
```

**Step 2: Commit**

```bash
git add src/app/(admin)/audit/actions.ts
git commit -m "feat: add audit dashboard server actions for activity logs and user summary"
```

---

## Task 9: Dashboard `/audit` — UI Components

**Files:**
- Create: `src/app/(admin)/audit/page.tsx`
- Create: `src/app/(admin)/audit/components/ActivityFeed.tsx`
- Create: `src/app/(admin)/audit/components/UserSummaryTable.tsx`
- Create: `src/app/(admin)/audit/components/OnlinePresence.tsx`

**Step 1: Buat `OnlinePresence.tsx`**

```typescript
// src/app/(admin)/audit/components/OnlinePresence.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge, Card } from 'antd'
import type { PresenceState } from '@/hooks/usePresence'

const PAGE_LABELS: Record<string, string> = {
  '/home': 'Dashboard',
  '/absensi': 'Absensi',
  '/laporan': 'Laporan',
  '/users/siswa': 'Data Siswa',
  '/users/guru': 'Data Guru',
  '/users/admin': 'Data Admin',
  '/kelas': 'Kelas',
  '/rapot': 'Rapot',
  '/materi': 'Materi',
  '/audit': 'Audit',
  '/monitoring': 'Monitoring',
  '/organisasi': 'Organisasi',
}

export function OnlinePresence() {
  const [onlineUsers, setOnlineUsers] = useState<PresenceState[]>([])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase.channel('online-users')

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceState>()
        const users = Object.values(state).flat()
        setOnlineUsers(users)
      })
      .subscribe()

    return () => { channel.unsubscribe() }
  }, [])

  return (
    <Card
      title={
        <span>
          <Badge status="success" />
          {' '}Sedang Online ({onlineUsers.length} orang)
        </span>
      }
      size="small"
    >
      {onlineUsers.length === 0 ? (
        <p className="text-gray-400 text-sm">Tidak ada user yang online</p>
      ) : (
        <ul className="space-y-2">
          {onlineUsers.map((u) => (
            <li key={u.user_id} className="flex items-center gap-2 text-sm">
              <Badge status="success" />
              <span className="font-medium">{u.full_name}</span>
              <span className="text-gray-400">({u.role})</span>
              <span className="text-gray-500">—</span>
              <span className="text-blue-600">
                {PAGE_LABELS[u.page_path] ?? u.page_path}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
```

**Step 2: Buat `ActivityFeed.tsx`**

```typescript
// src/app/(admin)/audit/components/ActivityFeed.tsx
'use client'

import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { Table, Tag } from 'antd'
import type { ActivityLogWithProfile } from '@/types/activityLog'

const ACTION_LABELS: Record<string, string> = {
  open_page: 'buka halaman',
  create_student: 'tambah siswa',
  update_student: 'update siswa',
  soft_delete_student: 'nonaktifkan siswa',
  hard_delete_student: 'hapus siswa',
  transfer_student: 'pindah siswa',
  archive_student: 'arsipkan siswa',
  create_teacher: 'tambah guru',
  update_teacher: 'update guru',
  delete_teacher: 'hapus guru',
  reset_teacher_password: 'reset password guru',
  save_attendance: 'simpan absensi',
  delete_attendance: 'hapus absensi',
  create_meeting: 'buat pertemuan',
  input_grade: 'input nilai rapot',
  publish_rapot: 'publish rapot',
  create_material: 'tambah materi',
  update_monthly_target: 'update target bulanan',
  create_activity_type: 'tambah jenis kegiatan',
  login: 'login',
  logout: 'logout',
}

const ACTION_COLORS: Record<string, string> = {
  open_page: 'default',
  create_student: 'green',
  update_student: 'blue',
  soft_delete_student: 'orange',
  hard_delete_student: 'red',
  transfer_student: 'purple',
  save_attendance: 'cyan',
  delete_attendance: 'orange',
  publish_rapot: 'gold',
  login: 'green',
  logout: 'default',
}

interface Props {
  logs: ActivityLogWithProfile[]
  loading?: boolean
  total: number
  page: number
  onPageChange: (page: number) => void
}

export function ActivityFeed({ logs, loading, total, page, onPageChange }: Props) {
  const columns = [
    {
      title: 'Waktu',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 150,
      render: (v: string) =>
        formatDistanceToNow(new Date(v), { addSuffix: true, locale: localeId }),
    },
    {
      title: 'User',
      key: 'user',
      render: (_: unknown, record: ActivityLogWithProfile) =>
        record.profiles?.full_name ?? '—',
    },
    {
      title: 'Role',
      dataIndex: 'user_role',
      key: 'user_role',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Aktivitas',
      dataIndex: 'action',
      key: 'action',
      render: (v: string) => (
        <Tag color={ACTION_COLORS[v] ?? 'default'}>
          {ACTION_LABELS[v] ?? v}
        </Tag>
      ),
    },
    {
      title: 'Detail',
      key: 'detail',
      render: (_: unknown, record: ActivityLogWithProfile) =>
        record.entity_label ?? record.page_path ?? '—',
    },
  ]

  return (
    <Table
      dataSource={logs}
      columns={columns}
      rowKey="id"
      loading={loading}
      pagination={{
        current: page,
        total,
        pageSize: 50,
        onChange: onPageChange,
        showTotal: (t) => `Total ${t} aktivitas`,
      }}
      size="small"
    />
  )
}
```

**Step 3: Buat `UserSummaryTable.tsx`**

```typescript
// src/app/(admin)/audit/components/UserSummaryTable.tsx
import { Table, Tag, Badge } from 'antd'
import { formatDistanceToNow } from 'date-fns'
import { id as localeId } from 'date-fns/locale'

interface UserSummary {
  id: string
  full_name: string
  username: string
  role: string
  last_active: string | null
  total_actions_30d: number
}

interface Props {
  data: UserSummary[]
  loading?: boolean
}

export function UserSummaryTable({ data, loading }: Props) {
  const columns = [
    {
      title: 'Nama',
      dataIndex: 'full_name',
      key: 'full_name',
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: 'Terakhir Aktif',
      dataIndex: 'last_active',
      key: 'last_active',
      render: (v: string | null) =>
        v
          ? formatDistanceToNow(new Date(v), { addSuffix: true, locale: localeId })
          : <span className="text-gray-400">Belum pernah</span>,
      sorter: (a: UserSummary, b: UserSummary) =>
        new Date(a.last_active ?? 0).getTime() - new Date(b.last_active ?? 0).getTime(),
    },
    {
      title: 'Aksi (30 hari)',
      dataIndex: 'total_actions_30d',
      key: 'total_actions_30d',
      render: (v: number) => (
        <Badge
          count={v}
          showZero
          color={v === 0 ? 'gray' : v < 10 ? 'orange' : 'green'}
        />
      ),
      sorter: (a: UserSummary, b: UserSummary) => a.total_actions_30d - b.total_actions_30d,
    },
  ]

  return (
    <Table
      dataSource={data}
      columns={columns}
      rowKey="id"
      loading={loading}
      size="small"
      pagination={false}
    />
  )
}
```

**Step 4: Buat `page.tsx`**

```typescript
// src/app/(admin)/audit/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Tabs, Card } from 'antd'
import { getActivityLogs, getUserActivitySummary } from './actions'
import { ActivityFeed } from './components/ActivityFeed'
import { UserSummaryTable } from './components/UserSummaryTable'
import { OnlinePresence } from './components/OnlinePresence'
import type { ActivityLogWithProfile } from '@/types/activityLog'

export default function AuditPage() {
  const [logs, setLogs] = useState<ActivityLogWithProfile[]>([])
  const [logCount, setLogCount] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingLogs, setLoadingLogs] = useState(true)

  const [userSummary, setUserSummary] = useState<any[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)

  useEffect(() => {
    setLoadingLogs(true)
    getActivityLogs({ page }).then(({ data, count }) => {
      setLogs(data)
      setLogCount(count)
      setLoadingLogs(false)
    })
  }, [page])

  useEffect(() => {
    setLoadingSummary(true)
    getUserActivitySummary().then((data) => {
      setUserSummary(data)
      setLoadingSummary(false)
    })
  }, [])

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Audit Aktivitas</h1>

      <OnlinePresence />

      <Tabs
        defaultActiveKey="feed"
        items={[
          {
            key: 'feed',
            label: 'Riwayat Aktivitas',
            children: (
              <Card>
                <ActivityFeed
                  logs={logs}
                  loading={loadingLogs}
                  total={logCount}
                  page={page}
                  onPageChange={setPage}
                />
              </Card>
            ),
          },
          {
            key: 'summary',
            label: 'Ringkasan per User',
            children: (
              <Card>
                <UserSummaryTable
                  data={userSummary}
                  loading={loadingSummary}
                />
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}
```

**Step 5: Tambah route ke sidebar**

Cari file sidebar navigation (biasanya di `src/components/layouts/AppSidebar.tsx` atau serupa), tambah item:

```typescript
{ key: '/audit', label: 'Audit Aktivitas', icon: <AuditOutlined /> }
```

Pastikan hanya muncul untuk role yang punya akses (superadmin, admin, guru dengan akses).

**Step 6: Test manual di browser**

```bash
npm run dev
```

Navigasi ke `/audit`. Verifikasi:
- Section "Sedang Online" muncul dan update real-time
- Tab "Riwayat Aktivitas" menampilkan log
- Tab "Ringkasan per User" menampilkan tabel

**Step 7: Commit**

```bash
git add src/app/(admin)/audit/
git commit -m "feat: add audit dashboard with activity feed, user summary, and online presence"
```

---

## Task 10: Type Check & Cleanup

**Step 1: Jalankan type check**

```bash
npm run type-check
```

Expected: No errors. Fix semua TypeScript errors yang muncul.

**Step 2: Jalankan semua unit tests**

```bash
npm run test:run
```

Expected: Semua pass, tidak ada regresi.

**Step 3: Format code**

```bash
npm run format
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: type check and format audit logging implementation"
```

---

## Verification End-to-End

1. **Action logging:** Buat siswa baru → cek `activity_logs` ada `create_student`
2. **Page view:** Buka `/absensi` → cek ada `open_page` dengan `page_path: '/absensi'`
3. **Online presence:** Login 2 tab berbeda → cek keduanya muncul di "Sedang Online"
4. **Tab tutup:** Tutup satu tab → dalam 5-10 detik hilang dari "Sedang Online"
5. **Role filtering:** Login sebagai Admin Daerah → hanya lihat log di daerahnya
6. **User summary:** Cek tabel ringkasan user dengan last_active dan total actions

---

## Catatan

- `logActivity` adalah fire-and-forget — jangan `await` di middleware, dan fungsi tidak throw ke caller
- Supabase Realtime Presence menggunakan WebSocket — tidak membebani Vercel edge request quota
- Retention policy (delete log > 6 bulan) harus dijalankan manual atau via Supabase scheduled function
- Fitur lanjutan "mini CCTV denah aplikasi" bisa dibangun di atas Presence hook yang sudah ada
