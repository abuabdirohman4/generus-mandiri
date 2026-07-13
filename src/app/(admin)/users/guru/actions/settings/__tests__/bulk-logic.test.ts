import { describe, it, expect } from 'vitest'
import { buildPermissionPatch, splitPermissionPatch } from '../logic'

describe('buildPermissionPatch', () => {
    it('returns empty object when all none', () => {
        expect(buildPermissionPatch({
            can_access_materials: 'none',
            can_manage_materials: 'none',
            can_access_monitoring: 'none',
            can_archive_students: 'none',
        })).toEqual({})
    })

    it('maps grant → true, revoke → false, none → omitted', () => {
        const result = buildPermissionPatch({
            can_access_materials: 'grant',
            can_manage_materials: 'revoke',
            can_access_monitoring: 'none',
            can_archive_students: 'grant',
        })
        expect(result).toEqual({
            can_access_materials: true,
            can_manage_materials: false,
            can_archive_students: true,
        })
        expect('can_access_monitoring' in result).toBe(false)
    })

    it('handles partial selections', () => {
        expect(buildPermissionPatch({ can_archive_students: 'revoke' })).toEqual({ can_archive_students: false })
    })

    it('returns empty object for empty input', () => {
        expect(buildPermissionPatch({})).toEqual({})
    })
})

describe('splitPermissionPatch', () => {
    it('routes can_archive_students to basePatch only', () => {
        const { basePatch, materialPatch } = splitPermissionPatch({ can_archive_students: true })
        expect(basePatch).toEqual({ can_archive_students: true })
        expect(materialPatch).toEqual({})
    })

    it('routes material flags to materialPatch only', () => {
        const { basePatch, materialPatch } = splitPermissionPatch({
            can_access_materials: true,
            can_manage_materials: false,
            can_access_monitoring: true,
        })
        expect(basePatch).toEqual({})
        expect(materialPatch).toEqual({
            can_access_materials: true,
            can_manage_materials: false,
            can_access_monitoring: true,
        })
    })

    it('splits mixed patch correctly', () => {
        const { basePatch, materialPatch } = splitPermissionPatch({
            can_archive_students: false,
            can_access_materials: true,
            can_access_monitoring: false,
        })
        expect(basePatch).toEqual({ can_archive_students: false })
        expect(materialPatch).toEqual({ can_access_materials: true, can_access_monitoring: false })
    })

    it('returns empty patches for empty input', () => {
        const { basePatch, materialPatch } = splitPermissionPatch({})
        expect(basePatch).toEqual({})
        expect(materialPatch).toEqual({})
    })
})
