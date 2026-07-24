"""
import-materi-psql.py

Import CSV flat materi ke local PostgreSQL (port 5417).
Usage:
    python3 scripts/import-materi-psql.py docs/materi/smp-pn-cleaned.csv [--dry-run]
"""

import csv, sys, subprocess, json, re

DB_CMD = ['psql', '-h', 'localhost', '-p', '5417', '-U', 'postgres', '-d', 'generus_local', '-A', '-t']

KATEGORI_MAP = {
    'Hafalan Doa Harian': 'Hafalan Doa Harian',
    "Hafalan Surat Al Qur'an": "Hafalan Surat Al Qur'an",
    'Hafalan Dalil-Dalil': 'Hafalan Dalil-Dalil',
    'Adab/ Tatakrama': 'Adab/ Tatakrama',
    'Adab/Tatakrama': 'Adab/ Tatakrama',
    'Akhlak': 'Akhlaq',
    'Akhlaq': 'Akhlaq',
    'Mandiri': 'Mandiri',
    'Kemandirian': 'Mandiri',
    'Praktik Ibadah': 'Praktik Ibadah',
    'Tulis Huruf Arab': 'Tulis Huruf Arab',
    'Materi Dasar Keagamaan': 'Materi Dasar Keagamaan',
    'Baca Huruf Quran': "Baca Huruf Al-Qur'an",
    "Baca Huruf Al-Qur'an": "Baca Huruf Al-Qur'an",
}

BULAN_MAP = {
    'Juli': 1, 'Agustus': 2, 'September': 3, 'Oktober': 4,
    'November': 5, 'Desember': 6, 'Januari': 7, 'Februari': 8,
    'Maret': 9, 'April': 10, 'Mei': 11, 'Juni': 12,
}

def psql(sql):
    result = subprocess.run(DB_CMD + ['-c', sql], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"psql error: {result.stderr}")
    return result.stdout.strip()

def psql_json(query):
    sql = f"SELECT json_agg(t) FROM ({query}) t;"
    out = psql(sql)
    if not out or out == '\\N':
        return []
    return json.loads(out)

def parse_month_range(target_bulan):
    """Return list of month numbers from 'Juli - September' or 'Juli'"""
    parts = [p.strip() for p in target_bulan.split(' - ')]
    if len(parts) == 1:
        m = BULAN_MAP.get(parts[0])
        return [m] if m else []
    start = BULAN_MAP.get(parts[0])
    end = BULAN_MAP.get(parts[1])
    if not start or not end:
        return []
    # Wrap-around bulan tahun ajaran (Juli=1 ... Juni=12)
    months = []
    cur = start
    while True:
        months.append(cur)
        if cur == end:
            break
        cur = (cur % 12) + 1
    return months

def semester_for_month(month_num):
    return 1 if month_num <= 6 else 2

def escape(s):
    return s.replace("'", "''")

def main():
    csv_path = sys.argv[1] if len(sys.argv) > 1 else None
    dry_run = '--dry-run' in sys.argv

    if not csv_path:
        print("Usage: python3 scripts/import-materi-psql.py <csv> [--dry-run]")
        sys.exit(1)

    print(f"📂 Membaca CSV: {csv_path}")
    if dry_run:
        print("🔍 DRY RUN — tidak ada yang ditulis ke DB\n")

    # Load lookup
    types = {r['name']: r['id'] for r in psql_json("SELECT id, name FROM material_types")}
    classes = {r['name']: r['id'] for r in psql_json("SELECT id, name FROM class_masters")}
    existing_items = {r['name'].lower(): r['id'] for r in psql_json("SELECT id, name FROM material_items")}

    print(f"✅ Loaded: {len(classes)} classes, {len(types)} types, {len(existing_items)} existing items\n")

    with open(csv_path, newline='', encoding='utf-8') as f:
        rows = list(csv.DictReader(f))
    print(f"📋 {len(rows)} baris ditemukan di CSV\n")

    errors = []
    items_inserted = 0
    items_reused = 0
    targets_inserted = 0

    # Collect all unique items needed first
    items_needed = {}  # lower_name → (display_name, type_id)
    for r in rows:
        materi = r['materi'].strip()
        kategori_raw = r['kategori'].strip()
        kategori = KATEGORI_MAP.get(kategori_raw, kategori_raw)
        type_id = types.get(kategori)
        if not type_id:
            errors.append(f"❌ Material type tidak ada: '{kategori_raw}'")
            continue
        items_needed[materi.lower()] = (materi, type_id)

    # Insert new items
    new_item_ids = {}  # lower_name → uuid
    for lower, (name, type_id) in items_needed.items():
        if lower in existing_items:
            new_item_ids[lower] = existing_items[lower]
            items_reused += 1
        else:
            if not dry_run:
                result = psql(f"""
                    INSERT INTO material_items (material_type_id, name)
                    VALUES ('{type_id}', '{escape(name)}')
                    ON CONFLICT DO NOTHING
                    RETURNING id;
                """)
                if result:
                    new_id = result.strip().splitlines()[0].strip()
                    new_item_ids[lower] = new_id
                else:
                    # Sudah ada (race / unique), ambil
                    existing = psql_json(f"SELECT id FROM material_items WHERE lower(name) = lower('{escape(name)}')")
                    if existing:
                        new_item_ids[lower] = existing[0]['id']
            else:
                new_item_ids[lower] = f'(new-uuid-{lower[:8]})'
            items_inserted += 1

    # Insert targets
    for r in rows:
        kelas = r['kelas'].strip()
        materi = r['materi'].strip()
        kategori_raw = r['kategori'].strip()
        kategori = KATEGORI_MAP.get(kategori_raw, kategori_raw)
        bulan_str = r['target_bulan'].strip()

        type_id = types.get(kategori)
        if not type_id:
            continue

        class_id = classes.get(kelas)
        if not class_id:
            errors.append(f"❌ Kelas tidak ada: '{kelas}'")
            continue

        item_id = new_item_ids.get(materi.lower())
        if not item_id:
            errors.append(f"❌ Item tidak ada di map: '{materi}'")
            continue

        months = parse_month_range(bulan_str)
        if not months:
            errors.append(f"❌ Bulan tidak dikenali: '{bulan_str}' ({kelas} - {materi})")
            continue

        for month_num in months:
            semester = semester_for_month(month_num)
            if not dry_run:
                psql(f"""
                    INSERT INTO material_monthly_targets
                        (class_master_id, semester, month, material_item_id)
                    VALUES
                        ('{class_id}', {semester}, {month_num}, '{item_id}')
                    ON CONFLICT DO NOTHING;
                """)
            targets_inserted += 1

    # material_item_classes
    item_class_inserted = 0
    seen_pairs = set()
    for r in rows:
        kelas = r['kelas'].strip()
        materi = r['materi'].strip()
        pair = (kelas, materi.lower())
        if pair in seen_pairs:
            continue
        seen_pairs.add(pair)

        class_id = classes.get(kelas)
        item_id = new_item_ids.get(materi.lower())
        if not class_id or not item_id:
            continue

        if not dry_run:
            psql(f"""
                INSERT INTO material_item_classes (class_master_id, material_item_id)
                VALUES ('{class_id}', '{item_id}')
                ON CONFLICT DO NOTHING;
            """)
        item_class_inserted += 1

    print("━━━ SUMMARY ━━━")
    print(f"✅ Items baru diinsert   : {items_inserted}")
    print(f"⏭️  Items reuse (existing): {items_reused}")
    print(f"✅ Targets diinsert      : {targets_inserted}")
    print(f"✅ Item-classes diinsert : {item_class_inserted}")
    if dry_run:
        print("\n(DRY RUN — tidak ada yang benar-benar ditulis)")
    if errors:
        unique_errors = sorted(set(errors))
        print(f"\n⚠️  {len(unique_errors)} error/warning:")
        for e in unique_errors:
            print(f"  {e}")
    else:
        print("\n✓ Tidak ada error")

if __name__ == '__main__':
    main()
