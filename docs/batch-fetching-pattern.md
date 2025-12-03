# Batch Fetching Pattern - Supabase Row Limit Workaround

## 📌 Ringkasan

Dokumentasi ini menjelaskan cara mengatasi **limit 1000 rows** pada Supabase/PostgREST menggunakan **batch fetching pattern**.

---

## ⚠️ Masalah

### Supabase Row Limit
Supabase (PostgREST) membatasi hasil query ke **maksimal 1000 rows** secara default. Jika tabel memiliki lebih dari 1000 rows, data yang melebihi limit akan **diabaikan** tanpa error.

### Gejala
- Data "hilang" di UI padahal ada di database
- Count/persentase tidak akurat
- Pagination tidak menampilkan semua data
- `.range(0, 9999)` **TIDAK mengatasi** masalah ini

### Contoh Kasus
```typescript
// ❌ SALAH - Hanya mengambil 1000 rows pertama
const { data } = await supabase
  .from('material_item_classes') // Punya 1152 rows
  .select('*')
  .range(0, 9999); // Tetap hanya dapat 1000 rows!

console.log(data.length); // Output: 1000 (bukan 1152)
```

---

## ✅ Solusi: Batch Fetching Pattern

### Konsep
Fetch data dalam **chunk/batch** sebesar 1000 rows, lalu gabungkan semua batch sampai tidak ada data lagi.

### Template Code

```typescript
async function fetchAllData<T>(
  tableName: string,
  selectQuery: string = '*'
): Promise<T[]> {
  const supabase = await createClient();
  
  let allData: T[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: batchData, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .range(offset, offset + batchSize - 1);

    if (error) {
      console.error(`Error fetching ${tableName} batch:`, error);
      throw new Error(`Gagal memuat data ${tableName}`);
    }

    if (batchData && batchData.length > 0) {
      allData = [...allData, ...batchData];
      offset += batchSize;
      hasMore = batchData.length === batchSize; // Stop jika batch tidak penuh
    } else {
      hasMore = false;
    }
  }

  return allData;
}
```

### Cara Kerja

1. **Inisialisasi**: Set `offset = 0`, `batchSize = 1000`
2. **Loop**:
   - Fetch rows dari `offset` sampai `offset + 999`
   - Jika dapat 1000 rows → Ada kemungkinan masih ada data lagi
   - Jika dapat < 1000 rows → Ini batch terakhir, stop
3. **Gabungkan**: Semua batch digabung jadi satu array

**Ilustrasi:**
```
Total data: 1152 rows

Batch 1: range(0, 999)    → 1000 rows ✓ Lanjut
Batch 2: range(1000, 1999) → 152 rows  ✓ Stop (tidak penuh)

Total fetched: 1152 rows ✅
```

---

## 🔧 Implementasi

### Contoh 1: Material Item Classes (Sudah Diimplementasikan)

**File**: `src/app/(admin)/materi/actions.ts`

```typescript
export async function getMaterialItemsWithClassMappings(): Promise<MaterialItem[]> {
  const supabase = await createClient();
  
  // 1. Fetch all material items
  const { data: itemsData } = await supabase
    .from('material_items')
    .select(`
      *,
      material_type:material_types(
        *,
        category:material_categories(*)
      )
    `)
    .range(0, 9999)
    .order('name');

  // 2. Fetch all class mappings (BATCH FETCHING)
  let allMappingsData: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: batchData, error: batchError } = await supabase
      .from('material_item_classes')
      .select(`
        material_item_id,
        class_master:class_masters(*)
      `)
      .range(offset, offset + batchSize - 1);

    if (batchError) {
      console.error('Error getting class mappings batch:', batchError);
      throw new Error('Gagal memuat mapping kelas');
    }

    if (batchData && batchData.length > 0) {
      allMappingsData = [...allMappingsData, ...batchData];
      offset += batchSize;
      hasMore = batchData.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  const mappingsData = allMappingsData;

  // 3. Map classes to items
  const items = (itemsData || []).map((item: any) => {
    const itemMappings = mappingsData?.filter((m: any) => m.material_item_id === item.id) || [];
    const classes = itemMappings
      .map((m: any) => m.class_master)
      .filter((cm: any) => cm);
      
    return {
      ...item,
      classes
    };
  });

  return items;
}
```

### Contoh 2: Attendance Records (Template)

**File**: `src/app/(admin)/absensi/actions.ts`

```typescript
export async function getAllAttendanceRecords(): Promise<AttendanceRecord[]> {
  const supabase = await createClient();
  
  let allRecords: any[] = [];
  let offset = 0;
  const batchSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: batchData, error } = await supabase
      .from('attendance_records')
      .select(`
        *,
        student:students(*),
        class:class_masters(*)
      `)
      .range(offset, offset + batchSize - 1)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching attendance batch:', error);
      throw new Error('Gagal memuat data absensi');
    }

    if (batchData && batchData.length > 0) {
      allRecords = [...allRecords, ...batchData];
      offset += batchSize;
      hasMore = batchData.length === batchSize;
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}
```

---

## 📊 Performa

### Overhead
- **Network**: 2 requests untuk 1152 rows (vs 1 request yang gagal)
- **Memory**: Minimal (data digabung secara incremental)
- **Time**: ~200-500ms per batch (tergantung kompleksitas query)

### Optimasi
1. **Gunakan `.order()`** untuk hasil konsisten
2. **Filter di database** jika memungkinkan (`.eq()`, `.gte()`, dll)
3. **Batasi kolom** dengan `select('id, name, ...')` bukan `select('*')`
4. **Cache hasil** jika data jarang berubah

---

## 🎯 Kapan Menggunakan Batch Fetching?

### ✅ Gunakan Jika:
- Tabel bisa punya **> 1000 rows**
- Data "hilang" padahal ada di database
- Count/aggregate tidak akurat
- Butuh **semua data** untuk processing di client

### ❌ Jangan Gunakan Jika:
- Data **pasti < 1000 rows**
- Bisa pakai **server-side pagination** (user klik next/prev)
- Bisa pakai **infinite scroll** (load on demand)
- Bisa pakai **server-side aggregation** (count, sum, dll di database)

---

## 🔍 Debugging

### Cek Jumlah Rows
```typescript
// Tambahkan logging sementara
console.log('Total fetched:', allData.length);
```

### Cek Batch Count
```typescript
let batchCount = 0;
while (hasMore) {
  batchCount++;
  // ... fetch logic
  console.log(`Batch ${batchCount}: ${batchData.length} rows`);
}
```

### Verifikasi di Database
```sql
-- Cek total rows di tabel
SELECT count(*) FROM material_item_classes;
```

---

## 📚 Referensi

- [Supabase Pagination Docs](https://supabase.com/docs/guides/api/pagination)
- [PostgREST Row Limits](https://postgrest.org/en/stable/references/api/pagination_count.html)

---

## 🤝 Kontribusi

Jika menemukan tabel lain yang butuh batch fetching, silakan:
1. Implementasikan pattern ini
2. Update dokumentasi ini dengan contoh baru
3. Tambahkan di checklist di bawah

### Checklist Implementasi
- [x] `material_item_classes` - Materi per Kelas
- [ ] `attendance_records` - Data Absensi
- [ ] `student_scores` - Nilai Siswa (jika ada)
- [ ] `meeting_participants` - Peserta Pertemuan (jika ada)

---

**Terakhir diupdate**: 2025-12-03  
**Dibuat oleh**: AI Assistant (Antigravity)
