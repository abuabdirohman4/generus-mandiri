import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Manajemen Kelas',
  description: 'Kelola template kelas dan implementasi kelas per kelompok',
};

export default function KelasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
