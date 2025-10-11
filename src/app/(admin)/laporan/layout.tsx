import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Laporan Kehadiran | School Management',
  description: 'Analisis dan visualisasi data kehadiran siswa',
}

export default function LaporanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
