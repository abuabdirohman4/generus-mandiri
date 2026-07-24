"""
csv_pivot_to_flat.py

Convert CSV pivot materi (format wide: bulan di kolom) ke CSV flat
yang kompatibel dengan scripts/import-materi.mjs.

Usage:
    python3 docs/materi/csv_pivot_to_flat.py

Output: docs/materi/csv/flat/<kelas>.csv
"""

import csv
import os
import io

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INPUT_DIR = os.path.join(SCRIPT_DIR, "csv")
OUTPUT_DIR = os.path.join(SCRIPT_DIR, "csv", "flat")

# Pivot CSV filename → nama kelas di DB (class_masters.name)
FILE_TO_KELAS = {
    "Materi Untuk Website - SMP 1.csv": "SMP 1",
    "Materi Untuk Website - SMP 2.csv": "SMP 2",
    "Materi Untuk Website - SMP 3.csv": "SMP 3",
    "Materi Untuk Website - SMA 1.csv": "SMA 1",
    "Materi Untuk Website - SMA 2.csv": "SMA 2",
    "Materi Untuk Website - SMA 3.csv": "SMA 3",
    "Materi Untuk Website - PN 1.csv":  "Pra Nikah 1",
    "Materi Untuk Website - PN 2.csv":  "Pra Nikah 2",
    "Materi Untuk Website - PN 3.csv":  "Pra Nikah 3",
    "Materi Untuk Website - PN 4.csv":  "Pra Nikah 4",
}

# Normalisasi nama kategori dari CSV → nama yang kompatibel dengan KATEGORI_TO_TYPE_NAME
KATEGORI_NORMALIZE = {
    "Materi dasar keagamaan": "Materi Dasar Keagamaan",
    "Adab/ Tatakrama": "Adab/ Tatakrama",
    "Adab/Tatakrama": "Adab/ Tatakrama",
    "Akhlak": "Akhlaq",
}

# Urutan bulan tahun ajaran (Juli = awal, Juni = akhir)
BULAN_ORDER = ["Juli", "Agustus", "September", "Oktober", "November", "Desember",
               "Januari", "Februari", "Maret", "April", "Mei", "Juni"]


def normalize_kategori(raw):
    raw = raw.strip()
    return KATEGORI_NORMALIZE.get(raw, raw)


def normalize_bulan(raw):
    """Normalize bulan header: strip whitespace, title case."""
    return raw.strip().strip("﻿").title()


def merge_months(month_values):
    """
    Input: list of (bulan_name, value) sesuai BULAN_ORDER (12 item)
    Output: list of (target_bulan_str, value) — bulan berurutan yang sama di-merge
    Contoh: [(Juli, X), (Agustus, X), (September, Y)] → [(Juli - Agustus, X), (September, Y)]
    Kosong ("") → di-skip.
    """
    result = []
    i = 0
    while i < len(month_values):
        bulan, val = month_values[i]
        val = val.strip()
        if not val:
            i += 1
            continue

        # Cari berapa bulan berurutan yang sama
        j = i + 1
        while j < len(month_values):
            next_bulan, next_val = month_values[j]
            if next_val.strip() == val:
                j += 1
            else:
                break

        if j - i == 1:
            target_bulan = bulan
        else:
            target_bulan = f"{bulan} - {month_values[j - 1][0]}"

        result.append((target_bulan, val))
        i = j

    return result


def parse_pivot_csv(filepath, kelas):
    """
    Parse CSV pivot dan return list of dicts:
    [{"kelas": ..., "kategori": ..., "target_bulan": ..., "materi": ...}, ...]
    """
    # newline='' wajib untuk csv.reader agar handle multiline quoted fields
    with open(filepath, encoding="utf-8-sig", newline="") as f:
        reader = list(csv.reader(f))

    # Baris 0: kosong
    # Baris 1: "Materi", "Sub Materi Semester 1", ..., "Sub Materi Semester 2", ...
    # Baris 2: "", "Juli", "Agustus", ..., "Juni"
    # Baris 3+: data

    # Parse baris 2 (index 2) untuk dapat nama bulan per kolom
    header_row = reader[2] if len(reader) > 2 else []
    bulan_cols = []
    for cell in header_row[1:]:
        name = normalize_bulan(cell)
        if name in BULAN_ORDER:
            bulan_cols.append(name)

    if len(bulan_cols) != 12:
        print(f"  ⚠️  Header bulan tidak lengkap: {bulan_cols}")

    rows = []
    current_kategori = None

    for cols in reader[3:]:
        # Pad kolom kalau kurang
        while len(cols) < 13:
            cols.append("")

        first_col = cols[0].strip()
        is_sub_row = first_col == ""

        if not is_sub_row:
            current_kategori = normalize_kategori(first_col)

        if current_kategori is None:
            continue

        # Ambil nilai per bulan (kolom 1-12)
        month_values = []
        for idx, bulan in enumerate(bulan_cols):
            val = cols[idx + 1] if idx + 1 < len(cols) else ""
            # Normalkan whitespace (multiline cell jadi satu baris ringkas)
            val = " ".join(val.split()).strip()
            month_values.append((bulan, val))

        # Merge bulan berurutan yang sama
        merged = merge_months(month_values)

        for target_bulan, materi in merged:
            if materi:
                rows.append({
                    "kelas": kelas,
                    "kategori": current_kategori,
                    "target_bulan": target_bulan,
                    "materi": materi,
                })

    return rows


def output_filename(kelas):
    return kelas.replace(" ", "-") + ".csv"


def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    total_rows = 0

    for filename, kelas in FILE_TO_KELAS.items():
        filepath = os.path.join(INPUT_DIR, filename)
        if not os.path.exists(filepath):
            print(f"⚠️  File tidak ditemukan: {filename}")
            continue

        print(f"📄 {filename} → {kelas}")
        rows = parse_pivot_csv(filepath, kelas)
        print(f"   {len(rows)} baris")

        out_path = os.path.join(OUTPUT_DIR, output_filename(kelas))
        with open(out_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=["kelas", "kategori", "target_bulan", "materi"])
            writer.writeheader()
            writer.writerows(rows)

        total_rows += len(rows)

    print(f"\n✅ Selesai. Total {total_rows} baris. Output: {OUTPUT_DIR}/")
    print("\nLangkah berikutnya (setelah cross-check manual):")
    print("  node scripts/import-materi.mjs docs/materi/csv/flat/SMP-1.csv --dry-run")
    print("  node scripts/import-materi.mjs docs/materi/csv/flat/SMP-1.csv")


if __name__ == "__main__":
    main()
