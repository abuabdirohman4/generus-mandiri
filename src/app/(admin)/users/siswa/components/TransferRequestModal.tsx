'use client'

import { useState, useEffect, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Label from '@/components/form/Label'
import InputFilter from '@/components/form/input/InputFilter'
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox'
import { toast } from 'sonner'

interface Student {
  id: string
  name: string
  daerah_id?: string
  desa_id?: string
  kelompok_id?: string
  daerah_name?: string
  desa_name?: string
  kelompok_name?: string
}

interface Daerah {
  id: string
  name: string
}

interface Desa {
  id: string
  name: string
  daerah_id: string
}

interface Kelompok {
  id: string
  name: string
  desa_id: string
}

interface Class {
  id: string
  name: string
  kelompok_id?: string
}

interface TransferRequestModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    studentIds: string[]
    toDaerahId: string
    toDesaId: string
    toKelompokId: string
    toClassIds?: string[]
    reason?: string
    notes?: string
  }) => Promise<{ success: boolean; autoApproved?: boolean; error?: string }>
  selectedStudents: Student[]
  daerah: Daerah[]
  desa: Desa[]
  kelompok: Kelompok[]
  classes: Class[]
  userProfile: {
    role: string
    daerah_id?: string
    desa_id?: string
    kelompok_id?: string
  }
  isLoading?: boolean
}

export default function TransferRequestModal({
  isOpen,
  onClose,
  onSubmit,
  selectedStudents,
  daerah,
  desa,
  kelompok,
  classes,
  userProfile,
  isLoading = false,
}: TransferRequestModalProps) {
  const [selectedDaerah, setSelectedDaerah] = useState<string>('')
  const [selectedDesa, setSelectedDesa] = useState<string>('')
  const [selectedKelompok, setSelectedKelompok] = useState<string>('')
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([])
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  // Filtered options
  const filteredDesa = useMemo(
    () => (selectedDaerah ? desa.filter((d) => d.daerah_id === selectedDaerah) : []),
    [selectedDaerah, desa]
  )

  const filteredKelompok = useMemo(
    () => (selectedDesa ? kelompok.filter((k) => k.desa_id === selectedDesa) : []),
    [selectedDesa, kelompok]
  )

  const filteredClasses = useMemo(
    () => (selectedKelompok ? classes.filter((c) => c.kelompok_id === selectedKelompok) : []),
    [selectedKelompok, classes]
  )

  // Check if transfer needs approval
  const needsApproval = useMemo(() => {
    if (!selectedStudents.length || !selectedKelompok) return false
    if (userProfile.role === 'superadmin') return false

    const firstStudent = selectedStudents[0]
    const sameKelompok = firstStudent.kelompok_id === selectedKelompok
    if (sameKelompok) return false

    return true
  }, [selectedStudents, selectedKelompok, userProfile.role])

  // Check if reason is required (cross-boundary transfer)
  const reasonRequired = needsApproval

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedDaerah('')
      setSelectedDesa('')
      setSelectedKelompok('')
      setSelectedClassIds([])
      setReason('')
      setNotes('')
    }
  }, [isOpen])

  // Auto-select if only one option
  useEffect(() => {
    if (daerah.length === 1 && !selectedDaerah) {
      setSelectedDaerah(daerah[0].id)
    }
  }, [daerah, selectedDaerah])

  useEffect(() => {
    if (filteredDesa.length === 1 && !selectedDesa) {
      setSelectedDesa(filteredDesa[0].id)
    }
  }, [filteredDesa, selectedDesa])

  const handleSubmit = async () => {
    // Validation
    if (!selectedDaerah || !selectedDesa || !selectedKelompok) {
      toast.error('Pilih organisasi tujuan lengkap')
      return
    }

    if (reasonRequired && !reason.trim()) {
      toast.error('Alasan transfer wajib diisi untuk transfer lintas organisasi')
      return
    }

    const result = await onSubmit({
      studentIds: selectedStudents.map((s) => s.id),
      toDaerahId: selectedDaerah,
      toDesaId: selectedDesa,
      toKelompokId: selectedKelompok,
      toClassIds: selectedClassIds.length > 0 ? selectedClassIds : undefined,
      reason: reason.trim() || undefined,
      notes: notes.trim() || undefined,
    })

    if (result.success) {
      onClose()
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-2xl m-4">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Transfer Siswa
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Transfer {selectedStudents.length} siswa ke organisasi lain
          </p>
        </div>

        {/* Selected Students List */}
        <div className="mb-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Siswa yang akan ditransfer:
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {selectedStudents.map((student) => (
              <div
                key={student.id}
                className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2"
              >
                <span>•</span>
                <span>
                  {student.name}{' '}
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    ({student.kelompok_name})
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4 mb-6">
          {/* Destination Organization */}
          <div>
            <Label htmlFor="daerah">
              Daerah Tujuan <span className="text-red-500">*</span>
            </Label>
            <InputFilter
              label=""
              id="daerah"
              options={daerah.map((d) => ({ value: d.id, label: d.name }))}
              value={selectedDaerah}
              onChange={setSelectedDaerah}
              placeholder="Pilih Daerah"
              variant="modal"
              disabled={isLoading}
            />
          </div>

          <div>
            <Label htmlFor="desa">
              Desa Tujuan <span className="text-red-500">*</span>
            </Label>
            <InputFilter
              label=""
              id="desa"
              options={filteredDesa.map((d) => ({ value: d.id, label: d.name }))}
              value={selectedDesa}
              onChange={setSelectedDesa}
              placeholder={selectedDaerah ? 'Pilih Desa' : 'Pilih Daerah terlebih dahulu'}
              variant="modal"
              disabled={isLoading || !selectedDaerah}
            />
          </div>

          <div>
            <Label htmlFor="kelompok">
              Kelompok Tujuan <span className="text-red-500">*</span>
            </Label>
            <InputFilter
              label=""
              id="kelompok"
              options={filteredKelompok.map((k) => ({ value: k.id, label: k.name }))}
              value={selectedKelompok}
              onChange={setSelectedKelompok}
              placeholder={selectedDesa ? 'Pilih Kelompok' : 'Pilih Desa terlebih dahulu'}
              variant="modal"
              disabled={isLoading || !selectedDesa}
            />
          </div>

          {/* Optional Class Selection */}
          {selectedKelompok && filteredClasses.length > 0 && (
            <div>
              <Label htmlFor="classes">Kelas Tujuan (Opsional)</Label>
              <MultiSelectCheckbox
                label=""
                items={filteredClasses.map((c) => ({ id: c.id, label: c.name }))}
                selectedIds={selectedClassIds}
                onChange={setSelectedClassIds}
                disabled={isLoading}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Jika dikosongkan, siswa akan ditransfer tanpa kelas
              </p>
            </div>
          )}

          {/* Reason (required for cross-boundary) */}
          <div>
            <Label htmlFor="reason">
              Alasan Transfer {reasonRequired && <span className="text-red-500">*</span>}
            </Label>
            <textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              rows={3}
              placeholder={
                reasonRequired
                  ? 'Wajib diisi untuk transfer lintas organisasi'
                  : 'Alasan transfer (opsional)'
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 resize-none"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isLoading}
              rows={2}
              placeholder="Catatan tambahan untuk reviewer..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50 resize-none"
            />
          </div>
        </div>

        {/* Approval Status Info */}
        {selectedKelompok && (
          <div
            className={`p-3 rounded-lg border mb-6 ${
              needsApproval
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
                : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
            }`}
          >
            <p
              className={`text-sm ${
                needsApproval
                  ? 'text-yellow-800 dark:text-yellow-200'
                  : 'text-green-800 dark:text-green-200'
              }`}
            >
              <strong>Status:</strong>{' '}
              {needsApproval
                ? 'Transfer ini memerlukan persetujuan dari admin tujuan'
                : 'Transfer ini akan disetujui otomatis (dalam organisasi yang sama)'}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-3">
          <Button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            variant="outline"
            className="w-full sm:w-1/2 px-4 py-2"
          >
            Batal
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !selectedDaerah || !selectedDesa || !selectedKelompok}
            loading={isLoading}
            loadingText="Memproses..."
            variant="primary"
            className="w-full sm:w-1/2 px-4 py-2"
          >
            {needsApproval ? 'Kirim Permintaan' : 'Transfer Sekarang'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
