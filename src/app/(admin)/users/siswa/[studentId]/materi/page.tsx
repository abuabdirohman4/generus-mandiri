'use client'

import { use } from 'react'
import MateriView from '../components/MateriView'

export default function StudentMateriPage({
    params,
}: {
    params: Promise<{ studentId: string }>
}) {
    const { studentId } = use(params)
    return <MateriView studentId={studentId} />
}
