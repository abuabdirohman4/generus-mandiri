import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Template Kartu ID | Generus Mandiri',
  description: 'Kelola template kartu ID QR siswa',
}

export default function QrCardsTemplateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
