'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validatePasswordChangeInput } from './logic'

export interface ChangePasswordResult {
  success?: boolean
  error?: string
}

export async function changePassword(
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<ChangePasswordResult> {
  try {
    validatePasswordChangeInput({ currentPassword, newPassword, confirmPassword })

    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return { error: 'Sesi tidak ditemukan. Silakan login kembali.' }
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) {
      return { error: 'Password saat ini salah' }
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (updateError) {
      return { error: updateError.message }
    }

    revalidatePath('/settings/security')
    return { success: true }
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message }
    }
    return { error: 'Terjadi kesalahan yang tidak diketahui' }
  }
}
