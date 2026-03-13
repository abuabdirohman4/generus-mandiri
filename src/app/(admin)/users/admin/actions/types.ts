export interface AdminData {
  username: string;
  full_name: string;
  email: string;
  password?: string;
  daerah_id: string;
  desa_id?: string | null;
  kelompok_id?: string | null;
  can_manage_materials?: boolean;
}

export interface AdminLevel {
  level: 'daerah' | 'desa' | 'kelompok';
  isAdminKelompok: boolean;
  isAdminDesa: boolean;
  isAdminDaerah: boolean;
}

export interface ValidationResult {
  ok: boolean;
  error?: string;
}

export interface AdminFilter {
  kelompok_id?: string;
  desa_id?: string;
  daerah_id?: string;
}
