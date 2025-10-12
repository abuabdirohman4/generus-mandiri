import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Laporan | Generus Mandiri',
  description: 'Analisis dan visualisasi data kehadiran siswa',
}

export default function LaporanLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
