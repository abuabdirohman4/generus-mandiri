import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Siswa | Generus Mandiri',
  description: 'Kelola data siswa dan informasi kelas',
}

export default function SiswaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}