'use client'

import { useState } from 'react'
import Button from '@/components/ui/button/Button'
import { useBatchImportStore } from '../../stores/batchImportStore'
import { clearDraft } from '../../utils/draftStorage'

interface Class {
  id: string
  name: string
}

interface Step3PreviewProps {
  selectedClass: Class | null
  onBack: () => void
  onImport: () => Promise<void>
}

export default function Step3Preview({ selectedClass, onBack, onImport }: Step3PreviewProps) {
  const {
    students,
    importProgress,
    isImporting,
    setImportProgress,
    setIsImporting
  } = useBatchImportStore()

  const [isImportingLocal, setIsImportingLocal] = useState(false)

  // Filter valid students (have both name and gender)
  const validStudents = students.filter(s => s.name.trim() !== '' && s.gender !== '')
  const emptyStudents = students.filter(s => s.name.trim() === '' && s.gender === '')

  const getCategoryFromClassName = (className: string): string => {
    const lower = className.toLowerCase()
    if (lower.includes('paud')) return 'Paud'
    if (/kelas [1-6]/.test(lower)) return 'Caberawit'
    if (/pra remaja/.test(lower)) return 'Pra Remaja'
    if (/remaja|pra nikah/.test(lower)) return 'Remaja'
    if (/kelompok/.test(lower)) return 'Orang Tua'
    return 'Caberawit'
  }

  const handleImport = async () => {
    if (validStudents.length === 0) {
      alert('Tidak ada siswa yang valid untuk ditambah')
      return
    }

    setIsImportingLocal(true)
    setIsImporting(true)
    setImportProgress(0)

    try {
      // Simulate progress updates
      let currentProgress = 0
      const progressInterval = setInterval(() => {
        currentProgress += 10
        if (currentProgress >= 90) {
          clearInterval(progressInterval)
          setImportProgress(90)
        } else {
          setImportProgress(currentProgress)
        }
      }, 200)

      await onImport()

      // Complete progress
      clearInterval(progressInterval)
      setImportProgress(100)

      // Clear draft after successful import
      if (selectedClass) {
        clearDraft(selectedClass.id)
      }

    } catch (error) {
      console.error('Import failed:', error)
    } finally {
      setIsImportingLocal(false)
      setIsImporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Preview & Konfirmasi
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Periksa data sebelum mengimport
        </p>
      </div>

      {/* Summary Card */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-blue-900 dark:text-blue-100">Total Baris:</span>
            <span className="ml-2 text-blue-700 dark:text-blue-300">{students.length}</span>
          </div>
          <div>
            <span className="font-medium text-blue-900 dark:text-blue-100">Akan dibuat:</span>
            <span className="ml-2 text-blue-700 dark:text-blue-300">{validStudents.length}</span>
          </div>
          <div>
            <span className="font-medium text-blue-900 dark:text-blue-100">Kelas:</span>
            <span className="ml-2 text-blue-700 dark:text-blue-300">{selectedClass?.name || '-'}</span>
          </div>
          <div>
            <span className="font-medium text-blue-900 dark:text-blue-100">Kategori:</span>
            <span className="ml-2 text-blue-700 dark:text-blue-300">
              {selectedClass ? getCategoryFromClassName(selectedClass.name) : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar (shown during import) */}
      {(isImporting || isImportingLocal) && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">Mengimport siswa...</span>
            <span className="text-gray-600 dark:text-gray-400">{importProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${importProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Preview Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  No
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Nama
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Jenis Kelamin
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {students.map((student, index) => {
                const isValid = student.name.trim() !== '' && student.gender !== ''
                const isEmpty = student.name.trim() === '' && student.gender === ''
                
                return (
                  <tr key={student.id} className={isEmpty ? 'opacity-50' : ''}>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {student.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-gray-900 dark:text-white">
                      {student.gender || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {isValid ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          ✓ Akan Dibuat
                        </span>
                      ) : isEmpty ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                          - Kosong
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                          ⚠ Tidak Lengkap
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Empty Students Info */}
      {emptyStudents.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Catatan:</strong> {emptyStudents.length} baris kosong akan diabaikan saat import.
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-4">
        <Button
          onClick={onBack}
          variant="outline"
          disabled={isImporting || isImportingLocal}
          className="px-4 py-2"
        >
          Kembali
        </Button>
        
        <Button
          onClick={handleImport}
          disabled={validStudents.length === 0 || isImporting || isImportingLocal}
          className="px-4 py-2"
        >
          {isImporting || isImportingLocal ? 'Mengimport...' : `Import ${validStudents.length} Siswa`}
        </Button>
      </div>
    </div>
  )
}
