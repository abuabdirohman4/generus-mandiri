import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import * as studentUseCases from '../studentUseCases'
import * as studentRepository from '@/repositories/studentRepository'
import * as studentTransform from '../studentTransform'

// Mock modules
vi.mock('@/repositories/studentRepository')
vi.mock('../studentTransform')

describe('studentUseCases - getAllStudents', () => {
  let mockSupabaseClient: SupabaseClient
  let mockAdminClient: SupabaseClient

  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabaseClient = {} as SupabaseClient
    mockAdminClient = {} as SupabaseClient
  })

  describe('for teacher role', () => {
    it('should get students from teacher classes only', async () => {
      const currentUser = {
        role: 'teacher',
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        classes: [
          { id: 'class-1', name: 'Class A' },
          { id: 'class-2', name: 'Class B' },
        ],
      }

      const mockStudentRows = [
        {
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
          student_classes: [],
          daerah: { name: 'Daerah A' },
          desa: { name: 'Desa A' },
          kelompok: { name: 'Kelompok A' },
        },
      ]

      const mockTransformedStudents = [
        {
          id: 'student-1',
          name: 'John Doe',
          gender: 'Laki-laki',
          class_id: 'class-1',
          class_name: 'Class A',
          kelompok_id: 'kelompok-1',
          desa_id: 'desa-1',
          daerah_id: 'daerah-1',
          status: 'active',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          classes: [],
          daerah_name: 'Daerah A',
          desa_name: 'Desa A',
          kelompok_name: 'Kelompok A',
        },
      ]

      vi.mocked(studentRepository.findStudentsByClassIds).mockResolvedValue(
        mockStudentRows
      )
      vi.mocked(studentTransform.transformStudentRows).mockReturnValue(
        mockTransformedStudents
      )

      const result = await studentUseCases.getAllStudents({
        supabaseClient: mockSupabaseClient,
        adminClient: mockAdminClient,
        currentUser,
        classId: undefined,
      })

      expect(studentRepository.findStudentsByClassIds).toHaveBeenCalledWith(
        mockAdminClient,
        ['class-1', 'class-2']
      )
      expect(studentTransform.transformStudentRows).toHaveBeenCalledWith(
        mockStudentRows
      )
      expect(result).toEqual(mockTransformedStudents)
    })

    it('should filter by specific class when classId provided', async () => {
      const currentUser = {
        role: 'teacher',
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        classes: [
          { id: 'class-1', name: 'Class A' },
          { id: 'class-2', name: 'Class B' },
        ],
      }

      const mockStudentRows = [
        {
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
          student_classes: [],
          daerah: { name: 'Daerah A' },
          desa: { name: 'Desa A' },
          kelompok: { name: 'Kelompok A' },
        },
      ]

      vi.mocked(studentRepository.findStudentsByClassIds).mockResolvedValue(
        mockStudentRows
      )
      vi.mocked(studentTransform.transformStudentRows).mockReturnValue([])

      await studentUseCases.getAllStudents({
        supabaseClient: mockSupabaseClient,
        adminClient: mockAdminClient,
        currentUser,
        classId: 'class-1', // Filter by specific class
      })

      // Should only query for class-1 (intersection of teacher classes + filter)
      expect(studentRepository.findStudentsByClassIds).toHaveBeenCalledWith(
        mockAdminClient,
        ['class-1']
      )
    })

    it('should return empty array when filtering class not in teacher classes', async () => {
      const currentUser = {
        role: 'teacher',
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        classes: [
          { id: 'class-1', name: 'Class A' },
          { id: 'class-2', name: 'Class B' },
        ],
      }

      const result = await studentUseCases.getAllStudents({
        supabaseClient: mockSupabaseClient,
        adminClient: mockAdminClient,
        currentUser,
        classId: 'class-999', // Not in teacher's classes
      })

      expect(studentRepository.findStudentsByClassIds).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })

    it('should return empty array when teacher has no classes', async () => {
      const currentUser = {
        role: 'teacher',
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        classes: [], // No classes assigned
      }

      const result = await studentUseCases.getAllStudents({
        supabaseClient: mockSupabaseClient,
        adminClient: mockAdminClient,
        currentUser,
        classId: undefined,
      })

      expect(studentRepository.findStudentsByClassIds).not.toHaveBeenCalled()
      expect(result).toEqual([])
    })
  })

  describe('for admin/superadmin role', () => {
    it('should get all students without class filtering for admin', async () => {
      const currentUser = {
        role: 'admin',
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        classes: [],
      }

      const mockStudentRows = [
        {
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
          student_classes: [],
          daerah: { name: 'Daerah A' },
          desa: { name: 'Desa A' },
          kelompok: { name: 'Kelompok A' },
        },
      ]

      const mockTransformedStudents = [
        {
          id: 'student-1',
          name: 'John Doe',
          gender: 'Laki-laki',
          class_id: 'class-1',
          class_name: 'Class A',
          kelompok_id: 'kelompok-1',
          desa_id: 'desa-1',
          daerah_id: 'daerah-1',
          status: 'active',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          classes: [],
          daerah_name: 'Daerah A',
          desa_name: 'Desa A',
          kelompok_name: 'Kelompok A',
        },
      ]

      // Mock Supabase query builder for admin
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockStudentRows, error: null }),
      }

      mockSupabaseClient.from = vi.fn().mockReturnValue(mockQuery)
      vi.mocked(studentTransform.transformStudentRows).mockReturnValue(
        mockTransformedStudents
      )

      const result = await studentUseCases.getAllStudents({
        supabaseClient: mockSupabaseClient as any,
        adminClient: mockAdminClient,
        currentUser,
        classId: undefined,
      })

      // Verify it doesn't use findStudentsByClassIds (which is for teachers)
      expect(studentRepository.findStudentsByClassIds).not.toHaveBeenCalled()
      // Verify it uses supabase client with RLS
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('students')
      expect(result).toEqual(mockTransformedStudents)
    })
  })
})
