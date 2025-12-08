import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Monitoring | Generus Mandiri",
  description: "Monitoring Siswa di Generus Mandiri",
};

export default function MonitoringLayout({ children }: { children: React.ReactNode }) {
  return children;
} 