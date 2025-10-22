import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kelas | Generus Mandiri',
  description: 'Kelola Kelas dan implementasi kelas per kelompok',
};

export default function KelasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
