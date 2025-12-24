// src/app/(admin)/rapot/templates/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createTemplate, getClassMasters } from '../actions'
import type { TemplateFormData } from '../types'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'

type ClassMaster = {
  id: string
  name: string
  category_id?: string | null
  categories?: { id: string; code: string; name: string } | null
}

export default function CreateTemplatePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [allClassMasters, setAllClassMasters] = useState<ClassMaster[]>([])
  const [selectAllClasses, setSelectAllClasses] = useState(true) // Default: universal
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    semester: 1,
    class_master_ids: [],
    is_active: true,
  })

  useEffect(() => {
    const loadClassMasters = async () => {
      const result = await getClassMasters()
      if (result.success && result.data) {
        setAllClassMasters(result.data)
      }
    }
    loadClassMasters()
  }, [])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate: if not "all classes", must select at least one
    if (!selectAllClasses && formData.class_master_ids.length === 0) {
      alert('Pilih minimal satu kelas atau centang "Semua Kelas (Universal)"')
      return
    }

    setIsSubmitting(true)

    try {
      const result = await createTemplate({
        name: formData.name,
        description: formData.description || undefined,
        semester: formData.semester,
        class_master_ids: selectAllClasses ? [] : formData.class_master_ids,
        is_active: formData.is_active,
      })

      if (result.success && result.data) {
        router.push(`/rapot/templates/${result.data.id}`)
      } else {
        alert('Error: ' + (result.error || 'Failed to create template'))
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            onClick={() => router.push('/rapot/templates')}
            variant="outline"
            className="px-4 py-2"
          >
            ← Kembali
          </Button>
        </div>

        {/* Form */}
        <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800">
          <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
            Buat Template Rapot Baru
          </h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nama Template <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Rapot Pra Nikah Semester 1"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Deskripsi
              </label>
              <textarea
                value={formData.description}
                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                placeholder="Deskripsi template (opsional)"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Semester */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Semester <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.semester}
                onChange={e =>
                  setFormData(prev => ({ ...prev, semester: parseInt(e.target.value) as 1 | 2 }))
                }
                required
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Template ini akan digunakan untuk rapot semester yang dipilih
              </p>
            </div>

            {/* Class Selection */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Untuk Kelas
              </label>

              {/* Checkbox: All Classes */}
              <div className="mb-3 flex items-center">
                <input
                  type="checkbox"
                  id="select_all_classes"
                  checked={selectAllClasses}
                  onChange={e => {
                    setSelectAllClasses(e.target.checked)
                    if (e.target.checked) {
                      setFormData(prev => ({ ...prev, class_master_ids: [] }))
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label
                  htmlFor="select_all_classes"
                  className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  🌐 Semua Kelas (Universal)
                </label>
              </div>

              {/* Multi-Select Checkboxes */}
              {!selectAllClasses && (
                <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-gray-300 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700">
                  {allClassMasters.length === 0 ? (
                    <p className="text-sm text-gray-500">Loading kelas...</p>
                  ) : (
                    allClassMasters.map(cm => (
                      <div key={cm.id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`class_${cm.id}`}
                          checked={formData.class_master_ids.includes(cm.id)}
                          onChange={e => {
                            const checked = e.target.checked
                            setFormData(prev => ({
                              ...prev,
                              class_master_ids: checked
                                ? [...prev.class_master_ids, cm.id]
                                : prev.class_master_ids.filter(id => id !== cm.id),
                            }))
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label
                          htmlFor={`class_${cm.id}`}
                          className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                        >
                          {cm.name}
                          {cm.categories && (
                            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                              ({cm.categories.name})
                            </span>
                          )}
                        </label>
                      </div>
                    ))
                  )}
                </div>
              )}

              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {selectAllClasses
                  ? 'Template ini akan tersedia untuk semua kelas'
                  : formData.class_master_ids.length > 0
                    ? `Template untuk ${formData.class_master_ids.length} kelas terpilih`
                    : 'Pilih minimal satu kelas'}
              </p>
            </div>

            {/* Is Active */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="is_active"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Template aktif
              </label>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t pt-6">
              <Button
                type="button"
                onClick={() => router.push('/rapot/templates')}
                variant="outline"
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" variant="primary" disabled={isSubmitting} loading={isSubmitting}>
                {isSubmitting ? 'Membuat...' : 'Buat Template'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}