import type { Metadata } from 'next';
import Link from 'next/link';
// Icons will be inline SVGs

export const metadata: Metadata = {
  title: "Settings | Generus Mandiri",
  description: "Pengaturan aplikasi dan preferensi pengguna",
};

const settingsCategories = [
  {
    title: "Akun & Profil",
    description: "Kelola informasi akun dan profil pengguna",
    icon: 'user',
    items: [
      {
        name: "Profil Pengguna",
        description: "Edit informasi profil dan foto",
        href: "/settings/profile",
        available: false
      },
      // {
      //   name: "Keamanan Akun",
      //   description: "Password, 2FA, dan keamanan",
      //   href: "/settings/security",
      //   available: false
      // }
    ]
  },
  {
    title: "Aplikasi",
    description: "Pengaturan aplikasi dan preferensi",
    icon: 'cog',
    items: [
      {
        name: "PWA Settings",
        description: "Kelola instalasi Progressive Web App",
        href: "/settings/pwa",
        available: true
      },
      {
        name: "Reset Cookies & Cache",
        description: "Hapus semua cookies dan cache aplikasi",
        href: "/settings/cache",
        available: true
      },
      // {
      //   name: "Notifikasi",
      //   description: "Pengaturan notifikasi dan alert",
      //   href: "/settings/notifications",
      //   available: false
      // },
      // {
      //   name: "Tampilan",
      //   description: "Tema, bahasa, dan preferensi UI",
      //   href: "/settings/appearance",
      //   available: false
      // }
    ]
  },
  // {
  //   title: "Sistem",
  //   description: "Pengaturan sistem dan integrasi",
  //   icon: 'shield',
  //   items: [
  //     {
  //       name: "Integrasi",
  //       description: "Koneksi dengan layanan eksternal",
  //       href: "/settings/integrations",
  //       available: false
  //     },
  //     {
  //       name: "Backup & Restore",
  //       description: "Cadangan dan pemulihan data",
  //       href: "/settings/backup",
  //       available: false
  //     }
  //   ]
  // }
];

export default function SettingsPage() {
  return (
    <div className="ounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6 not-last:space-y-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pengaturan
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Kelola pengaturan aplikasi dan preferensi pengguna
        </p>
      </div>

      {/* Settings Categories */}
      <div className="space-y-8">
        {settingsCategories.map((category, categoryIndex) => (
          <div key={categoryIndex} className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                {category.icon === 'user' && (
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                {category.icon === 'cog' && (
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {category.icon === 'shield' && (
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {category.title}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {category.description}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {category.items.map((item, itemIndex) => (
                <Link
                  key={itemIndex}
                  href={item.available ? item.href : '#'}
                  className={`group block p-4 rounded-lg border transition-all duration-200 ${
                    item.available
                      ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md cursor-pointer'
                      : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className={`font-medium mb-1 ${
                        item.available 
                          ? 'text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400' 
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {item.name}
                      </h3>
                      <p className={`text-sm ${
                        item.available 
                          ? 'text-gray-600 dark:text-gray-400' 
                          : 'text-gray-400 dark:text-gray-500'
                      }`}>
                        {item.description}
                      </p>
                    </div>
                    <div className="ml-3">
                      {item.available ? (
                        <svg 
                          className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      ) : (
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full">
                          Coming Soon
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      {/* <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Ubah Tema</span>
          </button>
          
          <button className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Ubah Bahasa</span>
          </button>
          
          <button className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12 7H4.828zM4.828 17l2.586-2.586a2 2 0 012.828 0L12 17H4.828z" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Notifikasi</span>
          </button>
          
          <button className="flex items-center space-x-3 p-3 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            <span className="text-sm font-medium text-gray-900 dark:text-white">Keamanan</span>
          </button>
        </div>
      </div> */}
    </div>
  );
}
