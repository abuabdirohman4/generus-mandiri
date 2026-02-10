/**
 * Test fixtures for student data
 */

export const mockStudent = {
    id: 'student-1',
    name: 'Ahmad Santoso',
    email: 'ahmad@example.com',
    phone: '081234567890',
    gender: 'L',
    daerah_id: 'daerah-1',
    desa_id: 'desa-1',
    kelompok_id: 'kelompok-1',
    status: 'active',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
}

export const mockStudents = [
    mockStudent,
    {
        id: 'student-2',
        name: 'Siti Nurhaliza',
        email: 'siti@example.com',
        phone: '081234567891',
        gender: 'P',
        daerah_id: 'daerah-1',
        desa_id: 'desa-1',
        kelompok_id: 'kelompok-1',
        status: 'active',
        created_at: '2024-01-02T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
    },
    {
        id: 'student-3',
        name: 'Budi Setiawan',
        email: 'budi@example.com',
        phone: '081234567892',
        gender: 'L',
        daerah_id: 'daerah-1',
        desa_id: 'desa-2',
        kelompok_id: 'kelompok-2',
        status: 'active',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
    },
]
