import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Detail Siswa | Generus Mandiri',
  description: 'Lihat riwayat kehadiran dan detail siswa',
}

export default function StudentDetailLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
