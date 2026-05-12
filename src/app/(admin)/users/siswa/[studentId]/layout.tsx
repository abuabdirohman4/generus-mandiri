'use client'

import { use } from 'react'
import useSWR from 'swr'
import StudentTabHeader from './components/StudentTabHeader'
import StudentSidebar from './components/StudentSidebar'
import { getStudentsForSidebar } from './actions/sidebar'
import { getCurrentUserRole } from '@/app/(admin)/users/siswa/actions/students/actions'
import { useStudentSidebarStore } from './stores/studentSidebarStore'

export default function StudentDetailLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ studentId: string }>
}) {
    const { studentId } = use(params)
    const { isOpen: sidebarOpen, setIsOpen: setSidebarOpen } = useStudentSidebarStore()

    const { data: students = [] } = useSWR(
        'sidebar-students',
        () => getStudentsForSidebar(),
        { revalidateOnFocus: false, dedupingInterval: 60000 }
    )

    const { data: userRole = '' } = useSWR(
        'current-user-role',
        () => getCurrentUserRole(),
        { revalidateOnFocus: false }
    )

    return (
        <div className="flex md:h-[calc(100vh-76px)] -m-4 md:-m-6 overflow-hidden">
            <StudentSidebar
                students={students}
                currentStudentId={studentId}
                userRole={userRole ?? ''}
            />
            <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
                <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6">
                    <StudentTabHeader
                        studentId={studentId}
                        onSidebarToggle={() => setSidebarOpen(!sidebarOpen)}
                    />
                    <div className="mx-auto">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    )
}
