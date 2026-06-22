'use client'

import { useState, useMemo } from 'react'
import { quickAddStudentToMeeting } from '../actions/students/quickAdd'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import InputFilter from '@/components/form/input/InputFilter'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'

interface QuickAddStudentModalProps {
  isOpen: boolean
  onClose: () => void
  meetingId: string
  classList: Array<{ id: string; name: string; kelompok_id?: string | null }>
  kelompokList: Array<{ id: string; name: string; desa_id: string }>
  desaList: Array<{ id: string; name: string }>
  onSuccess: (studentId?: string, studentName?: string) => void
}

export default function QuickAddStudentModal({
  isOpen,
  onClose,
  meetingId,
  classList,
  kelompokList,
  desaList,
  onSuccess
}: QuickAddStudentModalProps) {
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form states
  const [name, setName] = useState('')
  const [gender, setGender] = useState('')
  const [selectedDesa, setSelectedDesa] = useState<string>('')
  const [selectedKelompok, setSelectedKelompok] = useState<string>('')
  const [selectedClass, setSelectedClass] = useState<string>('')
  
  // Reset state when opening/closing
  const handleClose = () => {
    if (isSubmitting) return
    setError(null)
    setName('')
    setGender('')
    setSelectedDesa('')
    setSelectedKelompok('')
    setSelectedClass('')
    onClose()
  }

  // Auto-select if there's only 1 option
  useMemo(() => {
    if (desaList.length === 1 && !selectedDesa) {
      setSelectedDesa(desaList[0].id)
    }
  }, [desaList, selectedDesa])

  // Filter kelompok based on selected desa
  const filteredKelompokList = useMemo(() => {
    if (!selectedDesa) return kelompokList
    return kelompokList.filter(k => k.desa_id === selectedDesa)
  }, [kelompokList, selectedDesa])
  
  // Auto-select kelompok if only 1
  useMemo(() => {
    if (filteredKelompokList.length === 1 && !selectedKelompok) {
      setSelectedKelompok(filteredKelompokList[0].id)
      if (!selectedDesa && filteredKelompokList[0].desa_id) {
        setSelectedDesa(filteredKelompokList[0].desa_id)
      }
    }
  }, [filteredKelompokList, selectedKelompok, selectedDesa])

  // Filter class based on selected kelompok
  const filteredClassList = useMemo(() => {
    if (!selectedKelompok) return classList
    return classList.filter(c => c.kelompok_id === selectedKelompok || !c.kelompok_id)
  }, [classList, selectedKelompok])
  
  // Auto-select class if only 1
  useMemo(() => {
    if (filteredClassList.length === 1 && !selectedClass) {
      setSelectedClass(filteredClassList[0].id)
    }
  }, [filteredClassList, selectedClass])

  async function handleSubmit() {
    if (!name || !gender || !selectedClass) {
      setError('Mohon lengkapi data yang wajib diisi')
      return
    }

    const resolvedKelompokId = selectedKelompok || (kelompokList.length === 1 ? kelompokList[0].id : '')
    if (!resolvedKelompokId) {
      setError('Mohon lengkapi data Kelompok')
      return
    }

    setError(null)
    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('gender', gender)
      formData.append('classId', selectedClass)
      formData.append('kelompok_id', resolvedKelompokId)
      
      const result = await quickAddStudentToMeeting(meetingId, formData)
      
      if (result.success) {
        onSuccess(result.student?.id, result.student?.name)
        handleClose()
      } else {
        setError(result.message || 'Gagal menambahkan siswa')
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const genderOptions = [
    { value: 'Laki-laki', label: 'Laki-laki' },
    { value: 'Perempuan', label: 'Perempuan' }
  ]

  const desaOptions = desaList.map(d => ({ value: d.id, label: d.name }))
  const kelompokOptions = filteredKelompokList.map(k => ({ value: k.id, label: k.name }))
  const classOptions = filteredClassList.map(c => ({ value: c.id, label: c.name }))

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md w-full">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Tambah Siswa
      </h2>
      
      <div className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 dark:bg-red-900/30 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        <div>
          <Label className="mb-1">Nama Lengkap <span className="text-red-500">*</span></Label>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Contoh: Budi Santoso"
            className="w-full"
          />
        </div>

        <div>
          <InputFilter
            id="gender"
            label="Jenis Kelamin *"
            value={gender}
            onChange={setGender}
            options={genderOptions}
            allOptionLabel="Pilih Jenis Kelamin"
            widthClassName="!max-w-full"
            variant="modal"
          />
        </div>

        {desaList.length > 1 && (
          <div>
            <InputFilter
              id="desa_id"
              label="Desa *"
              value={selectedDesa}
              onChange={(val) => {
                setSelectedDesa(val)
                setSelectedKelompok('')
                setSelectedClass('')
              }}
              options={desaOptions}
              allOptionLabel="Pilih Desa"
              widthClassName="!max-w-full"
              variant="modal"
            />
          </div>
        )}

        {kelompokList.length > 1 && (
          <div>
            <InputFilter
              id="kelompok_id"
              label="Kelompok *"
              value={selectedKelompok}
              onChange={(val) => {
                setSelectedKelompok(val)
                setSelectedClass('')
              }}
              options={kelompokOptions}
              allOptionLabel="Pilih Kelompok"
              widthClassName="!max-w-full"
              variant="modal"
              disabled={desaList.length > 1 && !selectedDesa}
            />
          </div>
        )}

        <div>
          <InputFilter
            id="classId"
            label="Kelas *"
            value={selectedClass}
            onChange={setSelectedClass}
            options={classOptions}
            allOptionLabel="Pilih Kelas"
            widthClassName="!max-w-full"
            variant="modal"
            disabled={kelompokList.length > 1 && !selectedKelompok}
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
          <Button
            onClick={handleClose}
            variant="outline"
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !name || !gender || !selectedClass || (!selectedKelompok && kelompokList.length > 1)}
            loading={isSubmitting}
            loadingText="Menyimpan..."
          >
            Simpan Siswa
          </Button>
        </div>
      </div>
    </Modal>
  )
}
