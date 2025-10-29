# Panduan Import Materi Pembelajaran

## Overview
Panduan lengkap untuk mengekstrak dan mengimport materi pembelajaran dari file HTML ke database Supabase.

## Langkah-langkah Import

### 1. Persiapan Data
- Siapkan file HTML yang berisi materi pembelajaran
- Pastikan struktur HTML sudah terorganisir dengan baik (semester, bulan, minggu, hari)

### 2. Ekstrak Materi dari HTML
```bash
# Buat script untuk parsing HTML
node scripts/parse-materi-kelas-6.js
```

**Struktur data yang diperlukan:**
- `class_master_id`: ID kelas master di database
- `semester`: 1 atau 2
- `month`: 1-12 (Januari-Desember)
- `week`: 1-4 (Minggu I-IV)
- `day_of_week`: 1-6 (Senin-Sabtu)
- `content`: JSONB berisi materi pembelajaran

### 3. Generate SQL dalam Batch
```bash
# Buat script untuk generate SQL
node scripts/generate-kelas-6-sql.js
```

**Tips:**
- Bagi data menjadi batch kecil (10-15 entries per batch)
- Gunakan `ON CONFLICT DO UPDATE` untuk mencegah duplikasi
- Hindari komentar inline dalam SQL yang bisa menyebabkan syntax error

### 4. Perbaiki File Batch (Jika Ada Error)
```bash
# Script untuk menghapus komentar yang menyebabkan error
node scripts/fix-batch-comments.js
```

**Masalah umum:**
- Komentar inline setelah `)` dalam VALUES
- Trailing comma sebelum `ON CONFLICT`

### 5. Eksekusi Batch Satu per Satu
```bash
# Gunakan Supabase MCP tool untuk eksekusi
mcp_generus-mandiri-v2_execute_sql
```

**Strategi:**
- Eksekusi batch kecil (10-15 entries)
- Tunggu konfirmasi sukses sebelum lanjut ke batch berikutnya
- Jangan coba eksekusi semua batch sekaligus

### 6. Verifikasi Import
```sql
-- Cek total materi
SELECT COUNT(*) as total_materials
FROM learning_materials
WHERE class_master_id = 'your-class-master-id';

-- Cek distribusi per semester dan bulan
SELECT semester, month, COUNT(*) as total
FROM learning_materials
WHERE class_master_id = 'your-class-master-id'
GROUP BY semester, month
ORDER BY semester, month;
```

## Template Script yang Dibutuhkan

### 1. HTML Parser (`scripts/parse-materi.js`)
```javascript
const fs = require('fs');
const cheerio = require('cheerio');

// Parse HTML dan ekstrak data
// Output: JSON file dengan struktur data
```

### 2. SQL Generator (`scripts/generate-sql.js`)
```javascript
const fs = require('fs');

// Baca JSON data
// Generate SQL INSERT statements
// Bagi menjadi batch files
```

### 3. Batch Fixer (`scripts/fix-batch-comments.js`)
```javascript
const fs = require('fs');

// Hapus komentar inline yang menyebabkan error
// Perbaiki syntax SQL
```

## Struktur Database

### Table: `learning_materials`
```sql
CREATE TABLE learning_materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_master_id UUID NOT NULL REFERENCES class_masters(id),
  semester INTEGER NOT NULL CHECK (semester IN (1, 2)),
  month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  week INTEGER NOT NULL CHECK (week BETWEEN 1 AND 4),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 6),
  content JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_master_id, semester, month, week, day_of_week)
);
```

## Tips dan Best Practices

### ✅ Yang Harus Dilakukan
- Bagi data menjadi batch kecil (10-15 entries)
- Gunakan `ON CONFLICT DO UPDATE` untuk mencegah duplikasi
- Verifikasi setiap batch sebelum lanjut ke batch berikutnya
- Backup database sebelum import besar
- Test dengan data kecil dulu

### ❌ Yang Harus Dihindari
- Jangan eksekusi semua batch sekaligus
- Jangan gunakan komentar inline dalam SQL VALUES
- Jangan skip verifikasi setelah import
- Jangan import tanpa backup

## Troubleshooting

### Error: Syntax Error
- **Penyebab:** Komentar inline dalam SQL
- **Solusi:** Jalankan `fix-batch-comments.js`

### Error: Connection Timeout
- **Penyebab:** Batch terlalu besar
- **Solusi:** Bagi menjadi batch lebih kecil

### Error: Duplicate Key
- **Penyebab:** Data sudah ada
- **Solusi:** Gunakan `ON CONFLICT DO UPDATE`

## Contoh Struktur Content JSONB
```json
{
  "quran": {
    "title": "Baca Al-Qur'an",
    "items": ["juz 7"]
  },
  "hafalan": {
    "title": "Hafalan Surat",
    "items": [{
      "title": "Surat Al-Fajr (89)",
      "arabic": "...",
      "latin": "...",
      "meaning": "...",
      "reference": "..."
    }]
  },
  "akhlaq": {
    "title": "Akhlaqul Karimah",
    "items": [{
      "arabic": "...",
      "latin": "...",
      "meaning": "...",
      "reference": "..."
    }]
  }
}
```

## Status Import Terakhir
- **Total materi:** 157 entries
- **Semester 1:** Januari-Juni (143 entries)
- **Semester 2:** Juli (14 entries)
- **Status:** ✅ BERHASIL