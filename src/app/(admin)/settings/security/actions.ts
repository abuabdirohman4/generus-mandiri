'use server'

import { createClient, createAuthClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { validatePasswordChangeInput } from './logic'
import { logActivity } from '@/lib/activityLogger'
import { getCurrentUserProfile } from '@/lib/accessControlServer'

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

    const { data: { user } } = await (await createAuthClient()).auth.getUser()
    if (!user?.email) {
      return { error: 'Sesi tidak ditemukan. Silakan login kembali.' }
    }

    const { error: signInError } = await (await createAuthClient()).auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (signInError) {
      return { error: 'Password saat ini salah' }
    }

    const { error: updateError } = await (await createAuthClient()).auth.updateUser({
      password: newPassword,
    })
    if (updateError) {
      return { error: updateError.message }
    }

    revalidatePath('/settings/security')

    const profile = await getCurrentUserProfile()
    if (profile) {
      void logActivity({
        userId: profile.id,
        action: 'change_password',
        pagePath: '/settings/security'
      })
    }

    return { success: true }
  } catch (err) {
    if (err instanceof Error) {
      return { error: err.message }
    }
    return { error: 'Terjadi kesalahan yang tidak diketahui' }
  }
}
