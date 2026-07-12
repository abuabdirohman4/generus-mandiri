'use client'

import { useState, useEffect } from 'react'
import { useUserProfile } from '@/stores/userProfileStore'
import { isSuperAdmin, isAdminDaerah } from '@/lib/accessControl'
import { sendNotification, previewRecipientCount } from '@/app/(admin)/notifikasi/actions'
import type { NotificationType, NotificationDisplayConfig, NotificationTargetScope } from '@/types/notification'
import {
  fetchDaerahList,
  fetchDesaList,
  fetchKelompokList,
  fetchUserList,
  fetchRecipientsForScope,
  type OrgItem,
  type UserListItem,
  type RecipientItem,
} from '@/app/(admin)/notifikasi/actions/notifications/orgQueries'
import Button from '@/components/ui/button/Button'
import InputFilter from '@/components/form/input/InputFilter'
import InputField from '@/components/form/input/InputField'
import MultiSelectCheckbox from '@/components/form/input/MultiSelectCheckbox'
import RichTextEditor from '@/components/ui/rich-text-editor/RichTextEditor'

interface KirimBroadcastFormProps {
  onSuccess: () => void
}

type ScopeType = 'all' | 'daerah' | 'desa' | 'kelompok' | 'personal'
type UrgencyPreset = 'biasa' | 'penting' | 'wajib_tindakan'

const ROLE_OPTIONS = [
  { id: 'admin', label: 'Admin' },
  { id: 'teacher', label: 'Guru' },
  { id: 'student', label: 'Siswa' },
]

const SCOPE_OPTIONS_SUPERADMIN = [
  { value: 'all', label: 'Semua' },
  { value: 'daerah', label: 'Daerah' },
  { value: 'desa', label: 'Desa' },
  { value: 'kelompok', label: 'Kelompok' },
  { value: 'personal', label: 'Personal (pilih pengguna)' },
]

const SCOPE_OPTIONS_ADMIN_DAERAH = [
  { value: 'daerah', label: 'Daerah' },
  { value: 'desa', label: 'Desa' },
  { value: 'kelompok', label: 'Kelompok' },
  { value: 'personal', label: 'Personal' },
]

const NOTIF_TYPE_OPTIONS: { value: NotificationType; label: string }[] = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Tindakan' },
  { value: 'success', label: 'Sukses' },
]

const URGENCY_PRESETS: {
  value: UrgencyPreset
  label: string
  note: string
  config: NotificationDisplayConfig
  requiresCta: boolean
}[] = [
  {
    value: 'biasa',
    label: 'Biasa',
    note: 'Muncul sebagai banner di beranda penerima. Bisa ditutup kapan saja dan tersimpan di inbox.',
    config: { mode: 'banner', dismiss: 'free', showInList: true },
    requiresCta: false,
  },
  {
    value: 'penting',
    label: 'Penting',
    note: 'Muncul sebagai banner + popup di semua halaman. Penerima harus klik "Mengerti" untuk menutup. Tersimpan di inbox.',
    config: { mode: 'both', dismiss: 'acknowledge', showInList: true },
    requiresCta: false,
  },
  {
    value: 'wajib_tindakan',
    label: 'Wajib Tindakan',
    note: 'Muncul sebagai popup yang tidak bisa ditutup kecuali penerima klik tombol aksi. Untuk tugas yang wajib diselesaikan.',
    config: { mode: 'modal', dismiss: 'cta_required', showInList: false },
    requiresCta: true,
  },
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
  const [selectedDaerahIds, setSelectedDaerahIds] = useState<string[]>([])
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [notifType, setNotifType] = useState<NotificationType>('info')

  // Urgency preset + CTA
  const [preset, setPreset] = useState<UrgencyPreset>('biasa')
  const [actionUrl, setActionUrl] = useState('')
  const [actionLabel, setActionLabel] = useState('')

  // Org data
  const [daerahList, setDaerahList] = useState<OrgItem[]>([])
  const [desaList, setDesaList] = useState<OrgItem[]>([])
  const [kelompokList, setKelompokList] = useState<OrgItem[]>([])

  // Personal user picker state
  const [userSearch, setUserSearch] = useState('')
  const [userList, setUserList] = useState<UserListItem[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [userListLoading, setUserListLoading] = useState(false)

  // Recipient list (scope-based picker)
  const [recipientList, setRecipientList] = useState<RecipientItem[]>([])
  const [recipientListLoading, setRecipientListLoading] = useState(false)
  const [excludedRecipientIds, setExcludedRecipientIds] = useState<Set<string>>(new Set())
  const [recipientSearch, setRecipientSearch] = useState('')

  // UI state
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [recipientPreview, setRecipientPreview] = useState<number | null>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const activePreset = URGENCY_PRESETS.find(p => p.value === preset)!
  const showCtaFields = activePreset.requiresCta

  // Reset CTA fields when preset changes away from wajib_tindakan
  useEffect(() => {
    if (preset !== 'wajib_tindakan') {
      setActionUrl('')
      setActionLabel('')
    }
  }, [preset])

  // Load daerah list on mount (superadmin only)
  useEffect(() => {
    if (isSA) {
      fetchDaerahList().then(setDaerahList)
    }
  }, [isSA])

  // Load desa list when daerah changes
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
    setSelectedUsers([])
    setUserSearch('')
    setUserList([])
    if (!isSA) {
      setSelectedDaerah(profile?.daerah_id ?? '')
    } else {
      if (scope === 'all') setSelectedDaerah('')
    }
    setSelectedDaerahIds([])
    setRecipientList([])
    setExcludedRecipientIds(new Set())
    setRecipientSearch('')
  }, [scope, isSA, profile?.daerah_id])

  // Load user list for personal scope
  useEffect(() => {
    if (scope !== 'personal') return
    setUserListLoading(true)
    const daerahId = isDA ? (profile?.daerah_id ?? undefined) : undefined
    fetchUserList({ search: userSearch, daerahId }).then(list => {
      setUserList(list)
      setUserListLoading(false)
    })
  }, [scope, userSearch, isDA, profile?.daerah_id])

  // Load recipient list for scope-based targeting (non-personal)
  useEffect(() => {
    if (scope === 'personal') {
      setRecipientList([])
      setExcludedRecipientIds(new Set())
      return
    }
    const daerahId = isSA ? selectedDaerah : (profile?.daerah_id ?? undefined)
    // Only load when scope has enough context
    if (scope === 'desa' && !selectedDesa) { setRecipientList([]); return }
    if (scope === 'kelompok' && !selectedKelompok) { setRecipientList([]); return }
    if (scope === 'daerah' && isSA && selectedDaerahIds.length === 0) { setRecipientList([]); return }

    setRecipientListLoading(true)
    setExcludedRecipientIds(new Set())
    fetchRecipientsForScope({
      daerah_id: (scope === 'daerah' && !isSA) ? daerahId : undefined,
      daerah_ids: (scope === 'daerah' && isSA && selectedDaerahIds.length > 0) ? selectedDaerahIds : undefined,
      desa_id: scope === 'desa' ? selectedDesa : undefined,
      kelompok_id: scope === 'kelompok' ? selectedKelompok : undefined,
      roles: selectedRoles.length > 0 ? selectedRoles : undefined,
    }).then(list => {
      setRecipientList(list)
      setRecipientListLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedDaerah, selectedDaerahIds, selectedDesa, selectedKelompok, selectedRoles, isSA, profile?.daerah_id])

  // Debounced preview recipient count
  useEffect(() => {
    setRecipientPreview(null)
    const target: NotificationTargetScope = {}
    if (scope === 'personal') {
      if (selectedUsers.length > 0) {
        target.recipient_ids = selectedUsers
      } else {
        return
      }
    } else if (scope === 'daerah') {
      if (isSA) {
        if (selectedDaerahIds.length === 0) return
        target.daerah_ids = selectedDaerahIds
      } else {
        const daerahId = profile?.daerah_id
        if (!daerahId) return
        target.daerah_id = daerahId
      }
    } else if (scope === 'desa') {
      if (!selectedDesa) return
      target.desa_id = selectedDesa
    } else if (scope === 'kelompok') {
      if (!selectedKelompok) return
      target.kelompok_id = selectedKelompok
    }
    // scope === 'all': no filter needed
    if (selectedRoles.length > 0) target.roles = selectedRoles

    setPreviewLoading(true)
    const timer = setTimeout(async () => {
      const res = await previewRecipientCount(target)
      setRecipientPreview(res.success ? res.count : null)
      setPreviewLoading(false)
    }, 500)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, selectedDaerah, selectedDaerahIds, selectedDesa, selectedKelompok, selectedUsers, selectedRoles, isSA, profile?.daerah_id])

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
    if (showCtaFields && !actionUrl.trim()) {
      setFeedback({ type: 'error', message: 'URL aksi wajib diisi untuk Wajib Tindakan.' })
      return
    }

    const target: NotificationTargetScope = {}
    if (scope === 'personal') {
      if (selectedUsers.length === 0) { setFeedback({ type: 'error', message: 'Pilih minimal 1 penerima.' }); return }
      target.recipient_ids = selectedUsers
    } else if (scope === 'daerah') {
      if (isSA) {
        if (selectedDaerahIds.length === 0) { setFeedback({ type: 'error', message: 'Pilih minimal 1 daerah.' }); return }
        target.daerah_ids = selectedDaerahIds
      } else {
        const daerahId = profile?.daerah_id
        if (!daerahId) { setFeedback({ type: 'error', message: 'Pilih daerah terlebih dahulu.' }); return }
        target.daerah_id = daerahId
      }
    } else if (scope === 'desa') {
      if (!selectedDesa) { setFeedback({ type: 'error', message: 'Pilih desa terlebih dahulu.' }); return }
      target.desa_id = selectedDesa
    } else if (scope === 'kelompok') {
      if (!selectedKelompok) { setFeedback({ type: 'error', message: 'Pilih kelompok terlebih dahulu.' }); return }
      target.kelompok_id = selectedKelompok
    }
    if (scope !== 'personal' && selectedRoles.length > 0) target.roles = selectedRoles

    setSubmitting(true)
    try {
      const result = await sendNotification({
        title: title.trim(),
        body: body.trim(),
        type: notifType,
        target,
        display_config: activePreset.config,
        action_url: showCtaFields ? actionUrl.trim() : null,
        action_label: showCtaFields && actionLabel.trim() ? actionLabel.trim() : null,
        excluded_ids: excludedRecipientIds.size > 0 ? [...excludedRecipientIds] : undefined,
      })
      if (result.success) {
        setFeedback({ type: 'success', message: result.message || 'Notifikasi berhasil dikirim.' })
        setTitle('')
        setBody('')
        setSelectedRoles([])
        setPreset('biasa')
        setActionUrl('')
        setActionLabel('')
        setSelectedUsers([])
        setUserSearch('')
        setExcludedRecipientIds(new Set())
        setRecipientSearch('')
        setRecipientList([])
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

  const typeButtonStyle = (opt: { value: NotificationType; label: string }) => {
    const active = notifType === opt.value
    const styles = {
      info: active ? 'bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:border-blue-400 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
      success: active ? 'bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:border-green-400 dark:text-green-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
      warning: active ? 'bg-amber-100 border-amber-500 text-amber-700 dark:bg-amber-900/30 dark:border-amber-400 dark:text-amber-300' : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400',
    }
    return styles[opt.value]
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 p-5 space-y-4"
    >
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        Kirim Notifikasi
      </h3>

      {/* Title */}
      <div>
        <label htmlFor="notif-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
        <label htmlFor="notif-body" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
          {NOTIF_TYPE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setNotifType(opt.value)}
              disabled={submitting}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors disabled:opacity-50 ${typeButtonStyle(opt)}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tingkat Urgensi */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tingkat Urgensi</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
          Pilih seberapa penting notifikasi ini bagi penerima.
        </p>

        <div className="flex flex-col gap-2">
          {URGENCY_PRESETS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPreset(opt.value)}
              disabled={submitting}
              className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50 ${
                preset === opt.value
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              <span className={`mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                preset === opt.value ? 'border-blue-500 dark:border-blue-400' : 'border-gray-400 dark:border-gray-600'
              }`}>
                {preset === opt.value && (
                  <span className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400" />
                )}
              </span>
              <span>
                <span className={`block text-sm font-medium ${preset === opt.value ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                  {opt.label}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500">{opt.note}</span>
              </span>
            </button>
          ))}
        </div>

        {/* CTA fields — hanya jika Wajib Tindakan */}
        {showCtaFields && (
          <div className="mt-3 space-y-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-3">
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              Tombol Aksi (wajib diisi — penerima tidak bisa tutup tanpa klik ini)
            </p>
            <div>
              <label htmlFor="notif-action-url" className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                URL Tujuan <span className="text-red-500">*</span>
              </label>
              <InputField
                id="notif-action-url"
                type="text"
                placeholder="https://... atau /halaman"
                value={actionUrl}
                onChange={e => setActionUrl(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div>
              <label htmlFor="notif-action-label" className="block text-xs font-medium text-amber-700 dark:text-amber-400 mb-1">
                Label Tombol
              </label>
              <InputField
                id="notif-action-label"
                type="text"
                placeholder="Contoh: Buka Halaman, Lihat Detail"
                value={actionLabel}
                onChange={e => setActionLabel(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>
        )}
      </div>

      {/* Target Penerima */}
      <div className="border-t border-gray-100 dark:border-gray-800 pt-4">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Target Penerima</p>

        <InputFilter
          id="notif-scope"
          label="Lingkup"
          value={scope}
          onChange={val => setScope(val as ScopeType)}
          options={scopeOptions}
          variant="modal"
          disabled={submitting}
        />

        {scope === 'personal' && (
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="notif-user-search" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cari pengguna
              </label>
              <InputField
                id="notif-user-search"
                type="text"
                placeholder="Cari nama..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                disabled={submitting}
              />
            </div>
            {userListLoading ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">Memuat daftar pengguna...</p>
            ) : userList.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">{userSearch ? 'Tidak ada hasil.' : 'Ketik nama untuk mencari.'}</p>
            ) : (
              <div className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
                {userList.map(u => (
                  <label key={u.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={selectedUsers.includes(u.id)}
                      onChange={e => {
                        if (e.target.checked) setSelectedUsers(prev => [...prev, u.id])
                        else setSelectedUsers(prev => prev.filter(id => id !== u.id))
                      }}
                      disabled={submitting}
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{u.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{u.subtitle}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {selectedUsers.length > 0 && (
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {selectedUsers.length} pengguna dipilih
              </p>
            )}
          </div>
        )}

        {isSA && scope === 'daerah' && (
          <div className="mt-3">
            <MultiSelectCheckbox
              label="Pilih Daerah"
              items={daerahList.map(d => ({ id: d.id, label: d.name }))}
              selectedIds={selectedDaerahIds}
              onChange={setSelectedDaerahIds}
              disabled={submitting}
            />
          </div>
        )}
        {isSA && (scope === 'desa' || scope === 'kelompok') && (
          <div className="mt-3">
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
          </div>
        )}

        {(scope === 'desa' || scope === 'kelompok') && (
          <div className="mt-3">
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
          </div>
        )}

        {scope === 'kelompok' && (
          <div className="mt-3">
            <InputFilter
              id="notif-kelompok"
              label="Kelompok"
              value={selectedKelompok}
              onChange={setSelectedKelompok}
              options={kelompokSelectOptions}
              placeholder="Pilih kelompok..."
              variant="modal"
              compact
              disabled={submitting || kelompokList.length === 0}
            />
          </div>
        )}

        {scope !== 'personal' && (
          <div className="mt-4">
            <MultiSelectCheckbox
              label={<>Filter Peran <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(kosong = semua peran)</span></>}
              items={ROLE_OPTIONS}
              selectedIds={selectedRoles}
              onChange={setSelectedRoles}
              disabled={submitting}
            />
          </div>
        )}
      </div>

      {/* Recipient preview count */}
      {(previewLoading || recipientPreview !== null) && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {previewLoading
            ? 'Menghitung penerima...'
            : `Estimasi penerima: ${(recipientPreview ?? 0) - excludedRecipientIds.size} pengguna${excludedRecipientIds.size > 0 ? ` (${excludedRecipientIds.size} dikecualikan)` : ''}`}
        </p>
      )}

      {/* Scope-based recipient list with search + deselect */}
      {scope !== 'personal' && recipientList.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pilih Penerima
              <span className="ml-2 text-xs font-normal text-gray-400 dark:text-gray-500">
                {recipientList.length - excludedRecipientIds.size}/{recipientList.length} dipilih
              </span>
            </p>
            {excludedRecipientIds.size > 0 && (
              <button
                type="button"
                onClick={() => setExcludedRecipientIds(new Set())}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Pilih semua
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Cari nama penerima..."
            value={recipientSearch}
            onChange={e => setRecipientSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="max-h-52 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
            {recipientListLoading ? (
              <p className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500">Memuat penerima...</p>
            ) : recipientList.filter(r =>
                !recipientSearch.trim() || r.name.toLowerCase().includes(recipientSearch.toLowerCase())
              ).length === 0 ? (
              <p className="px-3 py-3 text-xs text-gray-400 dark:text-gray-500">Tidak ada hasil.</p>
            ) : (
              recipientList
                .filter(r => !recipientSearch.trim() || r.name.toLowerCase().includes(recipientSearch.toLowerCase()))
                .map(r => (
                  <label key={r.id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={!excludedRecipientIds.has(r.id)}
                      onChange={e => {
                        setExcludedRecipientIds(prev => {
                          const next = new Set(prev)
                          if (!e.target.checked) next.add(r.id)
                          else next.delete(r.id)
                          return next
                        })
                      }}
                      disabled={submitting}
                    />
                    <span className="flex flex-col min-w-0">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{r.name}</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 truncate">{r.subtitle}</span>
                    </span>
                  </label>
                ))
            )}
          </div>
        </div>
      )}

      {/* Feedback */}
      {feedback && (
        <p className={`text-sm rounded-lg px-3 py-2 ${
          feedback.type === 'success'
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        }`}>
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
