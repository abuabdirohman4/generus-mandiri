'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import dayjs, { Dayjs } from 'dayjs'
import { updatePromotionEndDate } from '../../naik-kelas/actions'
import DatePickerInput from '@/components/form/input/DatePicker'
import Button from '@/components/ui/button/Button'
import { usePromotionEnabled } from '@/hooks/usePromotionEnabled'

export default function PromotionToggleClient({ initialEndDate }: { initialEndDate: string | null }) {
    const [endDate, setEndDate] = useState<Dayjs | null>(initialEndDate ? dayjs(initialEndDate) : null)
    const [saving, setSaving] = useState(false)
    const { mutate } = usePromotionEnabled()

    const handleSave = async () => {
        if (!endDate) {
            toast.error('Pilih tanggal batas waktu terlebih dahulu')
            return
        }
        
        setSaving(true)
        const dateStr = endDate.format('YYYY-MM-DD')
        const res = await updatePromotionEndDate(dateStr)
        setSaving(false)
        if (res.success) {
            toast.success(res.message)
            mutate()
        } else {
            toast.error(res.message)
        }
    }

    const handleCloseAccess = async () => {
        setSaving(true)
        const res = await updatePromotionEndDate(null)
        setSaving(false)
        if (res.success) {
            setEndDate(null)
            toast.success(res.message)
            mutate()
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

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                        <div className="flex-1 w-full max-w-sm">
                            <DatePickerInput
                                label="Batas Akhir (Deadline)"
                                value={endDate}
                                onChange={setEndDate}
                                placeholder="Pilih tanggal penutupan"
                                disabled={saving}
                                mode="single"
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Button 
                                variant="outline" 
                                onClick={handleCloseAccess}
                                disabled={saving || !endDate}
                                className="flex-1 md:flex-none"
                            >
                                Tutup Akses
                            </Button>
                            <Button 
                                onClick={handleSave}
                                disabled={saving || !endDate}
                                className="flex-1 md:flex-none"
                            >
                                {saving ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 p-3 text-sm text-blue-800 dark:text-blue-200">
                        ℹ️ Sebelum naik kelas: buat & aktifkan tahun ajaran baru di menu <span className="font-medium">Tahun Ajaran</span>.
                    </div>
                </div>
            </div>
        </div>
    )
}
