import type { NextConfig } from "next";
import nextra from "nextra";

const withNextra = nextra({
  contentDirBasePath: "/docs",
});

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',

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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        port: '',
        pathname: '/api/**',
      },
    ],
  },
  
  // Compression
  compress: true,
  
  // Powered by header
  poweredByHeader: false,
  
  // Redirect sementara dari /absensi ke /presensi
  // Dapat dihapus setelah dipastikan tidak ada lagi akses ke /absensi
  async redirects() {
    return [
      {
        source: '/absensi',
        destination: '/presensi',
        permanent: false, // 307 — sementara, mudah dihapus nanti
      },
      {
        source: '/absensi/:path*',
        destination: '/presensi/:path*',
        permanent: false,
      },
    ];
  },

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

export default withNextra(nextConfig);