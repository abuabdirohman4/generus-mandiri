import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import * as studentRepository from '../studentRepository'

// Mock Supabase client
const createMockSupabaseClient = () => {
  const mockClient = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  } as unknown as SupabaseClient

  return mockClient
}

describe('studentRepository', () => {
  let mockClient: SupabaseClient

  beforeEach(() => {
    mockClient = createMockSupabaseClient()
    vi.clearAllMocks()
  })

  describe('getCurrentUserProfile', () => {
    it('should return user profile with classes', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = {
        role: 'teacher',
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        teacher_classes: [
          { class_id: 'class-1', classes: { id: 'class-1', name: 'Class A' } },
        ],
      }

      ;(mockClient.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      })
      ;(mockClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile }),
          }),
        }),
      })

      const result = await studentRepository.getCurrentUserProfile(mockClient)

      expect(result).toEqual({
        role: 'teacher',
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        classes: [{ id: 'class-1', name: 'Class A' }],
      })
    })

    it('should throw error when user not authenticated', async () => {
      ;(mockClient.auth.getUser as any).mockResolvedValue({
        data: { user: null },
      })

      await expect(
        studentRepository.getCurrentUserProfile(mockClient)
      ).rejects.toThrow('User not authenticated')
    })

    it('should throw error when profile not found', async () => {
      const mockUser = { id: 'user-1' }

      ;(mockClient.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      })
      ;(mockClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      })

      await expect(
        studentRepository.getCurrentUserProfile(mockClient)
      ).rejects.toThrow('User profile not found')
    })

    it('should handle empty teacher_classes array', async () => {
      const mockUser = { id: 'user-1' }
      const mockProfile = {
        role: 'admin',
        kelompok_id: 'kelompok-1',
        desa_id: null,
        daerah_id: null,
        teacher_classes: [],
      }

      ;(mockClient.auth.getUser as any).mockResolvedValue({
        data: { user: mockUser },
      })
      ;(mockClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockProfile }),
          }),
        }),
      })

      const result = await studentRepository.getCurrentUserProfile(mockClient)

      expect(result.classes).toEqual([])
    })
  })

  describe('findStudentById', () => {
    it('should return student with complete data', async () => {
      const mockStudent = {
        id: 'student-1',
        name: 'John Doe',
        gender: 'Laki-laki',
        class_id: 'class-1',
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        status: 'active',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        deleted_at: null,
        student_classes: [{ classes: { id: 'class-1', name: 'Class A' } }],
        daerah: { name: 'Daerah A' },
        desa: { name: 'Desa A' },
        kelompok: { name: 'Kelompok A' },
      }

      ;(mockClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: mockStudent }),
          }),
        }),
      })

      const result = await studentRepository.findStudentById(
        mockClient,
        'student-1'
      )

      expect(result).toEqual(mockStudent)
    })

    it('should return null when student not found', async () => {
      ;(mockClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null }),
          }),
        }),
      })

      const result = await studentRepository.findStudentById(
        mockClient,
        'nonexistent'
      )

      expect(result).toBeNull()
    })

    it('should throw error on database error', async () => {
      ;(mockClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      await expect(
        studentRepository.findStudentById(mockClient, 'student-1')
      ).rejects.toThrow('Database error: Database error')
    })
  })

  describe('hasAttendanceLogs', () => {
    it('should return true when student has attendance logs', async () => {
      ;(mockClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockResolvedValue({ data: { id: 'log-1' } }),
            }),
          }),
        }),
      })

      const result = await studentRepository.hasAttendanceLogs(
        mockClient,
        'student-1'
      )

      expect(result).toBe(true)
    })

    it('should return false when student has no attendance logs', async () => {
      ;(mockClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      })

      const result = await studentRepository.hasAttendanceLogs(
        mockClient,
        'student-1'
      )

      expect(result).toBe(false)
    })

    it('should return false on database error', async () => {
      ;(mockClient.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi
                .fn()
                .mockRejectedValue(new Error('Database error')),
            }),
          }),
        }),
      })

      const result = await studentRepository.hasAttendanceLogs(
        mockClient,
        'student-1'
      )

      expect(result).toBe(false) // Should not throw, just return false
    })
  })

  describe('insertStudent', () => {
    it('should insert student and return new student', async () => {
      const insertData = {
        name: 'Jane Doe',
        gender: 'Perempuan',
        class_id: 'class-1',
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        status: 'active',
      }

      const newStudent = {
        id: 'student-2',
        ...insertData,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
      }

      ;(mockClient.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: newStudent }),
          }),
        }),
      })

      const result = await studentRepository.insertStudent(
        mockClient,
        insertData as any
      )

      expect(result).toEqual(newStudent)
    })

    it('should throw error on insert failure', async () => {
      const insertData = {
        name: 'Jane Doe',
        gender: 'Perempuan',
        class_id: 'class-1',
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        status: 'active',
      }

      ;(mockClient.from as any).mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Insert failed' },
            }),
          }),
        }),
      })

      await expect(
        studentRepository.insertStudent(mockClient, insertData as any)
      ).rejects.toThrow('Database error: Insert failed')
    })
  })

  describe('updateStudentData', () => {
    it('should update student and return updated data', async () => {
      const updateData = {
        name: 'John Updated',
        gender: 'Laki-laki',
      }

      const updatedStudent = {
        id: 'student-1',
        ...updateData,
        class_id: 'class-1',
        updated_at: '2025-01-02',
      }

      ;(mockClient.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: updatedStudent }),
            }),
          }),
        }),
      })

      const result = await studentRepository.updateStudentData(
        mockClient,
        'student-1',
        updateData as any
      )

      expect(result).toEqual(updatedStudent)
    })

    it('should throw error when student not found', async () => {
      ;(mockClient.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
              }),
            }),
          }),
        }),
      })

      await expect(
        studentRepository.updateStudentData(mockClient, 'nonexistent', {} as any)
      ).rejects.toThrow('Database error: Not found')
    })
  })

  describe('softDeleteStudent', () => {
    it('should mark student as deleted', async () => {
      ;(mockClient.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      await expect(
        studentRepository.softDeleteStudent(mockClient, 'student-1', 'user-1')
      ).resolves.not.toThrow()
    })

    it('should throw error on delete failure', async () => {
      ;(mockClient.from as any).mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Delete failed' },
          }),
        }),
      })

      await expect(
        studentRepository.softDeleteStudent(mockClient, 'student-1', 'user-1')
      ).rejects.toThrow('Database error: Delete failed')
    })
  })

  describe('hardDeleteStudent', () => {
    it('should permanently delete student', async () => {
      ;(mockClient.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      })

      await expect(
        studentRepository.hardDeleteStudent(mockClient, 'student-1')
      ).resolves.not.toThrow()
    })

    it('should throw error on delete failure', async () => {
      ;(mockClient.from as any).mockReturnValue({
        delete: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            error: { message: 'Delete failed' },
          }),
        }),
      })

      await expect(
        studentRepository.hardDeleteStudent(mockClient, 'student-1')
      ).rejects.toThrow('Database error: Delete failed')
    })
  })
})
