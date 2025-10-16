import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guru | Generus Mandiri',
  description: 'Kelola data guru dalam sistem',
}

export default function GuruLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
