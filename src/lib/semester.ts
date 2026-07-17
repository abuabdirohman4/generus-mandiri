/**
 * Semester aktif diturunkan dari bulan:
 * Juli–Desember = 1, Januari–Juni = 2.
 * Dipakai sebagai DEFAULT filter (monitoring/laporan/materi/rapot).
 * BUKAN untuk membaca data historis — data lama pakai semester tersimpan.
 */
export function getCurrentSemester(d: Date = new Date()): 1 | 2 {
    const month = d.getMonth() + 1 // 1-12
    return month >= 7 ? 1 : 2
}
