'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import InputFilter from '@/components/form/input/InputFilter'
import { useBatchImportStore } from '../../stores/batchImportStore'
import { hasDraft, loadDraft } from '../../utils/draftStorage'

interface Class {
  id: string
  name: string
}

interface Step1ConfigProps {
  userProfile: { 
    role: string; 
    classes?: Array<{ id: string; name: string }> 
  } | null | undefined
  classes: Class[]
  onNext: () => void
}

export default function Step1Config({ userProfile, classes, onNext }: Step1ConfigProps) {
  const {
    batchSize,
    selectedClassId,
    setBatchSize,
    setSelectedClassId,
    setStudents,
    resetToStep1
  } = useBatchImportStore()

  const [hasExistingDraft, setHasExistingDraft] = useState(false)

  // Check for existing draft when classId changes
  useEffect(() => {
    if (selectedClassId) {
      setHasExistingDraft(hasDraft(selectedClassId))
    } else {
      setHasExistingDraft(false)
    }
  }, [selectedClassId])

  // Auto-select first class for teachers
  useEffect(() => {
    if (userProfile?.role === 'teacher' && userProfile.classes?.[0] && !selectedClassId) {
      setSelectedClassId(userProfile.classes[0].id)
    }
  }, [userProfile, selectedClassId, setSelectedClassId])

  const handleLoadDraft = () => {
    if (!selectedClassId) return
    
    const draftStudents = loadDraft(selectedClassId)
    if (draftStudents) {
      setStudents(draftStudents)
      setHasExistingDraft(false)
    }
  }

  const handleNext = () => {
    if (!selectedClassId) {
      alert('Pilih kelas terlebih dahulu')
      return
    }
    
    if (batchSize < 1 || batchSize > 20) {
      alert('Jumlah siswa harus antara 1-20')
      return
    }
    
    onNext()
  }

  const availableClasses = userProfile?.role === 'admin' 
    ? classes 
    : userProfile?.classes || []

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Konfigurasi Import Siswa
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Tentukan jumlah siswa dan kelas yang akan ditambah
        </p>
      </div>

      {/* Batch Size Input */}
      <div>
        <Label htmlFor="batchSize">Jumlah Siswa</Label>
        <Input
          id="batchSize"
          type="number"
          min="1"
          max="20"
          value={batchSize}
          onChange={(e) => setBatchSize(parseInt(e.target.value) || 1)}
          placeholder="Masukkan jumlah siswa (1-20)"
          className="w-full"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Masukkan jumlah yang akan ditambah (1-20)
        </p>
      </div>

      {/* Class Selection */}
      <div>
        <InputFilter
          id="classId"
          label="Kelas"
          value={selectedClassId}
          onChange={(value) => setSelectedClassId(value)}
          options={availableClasses.map((cls) => ({
            value: cls.id,
            label: cls.name,
          }))}
          allOptionLabel="Pilih kelas"
          widthClassName="!max-w-full"
        />
        {userProfile?.role === 'teacher' && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Kelas otomatis dipilih sesuai akun Anda
          </p>
        )}
      </div>

      {/* Load Draft Button */}
      {/* {hasExistingDraft && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Draft Tersimpan
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                Ada draft yang tersimpan untuk kelas ini
              </p>
            </div>
            <Button
              onClick={handleLoadDraft}
              variant="outline"
              size="sm"
              className="text-blue-700 border-blue-300 hover:bg-blue-100 dark:text-blue-300 dark:border-blue-700 dark:hover:bg-blue-900/30"
            >
              Muat Draft
            </Button>
          </div>
        </div>
      )} */}

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        {/* <Button
          onClick={resetToStep1}
          variant="outline"
          className="px-4 py-2"
        >
          Reset
        </Button> */}
        <Button
          onClick={handleNext}
          disabled={!selectedClassId || batchSize < 1}
          className="px-4 py-2"
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  )
}
