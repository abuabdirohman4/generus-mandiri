import React from 'react';
import { StudentReport, StudentGrade, StudentCharacterAssessment, ReportSubject } from '../types';

interface PrintableReportProps {
    student: any;
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

const SCHOOL_PROFILE = {
    name: "MADRASAH DINIYAH TAKWILIYAH",
    subName: "MAMBAUL HUDA",
    institution: "LEMBAGA DAKWAH ISLAM INDONESIA",
    address: "Kabupaten Bandung",
    logoUrl: "/logo-placeholder.png",
    nsm: "..............................",
    npsn: ".............................."
};

// Reusable cell styles for html2canvas compatibility
const cellStyle: React.CSSProperties = {
    verticalAlign: 'middle',
    padding: '6px 8px',
    border: '1px solid black'
};

const cellStyleCenter: React.CSSProperties = {
    ...cellStyle,
    textAlign: 'center'
};

const headerCellStyle: React.CSSProperties = {
    ...cellStyle,
    backgroundColor: '#f3f4f6',
    fontWeight: 'bold'
};

const PrintableReport: React.FC<PrintableReportProps> = ({ student, activeYear, semester, options, className }) => {
    const groupedGrades = React.useMemo(() => {
        const groups: { [key: string]: typeof student.grades } = {};
        student.grades?.forEach((g: any) => {
            const categoryName = g.subject?.material_type?.category?.name || 'Lainnya';
            if (!groups[categoryName]) groups[categoryName] = [];
            groups[categoryName].push(g);
        });
        Object.keys(groups).forEach(key => {
            groups[key].sort((a: any, b: any) => (a.subject?.display_order || 0) - (b.subject?.display_order || 0));
        });
        return groups;
    }, [student.grades]);

    const formatDate = (dateString?: string) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <>
            <style>{`
                @media print {
                    @page {
                        size: ${options.pageSize === 'Letter' ? 'letter' : 'A4'} ${options.orientation};
                        margin: 0;
                    }
                    body { visibility: hidden; background: white; }
                    .printable-report {
                        visibility: visible;
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .break-after-page { page-break-after: always; }
                }
            `}</style>

            <div
                className={`printable-report ${className || 'hidden print:block'}`}
                style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: 'serif', lineHeight: 1.4 }}
            >
                {/* PAGE 1: COVER */}
                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '40px', pageBreakAfter: 'always' }}>
                    <div style={{ textAlign: 'center', marginTop: '40px' }}>
                        <h1 style={{ fontSize: '28px', fontWeight: 'bold', letterSpacing: '2px' }}>RAPOR</h1>
                        <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>{SCHOOL_PROFILE.name}</h2>
                        <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px' }}>{SCHOOL_PROFILE.subName}</h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', margin: '40px 0' }}>
                        <div style={{ width: '192px', height: '192px', border: '4px double #1f2937', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', padding: '16px' }}>
                            <div style={{ textAlign: 'center', fontSize: '12px' }}>[LOGO TPQ]<br />{SCHOOL_PROFILE.subName}</div>
                        </div>

                        <div style={{ width: '100%', maxWidth: '400px', border: '4px double #1f2937', padding: '16px', textAlign: 'center', marginTop: '32px' }}>
                            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Nama Peserta Didik</h3>
                            <div style={{ borderBottom: '1px solid black', padding: '8px 16px', fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                                {student?.student?.name}
                            </div>
                        </div>

                        <div style={{ width: '100%', maxWidth: '300px', border: '4px double #1f2937', padding: '16px', textAlign: 'center', marginTop: '16px' }}>
                            <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>No Statistik</h3>
                            <div style={{ borderBottom: '1px solid black', padding: '8px 16px', fontSize: '18px' }}>{SCHOOL_PROFILE.nsm}</div>
                        </div>
                    </div>

                    <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '18px', marginBottom: '40px', textTransform: 'uppercase' }}>
                        {SCHOOL_PROFILE.institution}
                    </div>
                </div>

                {/* PAGE 2: STUDENT BIO */}
                <div style={{ width: '100%', minHeight: '100vh', padding: '48px', pageBreakAfter: 'always' }}>
                    <div style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '32px', textTransform: 'uppercase' }}>
                        <div style={{ fontSize: '18px' }}>{SCHOOL_PROFILE.address}</div>
                        <div style={{ fontSize: '20px', marginTop: '8px' }}>KETERANGAN TENTANG PESERTA DIDIK</div>
                    </div>

                    <table style={{ width: '100%', fontSize: '14px', borderCollapse: 'collapse' }}>
                        <tbody>
                            <tr><td style={{ width: '30px', padding: '4px 0', verticalAlign: 'middle' }}>1.</td><td style={{ width: '220px', verticalAlign: 'middle' }}>Nama Peserta Didik (Lengkap)</td><td style={{ width: '15px', verticalAlign: 'middle' }}>:</td><td style={{ fontWeight: 'bold', textTransform: 'uppercase', verticalAlign: 'middle' }}>{student?.student?.name}</td></tr>
                            <tr><td style={{ padding: '4px 0', verticalAlign: 'middle' }}>2.</td><td style={{ verticalAlign: 'middle' }}>Nomor Induk</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>{student?.student?.nis || '-'}</td></tr>
                            <tr><td style={{ padding: '4px 0', verticalAlign: 'middle' }}>3.</td><td style={{ verticalAlign: 'middle' }}>Tempat Tanggal Lahir</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>{student?.student?.birth_place || '-'}, {formatDate(student?.student?.birth_date)}</td></tr>
                            <tr><td style={{ padding: '4px 0', verticalAlign: 'middle' }}>4.</td><td style={{ verticalAlign: 'middle' }}>Jenis kelamin</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>{student?.student?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</td></tr>
                            <tr><td style={{ padding: '4px 0', verticalAlign: 'middle' }}>5.</td><td style={{ verticalAlign: 'middle' }}>Anak ke</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>-</td></tr>
                            <tr><td style={{ padding: '4px 0', verticalAlign: 'middle' }}>6.</td><td style={{ verticalAlign: 'middle' }}>Alamat Peserta Didik</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>{student?.student?.address || '-'}</td></tr>
                            <tr><td style={{ padding: '4px 0', verticalAlign: 'middle' }}>7.</td><td style={{ verticalAlign: 'middle' }}>Nomor Telepon Rumah</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>{student?.student?.parent_phone || '-'}</td></tr>
                            <tr><td colSpan={4} style={{ fontWeight: 'bold', paddingTop: '16px', verticalAlign: 'middle' }}>8. Nama Orang Tua</td></tr>
                            <tr><td></td><td style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>a) Ayah</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>{student?.student?.father_name || '-'}</td></tr>
                            <tr><td></td><td style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>b) Ibu</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>{student?.student?.mother_name || '-'}</td></tr>
                            <tr><td style={{ paddingTop: '8px', verticalAlign: 'middle' }}>9.</td><td style={{ paddingTop: '8px', verticalAlign: 'middle' }}>Alamat Orang Tua</td><td style={{ paddingTop: '8px', verticalAlign: 'middle' }}>:</td><td style={{ paddingTop: '8px', verticalAlign: 'middle' }}>{student?.student?.address || '-'}</td></tr>
                            <tr><td style={{ padding: '4px 0', verticalAlign: 'middle' }}>10.</td><td style={{ verticalAlign: 'middle' }}>Nomor Telepon Rumah</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>{student?.student?.parent_phone || '-'}</td></tr>
                            <tr><td colSpan={4} style={{ fontWeight: 'bold', paddingTop: '16px', verticalAlign: 'middle' }}>11. Pekerjaan Orang Tua</td></tr>
                            <tr><td></td><td style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>a) Ayah</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>-</td></tr>
                            <tr><td></td><td style={{ paddingLeft: '16px', verticalAlign: 'middle' }}>b) Ibu</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>-</td></tr>
                            <tr><td style={{ paddingTop: '16px', verticalAlign: 'middle' }}>12.</td><td style={{ paddingTop: '16px', verticalAlign: 'middle' }}>Nama Wali Peserta Didik</td><td style={{ paddingTop: '16px', verticalAlign: 'middle' }}>:</td><td style={{ paddingTop: '16px', verticalAlign: 'middle' }}>{student?.student?.guardian_name || '-'}</td></tr>
                            <tr><td style={{ padding: '4px 0', verticalAlign: 'middle' }}>13.</td><td style={{ verticalAlign: 'middle' }}>Alamat Wali Peserta Didik</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>{student?.student?.guardian_address || '-'}</td></tr>
                            <tr><td style={{ padding: '4px 0', verticalAlign: 'middle' }}>14.</td><td style={{ verticalAlign: 'middle' }}>Pekerjaan Wali Peserta Didik</td><td style={{ verticalAlign: 'middle' }}>:</td><td style={{ verticalAlign: 'middle' }}>-</td></tr>
                        </tbody>
                    </table>

                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '80px', padding: '0 32px' }}>
                        <div style={{ border: '1px solid black', width: '128px', height: '160px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#9ca3af' }}>
                            Pas Foto
                        </div>
                        <div style={{ textAlign: 'center', marginRight: '32px' }}>
                            <p style={{ marginBottom: '80px' }}>Bandung, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p style={{ fontWeight: 'bold', borderBottom: '1px solid black', paddingBottom: '4px', marginBottom: '4px' }}>Kepala Madrasah,</p>
                            <p>.......................................</p>
                        </div>
                    </div>
                </div>

                {/* PAGE 3: GRADES */}
                <div style={{ width: '100%', minHeight: '100vh', padding: '48px', pageBreakAfter: 'always' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '14px' }}>
                        <table style={{ width: '50%' }}>
                            <tbody>
                                <tr><td style={{ width: '120px', fontWeight: 'bold', verticalAlign: 'middle' }}>Nama Madrasah</td><td style={{ verticalAlign: 'middle' }}>: {SCHOOL_PROFILE.subName}</td></tr>
                                <tr><td style={{ fontWeight: 'bold', verticalAlign: 'middle' }}>Alamat</td><td style={{ verticalAlign: 'middle' }}>: {SCHOOL_PROFILE.address}</td></tr>
                                <tr><td style={{ fontWeight: 'bold', verticalAlign: 'middle' }}>Nama</td><td style={{ verticalAlign: 'middle' }}>: {student?.student?.name}</td></tr>
                                <tr><td style={{ fontWeight: 'bold', verticalAlign: 'middle' }}>No. Induk/NIS</td><td style={{ verticalAlign: 'middle' }}>: {student?.student?.nis || '-'}</td></tr>
                            </tbody>
                        </table>
                        <table style={{ width: '33%' }}>
                            <tbody>
                                <tr><td style={{ width: '120px', fontWeight: 'bold', verticalAlign: 'middle' }}>Kelas</td><td style={{ verticalAlign: 'middle' }}>: {student?.class?.name}</td></tr>
                                <tr><td style={{ fontWeight: 'bold', verticalAlign: 'middle' }}>Semester</td><td style={{ verticalAlign: 'middle' }}>: {semester} ({semester === '1' ? 'SATU' : 'DUA'})</td></tr>
                                <tr><td style={{ fontWeight: 'bold', verticalAlign: 'middle' }}>Tahun Pelajaran</td><td style={{ verticalAlign: 'middle' }}>: {activeYear}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Nilai Akademik</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '24px' }}>
                        <thead>
                            <tr>
                                <th style={{ ...headerCellStyle, width: '40px', textAlign: 'center' }}>No</th>
                                <th style={{ ...headerCellStyle, textAlign: 'left' }}>Mata Pelajaran</th>
                                <th style={{ ...headerCellStyle, width: '60px', textAlign: 'center' }}>Nilai</th>
                                <th style={{ ...headerCellStyle, width: '80px', textAlign: 'center' }}>Predikat</th>
                                <th style={{ ...headerCellStyle, textAlign: 'center' }}>Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(groupedGrades).map(([category, grades]: [string, any[]]) => (
                                <React.Fragment key={category}>
                                    {grades.map((grade: any, index: number) => (
                                        <tr key={grade.id}>
                                            <td style={cellStyleCenter}>{index + 1}</td>
                                            <td style={cellStyle}>{grade.subject?.display_name || '-'}</td>
                                            <td style={cellStyleCenter}>{grade.score ?? '-'}</td>
                                            <td style={{ ...cellStyleCenter, fontWeight: 'bold' }}>{grade.grade || '-'}</td>
                                            <td style={{ ...cellStyle, fontSize: '12px' }}>{grade.description || '-'}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>

                    <div style={{ border: '1px solid black', borderRadius: '12px', padding: '12px', fontSize: '14px', width: '66%', marginBottom: '32px' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Keterangan Predikat dan Deskripsi:</p>
                        <p>A (90-100) = Terlampaui, B (80-89) = Memenuhi, C (70-79) = Cukup Memenuhi, D (&lt;70) = Tidak Memenuhi</p>
                    </div>
                </div>

                {/* PAGE 4: CHARACTER & ATTENDANCE */}
                <div style={{ width: '100%', padding: '48px', pageBreakAfter: 'always' }}>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>Nilai-Nilai Luhur & Kepribadian</h3>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', marginBottom: '24px' }}>
                        <thead>
                            <tr>
                                <th style={{ ...headerCellStyle, width: '40px', textAlign: 'center' }}>No</th>
                                <th style={{ ...headerCellStyle, textAlign: 'left' }}>Catatan Nilai-nilai Luhur</th>
                                <th style={{ ...headerCellStyle, textAlign: 'center' }}>Deskripsi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {student?.character_assessments?.map((char: any, idx: number) => (
                                <tr key={char.id}>
                                    <td style={cellStyleCenter}>{idx + 1}</td>
                                    <td style={cellStyle}>{char.character_aspect}</td>
                                    <td style={cellStyle}>{char.description || '-'}</td>
                                </tr>
                            ))}
                            {(!student?.character_assessments || student.character_assessments.length === 0) && (
                                <tr><td colSpan={3} style={{ ...cellStyle, textAlign: 'center', fontStyle: 'italic', padding: '24px' }}>Belum ada penilaian karakter</td></tr>
                            )}
                        </tbody>
                    </table>

                    <div style={{ border: '1px solid black', borderRadius: '12px', padding: '12px', fontSize: '14px', width: '100%', marginBottom: '24px' }}>
                        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>Keterangan Predikat dan Deskripsi:</p>
                        <p>A = Sudah Terampil dan Terbiasa, B = Sudah Terbiasa, C = Belum Terbiasa</p>
                    </div>

                    <div style={{ display: 'flex', gap: '16px' }}>
                        <div style={{ width: '50%' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr><th colSpan={3} style={{ ...headerCellStyle, textAlign: 'center' }}>Ketidakhadiran</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td style={{ ...cellStyle, width: '30px' }}>1.</td><td style={cellStyle}>Sakit</td><td style={{ ...cellStyleCenter, width: '60px' }}>{student?.sick_days || '-'}</td></tr>
                                    <tr><td style={cellStyle}>2.</td><td style={cellStyle}>Izin</td><td style={cellStyleCenter}>{student?.permission_days || '-'}</td></tr>
                                    <tr><td style={cellStyle}>3.</td><td style={cellStyle}>Tanpa Keterangan</td><td style={cellStyleCenter}>{student?.absent_days || '-'}</td></tr>
                                </tbody>
                            </table>
                        </div>
                        <div style={{ width: '50%' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr><th colSpan={3} style={{ ...headerCellStyle, textAlign: 'center' }}>Kepribadian</th></tr>
                                </thead>
                                <tbody>
                                    <tr><td style={{ ...cellStyle, width: '30px' }}>1.</td><td style={cellStyle}>Kelakuan</td><td style={{ ...cellStyleCenter, width: '60px' }}>-</td></tr>
                                    <tr><td style={cellStyle}>2.</td><td style={cellStyle}>Kerajinan</td><td style={cellStyleCenter}>-</td></tr>
                                    <tr><td style={cellStyle}>3.</td><td style={cellStyle}>Kerapihan</td><td style={cellStyleCenter}>-</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* PAGE 5: EXTRAS, NOTES & SIGNATURES */}
                <div style={{ width: '100%', padding: '48px' }}>
                    <h3 style={{ fontWeight: 'bold', marginBottom: '8px' }}>PENGEMBANGAN DIRI</h3>

                    <div style={{ marginBottom: '16px' }}>
                        <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginLeft: '16px', marginBottom: '4px' }}>A. EKSTRA KULIKULER</h4>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                            <thead>
                                <tr>
                                    <th style={{ ...headerCellStyle, width: '40px', textAlign: 'center' }}>NO</th>
                                    <th style={{ ...headerCellStyle, textAlign: 'left' }}>Jenis Kegiatan</th>
                                    <th style={{ ...headerCellStyle, width: '100px', textAlign: 'center' }}>Predikat</th>
                                    <th style={{ ...headerCellStyle, textAlign: 'center' }}>Keterangan</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[1, 2, 3].map(num => (
                                    <tr key={num}>
                                        <td style={cellStyleCenter}>{num}</td>
                                        <td style={cellStyle}></td>
                                        <td style={cellStyleCenter}>A / B / C / D</td>
                                        <td style={cellStyle}></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div style={{ marginBottom: '32px' }}>
                        <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginLeft: '16px', marginBottom: '4px' }}>B. CATATAN MENGENAI SANTRI</h4>
                        <div style={{ border: '1px solid black', height: '96px', padding: '8px', fontSize: '14px' }}>
                            {student?.teacher_notes || ''}
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '48px', fontSize: '14px' }}>
                        <div style={{ textAlign: 'center', width: '33%' }}>
                            <p style={{ marginBottom: '80px' }}>Mengetahui<br />Orang Tua/Wali,</p>
                            <p style={{ borderTop: '1px solid black', paddingTop: '4px', width: '160px', margin: '0 auto' }}>( ......................... )</p>
                        </div>
                        <div style={{ textAlign: 'center', width: '33%' }}>
                            <p style={{ marginBottom: '8px' }}>Diberikan di: ........................<br />Tanggal : ........................</p>
                            <p style={{ marginBottom: '80px' }}>Pengajar MDT</p>
                            <p style={{ borderTop: '1px solid black', paddingTop: '4px', width: '160px', margin: '0 auto', fontWeight: 'bold' }}>{student?.class?.teacher_name || '.........................'}</p>
                        </div>
                    </div>
                </div>

            </div>
        </>
    );
};

export default PrintableReport;
