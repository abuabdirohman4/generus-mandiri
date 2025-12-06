import StudentReportDetailClient from './components/StudentReportDetailClient';

export const metadata = {
    title: 'Detail Rapot - Generus Mandiri Boarding School',
    description: 'Halaman detail pengisian nilai rapot siswa',
};

interface PageProps {
    params: Promise<{
        studentId: string;
    }>;
}

export default async function StudentReportDetailPage({ params }: PageProps) {
    const resolvedParams = await params;

    return <StudentReportDetailClient studentId={resolvedParams.studentId} />;
}
