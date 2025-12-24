// src/app/(admin)/rapot/templates/[templateId]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  getTemplateById,
  updateTemplate,
  createSection,
  deleteSection,
  updateSection,
} from '../actions'
import type { TemplateWithSections, ReportSection } from '../types'
import Button from '@/components/ui/button/Button'
import { PlusIcon, TrashBinIcon, PencilIcon, ArrowUpIcon, ArrowDownIcon } from '@/lib/icons'
import { SectionEditorModal } from './components/SectionEditorModal'

export default function TemplateBuilderPage() {
  const params = useParams()
  const router = useRouter()
  const templateId = params.templateId as string

  const [template, setTemplate] = useState<TemplateWithSections | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false)
  const [selectedSection, setSelectedSection] = useState<ReportSection | null>(null)

  const loadTemplate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await getTemplateById(templateId)
      if (result.success && result.data) {
        setTemplate(result.data)
      } else {
        setError(result.error || 'Failed to load template')
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadTemplate()
  }, [templateId])

  const handleDeleteSection = async (sectionId: string, sectionName: string) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus section "${sectionName}"?`)) {
      return
    }

    const result = await deleteSection(sectionId)
    if (result.success) {
      loadTemplate()
    } else {
      alert('Error: ' + (result.error || 'Failed to delete section'))
    }
  }

  const handleMoveSection = async (section: ReportSection, direction: 'up' | 'down') => {
    if (!template) return

    const sections = [...template.sections]
    const index = sections.findIndex(s => s.id === section.id)

    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === sections.length - 1)
    ) {
      return
    }

    const newIndex = direction === 'up' ? index - 1 : index + 1
    const [removed] = sections.splice(index, 1)
    sections.splice(newIndex, 0, removed)

    // Update display_order for both sections
    await updateSection(sections[index].id, { display_order: index })
    await updateSection(sections[newIndex].id, { display_order: newIndex })

    loadTemplate()
  }

  const handleSectionSaved = () => {
    setIsSectionModalOpen(false)
    setSelectedSection(null)
    loadTemplate()
  }

  const handleToggleActive = async () => {
    if (!template) return

    const newStatus = !template.is_active
    const result = await updateTemplate(templateId, { is_active: newStatus })

    if (result.success) {
      loadTemplate()
    } else {
      alert('Error: ' + (result.error || 'Failed to update template status'))
    }
  }

  if (isLoading) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-8 w-64 animate-pulse rounded bg-gray-200"></div>
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 animate-pulse rounded-lg bg-gray-200"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-500">Error: {error || 'Template not found'}</p>
            <Button onClick={() => router.push('/rapot/templates')} variant="outline" className="mt-4">
              Kembali
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => router.push('/rapot/templates')}
            variant="outline"
            className="mb-4 px-4 py-2"
          >
            ← Kembali
          </Button>

          <div className="flex items-start justify-between">
            <div>
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{template.name}</h1>
                <span className="inline-flex rounded-lg bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                  Semester {template.semester}
                </span>
              </div>
              {template.description && (
                <p className="mt-2 text-gray-600 dark:text-gray-400">{template.description}</p>
              )}

              {/* Classes display */}
              <div className="mt-3">
                {template.class_masters && template.class_masters.length > 0 ? (
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-400">
                      Untuk Kelas:
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {template.class_masters.map(cm => (
                        <span
                          key={cm.id}
                          className="inline-flex rounded-lg bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        >
                          {cm.name}
                          {cm.categories && (
                            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                              ({cm.categories.name})
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    🌐 Template Universal (Tersedia untuk semua kelas)
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${template.is_active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}
              >
                {template.is_active ? 'Aktif' : 'Nonaktif'}
              </span>
              <Button
                onClick={handleToggleActive}
                variant={template.is_active ? 'outline' : 'primary'}
                className="px-3 py-1 text-sm"
              >
                {template.is_active ? 'Nonaktifkan' : 'Aktifkan'}
              </Button>
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Sections ({template.sections.length})
          </h2>
          <Button
            onClick={() => {
              setSelectedSection(null)
              setIsSectionModalOpen(true)
            }}
            className="px-4 py-2"
          >
            <PlusIcon className="mr-2 h-5 w-5" />
            Tambah Section
          </Button>
        </div>

        {template.sections.length === 0 ? (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">
              Belum ada section. Klik "Tambah Section" untuk membuat yang pertama.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {template.sections.map((section, index) => (
              <div
                key={section.id}
                className="rounded-lg bg-white p-6 shadow-sm dark:bg-gray-800"
              >
                {/* Section Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {index + 1}. {section.name}
                      </h3>
                      <span className="rounded bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                        {section.grading_format === 'score'
                          ? 'Nilai (0-100)'
                          : section.grading_format === 'grade'
                            ? 'Grade (A/B/C/D)'
                            : section.grading_format === 'hafal'
                              ? 'Hafal (✓/✗)'
                              : 'Nilai + Grade'}
                      </span>
                    </div>
                    {section.description && (
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                        {section.description}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {/* Move Up */}
                    <button
                      onClick={() => handleMoveSection(section, 'up')}
                      disabled={index === 0}
                      className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      title="Pindah ke atas"
                    >
                      <ArrowUpIcon className="h-4 w-4" />
                    </button>

                    {/* Move Down */}
                    <button
                      onClick={() => handleMoveSection(section, 'down')}
                      disabled={index === template.sections.length - 1}
                      className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                      title="Pindah ke bawah"
                    >
                      <ArrowDownIcon className="h-4 w-4" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => {
                        setSelectedSection(section)
                        setIsSectionModalOpen(true)
                      }}
                      className="rounded-lg border border-gray-300 bg-white p-2 text-indigo-600 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:hover:bg-gray-600"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDeleteSection(section.id, section.name)}
                      className="rounded-lg border border-red-300 bg-white p-2 text-red-600 transition-colors hover:bg-red-50 dark:border-red-600 dark:bg-gray-700 dark:hover:bg-red-900"
                      title="Hapus"
                    >
                      <TrashBinIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Section Items */}
                <div className="border-t pt-4 dark:border-gray-700">
                  <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    Materi ({section.items?.length || 0}):
                  </p>
                  {!section.items || section.items.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Belum ada materi. Klik "Edit" untuk menambah materi.
                    </p>
                  ) : (
                    <ul className="space-y-1">
                      {section.items.map((item, idx) => (
                        <li key={item.id} className="text-sm text-gray-600 dark:text-gray-400">
                          {idx + 1}.{' '}
                          {item.material_category?.name ||
                            item.material_type?.name ||
                            item.material_item?.name}
                          {item.is_required && (
                            <span className="ml-2 text-xs text-red-500">*</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Section Editor Modal */}
        <SectionEditorModal
          isOpen={isSectionModalOpen}
          onClose={() => {
            setIsSectionModalOpen(false)
            setSelectedSection(null)
          }}
          templateId={templateId}
          section={selectedSection}
          onSaved={handleSectionSaved}
        />
      </div>
    </div>
  )
}