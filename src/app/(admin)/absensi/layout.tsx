import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Absensi | Generus Mandiri",
  description: "Absensi siswa di Generus Mandiri",
};

export default function AbsensiLayout({ children }: { children: React.ReactNode }) {
  return children;
} 