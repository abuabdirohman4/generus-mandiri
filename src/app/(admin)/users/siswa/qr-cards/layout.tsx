import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cetak Kartu ID QR | Generus Mandiri',
  description: 'Generate kartu ID QR siswa secara massal dari template',
}

export default function QrCardsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
