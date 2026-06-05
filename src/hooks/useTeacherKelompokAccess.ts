'use client'

import { useState, useEffect } from 'react'
import { useUserProfile } from '@/stores/userProfileStore'
import { isTeacherDesa } from '@/lib/userUtils'
import { getTeacherKelompokAccess } from '@/app/(admin)/users/guru/actions/teacher-kelompok-access/actions'

/**
 * Returns allowed kelompok IDs for the current teacher.
 * null = no restriction (full access to all kelompok in their desa)
 * string[] = restricted to these specific kelompok IDs
 *
 * Only relevant for guru desa with rows in teacher_kelompok_access.
 * Other roles always return null.
 */
export function useTeacherKelompokAccess(): string[] | null {
  const { profile } = useUserProfile()
  const [allowedIds, setAllowedIds] = useState<string[] | null>(null)

  useEffect(() => {
    if (!profile || !isTeacherDesa(profile)) return
    getTeacherKelompokAccess(profile.id).then(result => {
      if (result.success) {
        setAllowedIds(result.data.length > 0 ? result.data : null)
      }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id])

  return allowedIds
}
