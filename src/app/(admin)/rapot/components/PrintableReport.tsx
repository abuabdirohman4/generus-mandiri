import React from 'react';
import { StudentReport, StudentGrade, StudentCharacterAssessment, ReportSubject } from '../types';

interface PrintableReportProps {
    student: any; // We use simplified any here because the full structure is complex joined data
    activeYear: string;
    semester: string;
    options: {
        pageSize: 'A4' | 'Letter';
        orientation: 'portrait' | 'landscape';
        includePageNumbers: boolean;
        includeWatermark: boolean;
        margin: { top: number; right: number; bottom: number; left: number };
    };
    className?: string;
}

// Configurable School Profile (bisa diganti dari props atau settings nantinya)
const SCHOOL_PROFILE = {
    name: "MADRASAH DINIYAH TAKWILIYAH",
    subName: "MAMBAUL HUDA",
    institution: "LEMBAGA DAKWAH ISLAM INDONESIA",
    address: "Kabupaten Bandung", // Placeholder based on image
    logoUrl: "/logo-placeholder.png", // User needs to provide this
    nsm: "..............................", // No Statistik Madrasah
    npsn: ".............................."
};

const PrintableReport: React.FC<PrintableReportProps> = ({ student, activeYear, semester, options, className }) => {
    // 1. Group Grades by Category
    const groupedGrades = React.useMemo(() => {
        const groups: { [key: string]: typeof student.grades } = {};

        student.grades?.forEach((g: any) => {
            // Access category name safely through the nested joins
            // structure: grade -> subject -> material_type -> category -> name
            const categoryName = g.subject?.material_type?.category?.name || 'Lainnya';

            if (!groups[categoryName]) {
                groups[categoryName] = [];
            }
            groups[categoryName].push(g);
        });

        // Sort grades within groups by display_order
        Object.keys(groups).forEach(key => {
            groups[key].sort((a: any, b: any) =>
                (a.subject?.display_order || 0) - (b.subject?.display_order || 0)
            );
        });

        return groups;
    }, [student.grades]);

    // 2. Helper for date formatting
    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    // 3. Helper for Character/Attendance (Mapping data to fixed format if needed)
    // For now we just use the data array.

    return (
        <>
            <style jsx global>{`
                @media print {
                    @page {
                        size: ${options.pageSize === 'Letter' ? 'letter' : 'A4'} ${options.orientation};
                        margin: 0; /* Control margin via padding in container */
                    }
                    body {
                        visibility: hidden;
                        background: white;
                    }
                    .printable-report {
                        visibility: visible;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    /* Ensure background colors print */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .break-after-page {
                        page-break-after: always;
                    }
                }
            `}</style>

            {/* Default to hidden print:block unless className is passed to override */}
            <div 
                className={`printable-report bg-white text-black font-serif leading-tight ${className || 'hidden print:block'}`}
                style={{ backgroundColor: '#ffffff', color: '#000000' }}
            >

                {/* ================= PAGE 1: COVER RAPOR ================= */}
                <div className="w-full flex flex-col items-center justify-between break-after-page border-b-2 border-transparent pb-10">
                    <div className="text-center space-y-2 mt-10">
                        <h1 className="text-3xl font-bold tracking-wider">RAPOR</h1>
                        <h2 className="text-xl font-bold">{SCHOOL_PROFILE.name}</h2>
                        <h2 className="text-2xl font-bold mt-2">{SCHOOL_PROFILE.subName}</h2>
                    </div>

                    <div className="flex flex-col items-center gap-8 my-10">
                        {/* LOGO PLACEHOLDER */}
                        <div className="w-48 h-48 border-4 border-double border-gray-800 flex items-center justify-center rounded-full p-4">
                            <div className="text-center text-xs">
                                [LOGO TPQ] <br /> {SCHOOL_PROFILE.subName}
                            </div>
                        </div>

                        <div className="w-full max-w-lg border-4 border-double border-gray-800 p-4 text-center mt-8">
                            <h3 className="font-bold mb-2">Nama Peserta Didik</h3>
                            <div className="border-b border-black py-2 px-4 text-xl font-bold uppercase min-w-[200px]">
                                {student?.student?.name}
                            </div>
                        </div>

                        <div className="w-full max-w-sm border-4 border-double border-gray-800 p-4 text-center mt-4">
                            <h3 className="font-bold mb-2">No Statistik</h3>
                            <div className="border-b border-black py-2 px-4 text-lg min-w-[150px]">
                                {SCHOOL_PROFILE.nsm}
                            </div>
                        </div>
                    </div>

                    <div className="text-center font-bold text-lg mb-10 uppercase">
                        {SCHOOL_PROFILE.institution}
                    </div>
                </div>


                {/* ================= PAGE 2: STUDENT BIO ================= */}
                <div className="w-full min-h-screen p-12 break-after-page">
                    <div className="text-center font-bold mb-8 uppercase">
                        <div className="text-lg">{SCHOOL_PROFILE.address}</div>
                        <div className="text-xl mt-2">KETERANGAN TENTANG PESERTA DIDIK</div>
                    </div>

                    <table className="w-full text-base">
                        <tbody>
                            <tr className="h-8"><td className="w-10">1.</td><td className="w-64">Nama Peserta Didik (Lengkap)</td><td className="w-4">:</td><td className="font-bold uppercase">{student?.student?.name}</td></tr>
                            <tr className="h-8"><td>2.</td><td>Nomor Induk</td><td>:</td><td>{student?.student?.nis || '-'}</td></tr>
                            <tr className="h-8"><td>3.</td><td>Tempat Tanggal Lahir</td><td>:</td><td>{student?.student?.birth_place || '-'}, {formatDate(student?.student?.birth_date)}</td></tr>
                            <tr className="h-8"><td>4.</td><td>Jenis kelamin</td><td>:</td><td>{student?.student?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                            <tr className="h-8"><td>5.</td><td>Anak ke</td><td>:</td><td>-</td></tr>
                            <tr className="h-8"><td>6.</td><td>Alamat Peserta Didik</td><td>:</td><td>{student?.student?.address || '-'}</td></tr>
                            <tr className="h-8"><td>7.</td><td>Nomor Telepon Rumah</td><td>:</td><td>{student?.student?.parent_phone || '-'}</td></tr>

                            <tr className="h-10"><td colSpan={4} className="font-bold pt-4">8. Nama Orang Tua</td></tr>
                            <tr className="h-8"><td></td><td className="pl-4">a) Ayah</td><td>:</td><td>{student?.student?.father_name || '-'}</td></tr>
                            <tr className="h-8"><td></td><td className="pl-4">b) Ibu</td><td>:</td><td>{student?.student?.mother_name || '-'}</td></tr>

                            <tr className="h-8"><td className="pt-2">9.</td><td className="pt-2">Alamat Orang Tua</td><td className="pt-2">:</td><td className="pt-2">{student?.student?.address || '-'}</td></tr>
                            <tr className="h-8"><td>10.</td><td>Nomor Telepon Rumah</td><td>:</td><td>{student?.student?.parent_phone || '-'}</td></tr>

                            <tr className="h-10"><td colSpan={4} className="font-bold pt-4">11. Pekerjaan Orang Tua</td></tr>
                            <tr className="h-8"><td></td><td className="pl-4">a) Ayah</td><td>:</td><td>-</td></tr>
                            <tr className="h-8"><td></td><td className="pl-4">b) Ibu</td><td>:</td><td>-</td></tr>

                            <tr className="h-8"><td className="pt-4">12.</td><td className="pt-4">Nama Wali Peserta Didik</td><td className="pt-4">:</td><td className="pt-4">{student?.student?.guardian_name || '-'}</td></tr>
                            <tr className="h-8"><td>13.</td><td>Alamat Wali Peserta Didik</td><td>:</td><td>{student?.student?.guardian_address || '-'}</td></tr>
                            <tr className="h-8"><td>14.</td><td>Pekerjaan Wali Peserta Didik</td><td>:</td><td>-</td></tr>
                        </tbody>
                    </table>

                    <div className="flex justify-between mt-20 px-8">
                        <div className="border border-black w-32 h-40 flex items-center justify-center text-sm text-gray-400">
                            Pas Foto
                        </div>
                        <div className="text-center mr-8">
                            <p className="mb-20">Bandung, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="font-bold border-b border-black pb-1 mb-1">Kepala Madrasah,</p>
                            <p>.......................................</p>
                        </div>
                    </div>
                </div>

                {/* ================= PAGE 3: GRADES ================= */}
                <div className="w-full min-h-screen p-12 break-after-page">
                    {/* Header Data */}
                    <div className="flex justify-between mb-6 text-sm">
                        <table className="w-1/2">
                            <tbody>
                                <tr><td className="w-32 font-bold">Nama Madrasah</td><td>: {SCHOOL_PROFILE.subName}</td></tr>
                                <tr><td className="font-bold">Alamat</td><td>: {SCHOOL_PROFILE.address}</td></tr>
                                <tr><td className="font-bold">Nama</td><td>: {student?.student?.name}</td></tr>
                                <tr><td className="font-bold">No. Induk/NIS</td><td>: {student?.student?.nis || '-'}</td></tr>
                            </tbody>
                        </table>
                        <table className="w-1/3">
                            <tbody>
                                <tr><td className="w-32 font-bold">Kelas</td><td>: {student?.class?.name}</td></tr>
                                <tr><td className="font-bold">Semester</td><td>: {semester} ({semester === '1' ? 'SATU' : 'DUA'})</td></tr>
                                <tr><td className="font-bold">Tahun Pelajaran</td><td>: {activeYear}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h3 className="font-bold mb-2">Nilai Akademik</h3>
                    <table className="w-full border-collapse border border-black text-sm mb-6">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black px-2 py-1 w-10 text-center">No</th>
                                <th className="border border-black px-2 py-1 text-left">Mata Pelajaran</th>
                                <th className="border border-black px-2 py-1 text-center w-16">Nilai</th>
                                <th className="border border-black px-2 py-1 text-center w-20">Predikat</th>
                                <th className="border border-black px-2 py-1 text-center">Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(groupedGrades).map(([category, grades]: [string, any[]], catIndex) => (
                                <React.Fragment key={category}>
                                    {/* Handle categories that act as headers for sub-items logic here if needed. 
                                        For now we just list them. If category is 'General', maybe don't show header?
                                        Actually, prompt implies categories ARE the main subjects sometimes. 
                                        Let's assume flat list for now but grouped.
                                    */}
                                    {/* Optional Category Header row can be added here if desired */}
                                    {/* <tr className="bg-gray-50"><td colSpan={5} className="border border-black px-2 py-1 font-bold">{category}</td></tr> */}

                                    {grades.map((grade: any, index: number) => (
                                        <tr key={grade.id} className="h-8">
                                            <td className="border border-black px-2 py-1 text-center font-mono">
                                                {/* Global numbering or per category? Let's use simple global counter approach if possible, or just index + 1 per group */}
                                                {index + 1}
                                            </td>
                                            <td className="border border-black px-2 py-1">
                                                {grade.subject.display_name}
                                                {/* If we had sub-items logic, we'd render them here */}
                                            </td>
                                            <td className="border border-black px-2 py-1 text-center">
                                                {grade.score ?? '-'}
                                            </td>
                                            <td className="border border-black px-2 py-1 text-center font-bold">
                                                {grade.grade || '-'}
                                            </td>
                                            <td className="border border-black px-2 py-1 text-xs">
                                                {grade.description || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                            {/* Fill empty rows if needed to look full? */}
                        </tbody>
                    </table>

                    {/* Predicate Legend */}
                    <div className="border border-black rounded-xl p-3 text-sm w-2/3 mb-8">
                        <p className="font-bold mb-1">Keterangan Predikat dan Deskripsi:</p>
                        <p>A (90-100) = Terlampaui, B (80-89) = Memenuhi, C (70-79) = Cukup Memenuhi, D (&lt;70) = Tidak Memenuhi</p>
                    </div>

                </div>

                {/* ================= PAGE 4: CHARACTER & ATTENDANCE ================= */}
                <div className="w-full break-after-page p-12">
                    <h3 className="font-bold mb-2">Nilai-Nilai Luhur & Kepribadian</h3>

                    <table className="w-full border-collapse border border-black text-sm mb-6">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black px-2 py-1 w-10 text-center">No</th>
                                <th className="border border-black px-2 py-1 text-left">Catatan Nilai-nilai Luhur</th>
                                <th className="border border-black px-2 py-1 text-center">Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {student?.character_assessments?.map((char: any, idx: number) => (
                                <tr key={char.id} className="h-8">
                                    <td className="border border-black px-2 py-1 text-center">{idx + 1}</td>
                                    <td className="border border-black px-2 py-1">{char.character_aspect}</td>
                                    <td className="border border-black px-2 py-1">{char.description || '-'}</td>
                                </tr>
                            ))}
                            {(!student?.character_assessments || student.character_assessments.length === 0) && (
                                <tr><td colSpan={3} className="border border-black px-2 py-6 text-center italic">Belum ada penilaian karakter</td></tr>
                            )}
                        </tbody>
                    </table>

                    {/* Character Predicate Legend */}
                    <div className="border border-black rounded-xl p-3 text-sm w-full mb-6">
                        <p className="font-bold mb-1">Keterangan Predikat dan Deskripsi:</p>
                        <p>A = Sudah Terampil dan Terbiasa, B = Sudah Terbiasa, C = Belum Terbiasa</p>
                    </div>

                    {/* Attendance & Personality Side by Side */}
                    <div className="flex gap-4">
                        <div className="w-1/2">
                            <table className="w-full border-collapse border border-black text-sm">
                                <thead>
                                    <tr className="bg-gray-100"><th colSpan={3} className="border border-black px-2 py-1 text-center">Ketidakhadiran</th></tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className="border border-black px-2 py-1 w-8">1.</td>
                                        <td className="border border-black px-2 py-1">Sakit</td>
                                        <td className="border border-black px-2 py-1 w-16 text-center">{student?.sick_days || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black px-2 py-1">2.</td>
                                        <td className="border border-black px-2 py-1">Izin</td>
                                        <td className="border border-black px-2 py-1 text-center">{student?.permission_days || '-'}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black px-2 py-1">3.</td>
                                        <td className="border border-black px-2 py-1">Tanpa Keterangan</td>
                                        <td className="border border-black px-2 py-1 text-center">{student?.absent_days || '-'}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div className="w-1/2">
                            {/* Mock Personality Table - Data not in store yet */}
                            <table className="w-full border-collapse border border-black text-sm">
                                <thead>
                                    <tr className="bg-gray-100"><th colSpan={3} className="border border-black px-2 py-1 text-center">Kepribadian</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td className="border border-black px-2 py-1 w-8">1.</td><td className="border border-black px-2 py-1">Kelakuan</td><td className="border border-black px-2 py-1 w-16 text-center">-</td></tr>
                                    <tr><td className="border border-black px-2 py-1">2.</td><td className="border border-black px-2 py-1">Kerajinan</td><td className="border border-black px-2 py-1 text-center">-</td></tr>
                                    <tr><td className="border border-black px-2 py-1">3.</td><td className="border border-black px-2 py-1">Kerapihan</td><td className="border border-black px-2 py-1 text-center">-</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* ================= PAGE 5: EXTRAS, NOTES & SIGNATURES ================= */}
                <div className="w-full p-12">
                    <h3 className="font-bold mb-2">PENGEMBANGAN DIRI</h3>

                    <div className="mb-4">
                        <h4 className="font-bold text-sm ml-4 mb-1">A. EKSTRA KULIKULER</h4>
                        <table className="w-full border-collapse border border-black text-sm">
                            <thead>
                                <tr className="bg-gray-100">
                                    <th className="border border-black px-2 py-1 w-10 text-center">NO</th>
                                    <th className="border border-black px-2 py-1 text-left">Jenis Kegiatan</th>
                                    <th className="border border-black px-2 py-1 text-center w-24">Predikat</th>
                                    <th className="border border-black px-2 py-1 text-center">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Static Empty Rows for now as requested/mocked */}
                                {[1, 2, 3].map(num => (
                                    <tr key={num} className="h-8">
                                        <td className="border border-black px-2 py-1 text-center">{num}</td>
                                        <td className="border border-black px-2 py-1"></td>
                                        <td className="border border-black px-2 py-1 text-center">A / B / C / D</td>
                                        <td className="border border-black px-2 py-1"></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mb-8">
                        <h4 className="font-bold text-sm ml-4 mb-1">B. CATATAN MENGENAI SANTRI</h4>
                        <div className="border border-black h-24 p-2 text-sm">
                            {student?.teacher_notes || ''}
                        </div>
                    </div>

                    {/* Signatures */}
                    <div className="flex justify-between items-end mt-12 text-sm">
                        <div className="text-center w-1/3">
                            <p className="mb-20">Mengetahui<br />Orang Tua/Wali,</p>
                            <p className="border-t border-black pt-1 w-40 mx-auto">( ......................... )</p>
                        </div>
                        <div className="text-center w-1/3">
                            <p className="mb-2">Diberikan di: ........................<br />Tanggal : ........................</p>
                            <p className="mb-20">Pengajar MDT</p>
                            <p className="border-t border-black pt-1 w-40 mx-auto font-bold">{student?.class?.teacher_name || '.........................'}</p>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
};

export default PrintableReport;
