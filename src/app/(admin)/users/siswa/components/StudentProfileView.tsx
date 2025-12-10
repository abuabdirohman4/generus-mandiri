// src/app/(admin)/users/siswa/components/StudentProfileView.tsx
'use client'

import { StudentBiodata } from '../types'
// import { format } from 'date-fns'
import dayjs from 'dayjs'
import 'dayjs/locale/id'

interface StudentProfileViewProps {
  student: StudentBiodata
  onEdit?: () => void
}

export function StudentProfileView({ student, onEdit }: StudentProfileViewProps) {
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    try {
      return dayjs(dateString).format('D MMMM YYYY')
    } catch {
      return '-'
    }
  }

  const formatValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined || value === '') return '-'
    return value
  }

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Biodata Siswa</h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Edit Biodata
          </button>
        )}
      </div>

      {/* Identity Card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Identitas</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Nama Lengkap</p>
            <p className="font-medium">{formatValue(student.name)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Nomor Induk</p>
            <p className="font-medium">{formatValue(student.nomor_induk)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Jenis Kelamin</p>
            <p className="font-medium">{formatValue(student.gender)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tempat Lahir</p>
            <p className="font-medium">{formatValue(student.tempat_lahir)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tanggal Lahir</p>
            <p className="font-medium">{formatDate(student.tanggal_lahir)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Anak Ke-</p>
            <p className="font-medium">{formatValue(student.anak_ke)}</p>
          </div>
        </div>
      </div>

      {/* Contact Card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Kontak</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <p className="text-sm text-gray-500">Alamat</p>
            <p className="font-medium">{formatValue(student.alamat)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Nomor Telepon</p>
            <p className="font-medium">{formatValue(student.nomor_telepon)}</p>
          </div>
        </div>
      </div>

      {/* Parent Card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Data Orang Tua</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Nama Ayah</p>
            <p className="font-medium">{formatValue(student.nama_ayah)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Pekerjaan Ayah</p>
            <p className="font-medium">{formatValue(student.pekerjaan_ayah)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Nama Ibu</p>
            <p className="font-medium">{formatValue(student.nama_ibu)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Pekerjaan Ibu</p>
            <p className="font-medium">{formatValue(student.pekerjaan_ibu)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm text-gray-500">Alamat Orang Tua</p>
            <p className="font-medium">{formatValue(student.alamat_orangtua)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Telepon Orang Tua</p>
            <p className="font-medium">{formatValue(student.telepon_orangtua)}</p>
          </div>
        </div>
      </div>

      {/* Guardian Card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Data Wali</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Nama Wali</p>
            <p className="font-medium">{formatValue(student.nama_wali)}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Pekerjaan Wali</p>
            <p className="font-medium">{formatValue(student.pekerjaan_wali)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-sm text-gray-500">Alamat Wali</p>
            <p className="font-medium">{formatValue(student.alamat_wali)}</p>
          </div>
        </div>
      </div>

      {/* Organization Card */}
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold">Tempat Sambung</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-gray-500">Kelompok</p>
            <p className="font-medium">{student.kelompok?.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Desa</p>
            <p className="font-medium">{student.desa?.name || '-'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Daerah</p>
            <p className="font-medium">{student.daerah?.name || '-'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
