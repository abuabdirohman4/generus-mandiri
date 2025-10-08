import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Absensi | Warlob App",
  description: "Absensi siswa di Warlob App",
};

export default function AbsensiLayout({ children }: { children: React.ReactNode }) {
  return children;
} 