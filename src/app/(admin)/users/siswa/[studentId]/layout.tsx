'use client'

import { use } from 'react'
import StudentTabHeader from './components/StudentTabHeader'

export default function StudentDetailLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ studentId: string }>
}) {
    const { studentId } = use(params)

    return (
        <div>
            <StudentTabHeader studentId={studentId} />
            {children}
        </div>
    )
}
