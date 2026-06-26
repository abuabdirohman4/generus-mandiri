'use client';

import { useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import * as Sentry from '@sentry/nextjs';
import GridShape from "@/components/common/GridShape";
import { FaWhatsapp } from 'react-icons/fa';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to Sentry
    Sentry.captureException(error);
  }, [error]);

  const waNumber = "6285201201260";
  const errorMessage = error.message || "Unknown error";
  const errorDigest = error.digest || "No digest";
  
  const waText = encodeURIComponent(`Assalammualaikum, mas saya mengalami kendala teknis saat menggunakan aplikasi *Generus Mandiri*.

Sebelum error terjadi, saya sedang melakukan:
[Tolong ketikkan di sini apa yang baru saja Anda klik atau isi...]

---
Info Teknis (Otomatis terisi, *jangan dihapus*):
Pesan: ${errorMessage}
Kode (Digest): ${errorDigest}
---

Alhamdulillah jaza kallahu khoiro

`);
  
  const waLink = `https://wa.me/${waNumber}?text=${waText}`;

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1">
      <GridShape />
      <div className="mx-auto w-full max-w-60.5 text-center sm:max-w-140.5">
        <h1 className="mb-8 font-bold text-gray-800 text-title-md dark:text-white/90 xl:text-title-2xl">
          ERROR
        </h1>

        <Image
          src="/images/error/500.svg"
          alt="500"
          className="dark:hidden mx-auto"
          width={562}
          height={156}
        />
        <Image
          src="/images/error/500-dark.svg"
          alt="500"
          className="hidden dark:block mx-auto"
          width={562}
          height={156}
        />

        <p className="mt-10 mb-6 text-base text-gray-700 dark:text-gray-400 sm:text-lg">
          Maaf, ada masalah teknis untuk akses halaman ini. 
          <br /> Developer telah diberitahu dan sedang menyelidikinya.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/3 dark:hover:text-gray-200"
          >
            Kembali ke Beranda
          </Link>
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#25d366] px-5 py-3.5 text-sm font-medium shadow-theme-xs hover:bg-[#1da851] transition-colors"
          >
            <FaWhatsapp className="text-lg" />
            Lapor via WhatsApp
          </a>
        </div>
      </div>
      {/* <!-- Footer --> */}
      <p className="absolute text-sm text-center text-gray-500 -translate-x-1/2 bottom-6 left-1/2 dark:text-gray-400">
        &copy; {new Date().getFullYear()} - Generus Mandiri
      </p>
    </div>
  );
}
