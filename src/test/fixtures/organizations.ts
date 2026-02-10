/**
 * Test fixtures for organization data (daerah, desa, kelompok)
 */

export const mockDaerah = {
    id: 'daerah-1',
    name: 'Bandung Selatan 2',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
}

export const mockDesa = {
    id: 'desa-1',
    name: 'Soreang',
    daerah_id: 'daerah-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
}

export const mockKelompok = {
    id: 'kelompok-1',
    name: 'Warlob 1',
    desa_id: 'desa-1',
    daerah_id: 'daerah-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
}

export const mockClass = {
    id: 'class-1',
    name: 'Pra Nikah',
    kelompok_id: 'kelompok-1',
    desa_id: 'desa-1',
    daerah_id: 'daerah-1',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
}
