import type { Metadata } from 'next'
import ChangePasswordForm from './components/ChangePasswordForm'

export const metadata: Metadata = {
  title: 'Keamanan Akun | Generus Mandiri',
  description: 'Ubah password akun Anda',
}

export default function SecurityPage() {
  return (
    <div>
      <div className="rounded-2xl border border-gray-200 bg-white mb-28 md:mb-0 p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">
            Keamanan Akun
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ubah password untuk menjaga keamanan akun Anda
          </p>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
