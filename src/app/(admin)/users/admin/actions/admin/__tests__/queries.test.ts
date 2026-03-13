import { describe, it, expect, vi, beforeEach } from 'vitest';
import { insertAdminProfile, updateAdminProfile, fetchAdmins } from '../queries';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Admin Queries', () => {
  describe('insertAdminProfile', () => {
    it('should insert profile with correct data', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockSupabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert })
      } as any;

      await insertAdminProfile(mockSupabase, {
        id: 'user-1',
        username: 'admin1',
        full_name: 'Admin One',
        email: 'admin@example.com',
        role: 'admin',
        daerah_id: 'daerah-1'
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockInsert).toHaveBeenCalledWith([{
        id: 'user-1',
        username: 'admin1',
        full_name: 'Admin One',
        email: 'admin@example.com',
        role: 'admin',
        daerah_id: 'daerah-1'
      }]);
    });

    it('should insert profile with all optional fields', async () => {
      const mockInsert = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockSupabase = {
        from: vi.fn().mockReturnValue({ insert: mockInsert })
      } as any;

      await insertAdminProfile(mockSupabase, {
        id: 'user-2',
        username: 'admin2',
        full_name: 'Admin Two',
        email: 'admin2@example.com',
        role: 'admin',
        daerah_id: 'daerah-1',
        desa_id: 'desa-1',
        kelompok_id: 'kelompok-1',
        can_manage_materials: true
      });

      expect(mockInsert).toHaveBeenCalledWith([{
        id: 'user-2',
        username: 'admin2',
        full_name: 'Admin Two',
        email: 'admin2@example.com',
        role: 'admin',
        daerah_id: 'daerah-1',
        desa_id: 'desa-1',
        kelompok_id: 'kelompok-1',
        can_manage_materials: true
      }]);
    });
  });

  describe('updateAdminProfile', () => {
    it('should update profile with correct data', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: {}, error: null });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEq });
      const mockSupabase = {
        from: vi.fn().mockReturnValue({ update: mockUpdate })
      } as any;

      const updateData = {
        username: 'admin1_updated',
        full_name: 'Admin One Updated',
        email: 'admin_updated@example.com',
        daerah_id: 'daerah-2',
        desa_id: 'desa-1',
        kelompok_id: null,
        can_manage_materials: true,
        updated_at: '2026-03-12T10:00:00.000Z'
      };

      await updateAdminProfile(mockSupabase, 'user-1', updateData);

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockUpdate).toHaveBeenCalledWith(updateData);
      expect(mockEq).toHaveBeenCalledWith('id', 'user-1');
    });
  });

  describe('fetchAdmins', () => {
    let mockSupabase: any;
    let mockOrder: any;
    let mockSelect: any;
    let mockIn: any;

    beforeEach(() => {
      mockOrder = vi.fn().mockResolvedValue({ data: [], error: null });
      mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      mockSupabase = {
        from: vi.fn().mockReturnValue({ select: mockSelect })
      };
    });

    it('should fetch all admins when no filter provided', async () => {
      await fetchAdmins(mockSupabase);

      expect(mockSupabase.from).toHaveBeenCalledWith('profiles');
      expect(mockSelect).toHaveBeenCalledWith(`
      *,
      daerah:daerah_id(name),
      desa:desa_id(name),
      kelompok:kelompok_id(name)
    `);
      expect(mockIn).toHaveBeenCalledWith('role', ['admin', 'superadmin']);
      expect(mockOrder).toHaveBeenCalledWith('username');
    });

    it('should filter by kelompok_id for Admin Kelompok', async () => {
      const mockEq = vi.fn().mockResolvedValue({ data: [], error: null });
      mockOrder = vi.fn().mockReturnValue({ eq: mockEq });
      mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      mockSupabase.from = vi.fn().mockReturnValue({ select: mockSelect });

      await fetchAdmins(mockSupabase, { kelompok_id: 'kelompok-1' });

      expect(mockEq).toHaveBeenCalledWith('kelompok_id', 'kelompok-1');
    });

    it('should filter by desa_id for Admin Desa', async () => {
      const mockNot = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEq = vi.fn().mockReturnValue({ not: mockNot });
      mockOrder = vi.fn().mockReturnValue({ eq: mockEq });
      mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      mockSupabase.from = vi.fn().mockReturnValue({ select: mockSelect });

      await fetchAdmins(mockSupabase, { desa_id: 'desa-1' });

      expect(mockEq).toHaveBeenCalledWith('desa_id', 'desa-1');
      expect(mockNot).toHaveBeenCalledWith('desa_id', 'is', null);
    });

    it('should filter by daerah_id for Admin Daerah', async () => {
      const mockNot = vi.fn().mockResolvedValue({ data: [], error: null });
      const mockEq = vi.fn().mockReturnValue({ not: mockNot });
      mockOrder = vi.fn().mockReturnValue({ eq: mockEq });
      mockIn = vi.fn().mockReturnValue({ order: mockOrder });
      mockSelect = vi.fn().mockReturnValue({ in: mockIn });
      mockSupabase.from = vi.fn().mockReturnValue({ select: mockSelect });

      await fetchAdmins(mockSupabase, { daerah_id: 'daerah-1' });

      expect(mockEq).toHaveBeenCalledWith('daerah_id', 'daerah-1');
      expect(mockNot).toHaveBeenCalledWith('desa_id', 'is', null);
    });
  });
});
