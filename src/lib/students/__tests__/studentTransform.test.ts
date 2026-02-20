import { describe, it, expect } from 'vitest'
import * as studentTransform from '../studentTransform'
import type { StudentRow } from '@/repositories/studentRepository'

describe('studentTransform', () => {
  describe('extractDaerahName', () => {
    it('should extract name from object', () => {
      expect(studentTransform.extractDaerahName({ name: 'Daerah A' })).toBe(
        'Daerah A'
      )
    })

    it('should extract name from array with object', () => {
      expect(
        studentTransform.extractDaerahName([{ name: 'Daerah B' }])
      ).toBe('Daerah B')
    })

    it('should return empty string when null', () => {
      expect(studentTransform.extractDaerahName(null)).toBe('')
    })

    it('should return empty string when undefined', () => {
      expect(studentTransform.extractDaerahName(undefined)).toBe('')
    })

    it('should return empty string when empty array', () => {
      expect(studentTransform.extractDaerahName([])).toBe('')
    })

    it('should return empty string when object has no name', () => {
      expect(studentTransform.extractDaerahName({ id: '123' })).toBe('')
    })

    it('should return empty string when array has no valid object', () => {
      expect(studentTransform.extractDaerahName([null])).toBe('')
      expect(studentTransform.extractDaerahName([undefined])).toBe('')
      expect(studentTransform.extractDaerahName([{}])).toBe('')
    })
  })

  describe('extractDesaName', () => {
    it('should extract name from object', () => {
      expect(studentTransform.extractDesaName({ name: 'Desa A' })).toBe(
        'Desa A'
      )
    })

    it('should extract name from array with object', () => {
      expect(studentTransform.extractDesaName([{ name: 'Desa B' }])).toBe(
        'Desa B'
      )
    })

    it('should return empty string when null/undefined/empty', () => {
      expect(studentTransform.extractDesaName(null)).toBe('')
      expect(studentTransform.extractDesaName(undefined)).toBe('')
      expect(studentTransform.extractDesaName([])).toBe('')
    })
  })

  describe('extractKelompokName', () => {
    it('should extract name from object', () => {
      expect(studentTransform.extractKelompokName({ name: 'Kelompok A' })).toBe(
        'Kelompok A'
      )
    })

    it('should extract name from array with object', () => {
      expect(
        studentTransform.extractKelompokName([{ name: 'Kelompok B' }])
      ).toBe('Kelompok B')
    })

    it('should return empty string when null/undefined/empty', () => {
      expect(studentTransform.extractKelompokName(null)).toBe('')
      expect(studentTransform.extractKelompokName(undefined)).toBe('')
      expect(studentTransform.extractKelompokName([])).toBe('')
    })
  })

  describe('extractStudentClasses', () => {
    it('should extract classes from junction table', () => {
      const studentClasses = [
        { classes: { id: 'class-1', name: 'Class A' } },
        { classes: { id: 'class-2', name: 'Class B' } },
      ]

      expect(studentTransform.extractStudentClasses(studentClasses)).toEqual([
        { id: 'class-1', name: 'Class A' },
        { id: 'class-2', name: 'Class B' },
      ])
    })

    it('should filter out null/undefined classes', () => {
      const studentClasses = [
        { classes: { id: 'class-1', name: 'Class A' } },
        { classes: null },
        null,
        { classes: undefined },
        { classes: { id: 'class-2', name: 'Class B' } },
      ]

      expect(studentTransform.extractStudentClasses(studentClasses as any)).toEqual([
        { id: 'class-1', name: 'Class A' },
        { id: 'class-2', name: 'Class B' },
      ])
    })

    it('should return empty array when input is null/undefined', () => {
      expect(studentTransform.extractStudentClasses(null as any)).toEqual([])
      expect(studentTransform.extractStudentClasses(undefined as any)).toEqual(
        []
      )
      expect(studentTransform.extractStudentClasses([])).toEqual([])
    })

    it('should convert id and name to strings', () => {
      const studentClasses = [{ classes: { id: 123 as any, name: 456 as any } }]

      expect(studentTransform.extractStudentClasses(studentClasses as any)).toEqual([
        { id: '123', name: '456' },
      ])
    })

    it('should handle classes with missing id or name', () => {
      const studentClasses = [
        { classes: { id: 'class-1' } }, // Missing name
        { classes: { name: 'Class B' } }, // Missing id
        { classes: { id: 'class-3', name: 'Class C' } },
      ]

      expect(studentTransform.extractStudentClasses(studentClasses as any)).toEqual([
        { id: 'class-1', name: '' },
        { id: '', name: 'Class B' },
        { id: 'class-3', name: 'Class C' },
      ])
    })
  })

  describe('getPrimaryClass', () => {
    it('should return first class as primary', () => {
      const classes = [
        { id: 'class-1', name: 'Class A' },
        { id: 'class-2', name: 'Class B' },
      ]

      expect(studentTransform.getPrimaryClass(classes)).toEqual({
        id: 'class-1',
        name: 'Class A',
      })
    })

    it('should return null when classes is empty', () => {
      expect(studentTransform.getPrimaryClass([])).toBeNull()
    })

    it('should return null when classes is null/undefined', () => {
      expect(studentTransform.getPrimaryClass(null as any)).toBeNull()
      expect(studentTransform.getPrimaryClass(undefined as any)).toBeNull()
    })
  })

  describe('transformStudentRow', () => {
    it('should transform complete student row', () => {
      const row: StudentRow = {
        id: 'student-1',
        name: 'John Doe',
        gender: 'Laki-laki',
        class_id: 'class-1',
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        status: 'active',
        created_at: '2025-01-01',
        updated_at: '2025-01-02',
        deleted_at: null,
        student_classes: [
          { classes: { id: 'class-1', name: 'Class A' } },
          { classes: { id: 'class-2', name: 'Class B' } },
        ],
        daerah: { name: 'Daerah A' },
        desa: { name: 'Desa A' },
        kelompok: { name: 'Kelompok A' },
      }

      const result = studentTransform.transformStudentRow(row)

      expect(result).toEqual({
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
        updated_at: '2025-01-02',
        classes: [
          { id: 'class-1', name: 'Class A' },
          { id: 'class-2', name: 'Class B' },
        ],
        daerah_name: 'Daerah A',
        desa_name: 'Desa A',
        kelompok_name: 'Kelompok A',
      })
    })

    it('should handle student with no classes in junction table', () => {
      const row: StudentRow = {
        id: 'student-2',
        name: 'Jane Doe',
        gender: 'Perempuan',
        class_id: 'class-3',
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
      }

      const result = studentTransform.transformStudentRow(row)

      expect(result.classes).toEqual([])
      expect(result.class_id).toBe('class-3') // Falls back to class_id
      expect(result.class_name).toBe('') // No name because no junction table entry
    })

    it('should default status to "active" when null/undefined', () => {
      const row: StudentRow = {
        id: 'student-3',
        name: 'Test Student',
        gender: 'Laki-laki',
        class_id: null,
        kelompok_id: 'kelompok-1',
        desa_id: 'desa-1',
        daerah_id: 'daerah-1',
        status: null,
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        deleted_at: null,
        student_classes: [],
        daerah: { name: 'Daerah A' },
        desa: { name: 'Desa A' },
        kelompok: { name: 'Kelompok A' },
      }

      const result = studentTransform.transformStudentRow(row)

      expect(result.status).toBe('active')
    })

    it('should handle missing organizational names', () => {
      const row: StudentRow = {
        id: 'student-4',
        name: 'Test Student',
        gender: 'Laki-laki',
        class_id: null,
        kelompok_id: null,
        desa_id: null,
        daerah_id: null,
        status: 'active',
        created_at: '2025-01-01',
        updated_at: '2025-01-01',
        deleted_at: null,
        student_classes: [],
        daerah: null,
        desa: null,
        kelompok: null,
      }

      const result = studentTransform.transformStudentRow(row)

      expect(result.daerah_name).toBe('')
      expect(result.desa_name).toBe('')
      expect(result.kelompok_name).toBe('')
    })
  })

  describe('transformStudentRows', () => {
    it('should transform array of students', () => {
      const rows: StudentRow[] = [
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
          student_classes: [{ classes: { id: 'class-1', name: 'Class A' } }],
          daerah: { name: 'Daerah A' },
          desa: { name: 'Desa A' },
          kelompok: { name: 'Kelompok A' },
        },
        {
          id: 'student-2',
          name: 'Jane Doe',
          gender: 'Perempuan',
          class_id: 'class-2',
          kelompok_id: 'kelompok-1',
          desa_id: 'desa-1',
          daerah_id: 'daerah-1',
          status: 'active',
          created_at: '2025-01-01',
          updated_at: '2025-01-01',
          deleted_at: null,
          student_classes: [{ classes: { id: 'class-2', name: 'Class B' } }],
          daerah: { name: 'Daerah A' },
          desa: { name: 'Desa A' },
          kelompok: { name: 'Kelompok A' },
        },
      ]

      const result = studentTransform.transformStudentRows(rows)

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('John Doe')
      expect(result[1].name).toBe('Jane Doe')
    })

    it('should filter out invalid rows', () => {
      const rows: any[] = [
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
        null,
        undefined,
        'invalid',
        { id: 'student-2' }, // Missing required fields
      ]

      const result = studentTransform.transformStudentRows(rows as any)

      // Should handle all rows gracefully (including invalid ones)
      expect(result).toHaveLength(2) // Only valid student + incomplete one
    })

    it('should return empty array when input is null/undefined/empty', () => {
      expect(studentTransform.transformStudentRows(null as any)).toEqual([])
      expect(studentTransform.transformStudentRows(undefined as any)).toEqual(
        []
      )
      expect(studentTransform.transformStudentRows([])).toEqual([])
    })
  })

  describe('enrichStudentClassNames', () => {
    it('should add class names to students without junction table entries', () => {
      const students = [
        {
          id: 'student-1',
          name: 'John',
          class_id: 'class-1',
          classes: [], // No junction table entry
        },
        {
          id: 'student-2',
          name: 'Jane',
          class_id: 'class-2',
          classes: [{ id: 'class-2', name: 'Class B' }], // Has junction table
        },
      ]

      const classNameMap = new Map([
        ['class-1', 'Class A'],
        ['class-2', 'Class B Duplicate'], // Should not override junction table
      ])

      const result = studentTransform.enrichStudentClassNames(
        students as any,
        classNameMap
      )

      expect(result[0].classes).toEqual([{ id: 'class-1', name: 'Class A' }])
      expect(result[1].classes).toEqual([{ id: 'class-2', name: 'Class B' }]) // Unchanged
    })

    it('should handle students with no class_id', () => {
      const students = [
        {
          id: 'student-1',
          name: 'John',
          class_id: null,
          classes: [],
        },
      ]

      const classNameMap = new Map([['class-1', 'Class A']])

      const result = studentTransform.enrichStudentClassNames(
        students as any,
        classNameMap
      )

      expect(result[0].classes).toEqual([]) // No classes added
    })

    it('should use "Unknown Class" when class name not in map', () => {
      const students = [
        {
          id: 'student-1',
          name: 'John',
          class_id: 'class-unknown',
          classes: [],
        },
      ]

      const classNameMap = new Map([['class-1', 'Class A']])

      const result = studentTransform.enrichStudentClassNames(
        students as any,
        classNameMap
      )

      expect(result[0].classes).toEqual([
        { id: 'class-unknown', name: 'Unknown Class' },
      ])
    })
  })
})
