import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Organisasi | Generus Mandiri',
  description: 'Kelola struktur organisasi daerah, desa, dan kelompok',
}

export default function OrganisasiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
