'use client';

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import PDFReportDocument from './PDFReportDocument';

interface DownloadPDFOptions {
    student: any;
    activeYear: string;
    semester: string;
    fileName?: string;
}

/**
 * Generate PDF blob from student data using @react-pdf/renderer
 */
export async function generatePDFBlob(options: DownloadPDFOptions): Promise<Blob> {
    const { student, activeYear, semester } = options;

    const doc = React.createElement(PDFReportDocument, {
        student,
        activeYear,
        semester,
    });

    // Type assertion needed because pdf() expects ReactElement<DocumentProps>
    // but our component wrapper returns the Document element
    const blob = await pdf(doc as any).toBlob();
    return blob;
}

/**
 * Download PDF for a single student
 */
export async function downloadStudentPDF(options: DownloadPDFOptions): Promise<void> {
    const { student, activeYear, semester, fileName } = options;

    const studentName = student?.student?.name || 'Siswa';
    const defaultFileName = `Rapor_${studentName.replace(/\s+/g, '_')}_Semester${semester}.pdf`;

    const blob = await generatePDFBlob(options);

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || defaultFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Download PDFs for multiple students as separate files (one by one)
 * For bulk download, consider using JSZip to create a zip file
 */
export async function downloadBulkPDFs(
    students: any[],
    activeYear: string,
    semester: string,
    className: string,
    onProgress?: (current: number, total: number) => void
): Promise<void> {
    // Option 1: Download one by one (simple but many files)
    // Option 2: Use JSZip to bundle (need to install jszip)

    // For now, we'll generate a single merged PDF isn't straightforward with react-pdf
    // So let's download them one by one with a delay
    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        onProgress?.(i + 1, students.length);

        await downloadStudentPDF({
            student,
            activeYear,
            semester,
            fileName: `Rapor_${className}_${student.student?.name?.replace(/\s+/g, '_')}_Semester${semester}.pdf`
        });

        // Small delay between downloads
        if (i < students.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
}
