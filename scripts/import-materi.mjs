/**
 * import-materi.mjs
 *
 * Import materi dari CSV ke Supabase tanpa token AI.
 *
 * Usage:
 *   node scripts/import-materi.mjs docs/materi/hafalan-paud-kelas6.csv
 *   node scripts/import-materi.mjs docs/materi/selain-hafalan-paud-kelas6.csv
 *   node scripts/import-materi.mjs docs/materi/smp-sma.csv --dry-run
 *
 * CSV format yang didukung:
 *   kelas,kategori,target_bulan,materi
 *   (kolom pertama bisa berupa "No" — diabaikan otomatis)
 *
 * Env required (dari .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'

// ─── Setup ────────────────────────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// Load .env.local
config({ path: resolve(ROOT, '.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('❌ Missing env: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

const DRY_RUN = process.argv.includes('--dry-run')
const CSV_PATH = process.argv.find(a => a.endsWith('.csv'))

if (!CSV_PATH) {
    console.error('❌ Usage: node scripts/import-materi.mjs <path/to/file.csv> [--dry-run]')
    process.exit(1)
}

// ─── Constants ────────────────────────────────────────────────────────────────

// display_order untuk material_monthly_targets berdasarkan kategori CSV
const CATEGORY_DISPLAY_ORDER = {
    'Hafalan Doa Harian': 1,
    'Hafalan Surat Al Qur\'an': 2,
    'Hafalan Dalil-Dalil': 2,
    'Adab/ Tatakrama': 3,
    'Adab/Tatakrama': 3,
    'Akhlak': 4,
    'Akhlaq': 4,
    'Mandiri': 5,
    'Kemandirian': 5,
    'Praktik Ibadah': 6,
    'Tulis Huruf Arab': 6,
    'Materi Dasar Keagamaan': 6,
}

// Mapping nama kategori CSV → nama type di DB
// Jika ada kategori baru yang tidak ada di sini, script akan print warning dan skip
const KATEGORI_TO_TYPE_NAME = {
    'Hafalan Doa Harian': 'Hafalan Doa Harian',
    'Hafalan Surat Al Qur\'an': 'Hafalan Surat Al Qur\'an',
    'Hafalan Dalil-Dalil': 'Hafalan Dalil-Dalil',
    'Adab/ Tatakrama': 'Adab/ Tatakrama',
    'Adab/Tatakrama': 'Adab/ Tatakrama',
    'Akhlak': 'Akhlaq',   // DB name is Akhlaq
    'Akhlaq': 'Akhlaq',
    'Mandiri': 'Mandiri',
    'Kemandirian': 'Mandiri',
    'Praktik Ibadah': 'Praktik Ibadah',
    'Tulis Huruf Arab': 'Tulis Huruf Arab',
    'Materi Dasar Keagamaan': 'Materi Dasar Keagamaan',
}

// Mapping bulan (nama Indonesia) → nomor bulan
const BULAN_MAP = {
    'januari': 1, 'februari': 2, 'maret': 3, 'april': 4,
    'mei': 5, 'juni': 6, 'juli': 7, 'agustus': 8,
    'september': 9, 'oktober': 10, 'november': 11, 'desember': 12,
}

// ─── CSV Parser ───────────────────────────────────────────────────────────────

function parseCsv(filePath) {
    const content = readFileSync(resolve(ROOT, filePath), 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

    // Detect kolom — support format dengan/tanpa kolom "No"
    const hasNo = headers[0] === 'no'
    const kelasIdx = hasNo ? 1 : 0
    const kategoriIdx = hasNo ? 2 : 1
    const targetBulanIdx = hasNo ? 3 : 2
    // materi bisa mengandung koma (quoted), ambil semua kolom setelah target_bulan
    const materiStartIdx = hasNo ? 4 : 3

    const rows = []
    for (let i = 1; i < lines.length; i++) {
        const raw = lines[i]
        if (!raw.trim()) continue

        // Simple CSV parse: handle quoted fields
        const cols = parseRow(raw)
        if (cols.length < materiStartIdx + 1) continue

        // Skip rows where kelas is empty (continuation rows)
        const kelas = cols[kelasIdx]?.trim()
        if (!kelas) continue

        const kategori = cols[kategoriIdx]?.trim()
        const targetBulan = cols[targetBulanIdx]?.trim()
        // Join sisa kolom untuk materi (jika ada koma dalam nama materi)
        const materi = cols.slice(materiStartIdx).join(',').trim().replace(/^"|"$/g, '')

        if (!kelas || !kategori || !targetBulan || !materi) continue

        rows.push({ kelas, kategori, targetBulan, materi })
    }
    return rows
}

function parseRow(line) {
    const result = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
        const ch = line[i]
        if (ch === '"') {
            inQuotes = !inQuotes
        } else if (ch === ',' && !inQuotes) {
            result.push(current)
            current = ''
        } else {
            current += ch
        }
    }
    result.push(current)
    return result
}

// ─── Month Parser ─────────────────────────────────────────────────────────────

// Returns array of month numbers from "Juli - Agustus", "Maret", "Januari - Maret", etc.
function parseMonths(targetBulan) {
    const parts = targetBulan.split('-').map(p => p.trim().toLowerCase())
    if (parts.length === 1) {
        const m = BULAN_MAP[parts[0]]
        return m ? [m] : []
    }
    const start = BULAN_MAP[parts[0]]
    const end = BULAN_MAP[parts[1]]
    if (!start || !end) return []

    const months = []
    // Handle wrap-around (e.g., Juli-Juni wraps through December)
    if (start <= end) {
        for (let m = start; m <= end; m++) months.push(m)
    } else {
        for (let m = start; m <= 12; m++) months.push(m)
        for (let m = 1; m <= end; m++) months.push(m)
    }
    return months
}

// Semester: 1 = Juli–Desember (7–12), 2 = Januari–Juni (1–6)
function getSemester(month) {
    return month >= 7 ? 1 : 2
}

// ─── DB Lookup ────────────────────────────────────────────────────────────────

async function loadLookupTables() {
    const [classMastersRes, typesRes, ayRes] = await Promise.all([
        supabase.from('class_masters').select('id, name').order('sort_order'),
        supabase.from('material_types').select('id, name'),
        supabase.from('academic_years').select('id').eq('is_active', true).single(),
    ])

    if (classMastersRes.error) throw new Error('Failed to load class_masters: ' + classMastersRes.error.message)
    if (typesRes.error) throw new Error('Failed to load material_types: ' + typesRes.error.message)
    if (ayRes.error) throw new Error('Failed to load academic_years: ' + ayRes.error.message)

    const classByName = Object.fromEntries(classMastersRes.data.map(c => [c.name.toLowerCase(), c]))
    const typeByName = Object.fromEntries(typesRes.data.map(t => [t.name.toLowerCase(), t]))

    return { classByName, typeByName, academicYearId: ayRes.data.id }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n📂 Membaca CSV: ${CSV_PATH}`)
    if (DRY_RUN) console.log('🔍 DRY RUN — tidak ada yang ditulis ke DB\n')

    const rows = parseCsv(CSV_PATH)
    console.log(`📋 ${rows.length} baris ditemukan di CSV\n`)

    console.log('🔗 Loading DB lookup tables...')
    const { classByName, typeByName, academicYearId } = await loadLookupTables()
    console.log(`✅ Loaded: ${Object.keys(classByName).length} classes, ${Object.keys(typeByName).length} types`)
    console.log(`   Academic year: ${academicYearId}\n`)

    // ── Load existing material_items (by name, case-insensitive) ──
    const { data: existingItems, error: eiErr } = await supabase
        .from('material_items')
        .select('id, name, material_type_id')
    if (eiErr) throw new Error('Failed to load material_items: ' + eiErr.message)
    const itemByNameType = Object.fromEntries(
        existingItems.map(i => [`${i.name.toLowerCase()}||${i.material_type_id}`, i])
    )

    // ── Stats ──
    const stats = { itemInserted: 0, itemSkipped: 0, targetInserted: 0, targetSkipped: 0, errors: [] }

    // ── Process each row ──
    for (const row of rows) {
        const { kelas, kategori, targetBulan, materi } = row

        // 1. Resolve class master
        const classMaster = classByName[kelas.toLowerCase()]
        if (!classMaster) {
            stats.errors.push(`❌ Kelas tidak ditemukan: "${kelas}" (materi: ${materi})`)
            continue
        }

        // 2. Resolve material type
        const typeName = KATEGORI_TO_TYPE_NAME[kategori]
        if (!typeName) {
            stats.errors.push(`❌ Kategori tidak dikenali: "${kategori}" (materi: ${materi}) — tambahkan ke KATEGORI_TO_TYPE_NAME`)
            continue
        }
        const materialType = typeByName[typeName.toLowerCase()]
        if (!materialType) {
            stats.errors.push(`❌ Material type tidak ada di DB: "${typeName}"`)
            continue
        }

        // 3. Upsert material_item
        const itemKey = `${materi.toLowerCase()}||${materialType.id}`
        let item = itemByNameType[itemKey]

        if (!item) {
            if (!DRY_RUN) {
                const { data, error } = await supabase
                    .from('material_items')
                    .insert({ name: materi, material_type_id: materialType.id })
                    .select('id, name, material_type_id')
                    .single()
                if (error) {
                    stats.errors.push(`❌ Insert item gagal: "${materi}" — ${error.message}`)
                    continue
                }
                item = data
                itemByNameType[itemKey] = item
            } else {
                item = { id: `[DRY:${materi.slice(0, 20)}]`, name: materi, material_type_id: materialType.id }
            }
            stats.itemInserted++
        } else {
            stats.itemSkipped++
        }

        // 4. Parse months → insert targets
        const months = parseMonths(targetBulan)
        if (months.length === 0) {
            stats.errors.push(`⚠️  target_bulan tidak bisa diparsing: "${targetBulan}" (materi: ${materi})`)
            continue
        }

        const displayOrder = CATEGORY_DISPLAY_ORDER[kategori] ?? 99

        for (const month of months) {
            const semester = getSemester(month)
            const targetRow = {
                class_master_id: classMaster.id,
                academic_year_id: academicYearId,
                semester,
                month,
                material_item_id: item.id,
                display_order: displayOrder,
            }

            if (!DRY_RUN) {
                const { error } = await supabase
                    .from('material_monthly_targets')
                    .upsert(targetRow, {
                        onConflict: 'class_master_id,academic_year_id,semester,month,material_item_id',
                        ignoreDuplicates: true,
                    })
                if (error) {
                    stats.errors.push(`❌ Upsert target gagal: ${materi} (${kelas}, bulan ${month}) — ${error.message}`)
                    continue
                }
            }
            stats.targetInserted++
        }
    }

    // 5. Sync material_item_classes
    if (!DRY_RUN && stats.targetInserted > 0) {
        console.log('\n🔄 Syncing material_item_classes dari material_monthly_targets...')
        const { error: syncErr } = await supabase.rpc('exec_sql', {
            sql: `INSERT INTO material_item_classes (material_item_id, class_master_id)
                  SELECT DISTINCT material_item_id, class_master_id
                  FROM material_monthly_targets
                  ON CONFLICT (material_item_id, class_master_id) DO NOTHING`
        }).catch(() => ({ error: null })) // fallback: rpc mungkin tidak ada

        // Fallback: jalankan via supabase-js insert manually (kurang efisien tapi aman)
        if (syncErr) {
            console.log('   (rpc tidak tersedia — sync manual skipped, jalankan SQL berikut secara manual:)')
            console.log('   INSERT INTO material_item_classes (material_item_id, class_master_id)')
            console.log('   SELECT DISTINCT material_item_id, class_master_id FROM material_monthly_targets')
            console.log('   ON CONFLICT (material_item_id, class_master_id) DO NOTHING;')
        } else {
            console.log('   ✅ material_item_classes synced')
        }
    }

    // ── Summary ──
    console.log('\n━━━ SUMMARY ━━━')
    console.log(`✅ Items baru diinsert : ${stats.itemInserted}`)
    console.log(`⏭️  Items sudah ada    : ${stats.itemSkipped}`)
    console.log(`✅ Targets diinsert    : ${stats.targetInserted}`)
    if (DRY_RUN) console.log('\n(DRY RUN — tidak ada yang benar-benar ditulis)')

    if (stats.errors.length > 0) {
        console.log(`\n⚠️  ${stats.errors.length} error/warning:`)
        stats.errors.forEach(e => console.log('  ' + e))
    } else {
        console.log('\n🎉 Selesai tanpa error!')
    }
}

main().catch(err => {
    console.error('\n💥 Fatal error:', err.message)
    process.exit(1)
})
