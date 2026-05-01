# Activity Logging System

Panduan untuk menggunakan sistem activity logging di Generus Mandiri.

## Overview

Setiap aksi administratif (create, update, delete) harus dicatat via `logActivity()`. Sistem ini menghasilkan audit trail yang bisa dilihat di halaman `/tracking`.

**Tabel database**: `activity_logs`

---

## logActivity() — Calling Convention

**File**: `src/lib/activityLogger.ts`

```typescript
export async function logActivity(params: LogActivityParams): Promise<void>
```

**Pattern**: Fire-and-forget — jangan `await`, jangan propagate error ke caller.

```typescript
// ✅ CORRECT — fire and forget
logActivity({ userId, action: 'CREATE_ACTIVITY_TYPE', entityType: 'activity_type', entityId: newType.id, entityLabel: newType.name })

// ❌ WRONG — jangan await
await logActivity({ ... })

// ❌ WRONG — jangan catch error
try { await logActivity({ ... }) } catch { ... }
```

### Parameter Reference

```typescript
interface LogActivityParams {
  userId: string                       // Required: ID user yang melakukan aksi
  action: LogAction | string           // Required: jenis aksi (lihat LogAction di bawah)
  entityType?: string                  // Optional: nama entitas (e.g., 'activity_type', 'teacher', 'student')
  entityId?: string                    // Optional: ID entitas yang terpengaruh
  entityLabel?: string                 // Optional: label human-readable (e.g., nama kelas/guru)
  metadata?: Record<string, unknown>   // Optional: konteks tambahan (data sebelum/sesudah edit, dll)
  pagePath?: string                    // Optional: route halaman tempat aksi terjadi
}
```

### Contoh Pemanggilan

```typescript
// Create
logActivity({
  userId: user.id,
  action: 'CREATE_ACTIVITY_TYPE',
  entityType: 'activity_type',
  entityId: newType.id,
  entityLabel: newType.name,
  pagePath: '/kegiatan',
})

// Update (sertakan metadata dengan data lama)
logActivity({
  userId: user.id,
  action: 'UPDATE_ACTIVITY_LEVEL',
  entityType: 'activity_level',
  entityId: level.id,
  entityLabel: level.name,
  metadata: { previous_name: oldLevel.name, new_name: level.name },
})

// Delete
logActivity({
  userId: user.id,
  action: 'DELETE_ACTIVITY_TYPE',
  entityType: 'activity_type',
  entityId: id,
  entityLabel: deletedType.name,
})
```

---

## LogAction Union Types

Tersedia di `src/types/activityLog.ts`. Contoh action yang sudah didefinisikan:

| Prefix | Module |
|--------|--------|
| `CREATE_*`, `UPDATE_*`, `DELETE_*` | CRUD untuk semua entitas |
| `*_ACTIVITY_TYPE` | `/kegiatan` — tipe pertemuan |
| `*_ACTIVITY_LEVEL` | `/kegiatan` — tingkat pertemuan |
| `*_TEACHER` | `/users/guru` |
| `*_STUDENT` | `/users/siswa` |
| `*_CLASS` | `/kelas` |
| `*_MEETING` | `/presensi` (absensi) |
| `*_MATERIAL` | `/materi` |
| `*_RAPOT` | `/rapot` |
| `ASSIGN_ACTIVITY_TYPE_TO_TEACHER` | Assignment tipe ke guru |
| `REMOVE_ACTIVITY_TYPE_FROM_TEACHER` | Deassignment tipe dari guru |
| `LOGIN`, `LOGOUT` | Auth events |

---

## ActivityLog Schema (Tabel `activity_logs`)

| Field | Type | Deskripsi |
|-------|------|-----------|
| `id` | string | Primary key |
| `user_id` | string \| null | Siapa yang melakukan aksi |
| `user_role` | string \| null | Role user saat aksi dilakukan |
| `org_daerah_id` | string \| null | Konteks org — daerah user |
| `org_desa_id` | string \| null | Konteks org — desa user |
| `org_kelompok_id` | string \| null | Konteks org — kelompok user |
| `action` | string | Jenis aksi (LogAction) |
| `entity_type` | string \| null | Nama entitas yang terpengaruh |
| `entity_id` | string \| null | ID entitas |
| `entity_label` | string \| null | Label human-readable |
| `metadata` | jsonb | Konteks tambahan (before/after, etc) |
| `page_path` | string \| null | Route halaman tempat aksi |
| `created_at` | string | Timestamp |

**Extended type**: `ActivityLogWithProfile` — join dengan `profiles` untuk `full_name`, `username`.

---

## Access Control: `/tracking` Page

- **Superadmin**: Full access — semua log dari semua org
- **Admin Daerah**: Log dari scope daerah mereka
- **Admin Desa/Kelompok**: Tidak ada akses ke tracking page
- **Teacher**: Tidak ada akses

---

## Integrasi di Module Baru

Ketika membuat server action baru yang modifikasi data, tambahkan `logActivity()` di bagian akhir setelah operasi sukses:

```typescript
export async function createSomething(data: CreateData) {
  'use server'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Not authenticated' }

  const { data: result, error } = await supabase
    .from('some_table')
    .insert(data)
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  // Log after successful operation
  logActivity({
    userId: user.id,
    action: 'CREATE_SOMETHING',
    entityType: 'something',
    entityId: result.id,
    entityLabel: result.name,
    pagePath: '/your-route',
  })

  revalidatePath('/your-route')
  return { success: true, data: result }
}
```

**Reference Implementation**: `src/app/(admin)/kegiatan/actions.ts`
