'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import { useUserProfile } from '@/stores/userProfileStore'
import { canAccessMonitoring } from '@/lib/accessControl'

interface StudentTabHeaderProps {
    studentId: string
    onSidebarToggle?: () => void
}

type TabItem = {
    label: string
    href: string
    match: string
}

export default function StudentTabHeader({ studentId, onSidebarToggle }: StudentTabHeaderProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [loadingHref, setLoadingHref] = useState<string | null>(null)
    const { profile } = useUserProfile()

    // Clear loading state when route actually changes (new page mounted)
    useEffect(() => {
        setLoadingHref(null)
    }, [pathname])

    const canSeeMateri = canAccessMonitoring(profile)

    const tabs: TabItem[] = [
        { label: 'Profil', href: `/users/siswa/${studentId}`, match: `/${studentId}` },
        { label: 'Presensi', href: `/users/siswa/${studentId}/presensi`, match: '/presensi' },
        ...(canSeeMateri ? [{ label: 'Materi', href: `/users/siswa/${studentId}/materi`, match: '/materi' }] : []),
        { label: 'Biodata', href: `/users/siswa/${studentId}/biodata`, match: '/biodata' },
    ]

    const isActive = (tab: TabItem) => {
        if (tab.match === `/${studentId}`) {
            return pathname === `/users/siswa/${studentId}`
        }
        return pathname.includes(tab.match)
    }

    const handleTabClick = (e: React.MouseEvent, tab: TabItem) => {
        if (isActive(tab)) return
        e.preventDefault()
        setLoadingHref(tab.href)
        router.replace(tab.href)
    }

    return (
        <div className="flex items-center gap-0 border-b border-gray-200 dark:border-gray-700 mb-6">
            {onSidebarToggle && (
                <button
                    onClick={onSidebarToggle}
                    className="lg:hidden ml-1 mr-2 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                    aria-label="Buka daftar siswa"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                </button>
            )}
            <div className="flex-1 flex gap-0 overflow-x-auto no-scrollbar">
                {tabs.map((tab) => {
                const active = isActive(tab)
                const loading = loadingHref === tab.href

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        onClick={(e) => handleTabClick(e, tab)}
                        className={`relative px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                            active
                                ? 'border-brand-500 text-brand-600 dark:text-brand-400'
                                : loading
                                    ? 'border-brand-300 text-brand-400 dark:text-brand-500'
                                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300'
                        }`}
                    >
                        {loading && (
                            <span className="mr-1.5 mb-1 inline-block w-3 h-3 border-2 border-brand-400 border-t-transparent rounded-full animate-spin align-middle" />
                        )}
                        <span className={loading ? 'opacity-60' : ''}>{tab.label}</span>
                    </Link>
                )
            })}
            </div>
        </div>
    )
}
