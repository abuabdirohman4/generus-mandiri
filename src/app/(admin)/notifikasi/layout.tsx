import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Notifikasi | Generus Mandiri',
}

export default function NotifikasiLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
