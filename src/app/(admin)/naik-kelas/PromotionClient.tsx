'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Button from '@/components/ui/button/Button'
import {
    getPromotionSourceOptions,
    getStudentsToPromote,
    executeGradePromotion,
} from './actions'
import type {
    PromotionSourceOption,
    PromotionStudentRow,
    PromotionResult,
} from '@/types/promotion'
import DataFilter from '@/components/shared/DataFilter'
import InputFilter from '@/components/form/input/InputFilter'
import Checkbox from '@/components/form/input/Checkbox'
import Skeleton from '@/components/ui/skeleton/Skeleton'
import type { DataFilters } from '@/components/shared/dataFilterHelpers'
import { useUserProfile } from '@/stores/userProfileStore'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useClasses } from '@/hooks/useClasses'
import { useNotifications } from '@/hooks/useNotifications'

interface Props {
    academicYears: { id: string; name: string }[]
    defaultYearId: string
    canPickYear: boolean
}

type Step = 1 | 2 | 3 | 4

const optKey = (o: { kind: string; id: string }) => `${o.kind}-${o.id}`

const EMPTY_FILTERS: DataFilters = { daerah: [], desa: [], kelompok: [], kelas: [], gender: '' }

export default function PromotionClient({ academicYears, defaultYearId, canPickYear }: Props) {
    const [step, setStep] = useState<Step>(1)
    const [options, setOptions] = useState<PromotionSourceOption[]>([])
    const [windowClosedForUser, setWindowClosedForUser] = useState(false)
    const [loadingOptions, setLoadingOptions] = useState(true)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
    const [selectedCount, setSelectedCount] = useState(0)
    const [rows, setRows] = useState<PromotionStudentRow[]>([])
    const [loadingRows, setLoadingRows] = useState(false)
    const [executing, setExecuting] = useState(false)
    const [redirecting, setRedirecting] = useState(false)
    const [result, setResult] = useState<PromotionResult | null>(null)
    const [dataFilters, setDataFilters] = useState<DataFilters>(EMPTY_FILTERS)
    const [search, setSearch] = useState('')
    const [selectedYearId, setSelectedYearId] = useState(defaultYearId)

    const router = useRouter()
    const { profile: userProfile } = useUserProfile()
    const { daerah } = useDaerah()
    const { desa } = useDesa()
    const { kelompok } = useKelompok()
    const { classes: classList } = useClasses()
    const { mutate: mutateNotifications } = useNotifications()

    const selectedYearName = useMemo(
        () => academicYears.find(y => y.id === selectedYearId)?.name ?? null,
        [academicYears, selectedYearId]
    )

    // warning kalau belum ada tahun ajaran sama sekali / belum terpilih
    const yearWarning = useMemo(() => {
        if (academicYears.length === 0) return 'Belum ada tahun ajaran. Buat dulu di menu Tahun Ajaran.'
        if (!selectedYearId) return 'Tahun ajaran tujuan belum dipilih.'
        return null
    }, [academicYears, selectedYearId])

    useEffect(() => {
        ;(async () => {
            setLoadingOptions(true)
            const res = await getPromotionSourceOptions()
            if (res.success) {
                setOptions(res.data)
                setWindowClosedForUser(res.windowClosedForUser ?? false)
            } else {
                toast.error(res.message)
            }
            setLoadingOptions(false)
        })()
    }, [])

    // maps untuk filter desa/daerah dari kelompok_id
    const kelompokToDesa = useMemo(() => new Map<string, string>((kelompok || []).map((k: any) => [k.id, k.desa_id])), [kelompok])
    const desaToDaerah = useMemo(() => new Map<string, string>((desa || []).map((d: any) => [d.id, d.daerah_id])), [desa])

    // terapkan DataFilter ke rows (client-side)
    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase()
        return rows.filter(r => {
            // search nama
            if (q && !r.student_name.toLowerCase().includes(q)) return false
            // gender
            if (dataFilters.gender && r.gender !== dataFilters.gender) return false
            // kelompok
            if (dataFilters.kelompok.length > 0 && !dataFilters.kelompok.includes(r.kelompok_id)) return false
            // desa
            if (dataFilters.desa.length > 0) {
                const desaId = kelompokToDesa.get(r.kelompok_id)
                if (!desaId || !dataFilters.desa.includes(desaId)) return false
            }
            // daerah
            if (dataFilters.daerah.length > 0) {
                const desaId = kelompokToDesa.get(r.kelompok_id)
                const daerahId = desaId ? desaToDaerah.get(desaId) : undefined
                if (!daerahId || !dataFilters.daerah.includes(daerahId)) return false
            }
            // kelas (value bisa comma-separated class_ids)
            if (dataFilters.kelas.length > 0) {
                const selectedClassIds = new Set(dataFilters.kelas.flatMap(v => v.split(',')))
                if (!selectedClassIds.has(r.from_class_id)) return false
            }
            return true
        })
    }, [rows, dataFilters, search, kelompokToDesa, desaToDaerah])

    const selectedRows = filteredRows.filter(r => !r.excluded && r.to_class_id)
    const excludedCount = filteredRows.filter(r => r.excluded).length
    const noTargetCount = filteredRows.filter(r => !r.to_class_id).length
    const kelompokCount = new Set(selectedRows.map(r => r.kelompok_id)).size

    const allSelected = options.length > 0 && selectedIds.size === options.length

    const toggleSelect = (o: PromotionSourceOption) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            const k = optKey(o)
            if (next.has(k)) next.delete(k)
            else next.add(k)
            return next
        })
    }

    const toggleSelectAll = () => {
        setSelectedIds(prev => (prev.size === options.length ? new Set() : new Set(options.map(optKey))))
    }

    const handleProceed = async () => {
        const sources = options
            .filter(o => selectedIds.has(optKey(o)))
            .map(o => ({ kind: o.kind, id: o.id }))
        if (sources.length === 0) return
        setLoadingRows(true)
        const res = await getStudentsToPromote(sources)
        if (res.success) {
            setRows(res.data)
            setSelectedCount(sources.length)
            setStep(2)
        } else {
            toast.error(res.message)
        }
        setLoadingRows(false)
    }

    const toggleExclude = (studentId: string) => {
        setRows(prev => prev.map(r => (r.student_id === studentId ? { ...r, excluded: !r.excluded } : r)))
    }

    const handleExecute = async () => {
        if (!selectedYearId) {
            toast.error('Tahun ajaran tujuan belum dipilih')
            return
        }
        setExecuting(true)
        const res = await executeGradePromotion({
            academic_year_id: selectedYearId,
            semester: 1,
            rows: selectedRows.map(r => ({
                student_id: r.student_id,
                from_class_id: r.from_class_id,
                to_class_id: r.to_class_id as string,
            })),
        })
        setExecuting(false)
        if (res.success && res.data) {
            setResult(res.data)
            setStep(4)
            if (res.data.success.length > 0) {
                void mutateNotifications()
            }
        } else {
            toast.error(res.message)
        }
    }

    // grouped per kelompok untuk tampilan step 2
    const grouped = useMemo(() => {
        const map = new Map<string, { kelompok_name: string; rows: PromotionStudentRow[] }>()
        filteredRows.forEach(r => {
            if (!map.has(r.kelompok_id)) map.set(r.kelompok_id, { kelompok_name: r.kelompok_name, rows: [] })
            map.get(r.kelompok_id)!.rows.push(r)
        })
        return Array.from(map.values())
    }, [filteredRows])

    return (
        <div className="bg-gray-50 dark:bg-gray-900">
            <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Naik Kelas</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Tahun Ajaran tujuan: <span className="font-semibold">{selectedYearName ?? '—'}</span>
                    </p>
                    {yearWarning && (
                        <div className="mt-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 p-3 text-sm text-yellow-800 dark:text-yellow-200">
                            ⚠️ {yearWarning}
                        </div>
                    )}
                </div>

                {/* Step indicator */}
                <div className="flex gap-2 mb-6 text-xs">
                    {['Pilih Kelas', 'Preview', 'Konfirmasi', 'Hasil'].map((label, i) => (
                        <div
                            key={label}
                            className={`px-3 py-1 rounded-full ${step === i + 1 ? 'bg-brand-600 text-white' : step > i + 1 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}
                        >
                            {i + 1}. {label}
                        </div>
                    ))}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    {/* STEP 1 — pilih kelas asal (multi-select) */}
                    {step === 1 && (
                        <div>
                            {canPickYear && (
                                <div className="mb-5 max-w-xs">
                                    <InputFilter
                                        id="academicYearFilter"
                                        label="Tahun Ajaran Tujuan"
                                        value={selectedYearId}
                                        onChange={setSelectedYearId}
                                        options={academicYears.map(y => ({ value: y.id, label: y.name }))}
                                        placeholder="Pilih Tahun Ajaran"
                                        widthClassName="!max-w-full"
                                    />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Siswa akan didaftarkan ke tahun ini. Tidak mengubah tahun ajaran aktif sistem.
                                    </p>
                                </div>
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pilih Kelas yang Akan Dinaikkan</h2>
                                {options.length > 0 && (
                                    <Checkbox
                                        label="Pilih Semua"
                                        checked={allSelected}
                                        onChange={toggleSelectAll}
                                    />
                                )}
                            </div>
                            
                            {windowClosedForUser && options.length > 0 && (
                                <div className="mb-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-3 text-sm text-blue-800 dark:text-blue-200 flex gap-2">
                                    <span className="shrink-0 mt-0.5">ℹ️</span>
                                    <p>
                                        Masa kenaikan kelas reguler (PAUD - SMA) ditutup oleh pengurus. Anda saat ini hanya dapat memproses kenaikan tingkat untuk kelas <strong>Pra Nikah</strong>.
                                    </p>
                                </div>
                            )}

                            {loadingOptions ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 flex items-start gap-3">
                                            <Skeleton className="w-4 h-4 mt-1 shrink-0 rounded" />
                                            <div className="flex-1 space-y-2">
                                                <Skeleton className="h-4 w-3/4" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : options.length === 0 ? (
                                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-4">
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Tidak ada kelas yang bisa dinaikkan</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-lg mx-auto leading-relaxed">
                                        Saat ini tidak ada daftar kelas yang dapat Anda proses. Hal ini biasanya terjadi jika:
                                    </p>
                                    <ul className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2 text-left list-disc list-inside">
                                        <li>Sedang <strong>berada di luar masa kenaikan kelas</strong> (sehingga kelas PAUD hingga SMA dikunci oleh Admin).</li>
                                        <li>Anda hanya ditugaskan mengajar kelas akhir yang tidak memiliki tingkatan lanjutan (misal: Kelas Orang Tua).</li>
                                    </ul>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {options.map(opt => {
                                            const checked = selectedIds.has(optKey(opt))
                                            return (
                                                <button
                                                    key={optKey(opt)}
                                                    onClick={() => toggleSelect(opt)}
                                                    className={`text-left p-4 rounded-lg border transition flex items-start gap-3 ${checked ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-brand-400'}`}
                                                >
                                                    <span className="mt-1 pointer-events-none">
                                                        <Checkbox checked={checked} onChange={() => {}} />
                                                    </span>
                                                    <span>
                                                        <span className="block font-medium text-gray-900 dark:text-white">{opt.name}{opt.kelompok_name ? ` (${opt.kelompok_name})` : ''}</span>
                                                        {/* <span className="block text-sm text-gray-500 dark:text-gray-400 mt-1">
                                                            → {opt.to_name ?? '(tidak naik)'}
                                                        </span> */}
                                                    </span>
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <div className="flex justify-end mt-6">
                                        <Button
                                            variant="primary"
                                            onClick={handleProceed}
                                            disabled={selectedIds.size === 0}
                                            loading={loadingRows}
                                            loadingText="Memuat siswa..."
                                        >
                                            Lanjut ({selectedIds.size} kelas dipilih)
                                        </Button>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* STEP 2 — preview + exclude */}
                    {step === 2 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {selectedCount > 1 ? `${selectedCount} kelas dipilih` : 'Preview'} · {filteredRows.length} siswa
                                </h2>
                            </div>
                            <DataFilter
                                filters={dataFilters}
                                onFilterChange={setDataFilters}
                                userProfile={userProfile}
                                daerahList={daerah || []}
                                desaList={desa || []}
                                kelompokList={kelompok || []}
                                classList={classList || []}
                                showKelas={true}
                                showGender={true}
                                cascadeFilters={true}
                            />
                            <div className="mb-4">
                                <input
                                    type="text"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Cari nama siswa..."
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-brand-500 focus:outline-none"
                                />
                            </div>
                            {noTargetCount > 0 && (
                                <div className="mb-3 text-sm text-orange-600 dark:text-orange-400">
                                    {noTargetCount} siswa tidak punya kelas tujuan di kelompoknya (otomatis dilewati).
                                </div>
                            )}
                            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                                {grouped.map(g => (
                                    <div key={g.kelompok_name} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 font-medium text-sm text-gray-700 dark:text-gray-200 rounded-t-lg">
                                            {g.kelompok_name} ({g.rows.length} siswa)
                                        </div>
                                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {g.rows.map(r => (
                                                <div key={r.student_id} className="px-4 py-2 flex items-start gap-3 text-sm">
                                                    <div className="pt-0.5 shrink-0">
                                                        <Checkbox
                                                            checked={!r.excluded && !!r.to_class_id}
                                                            disabled={!r.to_class_id}
                                                            onChange={() => toggleExclude(r.student_id)}
                                                        />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className={`truncate font-medium text-gray-900 dark:text-white ${r.excluded || !r.to_class_id ? "line-through" : ""}`}>
                                                            {r.student_name}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                                            {r.from_class_name} → {r.to_class_name ?? '(tidak ada)'}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-6">
                                <Button variant="outline" onClick={() => setStep(1)}>Kembali</Button>
                                <Button variant="primary" onClick={() => setStep(3)} disabled={selectedRows.length === 0}>
                                    Lanjut ({selectedRows.length} siswa)
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3 — konfirmasi */}
                    {step === 3 && (
                        <div>
                            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Konfirmasi Naik Kelas</h2>
                            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                <p>Tahun Ajaran: <span className="font-semibold">{selectedYearName}</span></p>
                                <p><span className="font-semibold">{selectedRows.length}</span> siswa akan naik ({excludedCount} dikecualikan)</p>
                                <p>Tersebar di {kelompokCount} kelompok</p>
                                <p className="text-orange-600 dark:text-orange-400 mt-3">⚠️ Tindakan ini akan tercatat permanen dan tidak dapat dibatalkan otomatis.</p>
                            </div>
                            <div className="flex justify-between mt-6">
                                <Button variant="outline" onClick={() => setStep(2)} disabled={executing}>Kembali</Button>
                                <Button variant="primary" onClick={handleExecute} loading={executing} loadingText="Memproses...">
                                    Jalankan Naik Kelas
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* STEP 4 — hasil */}
                    {step === 4 && result && (
                        <div>
                            <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Hasil</h2>
                            <div className="space-y-2 text-sm">
                                <p className="text-green-600 dark:text-green-400">✅ {result.success.length} siswa berhasil naik</p>
                                <p className={result.failed.length > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-500'}>
                                    {result.failed.length > 0 ? '❌' : '✓'} {result.failed.length} gagal
                                </p>
                                {result.failed.length > 0 && (
                                    <ul className="mt-2 text-xs text-red-500 list-disc list-inside max-h-40 overflow-y-auto">
                                        {result.failed.map(f => (
                                            <li key={f.studentId}>{f.studentId}: {f.error}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                            <div className="flex justify-between mt-6">
                                <Button variant="outline" onClick={() => { setStep(1); setSelectedIds(new Set()); setSelectedCount(0); setRows([]); setResult(null); setDataFilters(EMPTY_FILTERS); setSearch(''); setSelectedYearId(defaultYearId) }}>
                                    Naik Kelas Lagi
                                </Button>
                                <Button variant="primary" loading={redirecting} onClick={() => { setRedirecting(true); router.push('/home') }}>
                                    Selesai
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
