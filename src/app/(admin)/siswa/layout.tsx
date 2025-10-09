import { Metadata } from 'next'
import SiswaPage from './page'

export const metadata: Metadata = {
  title: 'Siswa | Warlob App',
  description: 'Kelola data siswa dan informasi kelas',
}

export default function SiswaLayout() {
  return <SiswaPage />
}