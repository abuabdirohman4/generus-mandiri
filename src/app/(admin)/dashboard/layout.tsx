import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard | Generus Mandiri',
  description: 'Overview sistem manajemen generus',
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
