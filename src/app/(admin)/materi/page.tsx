import { getUserProfile } from '@/lib/accessControlServer'
import { getAvailableClassMasters } from './actions'
import MaterialsLayout from './components/MaterialsLayout'

export default async function MateriPage() {
  const userProfile = await getUserProfile()
  
  // Fetch available class masters for user
  const classMasters = await getAvailableClassMasters()
  
  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-0 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Materi Pembelajaran</h1>
          <p className="text-gray-600 dark:text-gray-400">Akses materi pembelajaran per minggu</p>
        </div>
        
        <MaterialsLayout 
          classMasters={classMasters}
          userProfile={userProfile}
        />
      </div>
    </div>
  )
}
