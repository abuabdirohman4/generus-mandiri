'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/button/Button'
import InputFilter from '@/components/form/input/InputFilter'
import Checkbox from '@/components/form/input/Checkbox'
import type { DataFilters } from '@/components/shared/DataFilter'
import DataFilter from '@/components/shared/DataFilter'
import DataTable from '@/components/table/Table'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
import { canManageIdCardTemplate } from '@/lib/userUtils'
import { detectRole } from '@/components/shared/dataFilterHelpers'
import { getIdCardTemplatesAction } from '../qr-cards/actions/template/actions'
import { getCustomFieldValuesAction, upsertCustomFieldValueAction } from '../qr-cards/actions/customField/actions'
import type { IdCardTemplate } from '@/types/idCardTemplate'
import { toast } from 'sonner'

export function QrCardsTab() {
  const router = useRouter()
  const { students, isLoading } = useStudents()
  const { classes } = useClasses()
  const { daerah } = useDaerah()
  const { desa } = useDesa()
  const { kelompok } = useKelompok()
  const { profile: userProfile } = useUserProfile()

  const [templates, setTemplates] = useState<(IdCardTemplate & { signedUrl?: string })[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [navigating, setNavigating] = useState(false)
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({})
  const debounceTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  
  const [filters, setFilters] = useState<DataFilters>({
    daerah: [],
    desa: [],
    kelompok: [],
    kelas: [],
    status: 'active',
    gender: 'all',
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const activeTemplate = templates.find(t => t.id === selectedTemplateId)
  const showCustomFieldColumn = activeTemplate?.show_custom_field ?? false
  const customFieldColumnLabel = activeTemplate?.custom_field_label || 'Keterangan'

  const role = useMemo(() => detectRole(userProfile ?? null), [userProfile])
  const gridColsClass = useMemo(() => {
    if (!role) return 'md:grid-cols-4'
    const visibleFilters = [
      role.isSuperAdmin || role.isAdminDaerah,
      role.isSuperAdmin || role.isAdminDaerah || role.isAdminDesa || role.isTeacherDaerah,
      role.isSuperAdmin || role.isAdminDaerah || role.isAdminDesa || role.isAdminKelompok || role.isTeacherDaerah || role.isTeacherDesa,
      true, // kelas
      true, // gender
      true, // status
    ].filter(Boolean).length

    if (visibleFilters === 5) return 'md:grid-cols-5'
    if (visibleFilters === 6) return 'md:grid-cols-6'
    return 'md:grid-cols-4'
  }, [role])

  useEffect(() => {
    setCustomFieldValues({})
    if (!selectedTemplateId || !activeTemplate?.show_custom_field) return
    getCustomFieldValuesAction(selectedTemplateId).then(res => {
      if (res.success && res.data) {
        setCustomFieldValues(res.data)
      }
    })
  }, [selectedTemplateId, activeTemplate?.show_custom_field])

  useEffect(() => {
    const timers = debounceTimers.current
    return () => { Object.values(timers).forEach(clearTimeout) }
  }, [])

  useEffect(() => {
    getIdCardTemplatesAction().then(res => {
      if (res.success && res.data) {
        setTemplates(res.data)
      }
    })
  }, [])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filters.status && filters.status !== 'all' && s.status !== filters.status) return false
      if (filters.gender && filters.gender !== 'all' && s.gender !== filters.gender) return false
      if (filters.daerah && filters.daerah.length > 0 && !filters.daerah.includes(s.daerah_id!)) return false
      if (filters.desa && filters.desa.length > 0 && !filters.desa.includes(s.desa_id!)) return false
      if (filters.kelompok && filters.kelompok.length > 0 && !filters.kelompok.includes(s.kelompok_id!)) return false
      if (filters.kelas && filters.kelas.length > 0) {
        const hasClass = s.classes?.some(c => filters.kelas.includes(c.id)) || filters.kelas.includes(s.class_id!)
        if (!hasClass) return false
      }
      return true
    })
  }, [students, filters])

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredStudents.map(s => s.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectRow = (id: string, checked: boolean) => {
    const next = new Set(selectedIds)
    if (checked) {
      next.add(id)
    } else {
      next.delete(id)
    }
    setSelectedIds(next)
  }

  const handleGenerate = async () => {
    if (!selectedTemplateId) return toast.error('Pilih template terlebih dahulu')
    if (selectedIds.size === 0) return toast.error('Pilih minimal 1 siswa')

    const template = templates.find(t => t.id === selectedTemplateId)
    if (!template) return toast.error('Template tidak valid')
    if (!template.signedUrl) return toast.error('Image template URL tidak valid')

    const selectedStudentsData = students.filter(s => selectedIds.has(s.id))

    setIsGenerating(true)
    setProgress({ current: 0, total: selectedStudentsData.length })

    try {
      // Dynamic import to avoid SSR issues with PDF and canvas
      const { generateIdCardsPdfBlob } = await import('@/lib/idCard/idCardPdfUtils')
      const blob = await generateIdCardsPdfBlob(selectedStudentsData, template, (current, total) => {
        setProgress({ current, total })
      }, customFieldValues)
      
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kartu_id_${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success('Kartu ID berhasil di-generate')
    } catch (err: any) {
      console.error(err)
      toast.error('Gagal generate PDF: ' + err.message)
    } finally {
      setIsGenerating(false)
      setProgress({ current: 0, total: 0 })
    }
  }

  const isAllSelected = filteredStudents.length > 0 && selectedIds.size === filteredStudents.length

  const handleManageTemplate = () => {
    setNavigating(true)
    router.push('/users/siswa/qr-cards/template')
  }

  const columns = [
    {
      key: 'select',
      label: <Checkbox checked={isAllSelected} onChange={handleSelectAll} />,
      width: '48px',
      sortable: false,
    },
    { key: 'name', label: 'Nama Siswa', sortable: true },
    { key: 'gender', label: 'Jenis Kelamin', align: 'center' as const, sortable: true, hideable: true },
    { key: 'class_name', label: 'Kelas', sortable: false, hideable: true },
    { key: 'kelompok_name', label: 'Kelompok', sortable: true, hideable: true },
    ...(role?.isSuperAdmin || role?.isAdminDaerah || role?.isTeacherDaerah ? [{ key: 'desa_name', label: 'Desa', sortable: true, hideable: true }] : []),
    ...(showCustomFieldColumn ? [{ key: 'custom_field', label: customFieldColumnLabel, sortable: false }] : []),
  ]

  const renderCell = (column: any, item: any) => {
    if (column.key === 'select') {
      return (
        <Checkbox
          checked={selectedIds.has(item.id)}
          onChange={(checked) => handleSelectRow(item.id, checked)}
        />
      )
    }
    if (column.key === 'name') {
      return <span className="font-medium">{item.name}</span>
    }
    if (column.key === 'gender') {
      return <span className="text-gray-600 dark:text-gray-400 text-center block">
        {item.gender === 'L' ? 'Laki-laki' : item.gender === 'P' ? 'Perempuan' : (item.gender || '-')}
      </span>
    }
    if (column.key === 'class_name') {
      return <span className="text-gray-600 dark:text-gray-400">
        {item.classes?.length > 0 ? item.classes.map((c: any) => c.name).join(', ') : (item.class_name || '-')}
      </span>
    }
    if (column.key === 'kelompok_name') {
      return <span className="text-gray-600 dark:text-gray-400">{item.kelompok_name || '-'}</span>
    }
    if (column.key === 'desa_name') {
      return <span className="text-gray-600 dark:text-gray-400">{item.desa_name || '-'}</span>
    }
    if (column.key === 'custom_field') {
      return (
        <input
          type="text"
          value={customFieldValues[item.id] || ''}
          onChange={e => {
            const val = e.target.value
            setCustomFieldValues(prev => ({ ...prev, [item.id]: val }))
            clearTimeout(debounceTimers.current[item.id])
            debounceTimers.current[item.id] = setTimeout(() => {
              upsertCustomFieldValueAction(item.id, selectedTemplateId, val)
            }, 800)
          }}
          className="border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm w-full dark:bg-gray-800"
          placeholder={customFieldColumnLabel}
        />
      )
    }
    return item[column.key]
  }

  return (
    <div className="space-y-6 pb-28 md:pb-0">
      <div className="w-full mb-4">
        <div className={`flex flex-col gap-y-4 md:grid md:gap-x-4 md:gap-y-4 ${gridColsClass} w-full md:items-end`}>
          <div className="flex w-full gap-4 md:contents">
            <div className="flex-1 md:col-span-1">
              <InputFilter
                id="template-select"
                label="Template Kartu"
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
                options={templates.map(t => ({ value: t.id, label: t.name }))}
                placeholder="Pilih Template"
                variant="page"
                className="mb-0!"
              />
            </div>
            <div className="flex-none flex items-end md:col-span-1">
              {canManageIdCardTemplate(userProfile) && (
                <Button className="w-full md:w-auto" variant="outline" onClick={handleManageTemplate} loading={navigating}>
                  <span className="hidden md:inline">Kelola Template</span>
                  <span className="md:hidden">Template</span>
                </Button>
              )}
            </div>
          </div>
          <div className={`w-full md:w-auto ${gridColsClass === 'md:grid-cols-4' ? 'md:col-span-2' : gridColsClass === 'md:grid-cols-5' ? 'md:col-span-3' : 'md:col-span-4'} flex md:justify-end`}>
            <Button 
              className="w-full md:w-auto"
              onClick={handleGenerate} 
              disabled={isGenerating || !selectedTemplateId || selectedIds.size === 0}
            >
              {isGenerating 
                ? `Memproses ${progress.current}/${progress.total}...` 
                : `Generate Kartu (${selectedIds.size} siswa)`}
            </Button>
          </div>
        </div>
      </div>

      <div className="">
        <div className="">
          <DataFilter 
            filters={filters}
            onFilterChange={setFilters}
            userProfile={userProfile}
            daerahList={daerah || []}
            desaList={desa || []}
            kelompokList={kelompok || []}
            classList={classes || []}
            showKelas={true}
            showGender={true}
            showStatus={true}
          />
        </div>

        <DataTable
          columns={columns}
          data={filteredStudents}
          renderCell={renderCell}
          searchable={true}
          searchPlaceholder="Cari siswa..."
          pagination={true}
          defaultItemsPerPage={30}
          itemsPerPageOptions={[10, 30, 50, 100]}
          getRowId={(item) => item.id}
          emptyMessage={isLoading ? 'Memuat data siswa...' : 'Tidak ada data siswa'}
        />
      </div>
    </div>
  )
}
