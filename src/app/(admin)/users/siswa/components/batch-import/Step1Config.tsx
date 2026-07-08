'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import Label from '@/components/form/Label'
import InputFilter from '@/components/form/input/InputFilter'
import { useBatchImportStore } from '../../stores/batchImportStore'
import {
  isAdminDesa,
  isAdminKelompok,
  isTeacherKelompok,
  shouldShowDaerahFilter,
  modalShouldShowDesaFilter,
  modalShouldShowKelompokFilter,
  getAutoFilledOrgValues
} from '@/lib/userUtils'
import { Class } from '@/app/(admin)/users/siswa/actions'
import type { UserProfile } from '@/types/user'
import type { DaerahBase, DesaBase, KelompokBase } from '@/types/organization'
import DataFilter from '@/components/shared/DataFilter'
import type { DataFilters } from '@/components/shared/DataFilter'
import { canBulkAssignCrossKelompok } from '@/lib/accessControl'
import { useClassMasters } from '@/hooks/useClassMasters'

interface Step1ConfigProps {
  userProfile: UserProfile | null | undefined
  classes: Class[]
  daerah?: DaerahBase[]
  desa?: DesaBase[]
  kelompok?: KelompokBase[]
  onNext: () => void
}


export default function Step1Config({ userProfile, classes, daerah, desa, kelompok, onNext }: Step1ConfigProps) {
  const {
    batchSize,
    selectedClassId,
    setBatchSize,
    setSelectedClassId,
    selectedMasterId,
    customClassName,
    setSelectedMasterId,
    setCustomClassName,
    isBulkAssign,
    setIsBulkAssign
  } = useBatchImportStore()

  const { masters } = useClassMasters()
  const canBulkAssign = canBulkAssignCrossKelompok(userProfile)
  
  // Initialize isBulkAssign based on permission
  useEffect(() => {
    setIsBulkAssign(canBulkAssign)
  }, [canBulkAssign, setIsBulkAssign])

  const showKelompokInLabel = userProfile ? isAdminDesa(userProfile) : false

  const autoFilled = userProfile ? getAutoFilledOrgValues(userProfile) : {}
  const [filters, setFilters] = useState<DataFilters>({
    daerah: autoFilled.daerah_id ? [autoFilled.daerah_id] : [],
    desa: autoFilled.desa_id ? [autoFilled.desa_id] : [],
    kelompok: autoFilled.kelompok_id ? [autoFilled.kelompok_id] : [],
    kelas: [] as string[]
  })

  // Auto-select only for teacher kelompok with exactly 1 assigned class
  useEffect(() => {
    if (userProfile?.role === 'teacher' && userProfile.classes?.length === 1 && !selectedClassId) {
      setSelectedClassId(userProfile.classes[0].id)
    }
  }, [userProfile, selectedClassId, setSelectedClassId])

  const handleNext = () => {
    if (isBulkAssign) {
      if (!selectedMasterId) {
        toast.error('Pilih keluarga kelas tujuan')
        return
      }
      const selectedMaster = masters.find(m => m.id === selectedMasterId)
      if (selectedMaster?.name === 'Lainnya' && !customClassName.trim()) {
        toast.error('Masukkan nama kelas custom')
        return
      }
    } else {
      if (!selectedClassId) {
        toast.error('Pilih kelas terlebih dahulu')
        return
      }
    }

    if (batchSize < 1 || batchSize > 20) {
      toast.error('Jumlah siswa harus antara 1-20')
      return
    }

    onNext()
  }

  const rawClasses = userProfile?.role === 'admin'
    ? classes
    : (userProfile?.classes as Class[] | undefined) || []

  const isKelompokScoped = !!userProfile && (isAdminKelompok(userProfile) || isTeacherKelompok(userProfile))
  const kelompokFilteredClasses = isKelompokScoped || filters.kelompok.length === 0
    ? rawClasses
    : rawClasses.filter(cls => filters.kelompok.includes(cls.kelompok_id ?? ''))

  const availableClasses = useMemo(() => {
    return [...kelompokFilteredClasses].sort((a, b) => {
      const getSortOrder = (cls: Class): number => {
        if (!cls.class_master_mappings || cls.class_master_mappings.length === 0) return 9999
        const sortOrders = cls.class_master_mappings
          .map(m => m.class_master?.sort_order)
          .filter((o): o is number => typeof o === 'number')
        return sortOrders.length === 0 ? 9999 : Math.min(...sortOrders)
      }
      const orderA = getSortOrder(a)
      const orderB = getSortOrder(b)
      if (orderA !== orderB) return orderA - orderB
      return a.name.localeCompare(b.name)
    })
  }, [kelompokFilteredClasses])

  // Reset selectedClassId when kelompok filter changes and current selection is no longer valid
  useEffect(() => {
    if (selectedClassId && filters.kelompok.length > 0) {
      const isValid = availableClasses.some(cls => cls.id === selectedClassId)
      if (!isValid) setSelectedClassId('')
    }
  }, [filters.kelompok, availableClasses, selectedClassId, setSelectedClassId])

  // Get unique "Lainnya" class names available in the user's scope
  const lainnyaClassNames = useMemo(() => {
    if (!classes) return []
    const names = new Set<string>()
    classes.forEach(c => {
      const hasLainnyaMaster = c.class_master_mappings?.some(
        (m: any) => m.class_master?.name === 'Lainnya'
      )
      if (hasLainnyaMaster) {
        names.add(c.name)
      }
    })
    return Array.from(names).sort()
  }, [classes])

  const needsKelompok = !!userProfile && modalShouldShowKelompokFilter(userProfile) && !isAdminKelompok(userProfile) && !isTeacherKelompok(userProfile)
  const kelompokReady = isBulkAssign || !needsKelompok || filters.kelompok.length > 0

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
          type="text"
          value={batchSize === 0 ? '' : batchSize.toString()}
          onChange={(e) => {
            const value = e.target.value
            if (value === '') {
              setBatchSize(0) // Allow empty state
            } else {
              // Only allow numeric input
              const numericValue = value.replace(/[^0-9]/g, '')
              if (numericValue !== '') {
                const numValue = parseInt(numericValue)
                if (!isNaN(numValue)) {
                  // Only clamp to max, allow values below 1 temporarily
                  setBatchSize(Math.min(20, numValue))
                }
              } else {
                setBatchSize(0)
              }
            }
          }}
          placeholder="Masukkan jumlah siswa (1-20)"
          className="w-full"
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Masukkan jumlah yang akan ditambah (1-20)
        </p>
      </div>

      {/* Org Selector (Daerah → Desa → Kelompok) */}
      {!isBulkAssign && userProfile && !isAdminKelompok(userProfile) && !isTeacherKelompok(userProfile) && (
        <DataFilter
          filters={filters}
          onFilterChange={setFilters}
          userProfile={userProfile}
          daerahList={daerah || []}
          desaList={desa || []}
          kelompokList={kelompok || []}
          classList={availableClasses}
          showDaerah={shouldShowDaerahFilter(userProfile)}
          showDesa={modalShouldShowDesaFilter(userProfile)}
          showKelompok={modalShouldShowKelompokFilter(userProfile)}
          showKelas={false}
          variant="modal"
          compact={true}
          cascadeFilters={true}
        />
      )}

      {/* Class/Master Selection */}
      <div className="space-y-4">
        {canBulkAssign && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <input
              type="checkbox"
              id="isBulkAssignMode"
              checked={isBulkAssign}
              onChange={(e) => setIsBulkAssign(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300"
            />
            <label htmlFor="isBulkAssignMode" className="text-sm text-blue-900 dark:text-blue-100 font-medium cursor-pointer">
              Assign Lintas Kelompok
            </label>
          </div>
        )}

        {isBulkAssign ? (
          <div className="space-y-4">
            <InputFilter
              id="masterClassId"
              label="Pilih Kelas Tujuan"
              value={selectedMasterId}
              onChange={(value) => setSelectedMasterId(value)}
              options={masters
                .filter(m => m.name !== 'Lainnya')
                .map((m) => ({ value: m.id, label: m.name }))
                // Append 'Lainnya' at the end
                .concat(
                  masters
                    .filter(m => m.name === 'Lainnya')
                    .map(m => ({ value: m.id, label: m.name }))
                )}
              allOptionLabel="Pilih kelas"
              widthClassName="!max-w-full"
              variant="modal"
            />
            {masters.find(m => m.id === selectedMasterId)?.name === 'Lainnya' && (
              <div className="mt-4">
                <InputFilter
                  id="customClassName"
                  label="Pilih Kelas Lainnya"
                  value={customClassName}
                  onChange={setCustomClassName}
                  options={lainnyaClassNames.map(name => ({
                    value: name,
                    label: name,
                  }))}
                  allOptionLabel="Pilih Kelas Lainnya"
                  widthClassName="!max-w-full"
                  variant="modal"
                />
                {lainnyaClassNames.length === 0 && (
                  <p className="text-sm text-amber-600 dark:text-amber-400 mt-2 font-medium">
                    Belum ada kelas custom (Lainnya) yang tersedia di wilayah Anda. Buat kelas di menu Kelas terlebih dahulu.
                  </p>
                )}
              </div>
            )}
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Siswa akan dimasukkan ke kelas ini di kelompok masing-masing (dipilih di langkah selanjutnya).
            </p>
          </div>
        ) : (
          <div>
            <InputFilter
          id="classId"
          label="Kelas"
          value={selectedClassId}
          onChange={(value) => setSelectedClassId(value)}
          options={availableClasses.map((cls) => ({
            value: cls.id,
            label: showKelompokInLabel && cls.kelompok?.name
              ? `${cls.kelompok.name} - ${cls.name}`
              : cls.name,
          }))}
          allOptionLabel="Pilih kelas"
          widthClassName="!max-w-full"
          disabled={!kelompokReady}
        />
        {kelompokReady && userProfile?.role === 'teacher' && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Kelas otomatis dipilih sesuai akun Anda
          </p>
        )}
      </div>
      )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pt-4">
        <Button
          onClick={handleNext}
          disabled={(isBulkAssign ? (!selectedMasterId) : (!selectedClassId)) || batchSize < 1 || !kelompokReady}
          className="px-4 py-2"
        >
          Selanjutnya
        </Button>
      </div>
    </div>
  )
}
