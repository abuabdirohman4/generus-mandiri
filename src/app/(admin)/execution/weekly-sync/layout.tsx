import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Weekly Sync | Better Planner",
  description: "Pusat penjadwalan mingguan dan drag-and-drop tugas dari Main Quest Anda.",
};

export default function WeeklySyncLayout({ children }: { children: React.ReactNode }) {
  return children;
} 