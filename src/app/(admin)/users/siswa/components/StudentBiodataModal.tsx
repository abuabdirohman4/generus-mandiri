// src/app/(admin)/users/siswa/components/StudentBiodataModal.tsx
'use client'

import { useState } from 'react'
import { StudentBiodata, StudentBiodataFormData, BiodataFormTab } from '../types'
import { updateStudentBiodata } from '../actions'
import { Modal } from '@/components/ui/modal'
import dayjs from 'dayjs'
import 'dayjs/locale/id'
import Button from '@/components/ui/button/Button'
import DatePickerInput from '@/components/form/input/DatePicker'
import Input from '@/components/form/input/InputField'

interface StudentBiodataModalProps {
  student: StudentBiodata
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function StudentBiodataModal({
  student,
  isOpen,
  onClose,
  onSuccess,
}: StudentBiodataModalProps) {
  const [activeTab, setActiveTab] = useState<BiodataFormTab>('identity')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState<StudentBiodataFormData>({
    name: student.name || '',
    nomor_induk: student.nomor_induk || '',
    gender: student.gender || '',
    tempat_lahir: student.tempat_lahir || '',
    tanggal_lahir: student.tanggal_lahir
      ? dayjs(student.tanggal_lahir).format('YYYY-MM-DD')
      : '',
    anak_ke: student.anak_ke?.toString() || '',
    alamat: student.alamat || '',
    nomor_telepon: student.nomor_telepon || '',
    nama_ayah: student.nama_ayah || '',
    nama_ibu: student.nama_ibu || '',
    alamat_orangtua: student.alamat_orangtua || '',
    telepon_orangtua: student.telepon_orangtua || '',
    pekerjaan_ayah: student.pekerjaan_ayah || '',
    pekerjaan_ibu: student.pekerjaan_ibu || '',
    nama_wali: student.nama_wali || '',
    alamat_wali: student.alamat_wali || '',
    pekerjaan_wali: student.pekerjaan_wali || '',
  })

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const updateData: any = {
        name: formData.name,
        nomor_induk: formData.nomor_induk || null,
        gender: formData.gender || null,
        tempat_lahir: formData.tempat_lahir || null,
        tanggal_lahir: formData.tanggal_lahir || null,
        anak_ke: formData.anak_ke ? parseInt(formData.anak_ke, 10) : null,
        alamat: formData.alamat || null,
        nomor_telepon: formData.nomor_telepon || null,
        nama_ayah: formData.nama_ayah || null,
        nama_ibu: formData.nama_ibu || null,
        alamat_orangtua: formData.alamat_orangtua || null,
        telepon_orangtua: formData.telepon_orangtua || null,
        pekerjaan_ayah: formData.pekerjaan_ayah || null,
        pekerjaan_ibu: formData.pekerjaan_ibu || null,
        nama_wali: formData.nama_wali || null,
        alamat_wali: formData.alamat_wali || null,
        pekerjaan_wali: formData.pekerjaan_wali || null,
      }

      const result = await updateStudentBiodata(student.id, updateData)

      if (result.success) {
        onSuccess()
        onClose()
      } else {
        alert('Error: ' + (result.error || 'Failed to update biodata'))
      }
    } catch (error: any) {
      alert('Error: ' + error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const tabs: Array<{ id: BiodataFormTab; label: string }> = [
    { id: 'identity', label: 'Identitas' },
    { id: 'contact', label: 'Kontak' },
    { id: 'parent', label: 'Orang Tua' },
    { id: 'guardian', label: 'Wali' },
  ]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="flex flex-col h-full -mx-6 -my-4">
        {/* Custom Header with Title and Tabs */}
        <div className="shrink-0 border-b dark:border-gray-700">
          <div className="px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Edit Biodata
            </h2>
          </div>

          {/* Tabs */}
          <div className="px-6">
            <div className="flex gap-4 overflow-x-auto border-b border-gray-200 dark:border-gray-700">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === tab.id
                    ? 'border-blue-600 text-blue-600 dark:border-blue-500 dark:text-blue-500'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {/* Identity Tab */}
          {activeTab === 'identity' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nama Lengkap <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nomor Induk
                </label>
                <input
                  type="text"
                  name="nomor_induk"
                  value={formData.nomor_induk}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Jenis Kelamin
                </label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Pilih...</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tempat Lahir
                  </label>
                  <Input
                    type="text"
                    name="tempat_lahir"
                    value={formData.tempat_lahir}
                    onChange={handleInputChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tanggal Lahir
                  </label>
                  <DatePickerInput
                    value={formData.tanggal_lahir ? dayjs(formData.tanggal_lahir) : null}
                    onChange={(date) => {
                      setFormData(prev => ({
                        ...prev,
                        tanggal_lahir: date ? date.format('YYYY-MM-DD') : ''
                      }))
                    }}
                    placeholder="Pilih tanggal lahir"
                    className="py-0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Anak Ke-
                </label>
                <input
                  type="number"
                  name="anak_ke"
                  value={formData.anak_ke}
                  onChange={handleInputChange}
                  min="1"
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Contact Tab */}
          {activeTab === 'contact' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alamat
                </label>
                <textarea
                  name="alamat"
                  value={formData.alamat}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nomor Telepon
                </label>
                <input
                  type="number"
                  name="nomor_telepon"
                  value={formData.nomor_telepon}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Parent Tab */}
          {activeTab === 'parent' && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nama Ayah
                  </label>
                  <input
                    type="text"
                    name="nama_ayah"
                    value={formData.nama_ayah}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pekerjaan Ayah
                  </label>
                  <input
                    type="text"
                    name="pekerjaan_ayah"
                    value={formData.pekerjaan_ayah}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Nama Ibu
                  </label>
                  <input
                    type="text"
                    name="nama_ibu"
                    value={formData.nama_ibu}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Pekerjaan Ibu
                  </label>
                  <input
                    type="text"
                    name="pekerjaan_ibu"
                    value={formData.pekerjaan_ibu}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alamat Orang Tua
                </label>
                <textarea
                  name="alamat_orangtua"
                  value={formData.alamat_orangtua}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Telepon Orang Tua
                </label>
                <input
                  type="number"
                  name="telepon_orangtua"
                  value={formData.telepon_orangtua}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Guardian Tab */}
          {activeTab === 'guardian' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Nama Wali
                </label>
                <input
                  type="text"
                  name="nama_wali"
                  value={formData.nama_wali}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pekerjaan Wali
                </label>
                <input
                  type="text"
                  name="pekerjaan_wali"
                  value={formData.pekerjaan_wali}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alamat Wali
                </label>
                <textarea
                  name="alamat_wali"
                  value={formData.alamat_wali}
                  onChange={handleInputChange}
                  rows={3}
                  className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-gray-900 dark:text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmitting}
              loading={isSubmitting}
              loadingText="Menyimpan..."
            >
              Simpan
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
