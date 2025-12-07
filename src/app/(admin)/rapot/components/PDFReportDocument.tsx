'use client';

import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import type { PageSize } from '@react-pdf/types';

// Register fonts if needed (optional - uses default sans-serif)
// Font.register({ family: 'Roboto', src: '/fonts/Roboto-Regular.ttf' });

// Props type
interface PDFReportProps {
    student: any;
    activeYear: string;
    semester: string;
    options?: {
        pageSize?: 'A4' | 'LETTER';
        orientation?: 'portrait' | 'landscape';
    };
}

// School profile config
const SCHOOL_PROFILE = {
    name: "MADRASAH DINIYAH TAKWILIYAH",
    subName: "MAMBAUL HUDA",
    institution: "LEMBAGA DAKWAH ISLAM INDONESIA",
    address: "Kabupaten Bandung",
    nsm: "..............................",
};

// Styles
const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontSize: 11,
        fontFamily: 'Helvetica',
        lineHeight: 1.4,
    },
    // Cover Page
    coverPage: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '100%',
    },
    coverTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 8,
    },
    coverSubtitle: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    coverLogo: {
        width: 150,
        height: 150,
        borderRadius: 75,
        border: '3pt double #333',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 30,
    },
    coverNameBox: {
        border: '3pt double #333',
        padding: 16,
        width: '70%',
        alignItems: 'center',
        marginVertical: 10,
    },
    coverInstitution: {
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 30,
    },
    // Bio Page
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    bioRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    bioLabel: {
        width: 200,
    },
    bioColon: {
        width: 15,
    },
    bioValue: {
        flex: 1,
    },
    bioNumber: {
        width: 25,
    },
    // Tables
    table: {
        width: '100%',
        marginBottom: 16,
    },
    tableRow: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#000',
        minHeight: 24,
    },
    tableHeader: {
        backgroundColor: '#f0f0f0',
        fontWeight: 'bold',
    },
    tableCell: {
        borderRightWidth: 1,
        borderRightColor: '#000',
        padding: 6,
        justifyContent: 'center',
    },
    tableCellFirst: {
        borderLeftWidth: 1,
        borderLeftColor: '#000',
    },
    tableCellCenter: {
        alignItems: 'center',
    },
    headerRow: {
        borderTopWidth: 1,
        borderTopColor: '#000',
    },
    // Signature section
    signatureSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 60,
    },
    signatureBox: {
        width: '40%',
        alignItems: 'center',
    },
    signatureLine: {
        borderTopWidth: 1,
        borderTopColor: '#000',
        width: 150,
        marginTop: 60,
        paddingTop: 4,
    },
    // Legend box
    legendBox: {
        border: '1pt solid #000',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
    },
    // Flex containers
    row: {
        flexDirection: 'row',
    },
    halfWidth: {
        width: '50%',
    },
    gap: {
        width: 16,
    },
});

// Helper for date formatting
const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
};

// Table Cell Component
const TableCell = ({ children, width, center, first, bold, small }: {
    children: React.ReactNode;
    width?: number | string;
    center?: boolean;
    first?: boolean;
    bold?: boolean;
    small?: boolean;
}) => {
    const viewStyles: any[] = [
        styles.tableCell,
        first ? styles.tableCellFirst : null,
        center ? styles.tableCellCenter : null,
        width ? { width } : { flex: 1 },
    ].filter(Boolean);

    const textStyles: any[] = [
        bold ? { fontWeight: 'bold' as const } : null,
        small ? { fontSize: 9 } : null,
    ].filter(Boolean);

    return (
        <View style={viewStyles}>
            <Text style={textStyles.length > 0 ? textStyles : undefined}>{children}</Text>
        </View>
    );
};

// Main PDF Document Component
const PDFReportDocument: React.FC<PDFReportProps> = ({ student, activeYear, semester, options }) => {
    // Group grades by category
    const groupedGrades = React.useMemo(() => {
        const groups: { [key: string]: any[] } = {};
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

    // Flatten grades for numbering
    const allGrades = Object.values(groupedGrades).flat();

    return (
        <Document>
            {/* PAGE 1: COVER */}
            <Page size={options?.pageSize || 'A4'} style={styles.coverPage}>
                <View style={{ alignItems: 'center', marginTop: 40 }}>
                    <Text style={styles.coverTitle}>RAPOR</Text>
                    <Text style={styles.coverSubtitle}>{SCHOOL_PROFILE.name}</Text>
                    <Text style={[styles.coverSubtitle, { fontSize: 24, marginTop: 8 }]}>{SCHOOL_PROFILE.subName}</Text>
                </View>

                <View style={styles.coverLogo}>
                    <Text style={{ fontSize: 10, textAlign: 'center' }}>[LOGO TPQ]{'\n'}{SCHOOL_PROFILE.subName}</Text>
                </View>

                <View style={styles.coverNameBox}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Nama Peserta Didik</Text>
                    <Text style={{ fontSize: 18, fontWeight: 'bold', textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 4, paddingHorizontal: 20 }}>
                        {student?.student?.name || '-'}
                    </Text>
                </View>

                <View style={[styles.coverNameBox, { width: '50%' }]}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>No Statistik</Text>
                    <Text style={{ fontSize: 14, borderBottomWidth: 1, borderBottomColor: '#000', paddingBottom: 4, paddingHorizontal: 20 }}>
                        {SCHOOL_PROFILE.nsm}
                    </Text>
                </View>

                <Text style={styles.coverInstitution}>{SCHOOL_PROFILE.institution}</Text>
            </Page>

            {/* PAGE 2: STUDENT BIO */}
            <Page size={options?.pageSize || 'A4'} style={styles.page}>
                <Text style={styles.sectionTitle}>{SCHOOL_PROFILE.address}</Text>
                <Text style={[styles.sectionTitle, { marginTop: -10 }]}>KETERANGAN TENTANG PESERTA DIDIK</Text>

                <View style={{ marginTop: 20 }}>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}>1.</Text><Text style={styles.bioLabel}>Nama Peserta Didik (Lengkap)</Text><Text style={styles.bioColon}>:</Text><Text style={[styles.bioValue, { fontWeight: 'bold', textTransform: 'uppercase' }]}>{student?.student?.name || '-'}</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}>2.</Text><Text style={styles.bioLabel}>Nomor Induk</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>{student?.student?.nis || '-'}</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}>3.</Text><Text style={styles.bioLabel}>Tempat Tanggal Lahir</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>{student?.student?.birth_place || '-'}, {formatDate(student?.student?.birth_date)}</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}>4.</Text><Text style={styles.bioLabel}>Jenis kelamin</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>{student?.student?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}>5.</Text><Text style={styles.bioLabel}>Anak ke</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>-</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}>6.</Text><Text style={styles.bioLabel}>Alamat Peserta Didik</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>{student?.student?.address || '-'}</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}>7.</Text><Text style={styles.bioLabel}>Nomor Telepon Rumah</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>{student?.student?.parent_phone || '-'}</Text></View>

                    <View style={[styles.bioRow, { marginTop: 10 }]}><Text style={{ fontWeight: 'bold' }}>8. Nama Orang Tua</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}></Text><Text style={styles.bioLabel}>    a) Ayah</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>{student?.student?.father_name || '-'}</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}></Text><Text style={styles.bioLabel}>    b) Ibu</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>{student?.student?.mother_name || '-'}</Text></View>

                    <View style={styles.bioRow}><Text style={styles.bioNumber}>9.</Text><Text style={styles.bioLabel}>Alamat Orang Tua</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>{student?.student?.address || '-'}</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}>10.</Text><Text style={styles.bioLabel}>Nomor Telepon Rumah</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>{student?.student?.parent_phone || '-'}</Text></View>

                    <View style={[styles.bioRow, { marginTop: 10 }]}><Text style={{ fontWeight: 'bold' }}>11. Pekerjaan Orang Tua</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}></Text><Text style={styles.bioLabel}>    a) Ayah</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>-</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}></Text><Text style={styles.bioLabel}>    b) Ibu</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>-</Text></View>

                    <View style={styles.bioRow}><Text style={styles.bioNumber}>12.</Text><Text style={styles.bioLabel}>Nama Wali Peserta Didik</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>{student?.student?.guardian_name || '-'}</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}>13.</Text><Text style={styles.bioLabel}>Alamat Wali Peserta Didik</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>{student?.student?.guardian_address || '-'}</Text></View>
                    <View style={styles.bioRow}><Text style={styles.bioNumber}>14.</Text><Text style={styles.bioLabel}>Pekerjaan Wali Peserta Didik</Text><Text style={styles.bioColon}>:</Text><Text style={styles.bioValue}>-</Text></View>
                </View>

                <View style={styles.signatureSection}>
                    <View style={{ width: 100, height: 120, border: '1pt solid #000', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#999', fontSize: 10 }}>Pas Foto</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text>Bandung, {formatDate(new Date().toISOString())}</Text>
                        <Text style={styles.signatureLine}>Kepala Madrasah,</Text>
                        <Text style={{ marginTop: 4 }}>.......................................</Text>
                    </View>
                </View>
            </Page>

            {/* PAGE 3: GRADES */}
            <Page size={options?.pageSize || 'A4'} style={styles.page}>
                {/* Header info */}
                <View style={[styles.row, { marginBottom: 20 }]}>
                    <View style={styles.halfWidth}>
                        <View style={styles.bioRow}><Text style={{ width: 100, fontWeight: 'bold' }}>Nama Madrasah</Text><Text>: {SCHOOL_PROFILE.subName}</Text></View>
                        <View style={styles.bioRow}><Text style={{ width: 100, fontWeight: 'bold' }}>Alamat</Text><Text>: {SCHOOL_PROFILE.address}</Text></View>
                        <View style={styles.bioRow}><Text style={{ width: 100, fontWeight: 'bold' }}>Nama</Text><Text>: {student?.student?.name}</Text></View>
                        <View style={styles.bioRow}><Text style={{ width: 100, fontWeight: 'bold' }}>No. Induk/NIS</Text><Text>: {student?.student?.nis || '-'}</Text></View>
                    </View>
                    <View style={styles.halfWidth}>
                        <View style={styles.bioRow}><Text style={{ width: 100, fontWeight: 'bold' }}>Kelas</Text><Text>: {student?.class?.name}</Text></View>
                        <View style={styles.bioRow}><Text style={{ width: 100, fontWeight: 'bold' }}>Semester</Text><Text>: {semester} ({semester === '1' ? 'SATU' : 'DUA'})</Text></View>
                        <View style={styles.bioRow}><Text style={{ width: 100, fontWeight: 'bold' }}>Tahun Pelajaran</Text><Text>: {activeYear}</Text></View>
                    </View>
                </View>

                <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Nilai Akademik</Text>

                {/* Grades Table */}
                <View style={styles.table}>
                    {/* Header */}
                    <View style={[styles.tableRow, styles.tableHeader, styles.headerRow]}>
                        <TableCell width={35} center first>No</TableCell>
                        <TableCell>Mata Pelajaran</TableCell>
                        <TableCell width={50} center>Nilai</TableCell>
                        <TableCell width={60} center>Predikat</TableCell>
                        <TableCell width={150} center>Deskripsi</TableCell>
                    </View>
                    {/* Body */}
                    {allGrades.map((grade: any, index: number) => (
                        <View key={grade.id || index} style={styles.tableRow}>
                            <TableCell width={35} center first>{index + 1}</TableCell>
                            <TableCell>{grade.subject?.display_name || '-'}</TableCell>
                            <TableCell width={50} center>{grade.score ?? '-'}</TableCell>
                            <TableCell width={60} center bold>{grade.grade || '-'}</TableCell>
                            <TableCell width={150} small>{grade.description || '-'}</TableCell>
                        </View>
                    ))}
                </View>

                {/* Legend */}
                <View style={[styles.legendBox, { width: '70%' }]}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Keterangan Predikat dan Deskripsi:</Text>
                    <Text>A (90-100) = Terlampaui, B (80-89) = Memenuhi, C (70-79) = Cukup Memenuhi, D (&lt;70) = Tidak Memenuhi</Text>
                </View>
            </Page>

            {/* PAGE 4: CHARACTER & ATTENDANCE */}
            <Page size={options?.pageSize || 'A4'} style={styles.page}>
                <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>Nilai-Nilai Luhur & Kepribadian</Text>

                {/* Character Table */}
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader, styles.headerRow]}>
                        <TableCell width={35} center first>No</TableCell>
                        <TableCell>Catatan Nilai-nilai Luhur</TableCell>
                        <TableCell width={200} center>Deskripsi</TableCell>
                    </View>
                    {student?.character_assessments?.length > 0 ? (
                        student.character_assessments.map((char: any, idx: number) => (
                            <View key={char.id} style={styles.tableRow}>
                                <TableCell width={35} center first>{idx + 1}</TableCell>
                                <TableCell>{char.character_aspect}</TableCell>
                                <TableCell width={200}>{char.description || '-'}</TableCell>
                            </View>
                        ))
                    ) : (
                        <View style={styles.tableRow}>
                            <TableCell width={35} center first>-</TableCell>
                            <TableCell>Belum ada penilaian karakter</TableCell>
                            <TableCell width={200} center>-</TableCell>
                        </View>
                    )}
                </View>

                {/* Legend */}
                <View style={styles.legendBox}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>Keterangan Predikat dan Deskripsi:</Text>
                    <Text>A = Sudah Terampil dan Terbiasa, B = Sudah Terbiasa, C = Belum Terbiasa</Text>
                </View>

                {/* Attendance & Personality */}
                <View style={[styles.row, { marginTop: 16 }]}>
                    {/* Attendance */}
                    <View style={styles.halfWidth}>
                        <View style={styles.table}>
                            <View style={[styles.tableRow, styles.tableHeader, styles.headerRow]}>
                                <TableCell first center>Ketidakhadiran</TableCell>
                            </View>
                            <View style={styles.tableRow}>
                                <TableCell width={30} first>1.</TableCell>
                                <TableCell>Sakit</TableCell>
                                <TableCell width={50} center>{student?.sick_days || '-'}</TableCell>
                            </View>
                            <View style={styles.tableRow}>
                                <TableCell width={30} first>2.</TableCell>
                                <TableCell>Izin</TableCell>
                                <TableCell width={50} center>{student?.permission_days || '-'}</TableCell>
                            </View>
                            <View style={styles.tableRow}>
                                <TableCell width={30} first>3.</TableCell>
                                <TableCell>Tanpa Keterangan</TableCell>
                                <TableCell width={50} center>{student?.absent_days || '-'}</TableCell>
                            </View>
                        </View>
                    </View>

                    <View style={styles.gap} />

                    {/* Personality */}
                    <View style={styles.halfWidth}>
                        <View style={styles.table}>
                            <View style={[styles.tableRow, styles.tableHeader, styles.headerRow]}>
                                <TableCell first center>Kepribadian</TableCell>
                            </View>
                            <View style={styles.tableRow}>
                                <TableCell width={30} first>1.</TableCell>
                                <TableCell>Kelakuan</TableCell>
                                <TableCell width={50} center>-</TableCell>
                            </View>
                            <View style={styles.tableRow}>
                                <TableCell width={30} first>2.</TableCell>
                                <TableCell>Kerajinan</TableCell>
                                <TableCell width={50} center>-</TableCell>
                            </View>
                            <View style={styles.tableRow}>
                                <TableCell width={30} first>3.</TableCell>
                                <TableCell>Kerapihan</TableCell>
                                <TableCell width={50} center>-</TableCell>
                            </View>
                        </View>
                    </View>
                </View>
            </Page>

            {/* PAGE 5: EXTRAS & SIGNATURES */}
            <Page size={options?.pageSize || 'A4'} style={styles.page}>
                <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>PENGEMBANGAN DIRI</Text>

                <Text style={{ fontWeight: 'bold', fontSize: 10, marginLeft: 16, marginBottom: 4 }}>A. EKSTRA KULIKULER</Text>
                <View style={styles.table}>
                    <View style={[styles.tableRow, styles.tableHeader, styles.headerRow]}>
                        <TableCell width={35} center first>NO</TableCell>
                        <TableCell>Jenis Kegiatan</TableCell>
                        <TableCell width={80} center>Predikat</TableCell>
                        <TableCell width={120} center>Keterangan</TableCell>
                    </View>
                    {[1, 2, 3].map(num => (
                        <View key={num} style={styles.tableRow}>
                            <TableCell width={35} center first>{num}</TableCell>
                            <TableCell> </TableCell>
                            <TableCell width={80} center>A / B / C / D</TableCell>
                            <TableCell width={120}> </TableCell>
                        </View>
                    ))}
                </View>

                <Text style={{ fontWeight: 'bold', fontSize: 10, marginLeft: 16, marginTop: 16, marginBottom: 4 }}>B. CATATAN MENGENAI SANTRI</Text>
                <View style={{ border: '1pt solid #000', height: 80, padding: 8, marginBottom: 20 }}>
                    <Text>{student?.teacher_notes || ''}</Text>
                </View>

                {/* Signatures */}
                <View style={styles.signatureSection}>
                    <View style={styles.signatureBox}>
                        <Text>Mengetahui</Text>
                        <Text>Orang Tua/Wali,</Text>
                        <Text style={styles.signatureLine}>( ......................... )</Text>
                    </View>
                    <View style={styles.signatureBox}>
                        <Text>Diberikan di: ........................</Text>
                        <Text>Tanggal : ........................</Text>
                        <Text style={{ marginTop: 8 }}>Pengajar MDT</Text>
                        <Text style={[styles.signatureLine, { fontWeight: 'bold' }]}>{student?.class?.teacher_name || '.........................'}</Text>
                    </View>
                </View>
            </Page>
        </Document>
    );
};

export default PDFReportDocument;
