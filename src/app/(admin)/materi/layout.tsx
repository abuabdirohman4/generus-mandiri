import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Materi | Generus Mandiri',
  description: 'Kelola Materi',
};

export default function MateriLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
