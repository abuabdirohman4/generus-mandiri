'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { isAdminKelompok } from '@/lib/userUtils'
import { useUserProfile } from '@/stores/userProfileStore'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useClassMasters } from '@/hooks/useClassMasters'
import { createBatchStandardClasses } from '../actions/batch-standard/actions'
import { createBatchCustomClass } from '../actions/batch-standard/custom-actions'
import { filterStandardMasters } from '../actions/batch-standard/logic'
import type { BatchStandardResult } from '../actions/batch-standard/actions'
import Modal from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import type { Kelompok } from '@/types/organization'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function BatchStandardKelasModal({ isOpen, onClose, onSuccess }: Props) {
  const { profile: userProfile } = useUserProfile()
  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok: allKelompok } = useKelompok()
  const { masters: allMasters, isLoading: mastersLoading } = useClassMasters()

  // Local state (no Zustand needed — modal is simple enough)
  const [mode, setMode] = useState<'standard' | 'custom'>('standard')
  const [customName, setCustomName] = useState('')
  const [filterDaerahId, setFilterDaerahId] = useState('')
  const [filterDesaId, setFilterDesaId] = useState('')
  const [selectedKelompokIds, setSelectedKelompokIds] = useState<string[]>([])
  const [selectedMasterIds, setSelectedMasterIds] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<BatchStandardResult | null>(null)

  const standardMasters = useMemo(() => filterStandardMasters(allMasters), [allMasters])

  // Pre-select all standard masters on open
  useEffect(() => {
    if (isOpen && standardMasters.length > 0) {
      setSelectedMasterIds(standardMasters.map(m => m.id))
    }
  }, [isOpen, standardMasters.length])

  // Auto-select kelompok for admin kelompok
  useEffect(() => {
    if (isOpen && userProfile && isAdminKelompok(userProfile) && userProfile.kelompok_id) {
      setSelectedKelompokIds([userProfile.kelompok_id])
    }
  }, [isOpen, userProfile])

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setMode('standard')
      setCustomName('')
      setFilterDaerahId('')
      setFilterDesaId('')
      setSelectedKelompokIds([])
      setSelectedMasterIds([])
      setIsSubmitting(false)
      setResult(null)
    }
  }, [isOpen])

  // Filter kelompok list based on cascade selection
  const filteredKelompok = useMemo(() => {
    if (!allKelompok) return []
    if (userProfile && isAdminKelompok(userProfile)) {
      return allKelompok.filter((k: Kelompok) => k.id === userProfile.kelompok_id)
    }
    if (filterDesaId) return allKelompok.filter((k: Kelompok) => (k as any).desa_id === filterDesaId)
    if (filterDaerahId) {
      const desaIds = (desa || [])
        .filter((d: any) => d.daerah_id === filterDaerahId)
        .map((d: any) => d.id)
      return allKelompok.filter((k: Kelompok) => desaIds.includes((k as any).desa_id))
    }
    return allKelompok
  }, [allKelompok, desa, filterDaerahId, filterDesaId, userProfile])

  const filteredDesa = useMemo(() => {
    if (!desa) return []
    if (filterDaerahId) return desa.filter((d: any) => d.daerah_id === filterDaerahId)
    return desa
  }, [desa, filterDaerahId])

  const toggleKelompok = (id: string) => {
    setSelectedKelompokIds(prev =>
      prev.includes(id) ? prev.filter(k => k !== id) : [...prev, id]
    )
  }

  const toggleSelectAllKelompok = () => {
    const allIds = filteredKelompok.map((k: Kelompok) => k.id)
    const isAllSelected = allIds.length > 0 && allIds.every((id: string) => selectedKelompokIds.includes(id))
    setSelectedKelompokIds(isAllSelected ? [] : allIds)
  }

  const toggleMaster = (id: string) => {
    setSelectedMasterIds(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  const handleSubmit = async () => {
    if (selectedKelompokIds.length === 0) {
      toast.error('Pilih minimal satu kelompok')
      return
    }
    if (mode === 'standard' && selectedMasterIds.length === 0) {
      toast.error('Pilih minimal satu kelas standar')
      return
    }
    if (mode === 'custom' && !customName.trim()) {
      toast.error('Isi nama kelas')
      return
    }

    setIsSubmitting(true)
    try {
      const res = mode === 'custom'
        ? await createBatchCustomClass(selectedKelompokIds, customName)
        : await createBatchStandardClasses(selectedKelompokIds, selectedMasterIds)
      setResult(res)
      if (res.totalCreated > 0) {
        toast.success(`${res.totalCreated} kelas berhasil dibuat`)
        onSuccess?.()
      } else {
        toast.info('Semua kelas sudah ada — tidak ada yang dibuat')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    onClose()
  }

  const isAdminKelompokUser = userProfile && isAdminKelompok(userProfile)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={result ? 'Hasil Pembuatan Kelas' : 'Tambah Kelas Batch'}>
      {result ? (
        // Result view
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{result.totalCreated} kelas dibuat</p>
            {result.totalSkipped > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{result.totalSkipped} dilewati (sudah ada)</p>
            )}
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {result.byKelompok.map(k => (
              <div key={k.kelompokId} className="text-sm border rounded p-3 dark:border-gray-700">
                <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {allKelompok?.find((kl: Kelompok) => kl.id === k.kelompokId)?.name || k.kelompokId}
                </p>
                {k.created.length > 0 && (
                  <p className="text-green-600 dark:text-green-400">✓ {k.created.join(', ')}</p>
                )}
                {k.skipped.length > 0 && (
                  <p className="text-yellow-600 dark:text-yellow-400">⏭ Dilewati: {k.skipped.join(', ')}</p>
                )}
                {k.errors.length > 0 && (
                  <p className="text-red-600 dark:text-red-400">✗ Error: {k.errors.join(', ')}</p>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleClose}>Tutup</Button>
          </div>
        </div>
      ) : (
        // Input view
        <div className="space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-1 border-b dark:border-gray-700">
            <button
              type="button"
              onClick={() => setMode('standard')}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                mode === 'standard'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Kelas Standar
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                mode === 'custom'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Kelas Custom
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Left: Kelompok selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pilih Kelompok <span className="text-red-500">*</span>
                </p>
                {!isAdminKelompokUser && filteredKelompok.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAllKelompok}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {filteredKelompok.every((k: Kelompok) => selectedKelompokIds.includes(k.id)) ? 'Batalkan semua' : 'Pilih semua'}
                  </button>
                )}
              </div>

              {/* Cascade filter — hidden for admin kelompok */}
              {!isAdminKelompokUser && (
                <div className="space-y-2 mb-3">
                  <select
                    className="w-full text-sm border rounded px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600"
                    value={filterDaerahId}
                    onChange={e => { setFilterDaerahId(e.target.value); setFilterDesaId(''); setSelectedKelompokIds([]) }}
                  >
                    <option value="">Semua Daerah</option>
                    {(daerah || []).map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <select
                    className="w-full text-sm border rounded px-2 py-1.5 dark:bg-gray-800 dark:border-gray-600"
                    value={filterDesaId}
                    onChange={e => { setFilterDesaId(e.target.value); setSelectedKelompokIds([]) }}
                  >
                    <option value="">Semua Desa</option>
                    {filteredDesa.map((d: any) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Kelompok checkboxes */}
              <div className="max-h-48 overflow-y-auto space-y-1 border rounded p-2 dark:border-gray-700">
                {filteredKelompok.length === 0 ? (
                  <p className="text-sm text-gray-400 p-2">Tidak ada kelompok</p>
                ) : (
                  filteredKelompok.map((k: Kelompok) => (
                    <label key={k.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 py-0.5">
                      <input
                        type="checkbox"
                        checked={selectedKelompokIds.includes(k.id)}
                        onChange={() => toggleKelompok(k.id)}
                        disabled={!!isAdminKelompokUser}
                      />
                      <span className="text-gray-700 dark:text-gray-300">{k.name}</span>
                    </label>
                  ))
                )}
              </div>
              {selectedKelompokIds.length > 0 && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{selectedKelompokIds.length} kelompok dipilih</p>
              )}
            </div>

            {/* Right: Standard masters OR custom name */}
            {mode === 'custom' ? (
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Nama Kelas <span className="text-red-500">*</span>
                </p>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="mis. CAI 2026"
                  className="w-full text-sm border rounded px-3 py-2 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Kelas ini dibuat di tiap kelompok terpilih dengan nama yang sama.
                </p>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Kelas Standar <span className="text-red-500">*</span>
                  </p>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedMasterIds(standardMasters.map(m => m.id))}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Semua
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedMasterIds([])}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Hapus
                    </button>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto space-y-1 border rounded p-2 dark:border-gray-700">
                  {mastersLoading ? (
                    <p className="text-sm text-gray-400 p-2">Memuat...</p>
                  ) : (
                    standardMasters.map(m => (
                      <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 rounded px-1 py-0.5">
                        <input
                          type="checkbox"
                          checked={selectedMasterIds.includes(m.id)}
                          onChange={() => toggleMaster(m.id)}
                        />
                        <span className="text-gray-700 dark:text-gray-300">{m.name}</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">{selectedMasterIds.length} / {standardMasters.length} dipilih</p>
              </div>
            )}
          </div>

          {/* Footer info */}
          <p className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 rounded px-3 py-2">
            ℹ Kelas yang sudah ada di kelompok yang dipilih akan dilewati otomatis
          </p>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting ||
                selectedKelompokIds.length === 0 ||
                (mode === 'standard' ? selectedMasterIds.length === 0 : !customName.trim())
              }
              loading={isSubmitting}
              loadingText="Membuat kelas..."
            >
              {mode === 'custom' ? 'Buat Kelas Custom' : 'Buat Kelas Standar'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
