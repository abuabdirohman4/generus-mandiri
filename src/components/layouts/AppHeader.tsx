"use client";
import React, { useState ,useEffect, Suspense} from "react";
import { usePathname } from "next/navigation";

// import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import NotificationDropdown from "./header/NotificationDropdown";
import UserDropdown from "./header/UserDropdown";
import { useSidebar } from "@/stores/sidebarStore";

// Page Title Component
function PageTitle() {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const getPageTitle = (path: string) => {
    switch (path) {
      case '/home':
        return 'Beranda';
      case '/absensi':
        return 'Absensi';
      case '/siswa':
        return 'Siswa';
      case '/laporan':
        return 'Laporan';
      case '/settings':
        return 'Pengaturan';
      case '/settings/profile':
        return 'Profil';
      case '/settings/pwa':
        return 'PWA Settings';
      default:
        return 'Warlob App';
    }
  };

  // Check if page needs back button (Vision, 12 Week Quests, Main Quest)
  const needsBackButton = (path: string) => {
    return path === '/planning/vision' || 
           path === '/planning/12-week-quests' || 
           path === '/planning/main-quests';
  };

  if (!mounted) {
    return <div className="w-32 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />;
  }

  const pageTitle = getPageTitle(pathname);
  const showBackButton = needsBackButton(pathname);

  return (
    <div className="flex items-center gap-3">
      {/* Back Button - Only for Vision, 12 Week Quests, Main Quest */}
      {showBackButton && (
        <button
          onClick={() => window.history.back()}
          className="lg:hidden absolute flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          aria-label="Go back"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z"
              fill="currentColor"
            />
          </svg>
        </button>
      )}
      
      {/* Page Title */}
      <h1 className={`text-xl font-semibold text-gray-900 dark:text-white text-center md:text-left flex-1`}>
        {pageTitle}
      </h1>
    </div>
  );
}

// Date Time Display Component
// function DateTimeDisplay({ isClient, currentDateTime }: { isClient: boolean; currentDateTime: Date | null }) {
//   const formatDateTime = (date: Date) => {
//     const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
//     const day = days[date.getDay()];
//     const dateStr = date.toLocaleDateString('id-ID', {
//       day: 'numeric',
//       month: 'short',
//     });
//     const timeStr = date.toLocaleTimeString('id-ID', {
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit'
//     });
//     return { day, date: dateStr, time: timeStr };
//   };

//   let day = "", date = "", time = "";
//   if (currentDateTime) {
//     const formatted = formatDateTime(currentDateTime);
//     day = formatted.day;
//     date = formatted.date;
//     time = formatted.time;
//   }

//   return (
//     <div className="hidden lg:flex flex-col items-end text-sm text-gray-600 dark:text-gray-400">
//       {isClient && currentDateTime ? (
//         <>
//           <div className="text-medium font-mono">{time}</div>
//           <div className="font-medium">{day}, {date}</div>
//         </>
//       ) : (
//         <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
//       )}
//     </div>
//   );
// }

// Application Menu Component
function ApplicationMenu({ 
  isOpen, 
  isClient, 
  currentDateTime 
}: { 
  isOpen: boolean; 
  isClient: boolean;
  currentDateTime: Date | null;
}) {
  return (
    <div
      className={`${isOpen ? "flex" : "hidden"} items-center justify-between w-full gap-4 px-5 py-4 lg:flex shadow-theme-md lg:justify-end lg:px-0 lg:shadow-none`}
    >
      {/* <div className="flex items-center gap-2 2xsm:gap-3">
        <DateTimeDisplay isClient={isClient} currentDateTime={currentDateTime} />
        <ThemeToggleButton />
        <NotificationDropdown />
      </div> */}
      <UserDropdown />
    </div>
  );
}

const AppHeader: React.FC = () => {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const pathname = usePathname();
  const isHome = pathname.includes("/home");

  const { isMobileOpen, toggleSidebar, toggleMobileSidebar } = useSidebar();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;
    setCurrentDateTime(new Date());
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [isClient]);

  const handleToggle = () => {
    if (window.innerWidth >= 1024) {
      toggleSidebar();
    } else {
      toggleMobileSidebar();
    }
  };

  const toggleApplicationMenu = () => {
    setApplicationMenuOpen(!isApplicationMenuOpen);
  };

  return (
    <header className={`sticky top-0 md:flex w-full bg-white border-gray-200 z-50 lg:z-10 dark:border-gray-800 dark:bg-gray-900 lg:border-b ${isHome ? 'hidden md:flex' : ''}`}>
      <div className="flex flex-col items-center justify-between grow lg:flex-row lg:px-6">
        <div className="flex items-center justify-between w-full gap-2 px-3 py-3 border-b border-gray-200 dark:border-gray-800 sm:gap-4 lg:justify-normal lg:border-b-0 lg:px-0 lg:py-4">
          {/* Toggle Sidebar */}
          <button
            className="items-center justify-center w-10 h-10 text-gray-500 border-gray-200 rounded-lg z-50 dark:border-gray-800 hidden md:flex dark:text-gray-400 lg:h-11 lg:w-11 lg:border"
            onClick={handleToggle}
            aria-label="Toggle Sidebar"
          >
            <svg
              width="16"
              height="12"
              viewBox="0 0 16 12"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M0.583252 1C0.583252 0.585788 0.919038 0.25 1.33325 0.25H14.6666C15.0808 0.25 15.4166 0.585786 15.4166 1C15.4166 1.41421 15.0808 1.75 14.6666 1.75L1.33325 1.75C0.919038 1.75 0.583252 1.41422 0.583252 1ZM0.583252 11C0.583252 10.5858 0.919038 10.25 1.33325 10.25L14.6666 10.25C15.0808 10.25 15.4166 10.5858 15.4166 11C15.4166 11.4142 15.0808 11.75 14.6666 11.75L1.33325 11.75C0.919038 11.75 0.583252 11.4142 0.583252 11ZM1.33325 5.25C0.919038 5.25 0.583252 5.58579 0.583252 6C0.583252 6.41421 0.919038 6.75 1.33325 6.75L7.99992 6.75C8.41413 6.75 8.74992 6.41421 8.74992 6C8.74992 5.58579 8.41413 5.25 7.99992 5.25L1.33325 5.25Z"
                fill="currentColor"
              />
            </svg>
          </button>
          
          {/* Page Title */}
          <div className="flex-1">
            <PageTitle />
          </div>

          {/* Application Menu */}
          <button
            onClick={toggleApplicationMenu}
            className="flex items-center justify-center w-10 h-10 text-gray-700 rounded-lg z-50 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 hidden md:flex lg:hidden"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M5.99902 10.4951C6.82745 10.4951 7.49902 11.1667 7.49902 11.9951V12.0051C7.49902 12.8335 6.82745 13.5051 5.99902 13.5051C5.1706 13.5051 4.49902 12.8335 4.49902 12.0051V11.9951C4.49902 11.1667 5.1706 10.4951 5.99902 10.4951ZM17.999 10.4951C18.8275 10.4951 19.499 11.1667 19.499 11.9951V12.0051C19.499 12.8335 18.8275 13.5051 17.999 13.5051C17.1706 13.5051 16.499 12.8335 16.499 12.0051V11.9951C16.499 11.1667 17.1706 10.4951 17.999 10.4951ZM13.499 11.9951C13.499 11.1667 12.8275 10.4951 11.999 10.4951C11.1706 10.4951 10.499 11.1667 10.499 11.9951V12.0051C10.499 12.8335 11.1706 13.5051 11.999 13.5051C12.8275 13.5051 13.499 12.8335 13.499 12.0051V11.9951Z"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <ApplicationMenu 
          isOpen={isApplicationMenuOpen} 
          isClient={isClient}
          currentDateTime={currentDateTime}
        />
      </div>
    </header>
  );
};

export default AppHeader;
