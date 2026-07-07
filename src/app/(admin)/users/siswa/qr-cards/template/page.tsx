import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/accessControlServer'
import { canManageIdCardTemplate } from '@/lib/accessControl'
import TemplateManager from './TemplateManager'

export default async function QrCardsTemplatePage() {
  const profile = await getCurrentUserProfile()
  
  if (!canManageIdCardTemplate(profile)) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900">
        <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
          <h1 className="text-red-500 dark:text-red-400 font-bold text-xl">Akses Ditolak</h1>
          <p className="text-gray-700 dark:text-gray-300">Anda tidak memiliki akses ke halaman ini. Hubungi admin.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto px-0 pb-28 md:pb-0 md:px-6 lg:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Upload Template Kartu ID</h1>
          <p className="text-sm text-gray-500 mt-1">Upload desain kartu dan atur posisi QR serta Nama Siswa</p>
        </div>
        <TemplateManager />
      </div>
    </div>
  )
}
