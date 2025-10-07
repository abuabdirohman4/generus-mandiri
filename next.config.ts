import type { NextConfig } from "next";
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  /* config options here */
  
  // Bundle optimization
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    
    return config;
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Compression
  compress: true,
  
  // Powered by header
  poweredByHeader: false,
  
  // Konfigurasi untuk file audio
  async headers() {
    return [
      {
        // File audio di public/audio bisa diakses dengan cache yang panjang
        source: '/audio/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};

const pwaConfig = withPWA({
  dest: "public",
  register: false, // Disable automatic registration - we handle it manually
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development", // Disable in development to avoid GenerateSW warnings
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    // Static assets caching
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-image-assets",
        expiration: {
          maxEntries: 64,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    // Fonts caching
    {
      urlPattern: /\.(?:woff|woff2|ttf|eot)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-font-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        },
      },
    },
    // Next.js static assets
    {
      urlPattern: /^https:\/\/.*\.(?:js|css)$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "static-js-css-assets",
        expiration: {
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        },
      },
    },
    // API routes - NO CACHING for dynamic data
    {
      urlPattern: ({ url }) => {
        return (
          url.origin === self.origin &&
          url.pathname.startsWith("/api/")
        );
      },
      handler: "NetworkFirst",
      options: {
        cacheName: "apis-no-cache",
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 0,
          maxAgeSeconds: 0,
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig as any);