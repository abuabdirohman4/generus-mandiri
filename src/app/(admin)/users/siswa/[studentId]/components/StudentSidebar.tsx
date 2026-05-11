'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import useSWR from 'swr'
import type { SidebarStudent } from '../actions/sidebar'
import DataFilter, { type DataFilters } from '@/components/shared/DataFilter'
import { useUserProfile } from '@/stores/userProfileStore'
import { getAllDaerah } from '@/app/(admin)/organisasi/actions/daerah'
import { getAllDesa } from '@/app/(admin)/organisasi/actions/desa'
import { getAllKelompok } from '@/app/(admin)/organisasi/actions/kelompok'
import { getAllClasses } from '@/app/(admin)/users/siswa/actions/classes/actions'

import { useStudentSidebarStore } from '../stores/studentSidebarStore'

interface StudentSidebarProps {
    students: SidebarStudent[]
    currentStudentId: string
    userRole: string
}

export default function StudentSidebar({
    students, currentStudentId, userRole
}: StudentSidebarProps) {
    const router = useRouter()
    const pathname = usePathname()
    const { profile } = useUserProfile()
    const { 
        isOpen, setIsOpen, 
        showFilters, setShowFilters, 
        filters, setFilters 
    } = useStudentSidebarStore()
    
    const [searchQuery, setSearchQuery] = useState('')
    const [isInitialized, setIsInitialized] = useState(false)

    // Fetch org data for DataFilter
    const { data: daerahList = [] } = useSWR('daerah-list', () => getAllDaerah())
    const { data: desaList = [] } = useSWR('desa-list', () => getAllDesa())
    const { data: kelompokList = [] } = useSWR('kelompok-list', () => getAllKelompok())
    const { data: classList = [] } = useSWR('class-list', () => getAllClasses())

    // Init filters to the current student's org hierarchy after data loads
    useEffect(() => {
        if (students.length > 0 && currentStudentId && !isInitialized) {
            const s = students.find(s => s.id === currentStudentId)
            if (s) {
                setFilters({
                    ...filters,
                    daerah: s.daerah_id ? [s.daerah_id] : [],
                    desa: s.desa_id ? [s.desa_id] : [],
                    kelompok: s.kelompok_id ? [s.kelompok_id] : [],
                    kelas: s.class_id ? [s.class_id] : []
                })
                setIsInitialized(true)
            }
        }
    }, [currentStudentId, students, isInitialized])

    // Reset initialization flag when student ID changes to a different one
    useEffect(() => {
        setIsInitialized(false)
    }, [currentStudentId])

    const filtered = useMemo(() => {
        let list = students.filter(s => s.status === 'active')
        
        // Filter by org hierarchy
        if (filters.daerah.length > 0) list = list.filter(s => s.daerah_id && filters.daerah.includes(s.daerah_id))
        if (filters.desa.length > 0) list = list.filter(s => s.desa_id && filters.desa.includes(s.desa_id))
        if (filters.kelompok.length > 0) list = list.filter(s => s.kelompok_id && filters.kelompok.includes(s.kelompok_id))
        if (filters.kelas.length > 0) {
            // Handle comma-separated IDs in filters.kelas (common in DataFilter)
            const selectedClassIds = filters.kelas.flatMap(id => id.split(','))
            list = list.filter(s => s.class_id && selectedClassIds.includes(s.class_id))
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            list = list.filter(s => s.name.toLowerCase().includes(q))
        }
        return list.sort((a, b) => a.name.localeCompare(b.name))
    }, [students, filters, searchQuery])

    // Detect if teacher only has access to one kelompok
    const isSingleKelompokTeacher = useMemo(() => {
        if (userRole !== 'teacher') return false
        const kelompokIds = new Set(students.map(s => s.kelompok_id).filter(Boolean))
        return kelompokIds.size === 1
    }, [students, userRole])

    const getDisplayedClassName = (student: SidebarStudent) => {
        if (!student.classes || student.classes.length === 0) return 'Tanpa Kelas'
        
        // If admin, show all classes
        if (profile?.role === 'admin' || profile?.role === 'superadmin') {
            return student.classes.map(c => c.name).join(', ')
        }

        // If teacher, filter to only classes they teach
        if (profile?.role === 'teacher' && profile.classes) {
            const teacherClassIds = profile.classes.map((c: any) => c.id)
            const allowedClasses = student.classes.filter(c => teacherClassIds.includes(c.id))
            if (allowedClasses.length > 0) {
                return allowedClasses.map(c => c.name).join(', ')
            }
        }

        return student.class_name || 'Tanpa Kelas'
    }

    const handleSelect = (studentId: string) => {
        if (studentId === currentStudentId) return
        
        // Preserve current sub-path (tab)
        const pathSegments = pathname.split('/').filter(Boolean)
        const studentIdIndex = pathSegments.indexOf(currentStudentId)
        
        let targetPath = `/users/siswa/${studentId}`
        if (studentIdIndex !== -1 && studentIdIndex < pathSegments.length - 1) {
            const subPath = pathSegments.slice(studentIdIndex + 1).join('/')
            if (subPath) {
                targetPath = `/users/siswa/${studentId}/${subPath}`
            }
        }

        router.replace(targetPath)
        if (typeof window !== 'undefined' && window.innerWidth < 1024) {
            setIsOpen(false)
        }
    }

    return (
        <>
            {isOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsOpen(false)} />
            )}

            <div className={`
                fixed lg:relative inset-y-0 left-0
                w-72 bg-white dark:bg-gray-800
                border-r border-gray-200 dark:border-gray-700
                transform transition-transform duration-300 ease-in-out
                z-50 lg:z-0 flex flex-col h-full px-0 pb-16 md:pb-0
                ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Pilih Siswa</h2>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-1.5 rounded-md transition-colors ${showFilters ? 'bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            title="Filter Organisasi"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                        </button>
                        <button onClick={() => setIsOpen(false)} className="lg:hidden text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${showFilters ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="px-3 pt-3 border-b border-gray-100 dark:border-gray-700 pb-3">
                        <DataFilter
                            filters={filters}
                            onFilterChange={setFilters}
                            userProfile={profile}
                            daerahList={daerahList}
                            desaList={desaList}
                            kelompokList={kelompokList}
                            classList={classList}
                            showKelas={true}
                            variant="page"
                            compact={true}
                            className="space-y-3"
                        />
                    </div>
                </div>

                <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Cari siswa..."
                            className="w-full text-sm border border-gray-200 dark:border-gray-600 rounded-lg pl-9 pr-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500 transition-all outline-none"
                        />
                        <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filtered.map(student => {
                        const isActive = student.id === currentStudentId
                        const orgLine = (userRole === 'superadmin' || userRole === 'admin')
                            ? [student.kelompok_name, student.desa_name].filter(Boolean).join(' · ')
                            : (isSingleKelompokTeacher ? null : student.kelompok_name)
                        return (
                            <button
                                key={student.id}
                                onClick={() => handleSelect(student.id)}
                                className={`
                                    w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700
                                    hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors
                                    ${isActive ? 'bg-brand-50 dark:bg-brand-900/20 border-l-2 border-l-brand-500' : 'border-l-2 border-l-transparent'}
                                `}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-sm font-medium text-brand-700 dark:text-brand-300 shrink-0">
                                        {student.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className={`text-sm font-medium truncate ${isActive ? 'text-brand-700 dark:text-brand-300' : 'text-gray-900 dark:text-white'}`}>
                                            {student.name}
                                        </p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                            {getDisplayedClassName(student)}
                                            {orgLine ? ` · ${orgLine}` : ''}
                                        </p>
                                    </div>
                                </div>
                            </button>
                        )
                    })}
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <p className="text-sm text-gray-400">Tidak ada siswa ditemukan</p>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
