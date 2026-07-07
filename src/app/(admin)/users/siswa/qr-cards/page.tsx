'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Button from '@/components/ui/button/Button'
import InputFilter from '@/components/form/input/InputFilter'
import Checkbox from '@/components/form/input/Checkbox'
import Spinner from '@/components/ui/spinner/Spinner'
import Pagination from '@/components/ui/pagination/Pagination'
import type { DataFilters } from '@/components/shared/DataFilter'
import DataFilter from '@/components/shared/DataFilter'
import { useStudents } from '@/hooks/useStudents'
import { useClasses } from '@/hooks/useClasses'
import { useDaerah } from '@/hooks/useDaerah'
import { useDesa } from '@/hooks/useDesa'
import { useKelompok } from '@/hooks/useKelompok'
import { useUserProfile } from '@/stores/userProfileStore'
import { canManageIdCardTemplate } from '@/lib/userUtils'
import { getIdCardTemplatesAction } from './actions/template/actions'
import type { IdCardTemplate } from '@/types/idCardTemplate'
import { toast } from 'sonner'

export default function QrCardsPage() {
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

  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(30)
  
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

  useEffect(() => {
    if (!userProfile) return
    if (!canManageIdCardTemplate(userProfile)) {
      router.push('/home')
    }
  }, [userProfile, router])

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

  // Reset to page 1 whenever the filtered set changes
  useEffect(() => {
    setCurrentPage(1)
  }, [filters, itemsPerPage])

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / itemsPerPage))
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return filteredStudents.slice(start, start + itemsPerPage)
  }, [filteredStudents, currentPage, itemsPerPage])

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
      })
      
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

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8 space-y-6 text-gray-900 dark:text-gray-100">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Cetak Kartu QR</h1>
          <p className="text-sm text-gray-500 mt-1">Pilih siswa dan template untuk di-generate sebagai PDF</p>
        </div>
        {canManageIdCardTemplate(userProfile) && (
          <Button variant="outline" onClick={() => router.push('/users/siswa/qr-cards/template')}>
            Kelola Template
          </Button>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="flex-1 w-full">
            <InputFilter
              id="template-select"
              label="Template Kartu"
              value={selectedTemplateId}
              onChange={setSelectedTemplateId}
              options={templates.map(t => ({ value: t.id, label: t.name }))}
              placeholder="Pilih Template"
              variant="page"
              compact
            />
          </div>
          <div className="flex-none w-full md:w-auto">
            <Button 
              className="w-full"
              onClick={handleGenerate} 
              disabled={isGenerating || !selectedTemplateId || selectedIds.size === 0}
            >
              {isGenerating 
                ? `Memproses ${progress.current}/${progress.total}...` 
                : `Generate PDF (${selectedIds.size} siswa)`}
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b dark:border-gray-700">
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

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-4 py-3 border-b dark:border-gray-700">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Menampilkan {filteredStudents.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
            { }-{ }{Math.min(currentPage * itemsPerPage, filteredStudents.length)} dari {filteredStudents.length} siswa
            {selectedIds.size > 0 && ` · ${selectedIds.size} dipilih`}
          </p>
          <div className="w-full sm:w-40">
            <InputFilter
              id="items-per-page"
              label=""
              value={String(itemsPerPage)}
              onChange={(v) => setItemsPerPage(Number(v))}
              options={[
                { value: '10', label: '10 / halaman' },
                { value: '30', label: '30 / halaman' },
                { value: '50', label: '50 / halaman' },
                { value: '100', label: '100 / halaman' },
              ]}
              compact
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="p-4 w-12">
                  <Checkbox
                    checked={isAllSelected}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="p-4 font-medium">Nama Siswa</th>
                <th className="p-4 font-medium">Kelompok</th>
                <th className="p-4 font-medium">Kelas</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center">
                    <div className="flex justify-center">
                      <Spinner size={28} />
                    </div>
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">Tidak ada data siswa</td>
                </tr>
              ) : (
                paginatedStudents.map(student => (
                  <tr key={student.id} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="p-4">
                      <Checkbox
                        checked={selectedIds.has(student.id)}
                        onChange={(checked) => handleSelectRow(student.id, checked)}
                      />
                    </td>
                    <td className="p-4 font-medium">{student.name}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{student.kelompok_name || '-'}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">
                      {student.classes?.length > 0 ? student.classes.map(c => c.name).join(', ') : (student.class_name || '-')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-4 border-t dark:border-gray-700">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
