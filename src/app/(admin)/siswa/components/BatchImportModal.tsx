'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { toast } from 'sonner'
import { useBatchImportStore } from '../stores/batchImportStore'
import { useClasses } from '@/hooks/useClasses'
import { useUserProfile } from '@/stores/userProfileStore'
import { createStudentsBatch } from '../actions'
import Step1Config from './batch-import/Step1Config'
import Step2Input from './batch-import/Step2Input'
import Step3Preview from './batch-import/Step3Preview'

interface BatchImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export default function BatchImportModal({ isOpen, onClose, onSuccess }: BatchImportModalProps) {
  const {
    currentStep,
    selectedClassId,
    students,
    showBatchModal,
    closeBatchModal,
    resetBatchImport
  } = useBatchImportStore()

  const { classes, isLoading: classesLoading } = useClasses()
  const { profile: userProfile, loading: profileLoading } = useUserProfile()

  const [isImporting, setIsImporting] = useState(false)

  // Reset when modal opens
  useEffect(() => {
    if (isOpen && !showBatchModal) {
      resetBatchImport()
    }
  }, [isOpen, showBatchModal, resetBatchImport])

  const handleClose = () => {
    if (isImporting) return // Prevent closing during import
    
    closeBatchModal()
    onClose()
  }

  const handleImport = async () => {
    if (!selectedClassId) {
      toast.error('Kelas tidak dipilih')
      return
    }

    const validStudents = students.filter(s => s.name.trim() !== '' && s.gender !== '')
    
    if (validStudents.length === 0) {
      toast.error('Tidak ada siswa yang valid untuk ditambah')
      return
    }

    setIsImporting(true)

    try {
      const result = await createStudentsBatch(validStudents, selectedClassId)
      
      if (result.success) {
        toast.success(`${result.imported} siswa berhasil ditambah`)
        handleClose()
        onSuccess?.()
      } else {
        toast.error('Gagal mengimport siswa')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Terjadi kesalahan'
      toast.error(errorMessage)
      console.error('Import error:', error)
    } finally {
      setIsImporting(false)
    }
  }

  const getSelectedClass = () => {
    if (!selectedClassId) return null
    return classes.find(c => c.id === selectedClassId) || null
  }

  const getStepTitle = () => {
    switch (currentStep) {
      case 1: return 'Konfigurasi'
      case 2: return 'Input Data'
      case 3: return 'Preview & Import'
      default: return 'Import Siswa Batch'
    }
  }

  const isLoading = classesLoading || profileLoading

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} className="max-w-4xl m-4">
        <div className="p-6">
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-4xl m-4">
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
            {getStepTitle()}
          </h2>
          
          {/* Step Indicator */}
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  }`}
                >
                  {step}
                </div>
                {step < 3 && (
                  <div
                    className={`w-12 h-0.5 mx-2 ${
                      step < currentStep ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <Step1Config
              userProfile={userProfile}
              classes={classes}
              onNext={() => useBatchImportStore.getState().nextStep()}
            />
          )}
          
          {currentStep === 2 && (
            <Step2Input
              selectedClass={getSelectedClass()}
              onBack={() => useBatchImportStore.getState().prevStep()}
              onNext={() => useBatchImportStore.getState().nextStep()}
            />
          )}
          
          {currentStep === 3 && (
            <Step3Preview
              selectedClass={getSelectedClass()}
              onBack={() => useBatchImportStore.getState().prevStep()}
              onImport={handleImport}
            />
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
            <div>
              {currentStep === 1 && 'Tentukan jumlah siswa dan kelas yang akan ditambah'}
              {currentStep === 2 && 'Isi data siswa yang akan ditambah'}
              {currentStep === 3 && 'Periksa dan konfirmasi data sebelum mengimport'}
            </div>
            <div>
              Langkah {currentStep} dari 3
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
