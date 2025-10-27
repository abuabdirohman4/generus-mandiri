# Add Meeting Types Feature

## Database Changes

### 1. Create Categories Table

Buat tabel `categories` untuk menyimpan kategori usia (PAUD, Caberawit, Pra Remaja, Remaja, Pra Nikah, Orang Tua, Lansia) dengan flag `is_sambung_capable` untuk menentukan tipe pertemuan yang tersedia.

### 2. Update Master Classes

- Tambah kolom `category_id` ke tabel `master_classes`
- Buat master class baru "Lansia" dengan category "LANSIA"
- Populate `category_id` untuk master classes yang sudah ada berdasarkan nama (PAUD → PAUD, Kelas 1-6 → Caberawit, Remaja → Remaja, dll)

### 3. Update Meetings Table

Tambah kolom `meeting_type_code` (VARCHAR) ke tabel `meetings` untuk menyimpan kode tipe pertemuan (nullable untuk meeting lama).

## Frontend Implementation

### 1. Create Constants File

File: `src/lib/constants/meetingTypes.ts`

- Define 5 meeting types sebagai constants
- Define helper functions untuk determine available types berdasarkan categories

### 2. Update Server Actions

File: `src/app/(admin)/absensi/actions.ts`

- Update `createMeeting` untuk require `meetingTypeCode`
- Update `getMeetingsWithStats` untuk include `meeting_type_code` dan `categories` via join
- Add validation logic untuk meeting type availability

### 3. Create Custom Hook

File: `src/app/(admin)/absensi/hooks/useMeetingTypes.ts`

- Hook untuk get available meeting types berdasarkan selected class IDs
- Fetch class categories dan determine available types client-side

### 4. Update CreateMeetingModal

File: `src/app/(admin)/absensi/components/CreateMeetingModal.tsx`

- Add meeting type selector (required field)
- Fetch available types berdasarkan selected classes
- Update form validation dan submission

### 5. Update DataFilter Component

File: `src/components/shared/DataFilter.tsx`

- Add meeting type filter dengan option "Semua Tipe"
- Meeting lama (null meeting_type_code) tidak ditampilkan jika filter aktif

### 6. Update Absensi Page

File: `src/app/(admin)/absensi/page.tsx`

- Integrate meeting type filter
- Update filtered meetings logic

### 7. Update UI Components

Files: `MeetingList.tsx`, `MeetingCards.tsx`, `MeetingChart.tsx`

- Display meeting type badge/label
- Handle null meeting_type_code (meeting lama)

### 8. Update TypeScript Interfaces

- Add `meeting_type_code` to Meeting interface
- Add `category_id` to MasterClass interface
- Update CreateMeetingData interface

## Business Logic

**Pembinaan Only (PAUD, Caberawit):**

- Hanya "Pembinaan"

**Sambung Capable (Pra Remaja, Remaja, Pra Nikah, Orang Tua, Lansia):**

- Semua 5 tipe tersedia

**Mixed Classes:**

- Jika ada minimal 1 kelas sambung-capable → semua 5 tipe tersedia
- Jika semua kelas pembinaan-only → hanya "Pembinaan"

## Migration Safety

- Kolom baru nullable → tidak break existing data
- Meeting lama tetap accessible (meeting_type_code = null)
- Master class baru tidak affect existing classes
- Category mapping otomatis via SQL UPDATE based on name pattern