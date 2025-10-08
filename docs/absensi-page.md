# Attendance Page

Halaman absensi yang sudah di-refactor menjadi komponen-komponen yang modular dan reusable.

## Struktur Komponen

```
src/app/(admin)/absensi/
├── page.tsx                    # Main page (113 baris)
├── hooks/
│   ├── useAttendance.ts        # Business logic untuk attendance
│   └── useAutoSave.ts          # Auto-save functionality
└── components/
    ├── AttendanceHeader.tsx    # Header + Date + Summary
    ├── AttendanceTable.tsx     # Table dengan dropdown
    ├── DateControls.tsx        # Date picker + navigation
    ├── LoadingState.tsx        # Loading component
    ├── ReasonModal.tsx         # Modal untuk alasan izin
    ├── SummaryCard.tsx         # Card summary
    ├── AutoSaveStatus.tsx      # Status auto-save
    └── index.ts                # Export semua komponen
```

## Cara Menggunakan Auto-Save

### 1. Import Hook dan Component
```tsx
import { useAutoSave } from './hooks/useAutoSave'
import { AutoSaveStatus } from './components'
```

### 2. Setup di Component
```tsx
export default function AbsensiPage() {
  const { students, attendance, selectedDate } = useAttendance()
  
  // Enable auto-save
  const { isAutoSaving, lastSaved } = useAutoSave({
    attendance,
    selectedDate,
    students,
    enabled: true,        // Set true untuk enable
    delay: 1500          // Delay dalam ms (default: 1500)
  })

  return (
    <div>
      {/* ... komponen lain ... */}
      
      {/* Auto-save Status */}
      <AutoSaveStatus
        isAutoSaving={isAutoSaving}
        lastSaved={lastSaved}
      />
    </div>
  )
}
```

### 3. Konfigurasi Auto-Save
- `enabled`: Boolean untuk enable/disable auto-save
- `delay`: Delay sebelum auto-save (default: 1500ms)
- `attendance`: Data attendance yang akan di-save
- `selectedDate`: Tanggal yang dipilih
- `students`: Data siswa

## Fitur Auto-Save

### ✅ **Debouncing**
- Auto-save hanya trigger setelah user berhenti mengubah data
- Delay yang bisa dikonfigurasi (default: 1.5 detik)

### ✅ **Visual Feedback**
- Loading indicator saat menyimpan
- Timestamp terakhir disimpan
- Status message yang informatif

### ✅ **Error Handling**
- Console error jika auto-save gagal
- Tidak mengganggu user experience

### ✅ **Performance**
- Cleanup timeout saat component unmount
- Tidak ada memory leak

## Komponen Reusable

### **DateControls**
```tsx
<DateControls
  selectedDate={selectedDate}
  onDateChange={handleDateChange}
  onPreviousDay={goToPreviousDay}
  onNextDay={goToNextDay}
/>
```

### **SummaryCard**
```tsx
<SummaryCard
  title="Kelas 10A"
  subtitle="Siswa (30 orang)"
  percentage={85}
  percentageLabel="Kehadiran"
/>
```

### **AttendanceTable**
```tsx
<AttendanceTable
  students={students}
  attendance={attendance}
  onStatusChange={handleStatusChange}
/>
```

## Keuntungan Refactoring

1. **Maintainability**: Kode lebih mudah di-maintain
2. **Reusability**: Komponen bisa digunakan di halaman lain
3. **Testability**: Setiap komponen bisa di-test secara terpisah
4. **Performance**: Re-render yang lebih efisien
5. **Readability**: Main page sangat clean dan mudah dipahami

## Future Enhancements

- [ ] Auto-save dengan optimistic updates
- [ ] Offline support dengan sync
- [ ] Bulk operations untuk attendance
- [ ] Export/Import attendance data
- [ ] Real-time collaboration
