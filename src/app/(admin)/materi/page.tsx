import { getUserProfile } from '@/lib/accessControlServer'
import { createClient } from '@/lib/supabase/server'
import { getAvailableClassMasters } from './actions'
import MaterialsPageClient from './components/layout/MaterialsPageClient'

export default async function MateriPage() {
  const userProfile = await getUserProfile()
  const supabase = await createClient()

  // Fetch available class masters for user
  const classMasters = await getAvailableClassMasters()

  // Fetch academic years for CurriculumView
  const { data: academicYears } = await supabase
    .from('academic_years')
    .select('id, name, is_active')
    .order('name', { ascending: false })

  return (
    <MaterialsPageClient
      classMasters={classMasters}
      userProfile={userProfile}
      academicYears={academicYears || []}
    />
  )
}
