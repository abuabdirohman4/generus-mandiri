// src/app/(admin)/users/siswa/actions/sebaran/types.ts

export interface KelasNode {
  id: string
  name: string
  total_students: number
}

export interface KelompokNode {
  id: string
  name: string
  total_students: number
  kelas: KelasNode[]
}

export interface DesaNode {
  id: string
  name: string
  total_students: number
  kelompok: KelompokNode[]
}

export interface DaerahNode {
  id: string
  name: string
  total_students: number
  desa: DesaNode[]
}

export type SebaranSiswaData =
  | { level: 'daerah'; data: DaerahNode[] }
  | { level: 'desa'; data: DesaNode[] }
  | { level: 'kelompok'; data: KelompokNode[] }
  | { level: 'kelas'; data: KelasNode[] }

export interface SebaranSiswaStats {
  total_daerah?: number
  total_desa?: number
  total_kelompok?: number
  total_siswa: number
  kelompok_kosong: number
}
