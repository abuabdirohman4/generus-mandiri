import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Presensi | Generus Mandiri",
  description: "Presensi siswa di Generus Mandiri",
};

export default function PresensiLayout({ children }: { children: React.ReactNode }) {
  return children;
} 