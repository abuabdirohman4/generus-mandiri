import { Metadata } from 'next';
import RapotPageClient from './components/RapotPageClient';

export const metadata: Metadata = {
    title: 'Rapot | Generus Mandiri',
    description: 'Kelola rapot siswa',
};

export default function RapotPage() {
    return <RapotPageClient />;
}
