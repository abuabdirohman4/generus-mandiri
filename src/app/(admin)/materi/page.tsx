import { getUserProfile } from '@/lib/accessControlServer'
import { getAvailableClassMasters } from './actions'
import MaterialsPageClient from './components/layout/MaterialsPageClient'

export default async function MateriPage() {
  const userProfile = await getUserProfile()

  // Fetch available class masters for user
  const classMasters = await getAvailableClassMasters()

  return (
    <MaterialsPageClient
      classMasters={classMasters}
      userProfile={userProfile}
    />
  )
}
