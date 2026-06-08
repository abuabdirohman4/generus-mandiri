import { describe, it, expect } from 'vitest';
import {
  determineAdminLevel,
  validateAdminData,
  validateAdminLevelRequirements,
  validatePasswordForCreate,
  transformAdminData,
  transformAdminList
} from '../logic';
import type { AdminData } from '../../types';

describe('Admin Business Logic', () => {
  describe('determineAdminLevel', () => {
    it('should identify Admin Daerah when only daerah_id is provided', () => {
      const data: AdminData = {
        username: 'admin_daerah',
        full_name: 'Admin Daerah',
        email: 'admin@daerah.com',
        daerah_id: 'daerah-1',
        desa_id: null,
        kelompok_id: null
      };

      const result = determineAdminLevel(data);

      expect(result.level).toBe('daerah');
      expect(result.isAdminDaerah).toBe(true);
      expect(result.isAdminDesa).toBe(false);
      expect(result.isAdminKelompok).toBe(false);
    });

    it('should identify Admin Desa when daerah_id and desa_id are provided', () => {
      const data: AdminData = {
        username: 'admin_desa',
        full_name: 'Admin Desa',
        email: 'admin@desa.com',
        daerah_id: 'daerah-1',
        desa_id: 'desa-1',
        kelompok_id: null
      };

      const result = determineAdminLevel(data);

      expect(result.level).toBe('desa');
      expect(result.isAdminDaerah).toBe(false);
      expect(result.isAdminDesa).toBe(true);
      expect(result.isAdminKelompok).toBe(false);
    });

    it('should identify Admin Kelompok when all IDs are provided', () => {
      const data: AdminData = {
        username: 'admin_kelompok',
        full_name: 'Admin Kelompok',
        email: 'admin@kelompok.com',
        daerah_id: 'daerah-1',
        desa_id: 'desa-1',
        kelompok_id: 'kelompok-1'
      };

      const result = determineAdminLevel(data);

      expect(result.level).toBe('kelompok');
      expect(result.isAdminDaerah).toBe(false);
      expect(result.isAdminDesa).toBe(false);
      expect(result.isAdminKelompok).toBe(true);
    });

    it('should handle undefined optional fields as Admin Daerah', () => {
      const data: AdminData = {
        username: 'admin',
        full_name: 'Admin',
        email: 'admin@test.com',
        daerah_id: 'daerah-1'
      };

      const result = determineAdminLevel(data);

      expect(result.level).toBe('daerah');
      expect(result.isAdminDaerah).toBe(true);
    });
  });

  describe('validateAdminData', () => {
    it('should pass for valid complete data', () => {
      const data: AdminData = {
        username: 'admin1',
        full_name: 'Admin One',
        email: 'admin@example.com',
        daerah_id: 'daerah-1',
        password: 'password123'
      };

      const result = validateAdminData(data);

      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject empty username', () => {
      const data: AdminData = {
        username: '',
        full_name: 'Admin One',
        email: 'admin@example.com',
        daerah_id: 'daerah-1'
      };

      const result = validateAdminData(data);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Username harus diisi');
    });

    it('should reject whitespace-only username', () => {
      const data: AdminData = {
        username: '   ',
        full_name: 'Admin One',
        email: 'admin@example.com',
        daerah_id: 'daerah-1'
      };

      const result = validateAdminData(data);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Username harus diisi');
    });

    it('should reject empty full_name', () => {
      const data: AdminData = {
        username: 'admin1',
        full_name: '',
        email: 'admin@example.com',
        daerah_id: 'daerah-1'
      };

      const result = validateAdminData(data);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Nama lengkap harus diisi');
    });

    it('should reject whitespace-only full_name', () => {
      const data: AdminData = {
        username: 'admin1',
        full_name: '  ',
        email: 'admin@example.com',
        daerah_id: 'daerah-1'
      };

      const result = validateAdminData(data);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Nama lengkap harus diisi');
    });

    it('should reject empty email', () => {
      const data: AdminData = {
        username: 'admin1',
        full_name: 'Admin One',
        email: '',
        daerah_id: 'daerah-1'
      };

      const result = validateAdminData(data);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Email harus diisi');
    });

    it('should reject whitespace-only email', () => {
      const data: AdminData = {
        username: 'admin1',
        full_name: 'Admin One',
        email: '   ',
        daerah_id: 'daerah-1'
      };

      const result = validateAdminData(data);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Email harus diisi');
    });

    it('should reject missing daerah_id', () => {
      const data = {
        username: 'admin1',
        full_name: 'Admin One',
        email: 'admin@example.com',
        daerah_id: ''
      } as AdminData;

      const result = validateAdminData(data);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Daerah harus dipilih');
    });
  });

  describe('validateAdminLevelRequirements', () => {
    it('should pass for Admin Daerah without desa_id or kelompok_id', () => {
      const data: AdminData = {
        username: 'admin_daerah',
        full_name: 'Admin Daerah',
        email: 'admin@daerah.com',
        daerah_id: 'daerah-1'
      };
      const level = { isAdminDesa: false, isAdminKelompok: false };

      const result = validateAdminLevelRequirements(data, level);

      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should require desa_id for Admin Desa', () => {
      const data: AdminData = {
        username: 'admin_desa',
        full_name: 'Admin Desa',
        email: 'admin@desa.com',
        daerah_id: 'daerah-1',
        desa_id: null
      };
      const level = { isAdminDesa: true, isAdminKelompok: false };

      const result = validateAdminLevelRequirements(data, level);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Desa harus dipilih untuk Admin Desa');
    });

    it('should pass for Admin Desa with desa_id', () => {
      const data: AdminData = {
        username: 'admin_desa',
        full_name: 'Admin Desa',
        email: 'admin@desa.com',
        daerah_id: 'daerah-1',
        desa_id: 'desa-1'
      };
      const level = { isAdminDesa: true, isAdminKelompok: false };

      const result = validateAdminLevelRequirements(data, level);

      expect(result.ok).toBe(true);
    });

    it('should require kelompok_id for Admin Kelompok', () => {
      const data: AdminData = {
        username: 'admin_kelompok',
        full_name: 'Admin Kelompok',
        email: 'admin@kelompok.com',
        daerah_id: 'daerah-1',
        desa_id: 'desa-1',
        kelompok_id: null
      };
      const level = { isAdminDesa: false, isAdminKelompok: true };

      const result = validateAdminLevelRequirements(data, level);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Kelompok harus dipilih untuk Admin Kelompok');
    });

    it('should pass for Admin Kelompok with kelompok_id', () => {
      const data: AdminData = {
        username: 'admin_kelompok',
        full_name: 'Admin Kelompok',
        email: 'admin@kelompok.com',
        daerah_id: 'daerah-1',
        desa_id: 'desa-1',
        kelompok_id: 'kelompok-1'
      };
      const level = { isAdminDesa: false, isAdminKelompok: true };

      const result = validateAdminLevelRequirements(data, level);

      expect(result.ok).toBe(true);
    });
  });

  describe('validatePasswordForCreate', () => {
    it('should pass for valid password', () => {
      const result = validatePasswordForCreate('password123');

      expect(result.ok).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject missing password', () => {
      const result = validatePasswordForCreate(undefined);

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Password harus diisi');
    });

    it('should reject empty password', () => {
      const result = validatePasswordForCreate('');

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Password harus diisi');
    });
  });

  describe('transformAdminData', () => {
    it('should handle array format for org names', () => {
      const admin = {
        id: 'user-1',
        username: 'admin1',
        full_name: 'Admin One',
        daerah: [{ name: 'Daerah One' }],
        desa: [{ name: 'Desa One' }],
        kelompok: [{ name: 'Kelompok One' }]
      };

      const result = transformAdminData(admin);

      expect(result.daerah_name).toBe('Daerah One');
      expect(result.desa_name).toBe('Desa One');
      expect(result.kelompok_name).toBe('Kelompok One');
    });

    it('should handle object format for org names', () => {
      const admin = {
        id: 'user-1',
        username: 'admin1',
        full_name: 'Admin One',
        daerah: { name: 'Daerah One' },
        desa: { name: 'Desa One' },
        kelompok: { name: 'Kelompok One' }
      };

      const result = transformAdminData(admin);

      expect(result.daerah_name).toBe('Daerah One');
      expect(result.desa_name).toBe('Desa One');
      expect(result.kelompok_name).toBe('Kelompok One');
    });

    it('should handle missing desa and kelompok', () => {
      const admin = {
        id: 'user-1',
        username: 'admin1',
        full_name: 'Admin One',
        daerah: { name: 'Daerah One' },
        desa: null,
        kelompok: null
      };

      const result = transformAdminData(admin);

      expect(result.daerah_name).toBe('Daerah One');
      expect(result.desa_name).toBe('');
      expect(result.kelompok_name).toBe('');
    });

    it('should handle empty array for org names', () => {
      const admin = {
        id: 'user-1',
        username: 'admin1',
        full_name: 'Admin One',
        daerah: [],
        desa: [],
        kelompok: []
      };

      const result = transformAdminData(admin);

      expect(result.daerah_name).toBe('');
      expect(result.desa_name).toBe('');
      expect(result.kelompok_name).toBe('');
    });

    it('should preserve all original fields', () => {
      const admin = {
        id: 'user-1',
        username: 'admin1',
        full_name: 'Admin One',
        email: 'admin@example.com',
        role: 'admin',
        daerah: { name: 'Daerah One' },
        desa: null,
        kelompok: null
      };

      const result = transformAdminData(admin);

      expect(result.id).toBe('user-1');
      expect(result.username).toBe('admin1');
      expect(result.full_name).toBe('Admin One');
      expect(result.email).toBe('admin@example.com');
      expect(result.role).toBe('admin');
    });
  });

  describe('transformAdminList', () => {
    it('should transform all admins in the list', () => {
      const admins = [
        {
          id: 'user-1',
          username: 'admin1',
          full_name: 'Admin One',
          daerah: { name: 'Daerah One' },
          desa: { name: 'Desa One' },
          kelompok: null
        },
        {
          id: 'user-2',
          username: 'admin2',
          full_name: 'Admin Two',
          daerah: { name: 'Daerah Two' },
          desa: null,
          kelompok: null
        }
      ];

      const result = transformAdminList(admins);

      expect(result).toHaveLength(2);
      expect(result[0].daerah_name).toBe('Daerah One');
      expect(result[0].desa_name).toBe('Desa One');
      expect(result[0].kelompok_name).toBe('');
      expect(result[1].daerah_name).toBe('Daerah Two');
      expect(result[1].desa_name).toBe('');
    });

    it('should handle empty list', () => {
      const result = transformAdminList([]);

      expect(result).toEqual([]);
    });

    it('should handle list with mixed formats', () => {
      const admins = [
        {
          id: 'user-1',
          daerah: [{ name: 'Daerah Array' }],
          desa: { name: 'Desa Object' },
          kelompok: null
        },
        {
          id: 'user-2',
          daerah: { name: 'Daerah Object' },
          desa: [],
          kelompok: [{ name: 'Kelompok Array' }]
        }
      ];

      const result = transformAdminList(admins);

      expect(result[0].daerah_name).toBe('Daerah Array');
      expect(result[0].desa_name).toBe('Desa Object');
      expect(result[1].daerah_name).toBe('Daerah Object');
      expect(result[1].kelompok_name).toBe('Kelompok Array');
    });
  });
});
