import type { Metadata } from "next";
import { Suspense } from 'react';
import HomeSkeleton from '@/components/ui/skeleton/HomeSkeleton';
import HomePage from "./page";

export const metadata: Metadata = {
  title: "Beranda | Generus Mandiri",
  description: "Halaman utama Generus Mandiri - Sistem Digital Generus LDII",
};

export default function HomeLayout() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomePage />
    </Suspense>
  );
}