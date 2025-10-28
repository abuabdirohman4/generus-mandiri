import { Outfit } from 'next/font/google';
import { Toaster } from 'sonner';
import type { Metadata } from 'next';

import './globals.css';

import PreloadProvider from '@/components/common/PreloadProvider';
import PWAComponents from '@/components/PWA';
import SplashScreen from '@/components/PWA/SplashScreen';
import SWRProvider from '@/components/common/SWRProvider';

const outfit = Outfit({
  subsets: ["latin"],
});

const toastConfig = {
  success: '!bg-blue-500 !text-white !border-blue-500',
  error: '!bg-red-500 !text-white !border-red-500',
  info: '!bg-blue-500 !text-white !border-blue-500',
  warning: '!bg-yellow-500 !text-white !border-yellow-500',
};

export const metadata: Metadata = {
  title: "Generus Mandiri - Sistem Digital Generus LDII",
  description: "Sistem Digital Generus LDII untuk manajemen pengajian, absensi dan data siswa",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Generus Mandiri",
  },
  icons: {
    icon: [
      { url: "/images/logo/logo-icon.svg", sizes: "192x192", type: "image/png" },
      { url: "/images/logo/logo-icon.svg", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/images/logo/logo-icon.svg", sizes: "192x192", type: "image/png" },
    ],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.className} suppressHydrationWarning>
      <body suppressHydrationWarning>
        {/* Inject global timer for Weekly Sync loading measurement */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if (typeof window !== 'undefined' && window.__WEEKLY_SYNC_START__ === undefined) { window.__WEEKLY_SYNC_START__ = performance.now(); }`,
          }}
        />
        
        {/* Umami Analytics */}
        {process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID && (
          <script 
            defer 
            src="https://cloud.umami.is/script.js" 
            data-website-id={process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID}
          />
        )}
        
        {/* PWA Components */}
        <PWAComponents />
        
        <SWRProvider>
          <PreloadProvider>
            <SplashScreen>
              {children}
            </SplashScreen>
            <Toaster
              position="top-right"
              toastOptions={{
                classNames: toastConfig
              }}
            />
          </PreloadProvider>
        </SWRProvider>
      </body>
    </html>
  );
}
