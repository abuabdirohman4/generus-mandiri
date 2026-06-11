'use client'

import { useState, useEffect } from 'react'
import { useUserProfile } from '@/stores/userProfileStore'
import { isSuperAdmin, isAdminDaerah } from '@/lib/accessControl'
import { sendNotification } from '@/app/(admin)/notifikasi/actions'
import type { NotificationType } from '@/types/notification'
import {
  fetchDaerahList,
  fetchDesaList,
  fetchKelompokList,
  type OrgItem,
} from '@/app/(admin)/notifikasi/actions/notifications/orgQueries'
import Button from '@/components/ui/button/Button'
import InputFilter from '@/components/form/input/InputFilter'
import InputField from '@/components/form/input/InputField'
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox'
import RichTextEditor from '@/components/ui/rich-text-editor/RichTextEditor'

interface KirimBroadcastFormProps {
  onSuccess: () => void
}

type ScopeType = 'all' | 'daerah' | 'desa' | 'kelompok'

const ROLE_OPTIONS = [
  { id: 'admin', label: 'Admin' },
  { id: 'teacher', label: 'Guru' },
  { id: 'student', label: 'Siswa' },
]

const SCOPE_OPTIONS_SUPERADMIN = [
  { value: 'all', label: 'Semua' },
  { value: 'daerah', label: 'Per Daerah' },
  { value: 'desa', label: 'Per Desa' },
  { value: 'kelompok', label: 'Per Kelompok' },
]

const SCOPE_OPTIONS_ADMIN_DAERAH = [
  { value: 'daerah', label: 'Per Daerah' },
  { value: 'desa', label: 'Per Desa' },
  { value: 'kelompok', label: 'Per Kelompok' },
]

const NOTIF_TYPE_OPTIONS: { value: NotificationType; label: string; color: string }[] = [
  { value: 'info', label: 'Info', color: 'blue' },
  { value: 'success', label: 'Sukses', color: 'green' },
  { value: 'warning', label: 'Peringatan', color: 'amber' },
]

export default function KirimBroadcastForm({ onSuccess }: KirimBroadcastFormProps) {
  const { profile } = useUserProfile()

  const isSA = profile ? isSuperAdmin(profile) : false
  const isDA = profile ? isAdminDaerah(profile) : false

  // Form fields
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [scope, setScope] = useState<ScopeType>(isSA ? 'all' : 'daerah')
  const [selectedDaerah, setSelectedDaerah] = useState<string>(
    isDA && profile?.daerah_id ? profile.daerah_id : ''
  )
  const [selectedDesa, setSelectedDesa] = useState<string>('')
  const [selectedKelompok, setSelectedKelompok] = useState<string>('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [notifType, setNotifType] = useState<NotificationType>('info')


  // Org data
  const [daerahList, setDaerahList] = useState<OrgItem[]>([])
  const [desaList, setDesaList] = useState<OrgItem[]>([])
  const [kelompokList, setKelompokList] = useState<OrgItem[]>([])

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Load daerah list on mount (superadmin only)
  useEffect(() => {
    if (isSA) {
      fetchDaerahList().then(setDaerahList)
    }
  }, [isSA])

  // Load desa list when daerah changes (or on mount for admin daerah)
  useEffect(() => {
    const daerahId = isSA ? selectedDaerah : (profile?.daerah_id ?? '')
    if (daerahId && (scope === 'desa' || scope === 'kelompok')) {
      fetchDesaList(daerahId).then(setDesaList)
      setSelectedDesa('')
      setSelectedKelompok('')
    } else if (!daerahId && scope !== 'all') {
      setDesaList([])
    }
  }, [selectedDaerah, scope, isSA, profile?.daerah_id])

  // Load kelompok list when desa changes
  useEffect(() => {
    if (selectedDesa && scope === 'kelompok') {
      fetchKelompokList(selectedDesa).then(setKelompokList)
      setSelectedKelompok('')
    } else {
      setKelompokList([])
    }
  }, [selectedDesa, scope])

  // Reset dependent fields when scope changes
  useEffect(() => {
    setSelectedDesa('')
    setSelectedKelompok('')
    if (!isSA) {
      // Admin daerah: daerah is locked
      setSelectedDaerah(profile?.daerah_id ?? '')
    } else {
      if (scope === 'all') {
        setSelectedDaerah('')
      }
    }
  }, [scope, isSA, profile?.daerah_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFeedback(null)

    if (!title.trim()) {
      setFeedback({ type: 'error', message: 'Judul notifikasi wajib diisi.' })
      return
    }
    if (!body.trim()) {
      setFeedback({ type: 'error', message: 'Pesan notifikasi wajib diisi.' })
      return
    }

    // Build target scope
    const target: { daerah_id?: string; desa_id?: string; kelompok_id?: string; roles?: string[] } = {}

    if (scope === 'daerah') {
      const daerahId = isSA ? selectedDaerah : profile?.daerah_id
      if (!daerahId) {
        setFeedback({ type: 'error', message: 'Pilih daerah terlebih dahulu.' })
        return
      }
      target.daerah_id = daerahId
    } else if (scope === 'desa') {
      if (!selectedDesa) {
        setFeedback({ type: 'error', message: 'Pilih desa terlebih dahulu.' })
        return
      }
      target.desa_id = selectedDesa
    } else if (scope === 'kelompok') {
      if (!selectedKelompok) {
        setFeedback({ type: 'error', message: 'Pilih kelompok terlebih dahulu.' })
        return
      }
      target.kelompok_id = selectedKelompok
    }
    // scope === 'all': no ids needed

    if (selectedRoles.length > 0) {
      target.roles = selectedRoles
    }

    setSubmitting(true)
    try {
      const result = await sendNotification({ title: title.trim(), body: body.trim(), type: notifType, target })
      if (result.success) {
        setFeedback({ type: 'success', message: result.message || 'Notifikasi berhasil dikirim.' })
        setTitle('')
        setBody('')
        setSelectedRoles([])

        onSuccess()
      } else {
        setFeedback({ type: 'error', message: result.message || 'Gagal mengirim notifikasi.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan. Coba lagi.' })
    } finally {
      setSubmitting(false)
    }
  }

  const scopeOptions = isSA ? SCOPE_OPTIONS_SUPERADMIN : SCOPE_OPTIONS_ADMIN_DAERAH

  const daerahSelectOptions = daerahList.map(d => ({ value: d.id, label: d.name }))
  const desaSelectOptions = desaList.map(d => ({ value: d.id, label: d.name }))
  const kelompokSelectOptions = kelompokList.map(k => ({ value: k.id, label: k.name }))

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 p-5 space-y-4"
    >
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        Kirim Notifikasi Broadcast
      </h3>

      {/* Title */}
      <div>
        <label
          htmlFor="notif-title"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Judul <span className="text-red-500">*</span>
        </label>
        <InputField
          id="notif-title"
          type="text"
          placeholder="Judul notifikasi"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          disabled={submitting}
        />
      </div>

      {/* Body */}
      <div className="mt-2">
        <label
          htmlFor="notif-body"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Pesan <span className="text-red-500">*</span>
        </label>
        <RichTextEditor
          value={body}
          onChange={setBody}
          placeholder="Isi pesan notifikasi..."
          rows={10}
          disabled={submitting}
        />
        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          Untuk menyisipkan link: seleksi teks yang ingin dijadikan link, lalu klik 🔗 di toolbar.
        </p>
      </div>



      {/* Tipe notifikasi */}
      <div>
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tipe</p>
        <div className="flex gap-2">
          {NOTIF_TYPE_OPTIONS.map(opt => {
            const active = notifType === opt.value
            const styles = {
              info: active
                ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
              success: active
                ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-400 dark:text-green-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
              warning: active
                ? 'bg-amber-100 border-amber-500 text-amber-700 dark:bg-amber-900/30 dark:border-amber-400 dark:text-amber-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
            }[opt.value]
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setNotifType(opt.value)}
                disabled={submitting}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${styles}`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Scope selector */}
      <InputFilter
        id="notif-scope"
        label="Target Penerima"
        value={scope}
        onChange={val => setScope(val as ScopeType)}
        options={scopeOptions}
        variant="modal"
        disabled={submitting}
      />

      {/* Daerah picker — superadmin only, when scope = daerah/desa/kelompok */}
      {isSA && scope !== 'all' && (
        <InputFilter
          id="notif-daerah"
          label="Daerah"
          value={selectedDaerah}
          onChange={setSelectedDaerah}
          options={daerahSelectOptions}
          placeholder="Pilih daerah..."
          variant="modal"
          compact
          disabled={submitting}
        />
      )}

      {/* Desa picker — when scope = desa or kelompok */}
      {(scope === 'desa' || scope === 'kelompok') && (
        <InputFilter
          id="notif-desa"
          label="Desa"
          value={selectedDesa}
          onChange={setSelectedDesa}
          options={desaSelectOptions}
          placeholder="Pilih desa..."
          variant="modal"
          compact
          disabled={submitting || desaList.length === 0}
        />
      )}

      {/* Kelompok picker — when scope = kelompok */}
      {scope === 'kelompok' && (
        <InputFilter
          id="notif-kelompok"
          label="Kelompok"
          value={selectedKelompok}
          onChange={setSelectedKelompok}
          options={kelompokSelectOptions}
          placeholder="Pilih kelompok..."
          variant="modal"
          className="mt-4"
          compact
          disabled={submitting || kelompokList.length === 0}
        />
      )}

      {/* Roles filter */}
      <div className="mt-4">
        <MultiSelectCheckbox
          label={<>Filter Peran <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(kosong = semua peran)</span></>}
          items={ROLE_OPTIONS}
          selectedIds={selectedRoles}
          onChange={setSelectedRoles}
          disabled={submitting}
        />
      </div>

      {/* Feedback */}
      {feedback && (
        <p
          className={`text-sm rounded-lg px-3 py-2 ${
            feedback.type === 'success'
              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
              : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
          }`}
        >
          {feedback.message}
        </p>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          loading={submitting}
          loadingText="Mengirim..."
          disabled={submitting}
        >
          Kirim Notifikasi
        </Button>
      </div>
    </form>
  )
}
