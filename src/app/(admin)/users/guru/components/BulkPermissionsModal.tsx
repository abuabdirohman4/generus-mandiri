'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Modal } from '@/components/ui/modal'
import Button from '@/components/ui/button/Button'
import { bulkUpdateTeacherPermissions } from '../actions/settings/actions'
import type { TriState, BulkPermissionSelections } from '../actions/settings/logic'

interface BulkPermissionsModalProps {
    isOpen: boolean
    onClose: () => void
    teacherIds: string[]
    onSuccess: () => void
}

interface FlagConfig {
    key: keyof BulkPermissionSelections
    label: string
    description: string
}

interface SectionConfig {
    title: string
    flags: FlagConfig[]
}

const SECTIONS: SectionConfig[] = [
    {
        title: 'Hak Akses Manajemen Siswa',
        flags: [
            { key: 'can_archive_students', label: 'Arsip Siswa', description: 'Lulus/Tidak Aktif' },
            { key: 'can_transfer_students', label: 'Transfer Siswa', description: 'Pindah Organisasi/Kelas' },
            { key: 'can_soft_delete_students', label: 'Hapus Siswa', description: 'Soft Delete — dapat dikembalikan' },
            { key: 'can_hard_delete_students', label: 'Hapus Permanen', description: 'Hard Delete — tidak dapat dikembalikan' },
            { key: 'can_bulk_assign_cross_kelompok', label: 'Bulk Assign Lintas Kelompok', description: 'Masukkan siswa ke kelas lintas kelompok' },
        ],
    },
    {
        title: 'Hak Akses Fitur',
        flags: [
            { key: 'can_manage_materials', label: 'Kelola Materi', description: 'Tambah/edit/hapus materi & set target' },
            { key: 'can_access_materials', label: 'Akses Materi', description: 'Bisa membuka halaman materi' },
            { key: 'can_access_monitoring', label: 'Akses Monitoring', description: 'Isi penilaian & lihat laporan materi' },
        ],
    },
    {
        title: 'Laporan',
        flags: [
            { key: 'can_multi_kelompok_laporan', label: 'Multi-Kelompok di Overview Laporan', description: 'Pilih lebih dari 1 kelompok di tab Overview' },
        ],
    },
    {
        title: 'Form Pertemuan',
        flags: [
            { key: 'can_manage_check_time', label: 'Aktifkan Cek Waktu Masuk', description: 'Bisa mengaktifkan toggle cek waktu masuk' },
        ],
    },
]

const TRISTATE_OPTIONS: { value: TriState; label: string }[] = [
    { value: 'none', label: 'Biarkan' },
    { value: 'grant', label: 'Aktifkan' },
    { value: 'revoke', label: 'Nonaktifkan' },
]

export default function BulkPermissionsModal({ isOpen, onClose, teacherIds, onSuccess }: BulkPermissionsModalProps) {
    const [selections, setSelections] = useState<BulkPermissionSelections>({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSelect = (key: keyof BulkPermissionSelections, value: TriState) => {
        setSelections(prev => ({ ...prev, [key]: value }))
    }

    const hasChanges = Object.values(selections).some(v => v && v !== 'none')

    const handleSubmit = async () => {
        if (!hasChanges) return
        setIsSubmitting(true)
        try {
            const result = await bulkUpdateTeacherPermissions(teacherIds, selections)
            if (result.success) {
                toast.success(result.message)
                if (result.data?.failed.length) {
                    toast.warning(`${result.data.failed.length} guru gagal diperbarui`)
                }
                onSuccess()
                handleClose()
            } else {
                toast.error(result.message)
            }
        } catch {
            toast.error('Gagal memperbarui hak akses')
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setSelections({})
        onClose()
    }

    return (
        <Modal isOpen={isOpen} onClose={handleClose} className="max-w-lg w-full m-4">
            <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    Atur Hak Akses
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                    {teacherIds.length} guru dipilih · Pilih tindakan per hak akses
                </p>

                <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
                    {SECTIONS.map((section, si) => (
                        <div key={section.title} className={si > 0 ? 'border-t border-gray-200 dark:border-gray-700 pt-4' : ''}>
                            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
                                {section.title}
                            </h3>
                            <div className="space-y-3">
                                {section.flags.map(flag => {
                                    const current = selections[flag.key] ?? 'none'
                                    return (
                                        <div key={flag.key}>
                                            <div className="flex items-baseline justify-between mb-1">
                                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{flag.label}</span>
                                                <span className="text-xs text-gray-400 ml-2 shrink-0">{flag.description}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {TRISTATE_OPTIONS.map(opt => {
                                                    const isSelected = current === opt.value
                                                    const colorClass = isSelected
                                                        ? opt.value === 'grant'
                                                            ? 'bg-green-100 border-green-400 text-green-700 dark:bg-green-900/40 dark:border-green-500 dark:text-green-300'
                                                            : opt.value === 'revoke'
                                                                ? 'bg-red-100 border-red-400 text-red-700 dark:bg-red-900/40 dark:border-red-500 dark:text-red-300'
                                                                : 'bg-gray-100 border-gray-400 text-gray-700 dark:bg-gray-700 dark:border-gray-500 dark:text-gray-300'
                                                        : 'border-gray-200 text-gray-500 dark:border-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                                    return (
                                                        <button
                                                            key={opt.value}
                                                            type="button"
                                                            onClick={() => handleSelect(flag.key, opt.value)}
                                                            className={`flex-1 py-1.5 text-xs font-medium rounded-lg border transition-colors ${colorClass}`}
                                                        >
                                                            {opt.label}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="flex-1">
                        Batal
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!hasChanges || isSubmitting}
                        loading={isSubmitting}
                        className="flex-1"
                    >
                        Simpan
                    </Button>
                </div>
            </div>
        </Modal>
    )
}
