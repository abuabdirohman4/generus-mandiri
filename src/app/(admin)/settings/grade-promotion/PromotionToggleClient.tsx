'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { togglePromotionEnabled } from '../../naik-kelas/actions'

export default function PromotionToggleClient({ initialEnabled }: { initialEnabled: boolean }) {
    const [enabled, setEnabled] = useState(initialEnabled)
    const [saving, setSaving] = useState(false)

    const handleToggle = async () => {
        const next = !enabled
        setSaving(true)
        const res = await togglePromotionEnabled(next)
        setSaving(false)
        if (res.success) {
            setEnabled(next)
            toast.success(res.message)
        } else {
            toast.error(res.message)
        }
    }

    return (
        <div className="bg-gray-50 dark:bg-gray-900">
            <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Mode Naik Kelas</h1>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Aktifkan untuk membuka menu <span className="font-medium">Naik Kelas</span>. Nyalakan hanya saat periode kenaikan kelas (Juni/Juli), lalu matikan lagi setelah selesai.
                    </p>

                    <div className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <div>
                            <div className="font-medium text-gray-900 dark:text-white">Aktifkan Mode Naik Kelas</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                Status: {enabled ? <span className="text-green-600 dark:text-green-400">Aktif</span> : <span className="text-gray-500">Nonaktif</span>}
                            </div>
                        </div>
                        <button
                            onClick={handleToggle}
                            disabled={saving}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition disabled:opacity-50 ${enabled ? 'bg-brand-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                            aria-label="Toggle mode naik kelas"
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-3 text-sm text-blue-800 dark:text-blue-200">
                        ℹ️ Sebelum naik kelas: buat & aktifkan tahun ajaran baru di menu <span className="font-medium">Tahun Ajaran</span>.
                    </div>
                </div>
            </div>
        </div>
    )
}
