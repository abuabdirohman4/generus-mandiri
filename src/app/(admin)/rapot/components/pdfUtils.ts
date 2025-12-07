'use client';

import React from 'react';
import { pdf } from '@react-pdf/renderer';
import PDFReportDocument, { PDFBulkReportDocument } from './PDFReportDocument';

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
 * Generate merged bulk PDF blob for multiple students
 */
export async function generateBulkPDFBlob(
    students: any[],
    activeYear: string,
    semester: string
): Promise<Blob> {
    const doc = React.createElement(PDFBulkReportDocument, {
        students,
        activeYear,
        semester,
    });

    const blob = await pdf(doc as any).toBlob();
    return blob;
}

/**
 * Download merged PDF for all students in one file
 */
export async function downloadBulkPDFs(
    students: any[],
    activeYear: string,
    semester: string,
    className: string,
    onProgress?: (current: number, total: number) => void
): Promise<void> {
    // Generate merged PDF with all students
    onProgress?.(0, students.length);

    const blob = await generateBulkPDFBlob(students, activeYear, semester);

    // Create download link
    const fileName = `Rapor_${className.replace(/\s+/g, '_')}_${activeYear.replace(/\//g, '-')}_Semester${semester}.pdf`;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onProgress?.(students.length, students.length);
}

