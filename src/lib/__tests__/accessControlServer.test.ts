import { describe, it, expect, vi } from 'vitest'
import { canAccessFeature, getDataFilter, canManageMaterials, isMaterialCoordinator } from '../accessControlServer'

describe('accessControlServer', () => {
    describe('canAccessFeature', () => {
        it('should allow superadmin to access any feature', () => {
            const profile = { id: '1', full_name: 'Super', role: 'superadmin' }
            expect(canAccessFeature(profile, 'any-feature')).toBe(true)
            expect(canAccessFeature(profile, 'dashboard')).toBe(true)
        })

        it('should allow admin to access specific admin features', () => {
            const profile = { id: '2', full_name: 'Admin', role: 'admin' }
            const allowedFeatures = ['dashboard', 'organisasi', 'users', 'manage_class_masters', 'manage_classes']

            allowedFeatures.forEach(feature => {
                expect(canAccessFeature(profile, feature)).toBe(true)
            })
        })

        it('should deny admin from accessing unknown features', () => {
            const profile = { id: '2', full_name: 'Admin', role: 'admin' }
            expect(canAccessFeature(profile, 'random-feature')).toBe(false)
        })

        it('should deny teacher from accessing admin features', () => {
            const profile = { id: '3', full_name: 'Teacher', role: 'teacher' }
            expect(canAccessFeature(profile, 'dashboard')).toBe(false)
        })

        it('should deny student from accessing any feature', () => {
            const profile = { id: '4', full_name: 'Student', role: 'student' }
            expect(canAccessFeature(profile, 'dashboard')).toBe(false)
        })
    })

    describe('getDataFilter', () => {
        it('should return empty object for superadmin', () => {
            const profile = { id: '1', role: 'superadmin', full_name: 'Super' }
            expect(getDataFilter(profile)).toEqual({})
        })

        it('should return organizational IDs for admin', () => {
            const profile = {
                id: '2',
                role: 'admin',
                full_name: 'Admin',
                daerah_id: 'd1',
                desa_id: 'v1',
                kelompok_id: 'k1'
            }
            expect(getDataFilter(profile)).toEqual({
                daerah_id: 'd1',
                desa_id: 'v1',
                kelompok_id: 'k1'
            })
        })

        it('should return null for other roles', () => {
            const teacher = { id: '3', role: 'teacher', full_name: 'Teacher' }
            const student = { id: '4', role: 'student', full_name: 'Student' }
            expect(getDataFilter(teacher)).toBeNull()
            expect(getDataFilter(student)).toBeNull()
        })
    })

    describe('canManageMaterials', () => {
        it('should return true if can_manage_materials is true', () => {
            const profile = { id: '1', full_name: 'User', role: 'teacher', can_manage_materials: true }
            expect(canManageMaterials(profile)).toBe(true)
        })

        it('should return false if can_manage_materials is false', () => {
            const profile = { id: '1', full_name: 'User', role: 'teacher', can_manage_materials: false }
            expect(canManageMaterials(profile)).toBe(false)
        })

        it('should return false if profile is null', () => {
            expect(canManageMaterials(null)).toBe(false)
        })
    })

    describe('isMaterialCoordinator', () => {
        it('should return true if role is material_coordinator', () => {
            const profile = { id: '1', full_name: 'Coord', role: 'material_coordinator' }
            expect(isMaterialCoordinator(profile)).toBe(true)
        })

        it('should return false for other roles', () => {
            const profile = { id: '1', full_name: 'Admin', role: 'admin' }
            expect(isMaterialCoordinator(profile)).toBe(false)
        })

        it('should return false if profile is null', () => {
            expect(isMaterialCoordinator(null)).toBe(false)
        })
    })
})
