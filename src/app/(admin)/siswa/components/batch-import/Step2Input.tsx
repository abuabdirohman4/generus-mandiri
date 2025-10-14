'use client'

import { useState, useEffect } from 'react'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import { useBatchImportStore } from '../../stores/batchImportStore'
import { saveDraft } from '../../utils/draftStorage'
import { TrashBinIcon } from '@/lib/icons'

interface Class {
  id: string
  name: string
}

interface Step2InputProps {
  selectedClass: Class | null
  onBack: () => void
  onNext: () => void
}

export default function Step2Input({ selectedClass, onBack, onNext }: Step2InputProps) {
  const {
    batchSize,
    students,
    setStudents,
    addStudent,
    updateStudent,
    removeStudent
  } = useBatchImportStore()

  const [isValid, setIsValid] = useState(false)

  // Generate initial students based on batch size
  useEffect(() => {
    const currentCount = students.length
    const targetCount = batchSize

    if (currentCount < targetCount) {
      // Add missing students
      const newStudents = Array.from({ length: targetCount - currentCount }, (_, i) => ({
        id: `temp-${Date.now()}-${i}`,
        name: '',
        gender: 'Laki-laki'
      }))
      setStudents([...students, ...newStudents])
    } else if (currentCount > targetCount) {
      // Remove excess students
      setStudents(students.slice(0, targetCount))
    }
  }, [batchSize, students.length, setStudents])

  // Validate form
  useEffect(() => {
    const hasValidStudents = students.some(s => s.name.trim() !== '' && s.gender !== '')
    setIsValid(hasValidStudents)
  }, [students])

  const handleAddMore = () => {
    const newStudents = Array.from({ length: 5 }, (_, i) => ({
      id: `temp-${Date.now()}-${i}`,
      name: '',
      gender: ''
    }))
    setStudents([...students, ...newStudents])
  }

  const handleSaveDraft = () => {
    if (selectedClass) {
      saveDraft(selectedClass.id, students)
      alert('Draft berhasil disimpan')
    }
  }

  const handleNext = () => {
    if (!isValid) {
      alert('Minimal isi satu siswa dengan nama dan jenis kelamin')
      return
    }
    onNext()
  }

  const getCategoryFromClassName = (className: string): string => {
    const lower = className.toLowerCase()
    if (lower.includes('paud')) return 'Paud'
    if (/kelas [1-6]/.test(lower)) return 'Caberawit'
    if (/pra remaja/.test(lower)) return 'Pra Remaja'
    if (/remaja|pra nikah/.test(lower)) return 'Remaja'
    if (/kelompok/.test(lower)) return 'Orang Tua'
    return 'Caberawit'
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Input Data Siswa
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Isi data siswa yang akan ditambah
        </p>
      </div>

      {/* Class Info */}
      {selectedClass && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
          <div className="grid grid-cols-1 gap-4 text-sm">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300"></span>
              <span className="ml-2 text-gray-900 dark:text-white">Kelas {selectedClass.name}</span>
            </div>
            {/* <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">Kategori:</span>
              <span className="ml-2 text-gray-900 dark:text-white">
                {getCategoryFromClassName(selectedClass.name)}
              </span>
            </div> */}
          </div>
        </div>
      )}

      {/* Students Form */}
      <div className="space-y-4">
        {/* <div className="flex items-center justify-between">
          <Label>Data Siswa</Label>
          <Button
            onClick={handleAddMore}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-700 dark:hover:bg-blue-900/20"
          >
            + Tambah 5 Lagi
          </Button>
        </div> */}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {students.map((student, index) => (
            <div key={student.id} className="grid grid-cols-12 gap-1 items-start">
              <div className="col-span-1">
                <Input
                  value={index + 1}
                  disabled
                  className={`w-full text-center text-gray-900 !p-0`}
                />
              </div>
              
              <div className="col-span-9">
                <Input
                  value={student.name}
                  onChange={(e) => updateStudent(student.id, { name: e.target.value })}
                  placeholder="Nama lengkap"
                  className={`w-full ${
                    student.gender && !student.name.trim() 
                      ? 'border-red-300 focus:border-red-500' 
                      : ''
                  }`}
                />
              </div>
              
              <div className="col-span-2">
                <select
                  value={student.gender || "Laki-laki"}
                  onChange={(e) => updateStudent(student.id, { gender: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white appearance-none bg-no-repeat bg-right bg-[length:16px] pr-8"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 8px center'
                  }}
                >
                  {/* <option value="">Pilih</option> */}
                  <option value="Laki-laki">L</option>
                  <option value="Perempuan">P</option>
                </select>
              </div>
              {/* <div className="col-span-3 flex items-center text-xs text-gray-500 dark:text-gray-400">
                {student.name.trim() && student.gender ? (
                  <span className="text-green-600 dark:text-green-400">✓ Lengkap</span>
                ) : student.name.trim() || student.gender ? (
                  <span className="text-yellow-600 dark:text-yellow-400">⚠ Sebagian</span>
                ) : (
                  <span className="text-gray-400">Kosong</span>
                )}
              </div> */}
              
              {/* <div className="col-span-1 flex justify-center">
                {students.length > 1 && (
                  <button
                    onClick={() => removeStudent(student.id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Hapus baris"
                  >
                    <TrashBinIcon className="w-4 h-4" />
                  </button>
                )}
              </div> */}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end pt-4">
        {/* <div className="flex gap-2">
          <Button
            onClick={handleSaveDraft}
            variant="outline"
            className="px-4 py-2"
          >
            Simpan Draft
          </Button>
        </div> */}
        
        <div className="flex gap-2">
          <Button
            onClick={onBack}
            variant="outline"
            className="px-4 py-2"
          >
            Kembali
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isValid}
            className="px-4 py-2"
          >
            Selanjutnya
          </Button>
        </div>
      </div>
    </div>
  )
}
