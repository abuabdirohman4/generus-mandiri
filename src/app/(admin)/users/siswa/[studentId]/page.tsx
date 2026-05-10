'use client'

import { use } from 'react'
import IkhtisarView from './components/IkhtisarView'

export default function StudentIkhtisarPage({
    params,
}: {
    params: Promise<{ studentId: string }>
}) {
    const { studentId } = use(params)
    return <IkhtisarView studentId={studentId} />
}
