# Panduan Mengubah Default Filter Kategori

Dokumen ini menjelaskan cara mengubah kategori yang terpilih secara otomatis saat pertama kali halaman dimuat.

## 1. Menjadi "Semua Kategori" (Default Kosong)

Jika Anda ingin agar halaman **Laporan** dan **Monitoring** langsung menampilkan **Semua Kategori** saat dibuka, ikuti langkah berikut:

### Halaman Monitoring (`src/app/(admin)/monitoring/page.tsx`)
Cari fungsi `loadInitialData` dan beri komentar pada blok kode pemilihan otomatis:

```tsx
// Lokasi: sekitar baris 237-241
// Cukup beri komentar (comment out) bagian ini:
/*
if (finalCategories.length > 0 && !selectedCategoryId) {
    const hafalanCategory = finalCategories.find(cat => cat.name.toLowerCase() === 'hafalan');
    setSelectedCategoryId(hafalanCategory ? hafalanCategory.id : finalCategories[0].id);
}
*/
```

### Halaman Laporan (`src/app/(admin)/laporan/page.tsx`)
Hapus atau beri komentar pada `useEffect` kategori:

```tsx
// Lokasi: sekitar baris 107-113
// Beri komentar bagian ini:
/*
useEffect(() => {
  if (categories.length > 0 && !materiFilters.categoryId) {
    const hafalanCategory = categories.find(c => c.label.toLowerCase() === 'hafalan')
    const defaultId = hafalanCategory ? hafalanCategory.value : categories[0].value
    setMateriFilters(prev => ({ ...prev, categoryId: defaultId }))
  }
}, [categories])
*/
```

---

## 2. Kembali Menjadi Kategori "Hafalan" (Kondisi Saat Ini)

Jika saat ini default-nya kosong dan Anda ingin mengembalikannya agar memilih "Hafalan" secara otomatis, cukup aktifkan kembali (uncomment) blok kode di atas.

Logika kodenya adalah:
1. Mencari kategori yang namanya "Hafalan" (case-insensitive).
2. Jika ditemukan, ID kategori tersebut akan dipilih.
3. Jika tidak ditemukan (misal namanya berbeda), sistem akan memilih kategori pertama sebagai cadangan.
