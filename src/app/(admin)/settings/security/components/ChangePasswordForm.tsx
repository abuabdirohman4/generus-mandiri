'use client'

import { useState } from 'react'
import PasswordInput from '@/components/form/input/PasswordInput'
import Label from '@/components/form/Label'
import Button from '@/components/ui/button/Button'
import { changePassword } from '../actions'
import { validatePasswordChangeInput } from '../logic'

interface FormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface FieldErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

export default function ChangePasswordForm() {
  const [formData, setFormData] = useState<FormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [serverError, setServerError] = useState<string | undefined>()
  const [success, setSuccess] = useState(false)

  function handleChange(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({ ...prev, [field]: e.target.value }))
      setFieldErrors(prev => ({ ...prev, [field]: undefined }))
      setServerError(undefined)
      setSuccess(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFieldErrors({})
    setServerError(undefined)
    setSuccess(false)

    // Client-side validation — instant feedback without network round-trip
    try {
      validatePasswordChangeInput(formData)
    } catch (err) {
      if (err instanceof Error) {
        const msg = err.message
        if (msg.includes('saat ini')) {
          setFieldErrors({ currentPassword: msg })
        } else if (msg.includes('baru') || msg.includes('minimal')) {
          setFieldErrors({ newPassword: msg })
        } else if (msg.includes('Konfirmasi')) {
          setFieldErrors({ confirmPassword: msg })
        } else if (msg.includes('sama')) {
          setFieldErrors({ newPassword: msg })
        }
      }
      return
    }

    setIsLoading(true)
    try {
      const result = await changePassword(
        formData.currentPassword,
        formData.newPassword,
        formData.confirmPassword
      )
      if (result.success) {
        setSuccess(true)
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        setServerError(result.error)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-5">
      {success && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
          <p className="text-sm font-medium text-green-800 dark:text-green-400">
            Password berhasil diubah.
          </p>
        </div>
      )}

      {serverError && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm font-medium text-red-800 dark:text-red-400">
            {serverError}
          </p>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="currentPassword">Password Saat Ini</Label>
        <PasswordInput
          id="currentPassword"
          name="currentPassword"
          value={formData.currentPassword}
          onChange={handleChange('currentPassword')}
          placeholder="Masukkan password saat ini"
          error={!!fieldErrors.currentPassword}
          hint={fieldErrors.currentPassword}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">Password Baru</Label>
        <PasswordInput
          id="newPassword"
          name="newPassword"
          value={formData.newPassword}
          onChange={handleChange('newPassword')}
          placeholder="Minimal 8 karakter"
          error={!!fieldErrors.newPassword}
          hint={fieldErrors.newPassword}
          disabled={isLoading}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">Konfirmasi Password Baru</Label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange('confirmPassword')}
          placeholder="Ulangi password baru"
          error={!!fieldErrors.confirmPassword}
          hint={fieldErrors.confirmPassword}
          disabled={isLoading}
        />
      </div>

      <Button
        type="submit"
        size="md"
        variant="primary"
        loading={isLoading}
        loadingText="Menyimpan..."
        disabled={isLoading}
      >
        Simpan Perubahan
      </Button>
    </form>
  )
}
