import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin | Generus Mandiri',
  description: 'Kelola data admin dalam sistem',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
