// src/app/(admin)/rapot/templates/[templateId]/components/SectionEditorModal.tsx
'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import Input from '@/components/form/input/InputField'
import {
  createSection,
  updateSection,
  createSectionItem,
  deleteSectionItem,
  getMaterialCategories,
  getMaterialTypes,
  getMaterialItems,
} from '../../actions'
import type {
  ReportSection,
  MaterialCategory,
  MaterialType,
  MaterialItem,
  GradingFormat,
  ReportSectionItem,
} from '../../types'
import { TrashBinIcon, PlusIcon } from '@/lib/icons'

interface SectionEditorModalProps {
  isOpen: boolean
  onClose: () => void
  templateId: string
  section: ReportSection | null // null = create, otherwise = edit
  onSaved: () => void
}

export function SectionEditorModal({
  isOpen,
  onClose,
  templateId,
  section,
  onSaved,
}: SectionEditorModalProps) {
  const isEdit = !!section
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    grading_format: 'score' as GradingFormat,
    is_active: true,
  })

  // Material selection state
  const [materialLevel, setMaterialLevel] = useState<'category' | 'type' | 'item'>('item')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('')
  const [selectedTypeId, setSelectedTypeId] = useState<string>('')
  const [categories, setCategories] = useState<MaterialCategory[]>([])
  const [types, setTypes] = useState<MaterialType[]>([])
  const [items, setItems] = useState<MaterialItem[]>([])
  const [selectedItems, setSelectedItems] = useState<
    Array<{
      level: 'category' | 'type' | 'item'
      category_id?: string
      type_id?: string
      item_id?: string
      name: string
      is_required: boolean
      grading_mode: 'expand' | 'single'
    }>
  >([])

  // Load materials
  useEffect(() => {
    const loadMaterials = async () => {
      const [catResult, typeResult, itemResult] = await Promise.all([
        getMaterialCategories(),
        getMaterialTypes(),
        getMaterialItems(),
      ])

      if (catResult.success && catResult.data) setCategories(catResult.data)
      if (typeResult.success && typeResult.data) setTypes(typeResult.data)
      if (itemResult.success && itemResult.data) setItems(itemResult.data)
    }

    if (isOpen) {
      loadMaterials()
    }
  }, [isOpen])

  // Initialize form when section changes
  useEffect(() => {
    if (section) {
      setFormData({
        name: section.name,
        description: section.description || '',
        grading_format: section.grading_format,
        is_active: section.is_active,
      })

      // Convert section items to selected items
      const selected =
        section.items?.map(item => {
          if (item.material_category_id) {
            return {
              level: 'category' as const,
              category_id: item.material_category_id,
              name: item.material_category?.name || '',
              is_required: item.is_required,
              grading_mode: item.grading_mode || 'expand',
            }
          } else if (item.material_type_id) {
            return {
              level: 'type' as const,
              type_id: item.material_type_id,
              name: item.material_type?.name || '',
              is_required: item.is_required,
              grading_mode: item.grading_mode || 'expand',
            }
          } else if (item.material_item_id) {
            return {
              level: 'item' as const,
              item_id: item.material_item_id,
              name: item.material_item?.name || '',
              is_required: item.is_required,
              grading_mode: item.grading_mode || 'expand', // Not used for item level but safe to carry
            }
          }
          return null
        }).filter(Boolean) || []

      setSelectedItems(selected as any)
    } else {
      setFormData({
        name: '',
        description: '',
        grading_format: 'score',
        is_active: true,
      })
      setSelectedItems([])
    }
  }, [section])

  const handleAddMaterial = (
    level: 'category' | 'type' | 'item',
    id: string,
    name: string
  ) => {
    const newItem = {
      level,
      ...(level === 'category' && { category_id: id }),
      ...(level === 'type' && { type_id: id }),
      ...(level === 'item' && { item_id: id }),
      name,
      is_required: false,
      grading_mode: 'expand' as const,
    }

    setSelectedItems(prev => [...prev, newItem])
  }

  const handleRemoveMaterial = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index))
  }

  const handleToggleRequired = (index: number) => {
    setSelectedItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, is_required: !item.is_required } : item))
    )
  }

  const handleUpdateMode = (index: number, mode: 'expand' | 'single') => {
    setSelectedItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, grading_mode: mode } : item))
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      let sectionId: string

      if (isEdit && section) {
        // Update section
        const result = await updateSection(section.id, {
          name: formData.name,
          description: formData.description || undefined,
          grading_format: formData.grading_format,
          is_active: formData.is_active,
        })

        if (!result.success) {
          throw new Error(result.error || 'Failed to update section')
        }

        sectionId = section.id

        // Delete old items
        if (section.items) {
          await Promise.all(section.items.map(item => deleteSectionItem(item.id)))
        }
      } else {
        // Create section
        const result = await createSection({
          template_id: templateId,
          name: formData.name,
          description: formData.description || undefined,
          grading_format: formData.grading_format,
          display_order: 0, // Will be updated by backend
          is_active: formData.is_active,
        })

        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to create section')
        }

        sectionId = result.data.id
      }

      // Create new items
      await Promise.all(
        selectedItems.map((item, index) =>
          createSectionItem({
            section_id: sectionId,
            material_level: item.level, // CRITICAL: Include material_level field
            material_category_id: item.category_id,
            material_type_id: item.type_id,
            material_item_id: item.item_id,
            display_order: index,
            is_required: item.is_required,
            grading_mode: item.grading_mode,
          })
        )
      )

      onSaved()
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-4xl">
      <form onSubmit={handleSubmit} className="flex h-full flex-col -mx-6 -my-4">
        {/* Header */}
        <div className="shrink-0 border-b px-6 py-4 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {isEdit ? 'Edit Section' : 'Tambah Section Baru'}
          </h2>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Nama Section <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Contoh: Nilai Akademik, Akhlak Luhur, dll"
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
                rows={2}
                placeholder="Deskripsi section (opsional)"
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Grading Format */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Format Penilaian <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.grading_format}
                onChange={e =>
                  setFormData(prev => ({ ...prev, grading_format: e.target.value as GradingFormat }))
                }
                className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                required
              >
                <option value="score">Nilai (0-100)</option>
                <option value="grade">Grade (A/B/C/D)</option>
                <option value="hafal">Hafal (✓/✗)</option>
                <option value="both">Nilai + Grade</option>
              </select>
            </div>

            {/* Is Active */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="section_is_active"
                checked={formData.is_active}
                onChange={e => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label
                htmlFor="section_is_active"
                className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
              >
                Section aktif
              </label>
            </div>

            {/* Material Selection */}
            <div className="border-t pt-6 dark:border-gray-700">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Materi Penilaian
              </h3>

              {/* Material Level Selector */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Level Penilaian <span className="text-red-500">*</span>
                </label>
                <select
                  value={materialLevel}
                  onChange={e => {
                    setMaterialLevel(e.target.value as 'category' | 'type' | 'item')
                    setSelectedCategoryId('')
                    setSelectedTypeId('')
                  }}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  required
                >
                  <option value="category">Kategori - Nilai gabungan semua materi dalam kategori</option>
                  <option value="type">Tipe - Nilai gabungan materi dalam satu tipe</option>
                  <option value="item">Item - Nilai per materi detail (paling spesifik)</option>
                </select>

                {/* Help Text */}
                <div className="mt-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {materialLevel === 'category' && (
                    <p>
                      <strong>Kategori:</strong> Siswa akan dinilai untuk semua materi dalam kategori ini sebagai satu nilai gabungan.
                      Materi yang muncul akan otomatis disesuaikan dengan kelas dan semester siswa saat membuat rapot.
                      <br />
                      <em>Contoh: "Hafalan" mencakup semua hafalan (doa, surat, hadis) dengan 1 nilai.</em>
                    </p>
                  )}
                  {materialLevel === 'type' && (
                    <p>
                      <strong>Tipe:</strong> Siswa akan dinilai untuk semua item dalam tipe ini sebagai satu nilai gabungan.
                      Materi yang muncul akan otomatis disesuaikan dengan kelas dan semester siswa saat membuat rapot.
                      <br />
                      <em>Contoh: "Hafalan Doa" mencakup semua doa dengan 1 nilai.</em>
                    </p>
                  )}
                  {materialLevel === 'item' && (
                    <p>
                      <strong>Item:</strong> Siswa akan dinilai per item materi secara spesifik.
                      Item akan muncul jika tersedia untuk kelas dan semester siswa saat membuat rapot.
                      <br />
                      <em>Contoh: "Doa Sebelum Makan" dinilai terpisah dari "Doa Sesudah Makan".</em>
                    </p>
                  )}
                </div>
              </div>

              {/* Selected Items */}
              {selectedItems.length > 0 && (
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Materi yang Dipilih
                  </label>
                  <div className="space-y-2">
                    {selectedItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between rounded-lg border bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-700"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {index + 1}.
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {item.level === 'category' && '📁 '}
                            {item.level === 'type' && '📂 '}
                            {item.level === 'item' && '📄 '}
                            {item.name}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            ({item.level === 'category' ? 'Kategori' : item.level === 'type' ? 'Tipe' : 'Item'})
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          {/* Grading Mode Selector (Only for Category/Type) */}
                          {item.level !== 'item' && (
                            <select
                              value={item.grading_mode}
                              onChange={(e) => handleUpdateMode(index, e.target.value as 'expand' | 'single')}
                              className="text-xs border rounded p-1 bg-white dark:bg-gray-800 dark:text-white border-gray-300 dark:border-gray-600"
                              title="Metode Penilaian"
                            >
                              <option value="expand">Expand (Semua Item)</option>
                              <option value="single">Single (Satu Nilai)</option>
                            </select>
                          )}

                          <label className="flex items-center text-sm">
                            <input
                              type="checkbox"
                              checked={item.is_required}
                              onChange={() => handleToggleRequired(index)}
                              className="mr-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            Wajib
                          </label>
                          <button
                            type="button"
                            onClick={() => handleRemoveMaterial(index)}
                            className="rounded p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                          >
                            <TrashBinIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Conditional Material Selection */}
              {materialLevel === 'category' && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pilih Kategori
                  </label>
                  <select
                    onChange={e => {
                      const cat = categories.find(c => c.id === e.target.value)
                      if (cat) handleAddMaterial('category', cat.id, cat.name)
                      e.target.value = ''
                    }}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">+ Tambah kategori</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {materialLevel === 'type' && (
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Filter Kategori
                    </label>
                    <select
                      value={selectedCategoryId}
                      onChange={e => setSelectedCategoryId(e.target.value)}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Semua Kategori</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pilih Tipe
                    </label>
                    <select
                      onChange={e => {
                        const type = types.find(t => t.id === e.target.value)
                        if (type) handleAddMaterial('type', type.id, type.name)
                        e.target.value = ''
                      }}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">+ Tambah tipe</option>
                      {types
                        .filter(t => !selectedCategoryId || t.category_id === selectedCategoryId)
                        .map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                            {type.category && ` (${type.category.name})`}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              {materialLevel === 'item' && (
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Filter Kategori
                    </label>
                    <select
                      value={selectedCategoryId}
                      onChange={e => {
                        setSelectedCategoryId(e.target.value)
                        setSelectedTypeId('')
                      }}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="">Semua Kategori</option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Filter Tipe
                    </label>
                    <select
                      value={selectedTypeId}
                      onChange={e => setSelectedTypeId(e.target.value)}
                      disabled={!selectedCategoryId}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                    >
                      <option value="">Semua Tipe</option>
                      {types
                        .filter(t => !selectedCategoryId || t.category_id === selectedCategoryId)
                        .map(type => (
                          <option key={type.id} value={type.id}>
                            {type.name}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pilih Item
                    </label>
                    <select
                      onChange={e => {
                        const item = items.find(i => i.id === e.target.value)
                        if (item) handleAddMaterial('item', item.id, item.name)
                        e.target.value = ''
                      }}
                      disabled={!selectedTypeId}
                      className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:disabled:bg-gray-800"
                    >
                      <option value="">+ Tambah item</option>
                      {items
                        .filter(i => !selectedTypeId || i.material_type_id === selectedTypeId)
                        .map(item => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t px-6 py-4 dark:border-gray-700">
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText={isEdit ? 'Menyimpan...' : 'Membuat...'}
            >
              {isEdit ? 'Simpan' : 'Buat Section'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}