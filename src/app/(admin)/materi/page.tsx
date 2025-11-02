import { getUserProfile } from '@/lib/accessControlServer'
import { getAvailableClassMasters } from './actions'
import MaterialsLayout from './components/MaterialsLayout'
import MaterialsPageClient from './components/MaterialsPageClient'

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
