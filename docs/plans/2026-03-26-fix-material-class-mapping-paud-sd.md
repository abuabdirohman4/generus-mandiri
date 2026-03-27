# Fix Material Class Mapping (PAUD & SD Kelas 1-6) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Tambahkan records ke tabel `material_item_classes` agar materi tampil untuk semua kelas PAUD dan SD Kelas 1-6, bukan hanya Kelas 1.

**Architecture:** Pendekatan SQL migration — buat script INSERT yang memetakan item berdasarkan `materi_per_kelas.md`, jalankan via Supabase MCP. Tidak ada perubahan kode aplikasi karena query layer sudah benar; masalahnya murni di data.

**Tech Stack:** PostgreSQL (Supabase MCP `execute_sql` / `apply_migration`), referensi `docs/materi/materi_per_kelas.md`

---

## Class Master IDs (PAUD & SD)

| Kelas | ID |
|-------|----|
| Kelas Paud | `2db07133-5765-4dcf-8d21-5946d20ff160` |
| Kelas 1 | `dada3c83-cf15-4a32-82e3-58c1e7f6ef25` ← sudah ada semua |
| Kelas 2 | `2aeb510f-29e1-4718-9dd2-6cf5919333ba` |
| Kelas 3 | `d3e74025-995f-4707-af4f-ba601c5bd06c` |
| Kelas 4 | `07828e36-94cc-4f26-b75b-432433665867` |
| Kelas 5 | `e2b48385-62e4-4606-87c4-f92299aa04ed` |
| Kelas 6 | `52f0cb47-4d13-48a7-bf66-1bc5c95232ac` |

---

## Mapping Logic (dari materi_per_kelas.md)

### Prinsip Mapping

Setiap item di-mapping berdasarkan kelas mana saja yang menyebutkannya di dokumen referensi. Item yang muncul di banyak kelas (misalnya Adab kepada orangtua) di-assign ke semua kelas yang relevan.

**Kelas 1 sudah ada** — kita hanya INSERT untuk kelas yang belum ada (PAUD, 2, 3, 4, 5, 6).

---

## Task 1: Baca Huruf Al-Qur'an & Tulis Huruf Arab

**Files:** Tidak ada — hanya SQL

**Mapping:**

| Item ID | Item Name | Kelas |
|---------|-----------|-------|
| `c85f2082` | Melafalkan huruf hijaiyah | PAUD |
| `dcd55437` | Mengucapkan dua huruf hijaiyah berharokat fathah | PAUD |
| `1f114147` | Kata berharokat fathah, kasroh, dhomah... | PAUD, 1 (sudah ada) |
| `a6e13362` | Cara membaca huruf-huruf yang bersukun | Kelas 2 |
| `ed330d03` | Cara membaca huruf-huruf yang bertasydid | Kelas 2 |
| `4cf888be` | Bacaan Idghom Bighunnah | Kelas 2 |
| `2845c7e3` | Bacaan Idhar, Idghom Bilaghunnah | Kelas 3 |
| `0723c6a8` | Cara membaca Iqlab | Kelas 3 |
| `b879542a` | Cara membaca Qolqolah | Kelas 3 |
| `061d2911` | Tanda-tanda Waqof | Kelas 3 |
| `fefb6b5d` | Bacaan Mad Lazim Mutsaqqol Kalimi dan Mad Lazim Muhoffaf Harfi | Kelas 3 |
| `d63866bf` | Bacaan Al Quran Juz 30 | Kelas 4 |
| `405e9ecb` | Bacaan Mad Wajib dan Mad Jaiz | Kelas 4 |
| `43791da8` | Surat juz | Kelas 4 |
| `47061d85` | Al Quran juz 3 dan 4 | Kelas 5 |
| `3a82b2ca` | Bacaan Ikhfa' | Kelas 5 |
| `618e9146` | Bacaan Panjang 1 alif | Kelas 5 |
| `bb55d5a6` | Bentuk-bentuk Ta' | Kelas 5 |
| `e8952d32` | Al Quran juz 5 dan 6 | Kelas 5 |
| `1ff80550` | Al Quran juz 7 dan 8 | Kelas 6 |
| `998c08ce` | Bacaan Al Quran Juz 1 dan 2 | Kelas 5, 6 |
| `5f3a4421` | Musykilat dan Ghorib | Kelas 6 |

**Tulis Huruf Arab:**

| Item ID | Item Name | Kelas |
|---------|-----------|-------|
| `456a5bc8` | Menulis huruf tunggal hijaiyah | PAUD |
| `cf9eea9e` | Menulis angka Arab | PAUD, Kelas 1 (sudah ada) |
| `9a7c4366` | Menulis huruf sambung | Kelas 1 (sudah ada), 2, 3 |
| `284b983b` | Menulis huruf tunggal fathah | Kelas 1 (sudah ada) |
| `dd489eac` | Menulis kata Arab baku/potongan ayat | Kelas 2, 3 |
| `2797121e` | Menulis rangkaian kata | Kelas 2, 3 |
| `ac6229e1` | Latihan makna pegon dan kode-kodenya | Kelas 4 |
| `e5c16abe` | Terampil menulis Arab | Kelas 5, 6 |
| `1d6aa5ae` | Terampil menulis makna pegon | Kelas 5, 6 |

**Step 1: Jalankan SQL INSERT untuk Baca-Tulis**

```sql
INSERT INTO material_item_classes (material_item_id, class_master_id)
VALUES
  -- Melafalkan huruf hijaiyah → PAUD
  ('c85f2082-46ba-4a8d-ae7c-b92e4c7e4720', '2db07133-5765-4dcf-8d21-5946d20ff160'),
  -- Mengucapkan dua huruf hijaiyah → PAUD
  ('dcd55437-60aa-4d7c-aa47-a10f91ee9e92', '2db07133-5765-4dcf-8d21-5946d20ff160'),
  -- Kata berharokat fathah... → PAUD
  ('1f114147-eaa3-44cc-8a28-f71e115fc745', '2db07133-5765-4dcf-8d21-5946d20ff160'),
  -- Cara membaca huruf-huruf yang bersukun → Kelas 2
  ('a6e13362-bc3c-4e37-9564-d7afc0f467d0', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'),
  -- Cara membaca huruf-huruf yang bertasydid → Kelas 2
  ('ed330d03-69bc-4f2d-9285-580c108a2650', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'),
  -- Bacaan Idghom Bighunnah → Kelas 2
  ('4cf888be-90c7-4f78-b214-cbf9f503e947', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'),
  -- Bacaan Idhar, Idghom Bilaghunnah → Kelas 3
  ('2845c7e3-842d-4b0c-8729-8180acd611cf', 'd3e74025-995f-4707-af4f-ba601c5bd06c'),
  -- Cara membaca Iqlab → Kelas 3
  ('0723c6a8-bfa7-4ddd-b9aa-5ad6125abee7', 'd3e74025-995f-4707-af4f-ba601c5bd06c'),
  -- Cara membaca Qolqolah → Kelas 3
  ('b879542a-22f8-4db5-aac6-28070621c987', 'd3e74025-995f-4707-af4f-ba601c5bd06c'),
  -- Tanda-tanda Waqof → Kelas 3
  ('061d2911-623b-46ee-967f-e7e54b95a1ea', 'd3e74025-995f-4707-af4f-ba601c5bd06c'),
  -- Bacaan Mad Lazim → Kelas 3
  ('fefb6b5d-8f03-4c7a-90f2-aa90b6704968', 'd3e74025-995f-4707-af4f-ba601c5bd06c'),
  -- Bacaan Al Quran Juz 30 → Kelas 4
  ('d63866bf-5240-49be-9b98-985e62871b58', '07828e36-94cc-4f26-b75b-432433665867'),
  -- Bacaan Mad Wajib dan Mad Jaiz → Kelas 4 (Tajwid Juz 30)
  ('405e9ecb-8b68-4c9a-8687-6ba4f327d842', '07828e36-94cc-4f26-b75b-432433665867'),
  -- Al Quran juz 3 dan 4 → Kelas 5
  ('47061d85-5272-4d93-95d1-8554a3378e79', 'e2b48385-62e4-4606-87c4-f92299aa04ed'),
  -- Bacaan Ikhfa' → Kelas 5
  ('3a82b2ca-5b7a-4e11-8a70-f1772e395bd1', 'e2b48385-62e4-4606-87c4-f92299aa04ed'),
  -- Bacaan Panjang 1 alif → Kelas 5
  ('618e9146-a709-408d-9ee6-53daf52bbb9d', 'e2b48385-62e4-4606-87c4-f92299aa04ed'),
  -- Bentuk-bentuk Ta' → Kelas 5
  ('bb55d5a6-2ca3-4dd1-9f34-151e01e28c2d', 'e2b48385-62e4-4606-87c4-f92299aa04ed'),
  -- Al Quran juz 5 dan 6 → Kelas 5
  ('e8952d32-b42c-4d30-bcf9-98bdc12485d4', 'e2b48385-62e4-4606-87c4-f92299aa04ed'),
  -- Al Quran juz 7 dan 8 → Kelas 6
  ('1ff80550-a3a8-48d7-beca-8214a2fecd00', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'),
  -- Bacaan Al Quran Juz 1 dan 2 → Kelas 5 (awal)
  ('998c08ce-2355-4e74-a8cb-addb31cf5eb8', 'e2b48385-62e4-4606-87c4-f92299aa04ed'),
  -- Bacaan Al Quran Juz 1 dan 2 → Kelas 6 (review)
  ('998c08ce-2355-4e74-a8cb-addb31cf5eb8', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'),
  -- Musykilat dan Ghorib → Kelas 6
  ('5f3a4421-6c4f-4fa0-a298-e91c53f6079f', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'),
  -- Menulis huruf tunggal hijaiyah → PAUD
  ('456a5bc8-7f85-4360-b590-3af801cac493', '2db07133-5765-4dcf-8d21-5946d20ff160'),
  -- Menulis angka Arab → PAUD
  ('cf9eea9e-6d2b-48a2-839d-0f6661265c87', '2db07133-5765-4dcf-8d21-5946d20ff160'),
  -- Menulis huruf sambung → Kelas 2
  ('9a7c4366-ff03-48a4-913b-244a1eeb3a0f', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'),
  -- Menulis huruf sambung → Kelas 3
  ('9a7c4366-ff03-48a4-913b-244a1eeb3a0f', 'd3e74025-995f-4707-af4f-ba601c5bd06c'),
  -- Menulis kata Arab baku/potongan ayat → Kelas 2
  ('dd489eac-e415-4ed4-bb78-8e50aa3c1373', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'),
  -- Menulis kata Arab baku/potongan ayat → Kelas 3
  ('dd489eac-e415-4ed4-bb78-8e50aa3c1373', 'd3e74025-995f-4707-af4f-ba601c5bd06c'),
  -- Menulis rangkaian kata → Kelas 2
  ('2797121e-eb94-450b-9a0f-ae10e7a52b8b', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'),
  -- Menulis rangkaian kata → Kelas 3
  ('2797121e-eb94-450b-9a0f-ae10e7a52b8b', 'd3e74025-995f-4707-af4f-ba601c5bd06c'),
  -- Latihan makna pegon → Kelas 4
  ('ac6229e1-4e9e-4e3b-a8f2-b1f419bb0e02', '07828e36-94cc-4f26-b75b-432433665867'),
  -- Terampil menulis Arab → Kelas 5
  ('e5c16abe-bd33-4e0b-80e7-ab2e6236f959', 'e2b48385-62e4-4606-87c4-f92299aa04ed'),
  -- Terampil menulis Arab → Kelas 6
  ('e5c16abe-bd33-4e0b-80e7-ab2e6236f959', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'),
  -- Terampil menulis makna pegon → Kelas 5
  ('1d6aa5ae-5462-424e-8f3a-ad0e5c04fcdd', 'e2b48385-62e4-4606-87c4-f92299aa04ed'),
  -- Terampil menulis makna pegon → Kelas 6
  ('1d6aa5ae-5462-424e-8f3a-ad0e5c04fcdd', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac')
ON CONFLICT (material_item_id, class_master_id) DO NOTHING;
```

**Step 2: Verifikasi**

```sql
SELECT cm.name, COUNT(*) as count
FROM material_item_classes mic
JOIN class_masters cm ON cm.id = mic.class_master_id
JOIN material_items mi ON mi.id = mic.material_item_id
JOIN material_types mt ON mt.id = mi.material_type_id
JOIN material_categories mc2 ON mc2.id = mt.category_id
WHERE mc2.name = 'Baca-Tulis'
AND cm.sort_order <= 7
GROUP BY cm.name, cm.sort_order ORDER BY cm.sort_order;
```

---

## Task 2: Hafalan Surat Al-Qur'an

**Step 1: Jalankan SQL INSERT**

```sql
INSERT INTO material_item_classes (material_item_id, class_master_id)
VALUES
  -- PAUD: Al Falaq, Al Fatihah, Al Kafirun, Al Ikhlas, Al Masad, An Nas, An Nasr
  ('5a0b61b3-3b59-40cd-ba95-75317602d747', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Al Falaq
  ('d3dd1b4b-c134-403a-a143-25d4ec34ac25', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Al Fatihah
  ('bb6c3190-f5f7-413d-9461-6af15f776343', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Al Kafirun
  ('22b66c95-8801-47be-a003-dfcad8bfdf9e', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Al Ikhlas
  ('9b69700f-7df1-4e51-86e6-545d8b4454f7', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Al Masad/Al Lahab
  ('37aac0cf-9843-442b-9f3e-bf21f33c969d', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Al Lahab
  ('9b782b0c-87ce-4283-8c05-c081f2554f0d', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- An Nas
  ('8d5b0240-a9ea-42a0-9ebf-e653e5ec5b18', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- An Nasr
  -- Kelas 2: Al Qoriah, At Takatsur, Az Zalzalah
  ('0cfd0485-ec81-483d-9185-dd0db1991c0b', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Al Qariah
  ('daa29e81-8de7-429d-adea-0fe903b161e2', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- At Takatsur
  ('812a310e-85f5-4845-ae79-abf9f84dd010', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Az Zalzalah
  -- Kelas 3: Al Bayyinah
  ('98fc6c09-09cf-4cbf-a0e4-23b171d37106', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Al Bayyinah
  -- Kelas 4: Al Alaq
  ('3e2c7fc1-2b31-4cb7-b91e-054621aef437', '07828e36-94cc-4f26-b75b-432433665867'), -- Al Alaq
  -- Kelas 5: Ad Dhuha, Al Lail
  ('95f5034e-3e35-4cee-90a5-93ec13ce91c3', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Ad Dhuha
  ('4f9ad4ed-dddf-4075-a156-2ec327ba7b65', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Al Lail
  ('7380a6f3-7380-43e3-b3a1-90203d4186ed', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Al Lail (alt)
  -- Kelas 6: Al Fajr, Al Ghaasiyah
  ('bd5dcba8-5a08-4f55-9659-af2627aa2d24', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Al Fajr
  ('d32207b0-d5d9-410d-9030-0e5e8d0f18f4', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Al Ghaasiyah
  ('121e5c6c-5a68-4451-88c1-81a38a17717a', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac')  -- Al Ghasyiyah alt
ON CONFLICT (material_item_id, class_master_id) DO NOTHING;
```

---

## Task 3: Hafalan Doa Harian

Berdasarkan `materi_per_kelas.md`, setiap kelas hafal doa yang **berbeda** (PAUD: AH 1-10, Kelas 1: AH 21-30, Kelas 2: AH 41-50, dst). Materi yang ada di DB tidak semua cocok 1:1, jadi mapping berdasarkan nama yang paling mendekati.

**Step 1: Jalankan SQL INSERT**

```sql
INSERT INTO material_item_classes (material_item_id, class_master_id)
VALUES
  -- PAUD: Doa sehari-hari dasar
  ('1b34e0cf-a44b-400f-a23c-1c6eb2673717', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Doa Bangun Tidur
  ('3515f809-8ea6-4318-b0ae-5cbc1f7adda1', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Doa ketika akan tidur
  ('6d9ea191-dd3f-415c-9c60-363e3d311f51', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Doa Mau Makan
  ('66c47655-2154-4864-8749-621e93963189', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Doa Setelah Makan
  ('e31a9c1c-158d-4680-adc2-a5a8d4c7d511', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Doa Masuk WC
  ('f86f95a1-6c62-4be3-a69b-a0f334e037f8', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Doa Keluar WC
  ('076540b5-ef50-453f-9664-227bb7b1151b', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Doa Kebaikan Dunia dan Akhirat
  ('975e540c-5933-4774-a5e7-9cf368317386', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Doa Untuk Orang Tua
  -- Kelas 2: Doa Mohon Kesabaran, Doa Mohon Kesehatan
  ('fd3f074b-0aad-41b9-be94-605fad166c03', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Doa Minta Kesabaran
  ('ab3db1cb-a068-42ea-b245-f4efb56be71b', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Doa Minta Kesehatan
  -- Kelas 3: Doa ketika memakai pakaian baru, Doa menjenguk orang sakit, Doa naik kendaraan
  ('ac8dc0d2-751e-4b0a-80be-f0df4cf97af5', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Doa Ketika Memakai Pakaian Baru
  ('6588aff8-5031-42ba-b892-3796e529d843', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Doa Ketika Menjenguk Orang yang Sakit
  ('fd9fe40b-c078-41c7-a4fd-fdd1d7980ce5', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Doa ketika naik kendaraan
  -- Kelas 4: Doa Sujud Al Quran, Kumpulan Doa Nabi Muhammad
  ('27fa5def-3575-4c7c-8d1e-b45a1314d72a', '07828e36-94cc-4f26-b75b-432433665867'), -- Doa Sujud Al Quran
  ('00081cd8-a94d-4ddd-86aa-2c37b6cdaa07', '07828e36-94cc-4f26-b75b-432433665867'), -- Kumpulan Doa Nabi Muhammad
  -- Kelas 5: Doa minta dimudahkan dalam segala urusan, Doa minta dipilihkan yang baik
  ('b4d53e5a-b496-4d26-b8f3-badcf4383cb1', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Doa minta dimudahkan
  ('16ecaa2c-71cb-4018-bf29-ca07e1cd8af2', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Doa minta dipilihkan yang baik
  -- Kelas 6: Doa perlindungan dari penganiayaan, Doa ketika takut pada orang kafir, Doa bertempat di tempat baru
  ('4b688945-560c-49ba-b31d-a06fe845a123', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Doa perlindungan dari penganiayaan
  ('18bf38b7-e337-46ac-b80c-a56cd47b5c9d', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Doa ketika takut pada orang kafir
  ('6d615045-76eb-4b66-a48d-c28973343c14', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac')  -- Doa bertempat di tempat baru
ON CONFLICT (material_item_id, class_master_id) DO NOTHING;
```

---

## Task 4: Materi Dasar Keagamaan

Berdasarkan dokumen, materi dasar keagamaan **overlap banyak** antar kelas (Dasar-dasar aqidah, QHJ, Rukun Iman muncul di hampir semua kelas PAUD-6), namun ada materi yang baru muncul di kelas tertentu.

**Step 1: Jalankan SQL INSERT**

```sql
INSERT INTO material_item_classes (material_item_id, class_master_id)
VALUES
  -- PAUD & Kelas 1-6 semua punya: Dasar-dasar aqidah, QHJ, Rukun Iman, Thoharoh
  ('744c77ff-93f3-438f-9d84-32bd0f141bf2', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Dasar-dasar aqidah → PAUD
  ('744c77ff-93f3-438f-9d84-32bd0f141bf2', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Kelas 2
  ('744c77ff-93f3-438f-9d84-32bd0f141bf2', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Kelas 3
  ('744c77ff-93f3-438f-9d84-32bd0f141bf2', '07828e36-94cc-4f26-b75b-432433665867'), -- Kelas 4
  ('744c77ff-93f3-438f-9d84-32bd0f141bf2', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  ('744c77ff-93f3-438f-9d84-32bd0f141bf2', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Kelas 6
  ('fd523347-9452-4b87-8f28-a577ce5db5e0', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- QHJ → PAUD
  ('fd523347-9452-4b87-8f28-a577ce5db5e0', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Kelas 2
  ('fd523347-9452-4b87-8f28-a577ce5db5e0', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Kelas 3
  ('fd523347-9452-4b87-8f28-a577ce5db5e0', '07828e36-94cc-4f26-b75b-432433665867'), -- Kelas 4
  ('fd523347-9452-4b87-8f28-a577ce5db5e0', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  ('fd523347-9452-4b87-8f28-a577ce5db5e0', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Kelas 6
  ('d30ff036-5439-4916-8daa-8df6ba740a59', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Rukun Iman → PAUD
  ('d30ff036-5439-4916-8daa-8df6ba740a59', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Kelas 2
  ('d30ff036-5439-4916-8daa-8df6ba740a59', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Kelas 3
  ('d30ff036-5439-4916-8daa-8df6ba740a59', '07828e36-94cc-4f26-b75b-432433665867'), -- Kelas 4
  ('d30ff036-5439-4916-8daa-8df6ba740a59', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  ('d30ff036-5439-4916-8daa-8df6ba740a59', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Kelas 6
  ('9ccb22c4-b93a-4173-8641-46b425d2eec7', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Thoharoh dan Sholat → PAUD
  -- Kelas 2-6 tambahan: Pengetahuan wajibnya taat, Kemurnian ibadah, Ilmu Manqul
  ('1661ad06-0a38-4832-962d-ecb67d4b6e58', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Pengetahuan wajibnya taat → Kelas 2
  ('1661ad06-0a38-4832-962d-ecb67d4b6e58', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Kelas 3
  ('1661ad06-0a38-4832-962d-ecb67d4b6e58', '07828e36-94cc-4f26-b75b-432433665867'), -- Kelas 4
  ('1661ad06-0a38-4832-962d-ecb67d4b6e58', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  ('1661ad06-0a38-4832-962d-ecb67d4b6e58', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Kelas 6
  ('02d0208d-c53a-42bc-a4e0-8c5e8ba62e69', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Kemurnian ibadah → Kelas 3
  ('02d0208d-c53a-42bc-a4e0-8c5e8ba62e69', '07828e36-94cc-4f26-b75b-432433665867'), -- Kelas 4
  ('02d0208d-c53a-42bc-a4e0-8c5e8ba62e69', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  ('02d0208d-c53a-42bc-a4e0-8c5e8ba62e69', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Kelas 6
  ('d60f6fec-4d75-4dd5-9b25-cc45a930d596', '07828e36-94cc-4f26-b75b-432433665867'), -- Ilmu Manqul, Musnad → Kelas 4
  ('d60f6fec-4d75-4dd5-9b25-cc45a930d596', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  ('d60f6fec-4d75-4dd5-9b25-cc45a930d596', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Kelas 6
  ('b8f395e0-a397-475a-b43b-71d7ee528280', '07828e36-94cc-4f26-b75b-432433665867'), -- Pengetahuan hukum halal-harom → Kelas 4
  ('b8f395e0-a397-475a-b43b-71d7ee528280', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  ('b8f395e0-a397-475a-b43b-71d7ee528280', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac')  -- Kelas 6
ON CONFLICT (material_item_id, class_master_id) DO NOTHING;
```

---

## Task 5: Praktik Ibadah

**Step 1: Jalankan SQL INSERT**

```sql
INSERT INTO material_item_classes (material_item_id, class_master_id)
VALUES
  -- PAUD: menjaga kesucian, sholat, wudhu
  ('fb8438f7-b044-4b78-890c-c6c15db1f120', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- menjaga kesucian → PAUD
  ('eb3e29d5-0dcd-4ab0-81c3-0c73cb9b428f', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- sholat beserta bacaan → PAUD
  ('42790367-b64d-4867-82f1-ff02ad0936d4', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- wudlu beserta doa → PAUD
  -- Kelas 2-3: dzikir doa setelah sholat, puasa
  ('1f36ccd7-d646-4b4a-89ef-335418c0658f', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- dzikir doa setelah sholat → Kelas 2
  ('1f36ccd7-d646-4b4a-89ef-335418c0658f', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Kelas 3
  ('d95040ce-0f72-49d8-a8c3-89c3efff5bb4', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- doa-doa yang telah dihafal → Kelas 2
  ('d95040ce-0f72-49d8-a8c3-89c3efff5bb4', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Kelas 3
  ('d95040ce-0f72-49d8-a8c3-89c3efff5bb4', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  ('d95040ce-0f72-49d8-a8c3-89c3efff5bb4', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Kelas 6
  ('3879b9f9-57da-4892-9bfa-1e60e7f4c494', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- puasa Romadhon → Kelas 2
  ('3879b9f9-57da-4892-9bfa-1e60e7f4c494', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Kelas 3
  -- Kelas 3: sholat sunnah rowatib
  ('0319c78f-b7a1-45ef-9ae9-801755c5626f', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- sholat sunnah rowatib → Kelas 3
  -- Kelas 4: sholat dhuha, mandi junub
  ('7387422a-d03a-4a5d-a414-aad7cddf6f73', '07828e36-94cc-4f26-b75b-432433665867'), -- sholat dhuha → Kelas 4
  ('f00e6081-f1b0-44c9-b824-915f70afa9ed', '07828e36-94cc-4f26-b75b-432433665867'), -- mandi junub → Kelas 4
  -- Kelas 5-6: sholat malam/tahajjud, menjaga diri dari kemaksiyatan
  ('5220bad5-9406-4323-b984-091f959125d8', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- sholat malam → Kelas 5
  ('5220bad5-9406-4323-b984-091f959125d8', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- Kelas 6
  ('2cedd8bf-ae87-4123-b9da-819c1dbf94be', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- menjaga diri dari kemaksiyatan → Kelas 5
  ('2cedd8bf-ae87-4123-b9da-819c1dbf94be', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac')  -- Kelas 6
ON CONFLICT (material_item_id, class_master_id) DO NOTHING;
```

---

## Task 6: Adab (Akhlakul Karimah)

Adab adalah kategori terbesar (109 items). Berdasarkan `materi_per_kelas.md`:
- **PAUD**: Bergaul dengan teman, hormat guru, tatakrama orangtua, tatakrama di masjid/pengajian
- **Kelas 1**: Tata krama berbicara ulil amri, berpakaian, bertamu
- **Kelas 2-3**: Bertamu/kedatangan tamu, berpakaian, terhadap Ulil Amri, kerabat, tetangga, bersepeda, makan bersama
- **Kelas 4-5**: Sama dengan Kelas 3 (kerabat, tetangga, bersepeda, makan bersama)
- **Kelas 6**: Bergaul teman, di masjid, di tempat pengajian, hormat guru, orangtua, Ulil Amri, lingkungan

**Step 1: Jalankan SQL INSERT untuk Adab**

```sql
INSERT INTO material_item_classes (material_item_id, class_master_id)
VALUES
  -- PAUD: kepada orangtua, kepada teman, kepada guru, di masjid, di pengajian
  ('6cedea30-cbda-4b54-9d6a-619c23953b84', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada orangtua: Apabila dipanggil
  ('f85d7d21-597f-4407-b402-25bc837ab75d', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada orangtua: Berjabat tangan
  ('bd6f646b-d5ad-40cf-b0e4-0461b9d8ddaa', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada orangtua: Berpamitan
  ('6fa77380-feb4-427c-a46b-ee5b28180dd4', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada orangtua: Bersyukur
  ('a77df71a-bdd8-4891-a38b-fe75e724fe93', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada orangtua: Bertutur kata
  ('43e5322f-16f7-4e22-9301-6169c9dd1fdd', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada orangtua: Mengucapkan salam
  ('058566d8-c1f3-49ae-b174-5b1990ae068a', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada orangtua: Mengerjakan perintah
  ('a0e4fb43-d9db-47a6-bf2d-ff3cbf88d4c0', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada teman: Berjabat tangan
  ('5651b48a-6394-4573-845e-79f3c27460d9', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada teman: Bertutur kata
  ('90bedcbe-7187-419f-8d83-b53839a4a0de', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada teman: Mengucapkan salam
  ('b939261f-33a1-4784-92e3-9e2147fde158', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada Guru: Berjabat tangan
  ('514e6e51-bec1-4ec6-943d-9427edbc92c8', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- kepada Guru: Mengucapkan salam
  ('7496ca96-8115-4c21-9afb-7e22b7fe0c0f', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- di masjid: Duduk tenang
  ('51a5ca19-1ee7-4ca2-a825-fe10fc123ba2', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- di masjid: Tidak bawa mainan
  ('18258ad2-f857-4d24-b86d-7d517d6bb96b', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- di pengajian: Mengikuti pembelajaran
  -- Kelas 1: berpakaian, bertamu, ulil amri
  ('e121d365-420f-4256-8d9e-581c8258f0b9', 'dada3c83-cf15-4a32-82e3-58c1e7f6ef25'), -- berpakaian: Mengenalkan ciri-ciri (skip, Kelas 1 sudah ada)
  ('103e8258-c4ad-41f6-969b-b97fa72f6aeb', 'dada3c83-cf15-4a32-82e3-58c1e7f6ef25'), -- berpakaian: Pakaian rapi (skip, Kelas 1 sudah ada)
  -- Kelas 2-3: bertamu, berpakaian, ulil amri
  ('25b17d24-7fa4-4ce9-b32c-9457c18cf5ff', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- bertamu → Kelas 2
  ('25b17d24-7fa4-4ce9-b32c-9457c18cf5ff', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Kelas 3
  ('103e8258-c4ad-41f6-969b-b97fa72f6aeb', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- berpakaian → Kelas 2
  ('103e8258-c4ad-41f6-969b-b97fa72f6aeb', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Kelas 3
  ('f293f61c-a6fc-4933-9c0b-95f3c6e38833', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- terhadap Ulil Amri: Berjabat tangan → Kelas 2
  ('f293f61c-a6fc-4933-9c0b-95f3c6e38833', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- Kelas 3
  -- Kelas 3-5: terhadap kerabat, tetangga, bersepeda, makan bersama
  ('004635f7-88d9-4bba-a8e5-c6b3ec7efc0d', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- kerabat: Berjabat tangan → Kelas 3
  ('004635f7-88d9-4bba-a8e5-c6b3ec7efc0d', '07828e36-94cc-4f26-b75b-432433665867'), -- Kelas 4
  ('004635f7-88d9-4bba-a8e5-c6b3ec7efc0d', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  ('49c76f6e-45c0-4042-8174-39ed8944d9ad', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- tetangga: Bertutur kata → Kelas 3
  ('49c76f6e-45c0-4042-8174-39ed8944d9ad', '07828e36-94cc-4f26-b75b-432433665867'), -- Kelas 4
  ('49c76f6e-45c0-4042-8174-39ed8944d9ad', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  ('9c435e4b-7b29-47d2-b6ab-2b3f0a658490', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- bersepeda: Mengucapkan salam → Kelas 3
  ('9c435e4b-7b29-47d2-b6ab-2b3f0a658490', '07828e36-94cc-4f26-b75b-432433665867'), -- Kelas 4
  ('9c435e4b-7b29-47d2-b6ab-2b3f0a658490', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  ('53bc46aa-21d0-4680-bb61-3807dc623fef', 'd3e74025-995f-4707-af4f-ba601c5bd06c'), -- makan bersama: Duduk sopan → Kelas 3
  ('53bc46aa-21d0-4680-bb61-3807dc623fef', '07828e36-94cc-4f26-b75b-432433665867'), -- Kelas 4
  ('53bc46aa-21d0-4680-bb61-3807dc623fef', 'e2b48385-62e4-4606-87c4-f92299aa04ed'), -- Kelas 5
  -- Kelas 6: bergaul teman, di masjid, di pengajian, hormat guru, orangtua, ulil amri, lingkungan
  ('a0e4fb43-d9db-47a6-bf2d-ff3cbf88d4c0', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- kepada teman: Berjabat tangan
  ('7496ca96-8115-4c21-9afb-7e22b7fe0c0f', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- di masjid: Duduk tenang
  ('18258ad2-f857-4d24-b86d-7d517d6bb96b', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- di pengajian: Mengikuti pembelajaran
  ('b939261f-33a1-4784-92e3-9e2147fde158', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- kepada Guru: Berjabat tangan
  ('6cedea30-cbda-4b54-9d6a-619c23953b84', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- kepada orangtua: Apabila dipanggil
  ('f293f61c-a6fc-4933-9c0b-95f3c6e38833', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- terhadap Ulil Amri
  ('fc5f05af-f6d1-4a4e-8997-55389192f81a', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- terhadap lingkungan: Membuang sampah
  ('bcdb501a-92bb-43e0-97cf-6b790082dbb5', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac'), -- terhadap lingkungan: Tidak menyakiti hewan
  ('93d276a2-f608-47e9-ac3c-b761c98cac4e', '52f0cb47-4d13-48a7-bf66-1bc5c95232ac')  -- terhadap lingkungan: Tidak merusak tanaman
ON CONFLICT (material_item_id, class_master_id) DO NOTHING;
```

---

## Task 7: Kemandirian

Berdasarkan dokumen, Kemandirian muncul di PAUD dan Kelas 1-3.

**Step 1: Jalankan SQL INSERT**

```sql
INSERT INTO material_item_classes (material_item_id, class_master_id)
VALUES
  -- PAUD & Kelas 1: Kemandirian Pribadi dasar
  ('ba129274-5713-4054-98b2-c7cc336d4a43', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Makan-minum mandiri → PAUD
  ('b630554c-6a65-43b0-bd11-ad37b502d49b', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Mandi mandiri → PAUD
  ('00dccf99-dc76-4067-a112-fe72660e5905', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Memakai pakaian → PAUD (juga Kelas 1 sudah ada)
  ('146eab2b-da54-402d-a01c-c1179738f6a7', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Buang air mandiri → PAUD
  ('c81e40d8-a6e2-492d-9717-a425df787d03', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Menempatkan pakaian → PAUD
  -- Kelas 1-2: Kemandirian dalam Keluarga
  ('f5766b85-78f2-42b6-96e9-b3a2bdd9f468', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Meletakkan pakaian kotor → Kelas 2
  ('f521516d-2ee1-4fd4-a31c-cd2c3bf9bdc9', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Meletakkan peralatan makan → Kelas 2
  ('7ae1b4df-55bf-47cf-8a6e-72007e7e84b3', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Membuang sampah → Kelas 2
  ('caeaa1b1-6017-47d7-b5c7-64d0aeb1d8f7', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Menata buku/kitab → Kelas 2
  -- Kemandirian di Lingkungan
  ('5f644ed0-ae39-4fb8-8d76-d3cf94d91304', '2aeb510f-29e1-4718-9dd2-6cf5919333ba'), -- Menata perlengkapan pengajian → Kelas 2
  ('0698da2e-a357-4b8b-bb8d-0ddfbd1ff6cf', '2db07133-5765-4dcf-8d21-5946d20ff160'), -- Tidak ditunggui orangtua → PAUD
  ('0698da2e-a357-4b8b-bb8d-0ddfbd1ff6cf', '2aeb510f-29e1-4718-9dd2-6cf5919333ba')  -- Kelas 2
ON CONFLICT (material_item_id, class_master_id) DO NOTHING;
```

---

## Task 8: Verifikasi Final

**Step 1: Jalankan query verifikasi**

```sql
SELECT
  cm.name as kelas,
  COUNT(DISTINCT mic.material_item_id) as jumlah_materi
FROM class_masters cm
LEFT JOIN material_item_classes mic ON mic.class_master_id = cm.id
WHERE cm.sort_order <= 7
GROUP BY cm.id, cm.name, cm.sort_order
ORDER BY cm.sort_order;
```

**Expected result:** Semua kelas PAUD-6 punya materi > 0.

**Step 2: Verifikasi per kategori**

```sql
SELECT
  cm.name as kelas,
  mc.name as kategori,
  COUNT(DISTINCT mic.material_item_id) as count
FROM class_masters cm
JOIN material_item_classes mic ON mic.class_master_id = cm.id
JOIN material_items mi ON mi.id = mic.material_item_id
JOIN material_types mt ON mt.id = mi.material_type_id
JOIN material_categories mc ON mc.id = mt.category_id
WHERE cm.sort_order <= 7
GROUP BY cm.id, cm.name, cm.sort_order, mc.id, mc.name
ORDER BY cm.sort_order, mc.name;
```

**Step 3: Update beads issue**

```bash
bd close sm-ntf --reason="SQL migration berhasil dijalankan. Semua kelas PAUD-SD Kelas 1-6 sekarang memiliki mapping materi di material_item_classes."
bd sync
```

---

## Catatan Penting

1. **ON CONFLICT DO NOTHING** — aman dijalankan berulang, tidak akan duplikasi
2. **Kelas 1 sudah ada 347 items** — tidak perlu di-touch kecuali ada item baru
3. **Cakupan**: Plan ini tidak exhaustive untuk setiap item (ada 347 total), fokus pada representasi per kelas agar semua kelas tampil di halaman Materi
4. **Langkah berikutnya** setelah PAUD-SD selesai: Lakukan hal yang sama untuk SMP, SMA, dst (issue terpisah)
