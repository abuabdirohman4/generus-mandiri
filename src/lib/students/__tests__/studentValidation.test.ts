import { describe, it, expect } from 'vitest'
import * as studentValidation from '../studentValidation'

describe('studentValidation', () => {
  describe('validateStudentCreate', () => {
    it('should validate correct data', () => {
      const data = {
        name: 'John Doe',
        gender: 'Laki-laki',
        classId: 'class-1',
      }

      const result = studentValidation.validateStudentCreate(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(data)
      }
    })

    it('should reject missing name', () => {
      const data = {
        name: '',
        gender: 'Laki-laki',
        classId: 'class-1',
      }

      const result = studentValidation.validateStudentCreate(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Nama')
      }
    })

    it('should reject invalid gender', () => {
      const data = {
        name: 'John Doe',
        gender: 'Invalid',
        classId: 'class-1',
      }

      const result = studentValidation.validateStudentCreate(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Jenis kelamin')
      }
    })

    it('should reject missing classId', () => {
      const data = {
        name: 'John Doe',
        gender: 'Laki-laki',
        classId: '',
      }

      const result = studentValidation.validateStudentCreate(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('Kelas')
      }
    })

    it('should trim whitespace from name', () => {
      const data = {
        name: '  John Doe  ',
        gender: 'Laki-laki',
        classId: 'class-1',
      }

      const result = studentValidation.validateStudentCreate(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('John Doe')
      }
    })
  })

  describe('validateStudentUpdate', () => {
    it('should validate correct update data', () => {
      const data = {
        name: 'Jane Doe',
        gender: 'Perempuan',
        classIds: ['class-1', 'class-2'],
      }

      const result = studentValidation.validateStudentUpdate(data)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(data)
      }
    })

    it('should reject missing name', () => {
      const data = {
        name: '',
        gender: 'Perempuan',
        classIds: ['class-1'],
      }

      const result = studentValidation.validateStudentUpdate(data)

      expect(result.success).toBe(false)
    })

    it('should reject empty classIds array', () => {
      const data = {
        name: 'Jane Doe',
        gender: 'Perempuan',
        classIds: [],
      }

      const result = studentValidation.validateStudentUpdate(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toContain('minimal satu kelas')
      }
    })
  })

  describe('validateGender', () => {
    it('should accept "Laki-laki"', () => {
      expect(studentValidation.validateGender('Laki-laki')).toBe(true)
    })

    it('should accept "Perempuan"', () => {
      expect(studentValidation.validateGender('Perempuan')).toBe(true)
    })

    it('should reject invalid values', () => {
      expect(studentValidation.validateGender('Male')).toBe(false)
      expect(studentValidation.validateGender('Female')).toBe(false)
      expect(studentValidation.validateGender('')).toBe(false)
      expect(studentValidation.validateGender('laki-laki')).toBe(false) // Case sensitive
    })
  })

  describe('validateClassIds', () => {
    it('should accept non-empty array', () => {
      expect(studentValidation.validateClassIds(['class-1'])).toBe(true)
      expect(
        studentValidation.validateClassIds(['class-1', 'class-2'])
      ).toBe(true)
    })

    it('should reject empty array', () => {
      expect(studentValidation.validateClassIds([])).toBe(false)
    })

    it('should reject non-array', () => {
      expect(studentValidation.validateClassIds(null as any)).toBe(false)
      expect(studentValidation.validateClassIds(undefined as any)).toBe(false)
      expect(studentValidation.validateClassIds('class-1' as any)).toBe(false)
    })
  })

  describe('extractFormData', () => {
    it('should extract student create data from FormData', () => {
      const formData = new FormData()
      formData.set('name', 'John Doe')
      formData.set('gender', 'Laki-laki')
      formData.set('classId', 'class-1')
      formData.set('kelompok_id', 'kelompok-1')

      const result = studentValidation.extractFormData(formData)

      expect(result).toEqual({
        name: 'John Doe',
        gender: 'Laki-laki',
        classId: 'class-1',
        kelompokId: 'kelompok-1',
      })
    })

    it('should handle missing optional fields', () => {
      const formData = new FormData()
      formData.set('name', 'John Doe')
      formData.set('gender', 'Laki-laki')
      formData.set('classId', 'class-1')

      const result = studentValidation.extractFormData(formData)

      expect(result.kelompokId).toBeUndefined()
    })
  })

  describe('extractUpdateFormData', () => {
    it('should extract student update data from FormData', () => {
      const formData = new FormData()
      formData.set('name', 'Jane Doe')
      formData.set('gender', 'Perempuan')
      formData.set('classIds', 'class-1,class-2')
      formData.set('kelompok_id', 'kelompok-1')

      const result = studentValidation.extractUpdateFormData(formData)

      expect(result).toEqual({
        name: 'Jane Doe',
        gender: 'Perempuan',
        classIds: ['class-1', 'class-2'],
        kelompokId: 'kelompok-1',
      })
    })

    it('should support single classId (backward compatibility)', () => {
      const formData = new FormData()
      formData.set('name', 'Jane Doe')
      formData.set('gender', 'Perempuan')
      formData.set('classId', 'class-1') // Single class

      const result = studentValidation.extractUpdateFormData(formData)

      expect(result.classIds).toEqual(['class-1'])
    })

    it('should filter empty class IDs', () => {
      const formData = new FormData()
      formData.set('name', 'Jane Doe')
      formData.set('gender', 'Perempuan')
      formData.set('classIds', 'class-1,,class-2,')

      const result = studentValidation.extractUpdateFormData(formData)

      expect(result.classIds).toEqual(['class-1', 'class-2'])
    })
  })
})
