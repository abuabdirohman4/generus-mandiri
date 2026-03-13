// Layer 2: Business logic
// NO 'use server' - pure functions

import type { AdminData, AdminLevel, ValidationResult } from '../types';

/**
 * Determines the admin level based on provided organizational IDs
 */
export function determineAdminLevel(data: AdminData): AdminLevel {
  const isAdminKelompok = !!data.kelompok_id;
  const isAdminDesa = !data.kelompok_id && !!data.desa_id;
  const isAdminDaerah = !data.kelompok_id && !data.desa_id;

  let level: 'daerah' | 'desa' | 'kelompok' = 'daerah';
  if (isAdminKelompok) level = 'kelompok';
  else if (isAdminDesa) level = 'desa';

  return { level, isAdminKelompok, isAdminDesa, isAdminDaerah };
}

/**
 * Validates required admin data fields
 */
export function validateAdminData(data: AdminData): ValidationResult {
  if (!data.username?.trim()) {
    return { ok: false, error: 'Username harus diisi' };
  }
  if (!data.full_name?.trim()) {
    return { ok: false, error: 'Nama lengkap harus diisi' };
  }
  if (!data.email?.trim()) {
    return { ok: false, error: 'Email harus diisi' };
  }
  if (!data.daerah_id) {
    return { ok: false, error: 'Daerah harus dipilih' };
  }
  return { ok: true };
}

/**
 * Validates admin level-specific requirements
 */
export function validateAdminLevelRequirements(
  data: AdminData,
  level: { isAdminDesa: boolean; isAdminKelompok: boolean }
): ValidationResult {
  if (level.isAdminDesa && !data.desa_id) {
    return { ok: false, error: 'Desa harus dipilih untuk Admin Desa' };
  }
  if (level.isAdminKelompok && !data.kelompok_id) {
    return { ok: false, error: 'Kelompok harus dipilih untuk Admin Kelompok' };
  }
  return { ok: true };
}

/**
 * Validates password for admin creation
 */
export function validatePasswordForCreate(password?: string): ValidationResult {
  if (!password) {
    return { ok: false, error: 'Password harus diisi' };
  }
  return { ok: true };
}

/**
 * Transforms admin data to flatten organization names
 */
export function transformAdminData(admin: any): any {
  return {
    ...admin,
    daerah_name: Array.isArray(admin.daerah)
      ? admin.daerah[0]?.name || ''
      : admin.daerah?.name || '',
    desa_name: Array.isArray(admin.desa)
      ? admin.desa[0]?.name || ''
      : admin.desa?.name || '',
    kelompok_name: Array.isArray(admin.kelompok)
      ? admin.kelompok[0]?.name || ''
      : admin.kelompok?.name || ''
  };
}

/**
 * Transforms a list of admins
 */
export function transformAdminList(admins: any[]): any[] {
  return admins.map(transformAdminData);
}
