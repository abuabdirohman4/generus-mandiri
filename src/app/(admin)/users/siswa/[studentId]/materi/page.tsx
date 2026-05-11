'use client'

import { use, useEffect } from 'react'
import MateriView from '../components/MateriView'
import { useUserProfile } from '@/stores/userProfileStore'
import { canAccessMonitoring } from '@/lib/accessControl'
import { useRouter } from 'next/navigation'

export default function StudentMateriPage({
    params,
}: {
    params: Promise<{ studentId: string }>
}) {
    const { studentId } = use(params)
    const { profile, isInitialized } = useUserProfile()
    const router = useRouter()

    useEffect(() => {
        if (isInitialized && !canAccessMonitoring(profile)) {
            router.replace(`/users/siswa/${studentId}`)
        }
    }, [profile, isInitialized, studentId, router])

    if (!isInitialized || !canAccessMonitoring(profile)) {
        return null
    }

    return <MateriView studentId={studentId} />
}
