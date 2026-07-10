import { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { isAdmin } from '@/lib/accessControl'

export const metadata: Metadata = {
  title: 'Organisasi | Generus Mandiri',
  description: 'Kelola struktur organisasi daerah, desa, dan kelompok',
}

export default async function OrganisasiLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Access guard (sm-2m5n): /organisasi is admin-only. The sidebar hides the menu
  // for non-admins, but that alone doesn't stop direct-URL access. Guarding in this
  // server layout blocks BOTH render and the client page's org-tree data fetch
  // (killing the egress) before anything runs.
  const profile = await getCurrentUserProfile()
  if (!profile || !isAdmin(profile)) {
    redirect('/home')
  }

  return children
}
