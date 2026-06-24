'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Button from '@/components/ui/button/Button'
import Checkbox from '@/components/form/input/Checkbox'
import InputFilter from '@/components/form/input/InputFilter'
import InputField from '@/components/form/input/InputField'
import Skeleton from '@/components/ui/skeleton/Skeleton'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import {
  onboardCreateDaerah,
  onboardCreateDesa,
  onboardCreateKelompok,
} from './actions'
import { onboardBatchCreateTeachers, type BatchTeacherDef } from './actions/orchestration/batch-teachers'
import { createBatchStandardClasses } from '@/app/(admin)/kelas/actions/batch-standard/actions'
import type { ClassMaster } from '@/types/class'
import type { UserProfile } from '@/types/user'
import type { BatchStandardResult } from '@/app/(admin)/kelas/actions/batch-standard/actions'
import { isSuperAdmin } from '@/lib/accessControl'

type Step = 1 | 2 | 3 | 4

function generateDaerahSnippet(daerahName: string, teachers: any[]) {
  const daerahTeachers = teachers.filter(t => t.scope === 'daerah')
  if (daerahTeachers.length === 0) return ''
  
  let text = `Berikut adalah akun untuk mengakses aplikasi *Generus Mandiri* https://generus.abuabdirohman.com/ :\n\n`
  text += `*👨‍🏫 Akun Guru - Tingkat Daerah ${daerahName} :*\n\n`
  
  daerahTeachers.forEach((t, i) => {
    text += `${i + 1}. *${t.full_name}*\n`
    text += `   - Username: ${t.username}\n`
    text += `   - Password: ngaji354\n\n`
  })
  
  text += `📝 Simpan informasi ini baik-baik dan berikan kepada pengurus Daerah terkait.`
  return text
}

function generateDesaSnippet(daerahName: string, desa: any, teachers: any[]) {
  let text = `Berikut adalah akun untuk mengakses aplikasi *Generus Mandiri* https://generus.abuabdirohman.com/ :\n\n`
  text += `*👨‍🏫 Akun Guru - Desa ${desa.name} (Daerah ${daerahName}) :*\n\n`
  
  const desaTeachers = teachers.filter((t: any) => t.scope === 'desa' && t.desa_id === desa.id)
  if (desaTeachers.length > 0) {
    text += `*--- Pengurus Desa ---*\n\n`
    desaTeachers.forEach((t: any, i: number) => {
      text += `${i + 1}. *${t.full_name}*\n`
      text += `   - Username: ${t.username}\n`
      text += `   - Password: ngaji354\n\n`
    })
  }

  if (desa.kelompoks && desa.kelompoks.length > 0) {
    text += `*--- Pengurus Kelompok ---*\n\n`
    desa.kelompoks.forEach((kel: any, i: number) => {
      text += `${i + 1}. *Kelompok ${kel.name}*\n`
      const kelTeachers = teachers.filter((t: any) => t.scope === 'kelompok' && t.kelompok_id === kel.id)
      kelTeachers.forEach((t: any) => {
        text += `   - Username: ${t.username} (${t.full_name})\n`
        text += `   - Password: ngaji354\n`
      })
      text += `\n`
    })
  }
  
  text += `📝 Simpan informasi ini baik-baik dan distribusikan kepada pengurus Desa dan Kelompok terkait.`
  return text
}

interface Props {
  profile: UserProfile
  standardMasters: ClassMaster[]
}

interface CreatedKelompok {
  id: string
  name: string
}

interface CreatedDesa {
  id: string
  name: string
  kelompoks: CreatedKelompok[]
}

interface CreatedGuru {
  id: string
  username: string
  full_name: string
  role?: string
  scope?: string
  daerah_id?: string
  desa_id?: string | null
  kelompok_id?: string | null
}

export default function OnboardingClient({ profile, standardMasters }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

  // ── Step 1 state ────────────────────────────────────────────────────────
  const isSuperAdminUser = isSuperAdmin(profile)

  // Daerah
  const [selectedDaerahId, setSelectedDaerahId] = useState<string>(
    isSuperAdminUser ? '' : (profile.daerah_id ?? '')
  )
  const [newDaerahName, setNewDaerahName] = useState('')
  const [creatingDaerah, setCreatingDaerah] = useState(false)

  // Desa list — multiple desas each with their own kelompoks
  const [desas, setDesas] = useState<CreatedDesa[]>([])
  const [newDesaName, setNewDesaName] = useState('')
  const [creatingDesa, setCreatingDesa] = useState(false)

  // Kelompok — per desa (tracked by desaId)
  const [newKelompokNames, setNewKelompokNames] = useState<Record<string, string>>({})
  const [creatingKelompokFor, setCreatingKelompokFor] = useState<string | null>(null)

  const { daerah: daerahList, isLoading: isLoadingDaerah } = useDaerah()
  const { desa: desaList, isLoading: isLoadingDesa } = useDesa()
  const { kelompok: kelompokList, isLoading: isLoadingKelompok } = useKelompok()

  const isDataLoading = isLoadingDaerah || isLoadingDesa || isLoadingKelompok

  // Existing desa options filtered by daerah (for "select existing" dropdown)
  const filteredExistingDesa = useMemo(() => {
    if (!desaList) return []
    if (!selectedDaerahId) return desaList
    return desaList.filter((d: any) => d.daerah_id === selectedDaerahId)
  }, [desaList, selectedDaerahId])

  // All kelompoks across all desas
  const allKelompoks = useMemo(() => desas.flatMap(d => d.kelompoks), [desas])

  // ── Step 2 state ────────────────────────────────────────────────────────
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>(
    standardMasters.map(m => m.id)
  )
  const [kelasResult, setKelasResult] = useState<BatchStandardResult | null>(null)
  const [creatingKelas, setCreatingKelas] = useState(false)

  // ── Step 3 state ────────────────────────────────────────────────────────
  const [guruTemplates, setGuruTemplates] = useState({
    pj_kelompok: true,
    generus_kelompok: true,
    pj_desa: true,
    generus_desa: true,
    pj_daerah: true,
    generus_daerah: true,
  })
  const [guruList, setGuruList] = useState<CreatedGuru[]>([])
  const [creatingGuru, setCreatingGuru] = useState(false)
  const [previewTeachers, setPreviewTeachers] = useState<BatchTeacherDef[]>([])

  // ── Handlers: Step 1 — Daerah ──────────────────────────────────────────

  const handleCreateDaerah = useCallback(async () => {
    if (!newDaerahName.trim()) return
    setCreatingDaerah(true)
    const res = await onboardCreateDaerah(newDaerahName.trim())
    setCreatingDaerah(false)
    if (res.success && res.data) {
      setSelectedDaerahId(res.data.id)
      setNewDaerahName('')
      setDesas([])
      toast.success(`Daerah "${newDaerahName.trim()}" berhasil dibuat`)
    } else {
      toast.error(res.message ?? 'Gagal membuat daerah')
    }
  }, [newDaerahName])

  // ── Handlers: Step 1 — Desa ─────────────────────────────────────────────

  const handleCreateDesa = useCallback(async () => {
    if (!newDesaName.trim()) return
    if (!selectedDaerahId) { toast.error('Pilih daerah terlebih dahulu'); return }
    setCreatingDesa(true)
    const res = await onboardCreateDesa(newDesaName.trim(), selectedDaerahId)
    setCreatingDesa(false)
    if (res.success && res.data) {
      const newDesa: CreatedDesa = { id: res.data.id, name: newDesaName.trim(), kelompoks: [] }
      setDesas(prev => [...prev, newDesa])
      setNewDesaName('')
      toast.success(`Desa "${newDesaName.trim()}" berhasil dibuat`)
    } else {
      toast.error(res.message ?? 'Gagal membuat desa')
    }
  }, [newDesaName, selectedDaerahId])

  const handleAddExistingDesa = (desaId: string) => {
    if (!desaId) return
    if (desas.some(d => d.id === desaId)) { toast.info('Desa sudah ditambahkan'); return }
    const found = (filteredExistingDesa as any[]).find(d => d.id === desaId)
    if (!found) return
    setDesas(prev => [...prev, { id: found.id, name: found.name, kelompoks: [] }])
    toast.success(`Desa "${found.name}" ditambahkan`)
  }

  const handleRemoveDesa = (desaId: string) => {
    setDesas(prev => prev.filter(d => d.id !== desaId))
  }

  // ── Handlers: Step 1 — Kelompok per Desa ──────────────────────────────

  const handleCreateKelompok = useCallback(async (desaId: string) => {
    const name = (newKelompokNames[desaId] ?? '').trim()
    if (!name) return
    setCreatingKelompokFor(desaId)
    const res = await onboardCreateKelompok(name, desaId)
    setCreatingKelompokFor(null)
    if (res.success && res.data) {
      setDesas(prev => prev.map(d =>
        d.id === desaId
          ? { ...d, kelompoks: [...d.kelompoks, { id: res.data!.id, name }] }
          : d
      ))
      setNewKelompokNames(prev => ({ ...prev, [desaId]: '' }))
      toast.success(`Kelompok "${name}" berhasil dibuat`)
    } else {
      toast.error(res.message ?? 'Gagal membuat kelompok')
    }
  }, [newKelompokNames])

  const handleRemoveKelompok = (desaId: string, kelompokId: string) => {
    setDesas(prev => prev.map(d =>
      d.id === desaId
        ? { ...d, kelompoks: d.kelompoks.filter(k => k.id !== kelompokId) }
        : d
    ))
  }

  const handleAddExistingKelompok = (desaId: string, kelompokId: string) => {
    if (!kelompokId) return
    const desa = desas.find(d => d.id === desaId)
    if (!desa) return
    if (desa.kelompoks.some(k => k.id === kelompokId)) {
      toast.info('Kelompok sudah ditambahkan')
      return
    }
    const found = (kelompokList || []).find((k: any) => k.id === kelompokId)
    if (!found) return
    
    setDesas(prev => prev.map(d =>
      d.id === desaId
        ? { ...d, kelompoks: [...d.kelompoks, { id: found.id, name: found.name }] }
        : d
    ))
    toast.success(`Kelompok "${found.name}" ditambahkan`)
  }



  // ── Handlers: Step 2 ───────────────────────────────────────────────────

  const toggleMaster = (id: string) => {
    setSelectedMasterIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const handleBuatKelas = useCallback(async () => {
    if (selectedMasterIds.length === 0) {
      toast.error('Pilih minimal satu kelas standar')
      return
    }
    setCreatingKelas(true)
    const kelompokIds = allKelompoks.map(k => k.id)
    const res = await createBatchStandardClasses(kelompokIds, selectedMasterIds)
    setCreatingKelas(false)
    setKelasResult(res)
    if (res.totalCreated > 0) {
      toast.success(`${res.totalCreated} kelas berhasil dibuat`)
    } else if (res.totalSkipped > 0) {
      toast.info('Semua kelas sudah ada — tidak ada yang dibuat')
    } else {
      toast.error(res.message ?? 'Gagal membuat kelas')
    }
  }, [allKelompoks, selectedMasterIds])

  // ── Handlers: Step 3 ───────────────────────────────────────────────────

  const handleGeneratePreview = useCallback(() => {
    if (!selectedDaerahId) return

    const parentDaerah = (daerahList || []).find((d: any) => d.id === selectedDaerahId)
    const daerahName = parentDaerah?.name || 'Daerah'
    const sanitize = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')
    const newPreview: BatchTeacherDef[] = []

    const generateId = () => Math.random().toString(36).substr(2, 9)

    // Daerah
    if (guruTemplates.pj_daerah) {
      newPreview.push({
        id: generateId(),
        full_name: `PJ Daerah ${daerahName}`,
        username: `${sanitize(daerahName)}_daerah`,
        roleType: 'pj_utama',
        scopeType: 'daerah',
        daerah_id: selectedDaerahId,
        desa_id: null,
        kelompok_id: null
      })
    }
    if (guruTemplates.generus_daerah) {
      newPreview.push({
        id: generateId(),
        full_name: `PJ Generus Daerah ${daerahName}`,
        username: `${sanitize(daerahName)}_generus`,
        roleType: 'pj_generus',
        scopeType: 'daerah',
        daerah_id: selectedDaerahId,
        desa_id: null,
        kelompok_id: null
      })
    }

    // Desa
    for (const desa of desas) {
      if (guruTemplates.pj_desa) {
        newPreview.push({
          id: generateId(),
          full_name: `PJ Desa ${desa.name}`,
          username: `${sanitize(desa.name)}_desa`,
          roleType: 'pj_utama',
          scopeType: 'desa',
          daerah_id: selectedDaerahId,
          desa_id: desa.id,
          kelompok_id: null
        })
      }
      if (guruTemplates.generus_desa) {
        newPreview.push({
          id: generateId(),
          full_name: `PJ Generus Desa ${desa.name}`,
          username: `${sanitize(desa.name)}_generus`,
          roleType: 'pj_generus',
          scopeType: 'desa',
          daerah_id: selectedDaerahId,
          desa_id: desa.id,
          kelompok_id: null
        })
      }

      // Kelompok
      for (const kel of desa.kelompoks) {
        if (guruTemplates.pj_kelompok) {
          newPreview.push({
            id: generateId(),
            full_name: `PJ Kelompok ${kel.name}`,
            username: `${sanitize(kel.name)}_kelompok`,
            roleType: 'pj_utama',
            scopeType: 'kelompok',
            daerah_id: selectedDaerahId,
            desa_id: desa.id,
            kelompok_id: kel.id
          })
        }
        if (guruTemplates.generus_kelompok) {
          newPreview.push({
            id: generateId(),
            full_name: `PJ Generus Kelompok ${kel.name}`,
            username: `${sanitize(kel.name)}_generus`,
            roleType: 'pj_generus',
            scopeType: 'kelompok',
            daerah_id: selectedDaerahId,
            desa_id: desa.id,
            kelompok_id: kel.id
          })
        }
      }
    }

    setPreviewTeachers(newPreview)
  }, [selectedDaerahId, daerahList, desas, guruTemplates])

  const handleUpdatePreview = useCallback((id: string, field: 'full_name' | 'username', value: string) => {
    setPreviewTeachers(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t))
  }, [])

  const handleRemovePreview = useCallback((id: string) => {
    setPreviewTeachers(prev => prev.filter(t => t.id !== id))
  }, [])

  const handleBuatAkunGuruOtomatis = useCallback(async () => {
    if (!selectedDaerahId || previewTeachers.length === 0) {
      toast.error('Daftar preview kosong atau daerah belum dipilih')
      return
    }

    setCreatingGuru(true)
    try {
      const payload = {
        teachers: previewTeachers
      }
      
      const res = await onboardBatchCreateTeachers(payload)
      
      if (res.success && res.teachers) {
        setGuruList(res.teachers)
        setPreviewTeachers([])
        if (res.teachers.length > 0) {
          toast.success(`${res.teachers.length} guru berhasil digenerate`)
        }
        if (res.failed?.length) {
          toast.error(`${res.failed.length} akun gagal dibuat`, {
            description: <span className="text-white/90">{res.failed.map((f: any) => `${f.name} (${f.reason})`).join(', ')}</span>,
            duration: 8000
          })
        }
      } else {
        toast.error(res.message || 'Gagal generate guru')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan')
    } finally {
      setCreatingGuru(false)
    }
  }, [selectedDaerahId, previewTeachers])

  // ── Render ─────────────────────────────────────────────────────────────

  const stepLabels = ['Organisasi', 'Kelas', 'Guru', 'Ringkasan']

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Onboarding</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Setup organisasi, kelas, dan guru dalam satu alur
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            {stepLabels.map((label, i) => {
              const isActive = step === i + 1;
              return (
                <button
                  key={label}
                  onClick={() => setStep((i + 1) as Step)}
                  className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? 'border-brand-500 text-brand-600 dark:border-brand-400 dark:text-brand-400'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">

          {/* ──── STEP 1 — Organisasi ──────────────────────────────────── */}
          {step === 1 && (
            isDataLoading ? (
              <div className="space-y-4 relative">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Step 1: Tambah Organisasi</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tambahkan struktur organisasi dari tingkat daerah, desa, hingga kelompok. Minimal satu daerah, satu desa, dan satu kelompok diperlukan untuk membuat akun guru di step selanjutnya.
                </p>
                <div className="space-y-5">
                  <Skeleton className="h-48 w-full rounded-xl" />
                  <Skeleton className="h-48 w-full rounded-xl" />
                </div>
              </div>
            ) : (
              <div className="space-y-4 relative">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Step 1: Tambah Organisasi</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tambahkan struktur organisasi dari tingkat daerah, desa, hingga kelompok. Minimal satu daerah diperlukan untuk membuat akun guru di step selanjutnya.
                </p>

              {/* ── Daerah Card ── */}
              <div className="relative z-10 flex items-start gap-5">
                <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      Daerah <span className="text-red-500">*</span>
                    </h3>
                    {selectedDaerahId && (
                      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full font-medium">✓ Dipilih</span>
                    )}
                  </div>
                  <div className="p-5">
                    {isSuperAdminUser ? (
                      <div>
                        <div className="max-w-md">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tambah Daerah Baru</label>
                          <div className="flex items-stretch gap-2">
                            <div className="flex-1">
                              <InputField
                                id="onboarding-new-daerah"
                                type="text"
                                value={newDaerahName}
                                onChange={e => setNewDaerahName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleCreateDaerah()}
                                placeholder="Nama daerah..."
                                className="bg-white! dark:bg-gray-900!"
                              />
                            </div>
                            <Button
                              variant="primary"
                              onClick={handleCreateDaerah}
                              loading={creatingDaerah}
                              disabled={!newDaerahName.trim()}
                              className="px-3! h-11!"
                            >
                              Tambah
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 my-5 max-w-md">
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ATAU</span>
                          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        </div>

                        <div className="max-w-md">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Daerah yang sudah ada</label>
                          <InputFilter
                            id="onboarding-daerah"
                            label=""
                            value={selectedDaerahId}
                            onChange={(val) => {
                              setSelectedDaerahId(val)
                              setDesas([])
                            }}
                            options={(daerahList || []).map((d: any) => ({ value: d.id, label: d.name }))}
                            placeholder="Pilih daerah..."
                            widthClassName="w-full! max-w-full!"
                            selectClassName="h-11! px-4! py-2.5! rounded-lg! text-sm!"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {(daerahList || []).find((d: any) => d.id === selectedDaerahId)?.name ?? profile.daerah_id ?? '(Daerah Anda)'}
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-600 px-2 py-0.5 rounded-full">Terkunci</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Desa Card ── */}
              {selectedDaerahId && (
                <div className="relative z-10 flex items-start gap-5 animate-in slide-in-from-top-2 fade-in duration-300">
                  <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="bg-gray-50 dark:bg-gray-800/50 px-5 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                        Desa <span className="text-red-500">*</span>
                        <span className="text-xs font-normal text-gray-500 ml-1">(Bisa &gt; 1)</span>
                      </h3>
                      <span className="text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 px-2 py-1 rounded-full font-medium">
                        {desas.length} Dipilih
                      </span>
                    </div>
                    
                    <div className="p-5">
                      <div className="max-w-md">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tambah Desa Baru</label>
                        <div className="flex items-stretch gap-2">
                          <div className="flex-1">
                            <InputField
                              id="onboarding-new-desa"
                              type="text"
                              value={newDesaName}
                              onChange={e => setNewDesaName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleCreateDesa()}
                              placeholder="Nama desa..."
                              disabled={!selectedDaerahId}
                              className="bg-white! dark:bg-gray-900!"
                            />
                          </div>
                          <Button
                            variant="primary"
                            onClick={handleCreateDesa}
                            loading={creatingDesa}
                            disabled={!newDesaName.trim() || !selectedDaerahId}
                            className="px-3! h-11! bg-blue-600 hover:bg-blue-700"
                          >
                            Tambah
                          </Button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 my-5 max-w-md">
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ATAU</span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                      </div>

                      <div className="max-w-md mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pilih Desa yang sudah ada</label>
                        <InputFilter
                          id="onboarding-desa-existing"
                          label=""
                          value=""
                          onChange={handleAddExistingDesa}
                          options={filteredExistingDesa
                            .filter((d: any) => !desas.some(added => added.id === d.id))
                            .map((d: any) => ({ value: d.id, label: d.name }))}
                          placeholder="Pilih desa..."
                          widthClassName="w-full! max-w-full!"
                          disabled={!selectedDaerahId}
                          selectClassName="h-11! px-4! py-2.5! rounded-lg! text-sm!"
                        />
                      </div>

                      {/* List of Desas & Kelompoks */}
                      {desas.length > 0 ? (
                        <div className="space-y-4 border-t border-gray-100 dark:border-gray-700 pt-5">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Kelompok:</h4>
                          {desas.map((desa, idx) => (
                            <div key={desa.id} className="relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                                <div className="flex items-center justify-between p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-800 dark:text-gray-200">{desa.name}</span>
                                    <span className="text-[10px] text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{desa.kelompoks.length} Kelompok</span>
                                  </div>
                                  <button onClick={() => handleRemoveDesa(desa.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20">
                                    Hapus
                                  </button>
                                </div>
                                
                                <div className="p-3">
                                  {desa.kelompoks.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                      {desa.kelompoks.map(k => (
                                        <div key={k.id} className="group flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 px-2.5 py-1 rounded-md text-xs font-medium transition-colors">
                                          {k.name}
                                          <button onClick={() => handleRemoveKelompok(desa.id, k.id)} className="ml-1 text-indigo-400 hover:text-red-500 focus:opacity-100 transition-opacity">
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-md border border-gray-100 dark:border-gray-700">
                                    <div className="flex-1 flex items-center gap-1">
                                      <div className="flex-1 w-full">
                                        <InputField
                                          id={`kelompok-input-${desa.id}`}
                                          type="text"
                                          value={newKelompokNames[desa.id] ?? ''}
                                          onChange={e => setNewKelompokNames(prev => ({ ...prev, [desa.id]: e.target.value }))}
                                          onKeyDown={e => e.key === 'Enter' && handleCreateKelompok(desa.id)}
                                          placeholder="Tambah kelompok baru..."
                                          className="bg-white! dark:bg-gray-900!"
                                        />
                                      </div>
                                      <Button
                                        variant="primary"
                                        onClick={() => handleCreateKelompok(desa.id)}
                                        loading={creatingKelompokFor === desa.id}
                                        disabled={!(newKelompokNames[desa.id] ?? '').trim()}
                                        className="px-2.5! h-11!"
                                      >
                                        Tambah
                                      </Button>
                                    </div>
                                    <span className="hidden md:inline text-gray-300 dark:text-gray-600">/</span>
                                    <span className="md:hidden text-[10px] font-bold text-gray-400 uppercase tracking-widest text-center my-1">ATAU</span>
                                    <div className="flex-1 md:mt-5">
                                      <InputFilter
                                        id={`kelompok-existing-${desa.id}`}
                                        label=""
                                        value=""
                                        onChange={(val) => handleAddExistingKelompok(desa.id, val)}
                                        options={(kelompokList || [])
                                          .filter((k: any) => k.desa_id === desa.id && !desa.kelompoks.some(added => added.id === k.id))
                                          .map((k: any) => ({ value: k.id, label: k.name }))}
                                        placeholder="Pilih kelompok..."
                                        widthClassName="w-full! max-w-full! min-w-[140px]!"
                                        selectClassName="h-11! px-4! py-2.5! rounded-lg! text-sm!"
                                      />
                                    </div>
                                  </div>
                                </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-6 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50/50 dark:bg-gray-800/30">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Belum ada desa yang dipilih.</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Gunakan form di atas untuk menambah desa.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
            )
          )}

          {/* ──── STEP 2 — Kelas ──────────────────────────────────────── */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Step 2: Tambah Kelas Standar</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pilih template kelas yang ingin dibuat untuk setiap kelompok yang sudah ada. Kelas akan otomatis dibuatkan secara masal.
              </p>

              {!selectedDaerahId && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300">
                  ⚠️ Silakan kembali ke tab <strong>Organisasi</strong> dan pilih Daerah/Desa/Kelompok terlebih dahulu sebelum membuat kelas.
                </div>
              )}

              {/* Master checkboxes */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Kelas Standar <span className="text-red-500">*</span>
                  </p>
                  <div className="flex gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setSelectedMasterIds(standardMasters.map(m => m.id))}
                      className="text-blue-600 hover:underline"
                    >
                      Semua
                    </button>
                    <span className="text-gray-300 dark:text-gray-600">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMasterIds([])}
                      className="text-gray-500 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
                <div className="max-h-72 overflow-y-auto border rounded-lg p-3 dark:border-gray-700">
                  <div className="columns-2 sm:columns-3 gap-x-4">
                    {standardMasters.map(m => (
                      <div key={m.id} className="break-inside-avoid py-1">
                        <Checkbox
                          label={m.name}
                          checked={selectedMasterIds.includes(m.id)}
                          onChange={() => toggleMaster(m.id)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedMasterIds.length} / {standardMasters.length} dipilih</p>
              </div>

              {/* Result summary */}
              {kelasResult && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    {kelasResult.totalCreated} kelas dibuat, {kelasResult.totalSkipped} dilewati
                  </p>
                  <div className="mt-2 space-y-1">
                    {kelasResult.byKelompok.map(k => {
                      const kName = allKelompoks.find(kl => kl.id === k.kelompokId)?.name ?? k.kelompokId
                      return (
                        <div key={k.kelompokId} className="text-xs border rounded p-2 dark:border-gray-600">
                          <p className="font-medium text-gray-700 dark:text-gray-300">{kName}</p>
                          {k.created.length > 0 && <p className="text-green-600 dark:text-green-400">✓ {k.created.join(', ')}</p>}
                          {k.skipped.length > 0 && <p className="text-yellow-600 dark:text-yellow-400">⏭ {k.skipped.join(', ')}</p>}
                          {k.errors.length > 0 && <p className="text-red-600 dark:text-red-400">✗ {k.errors.join(', ')}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <Button
                  variant="primary"
                  onClick={handleBuatKelas}
                  loading={creatingKelas}
                  loadingText="Membuat kelas..."
                  disabled={!selectedDaerahId || selectedMasterIds.length === 0}
                >
                  Tambah Kelas
                </Button>
              </div>
            </div>
          )}

          {/* ──── STEP 3 — Guru ───────────────────────────────────────── */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Step 3: Tambah Guru</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Pilih template akun yang ingin dibuat. Sistem akan otomatis men-generate akun untuk setiap kelompok, desa, dan daerah yang telah dipilih.
              </p>

              {(!selectedDaerahId || !kelasResult) && (
                <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm text-yellow-800 dark:text-yellow-300">
                  ⚠️ Harap pilih Daerah di tab <strong>Organisasi</strong> dan jalankan fitur Buat Kelas di tab <strong>Kelas</strong> terlebih dahulu agar akun guru yang dibuat otomatis terhubung dengan kelasnya.
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                {/* Tingkat Kelompok */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">Tingkat Kelompok</h3>
                  <div className="space-y-3">
                    <Checkbox
                      label="PJ Kelompok (Paud - Orang Tua)"
                      checked={guruTemplates.pj_kelompok}
                      onChange={(checked) => setGuruTemplates(prev => ({ ...prev, pj_kelompok: checked }))}
                    />
                    <Checkbox
                      label="PJ Generus Kelompok (Paud - Pra Nikah 4)"
                      checked={guruTemplates.generus_kelompok}
                      onChange={(checked) => setGuruTemplates(prev => ({ ...prev, generus_kelompok: checked }))}
                    />
                  </div>
                </div>

                {/* Tingkat Desa */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">Tingkat Desa</h3>
                  <div className="space-y-3">
                    <Checkbox
                      label="PJ Desa (Paud - Orang Tua)"
                      checked={guruTemplates.pj_desa}
                      onChange={(checked) => setGuruTemplates(prev => ({ ...prev, pj_desa: checked }))}
                    />
                    <Checkbox
                      label="PJ Generus Desa (Paud - Pra Nikah 4)"
                      checked={guruTemplates.generus_desa}
                      onChange={(checked) => setGuruTemplates(prev => ({ ...prev, generus_desa: checked }))}
                    />
                  </div>
                </div>

                {/* Tingkat Daerah */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-3 border-b pb-2">Tingkat Daerah</h3>
                  <div className="space-y-3">
                    <Checkbox
                      label="PJ Daerah (Paud - Orang Tua)"
                      checked={guruTemplates.pj_daerah}
                      onChange={(checked) => setGuruTemplates(prev => ({ ...prev, pj_daerah: checked }))}
                    />
                    <Checkbox
                      label="PJ Generus Daerah (Paud - Pra Nikah 4)"
                      checked={guruTemplates.generus_daerah}
                      onChange={(checked) => setGuruTemplates(prev => ({ ...prev, generus_daerah: checked }))}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-3 text-xs text-gray-600 dark:text-gray-400 mb-4">
                <strong>Catatan:</strong> Klik "Preview" untuk melihat daftar akun yang akan dibuat sesuai format nama yang Anda inginkan sebelum memproses penyimpanan.
              </div>

              {previewTeachers.length === 0 ? (
                <Button
                  variant="primary"
                  onClick={handleGeneratePreview}
                  disabled={!selectedDaerahId || !kelasResult}
                >
                  Preview
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-white">Daftar Akun ({previewTeachers.length})</h3>
                    <Button variant="outline" size="sm" onClick={handleGeneratePreview}>Buat Ulang</Button>
                  </div>
                  
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    {/* Desktop Table View */}
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400 hidden md:table">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                        <tr>
                          <th className="px-4 py-3">Scope</th>
                          <th className="px-4 py-3">Nama Lengkap</th>
                          <th className="px-4 py-3">Username</th>
                          <th className="px-4 py-3 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewTeachers.map(t => (
                          <tr key={t.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 align-middle">
                              <span className="font-medium text-gray-900 dark:text-white capitalize">{t.scopeType}</span>
                              <div className="text-xs text-gray-500">PJ {t.roleType === 'pj_utama' ? 'Utama' : 'Generus'}</div>
                            </td>
                            <td className="px-4 py-2 align-middle">
                              <input 
                                type="text"
                                className="w-full text-sm border border-gray-300 px-3 py-1.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white transition-colors"
                                value={t.full_name}
                                onChange={(e) => handleUpdatePreview(t.id, 'full_name', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-2 align-middle">
                              <input 
                                type="text"
                                className="w-full text-sm border border-gray-300 px-3 py-1.5 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:border-gray-600 rounded-md dark:bg-gray-800 dark:text-white transition-colors"
                                value={t.username}
                                onChange={(e) => handleUpdatePreview(t.id, 'username', e.target.value)}
                              />
                            </td>
                            <td className="px-4 py-3 align-middle text-right">
                              <button 
                                onClick={() => handleRemovePreview(t.id)}
                                className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden flex flex-col divide-y divide-gray-200 dark:divide-gray-700 bg-gray-50 dark:bg-gray-800">
                      {previewTeachers.map(t => (
                        <div key={t.id} className="p-4 space-y-3 bg-white dark:bg-gray-800">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-semibold text-gray-900 dark:text-white capitalize">{t.scopeType}</span>
                              <div className="text-xs text-gray-500">PJ {t.roleType === 'pj_utama' ? 'Utama' : 'Generus'}</div>
                            </div>
                            <button 
                              onClick={() => handleRemovePreview(t.id)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded"
                            >
                              Hapus
                            </button>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Nama Lengkap</label>
                            <input 
                              type="text"
                              className="w-full text-sm border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white transition-colors"
                              value={t.full_name}
                              onChange={(e) => handleUpdatePreview(t.id, 'full_name', e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-1">
                            <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Username</label>
                            <input 
                              type="text"
                              className="w-full text-sm border border-gray-300 px-3 py-2 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white transition-colors"
                              value={t.username}
                              onChange={(e) => handleUpdatePreview(t.id, 'username', e.target.value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    onClick={handleBuatAkunGuruOtomatis}
                    loading={creatingGuru}
                    loadingText="Menyimpan akun..."
                    className="w-full sm:w-auto"
                    disabled={!selectedDaerahId || !kelasResult}
                  >
                    Simpan & Buat Akun
                  </Button>
                </div>
              )}

              {/* Added guru list */}
              {guruList.length > 0 && previewTeachers.length === 0 && (
                <div className="space-y-4 mt-4 bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-100 dark:border-green-800">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-green-800 dark:text-green-300">{guruList.length} guru berhasil ditambahkan:</p>
                    {guruList.map(g => (
                      <div key={g.id} className="text-sm text-green-700 dark:text-green-400">
                        ✓ {g.full_name} (@{g.username})
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-4 flex justify-end">
                    <Button variant="primary" onClick={() => setStep(4)}>
                      Lanjut ke Ringkasan dan Copy Snippet Distribusi Akun
                    </Button>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* ──── STEP 4 — Ringkasan ────────────────────────────────────── */}
          {step === 4 && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">📝 Ringkasan Onboarding</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Berikut adalah ringkasan dari entitas yang telah Anda buat selama proses onboarding ini.
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-brand-50 dark:bg-brand-900/30 p-4 rounded-lg border border-brand-100 dark:border-brand-800">
                  <div className="text-2xl font-bold text-brand-700 dark:text-brand-300">
                    {selectedDaerahId ? '1' : '0'}
                  </div>
                  <div className="text-sm font-medium text-brand-600 dark:text-brand-400">Daerah</div>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {desas.length}
                  </div>
                  <div className="text-sm font-medium text-blue-600 dark:text-blue-400">Desa</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded-lg border border-purple-100 dark:border-purple-800">
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {allKelompoks.length}
                  </div>
                  <div className="text-sm font-medium text-purple-600 dark:text-purple-400">Kelompok</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg border border-green-100 dark:border-green-800">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {guruList.length}
                  </div>
                  <div className="text-sm font-medium text-green-600 dark:text-green-400">Guru/Admin</div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">Struktur Organisasi:</h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                  {desas.map((desa) => (
                    <li key={desa.id} className="ml-2">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">Desa {desa.name}</span>
                      <ul className="list-disc ml-5 mt-1">
                        {desa.kelompoks.map(k => (
                          <li key={k.id}>{k.name}</li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              </div>

              {/* ──── Snippet Credentials ──── */}
              {guruList.length > 0 && (
                <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 mt-6">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Distribusi Akun (Copy Snippet)
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Gunakan tombol di bawah ini untuk menyalin informasi akun-akun yang baru saja dibuat. Anda dapat langsung mengirimkannya ke WhatsApp masing-masing pengurus.
                  </p>
                  
                  <div className="space-y-3">
                    {/* Copy Daerah */}
                    {guruList.some(g => g.scope === 'daerah') && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                        <div>
                          <p className="font-medium text-sm text-gray-800 dark:text-gray-200">Akun Tingkat Daerah</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Termasuk PJ Utama dan PJ Generus Daerah</p>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            const dName = (daerahList || []).find((d: any) => d.id === selectedDaerahId)?.name || 'Daerah'
                            const text = generateDaerahSnippet(dName, guruList)
                            navigator.clipboard.writeText(text)
                            toast.success('Snippet akun Daerah berhasil disalin!')
                          }}
                        >
                          Copy
                        </Button>
                      </div>
                    )}

                    {/* Copy Tiap Desa */}
                    {desas.map(desa => {
                      const hasDesaOrKelp = guruList.some(g => g.desa_id === desa.id)
                      if (!hasDesaOrKelp) return null
                      return (
                        <div key={desa.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600">
                          <div>
                            <p className="font-medium text-sm text-gray-800 dark:text-gray-200">Akun Desa {desa.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Termasuk {desa.kelompoks.length} Kelompok di dalamnya</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              const dName = (daerahList || []).find((d: any) => d.id === selectedDaerahId)?.name || 'Daerah'
                              const text = generateDesaSnippet(dName, desa, guruList)
                              navigator.clipboard.writeText(text)
                              toast.success(`Snippet akun Desa ${desa.name} berhasil disalin!`)
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}


              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                <Button variant="primary" onClick={() => router.push('/home')}>
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
