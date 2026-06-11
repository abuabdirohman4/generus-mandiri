import { describe, it, expect } from 'vitest'
import {
    validateNotificationInput,
    resolveTargetScopeForSender,
    buildRecipientProfileFilter,
} from '../logic'
import type { UserProfile } from '@/types/user'
import type { NotificationTargetScope, SendNotificationInput } from '@/types/notification'

// ─── validateNotificationInput ────────────────────────────────────────────────

describe('validateNotificationInput', () => {
    it('rejects empty title', () => {
        const input: SendNotificationInput = { title: '', body: 'Some body text', target: {} }
        expect(validateNotificationInput(input)).toEqual({ ok: false, error: expect.any(String) })
    })

    it('rejects whitespace-only title', () => {
        const input: SendNotificationInput = { title: '   ', body: 'Some body text', target: {} }
        expect(validateNotificationInput(input)).toEqual({ ok: false, error: expect.any(String) })
    })

    it('rejects empty body', () => {
        const input: SendNotificationInput = { title: 'Valid Title', body: '', target: {} }
        expect(validateNotificationInput(input)).toEqual({ ok: false, error: expect.any(String) })
    })

    it('rejects whitespace-only body', () => {
        const input: SendNotificationInput = { title: 'Valid Title', body: '   ', target: {} }
        expect(validateNotificationInput(input)).toEqual({ ok: false, error: expect.any(String) })
    })

    it('rejects title longer than 200 characters', () => {
        const longTitle = 'a'.repeat(201)
        const input: SendNotificationInput = { title: longTitle, body: 'Valid body', target: {} }
        expect(validateNotificationInput(input)).toEqual({ ok: false, error: expect.any(String) })
    })

    it('accepts title exactly 200 characters', () => {
        const maxTitle = 'a'.repeat(200)
        const input: SendNotificationInput = { title: maxTitle, body: 'Valid body', target: {} }
        expect(validateNotificationInput(input)).toEqual({ ok: true })
    })

    it('rejects body longer than 1000 characters', () => {
        const longBody = 'a'.repeat(1001)
        const input: SendNotificationInput = { title: 'Valid Title', body: longBody, target: {} }
        expect(validateNotificationInput(input)).toEqual({ ok: false, error: expect.any(String) })
    })

    it('accepts body exactly 1000 characters', () => {
        const maxBody = 'a'.repeat(1000)
        const input: SendNotificationInput = { title: 'Valid Title', body: maxBody, target: {} }
        expect(validateNotificationInput(input)).toEqual({ ok: true })
    })

    it('returns ok: true for valid input', () => {
        const input: SendNotificationInput = {
            title: 'Pengumuman Penting',
            body: 'Ini adalah isi notifikasi yang valid.',
            target: { daerah_id: 'daerah-1' },
        }
        expect(validateNotificationInput(input)).toEqual({ ok: true })
    })

    it('returns no error field when valid', () => {
        const input: SendNotificationInput = { title: 'Title', body: 'Body text', target: {} }
        const result = validateNotificationInput(input)
        expect(result.ok).toBe(true)
        expect(result.error).toBeUndefined()
    })
})

// ─── resolveTargetScopeForSender ──────────────────────────────────────────────

const baseSuperadmin: UserProfile = {
    id: 'u-super',
    role: 'superadmin',
    full_name: 'Super Admin',
    daerah_id: null,
    desa_id: null,
    kelompok_id: null,
}

const baseAdminDaerah: UserProfile = {
    id: 'u-admin-d',
    role: 'admin',
    full_name: 'Admin Daerah',
    daerah_id: 'daerah-001',
    desa_id: null,
    kelompok_id: null,
}

const baseTeacher: UserProfile = {
    id: 'u-guru',
    role: 'teacher',
    full_name: 'Guru',
    daerah_id: 'daerah-001',
    desa_id: 'desa-001',
    kelompok_id: 'kelompok-001',
}

const baseAdminKelompok: UserProfile = {
    id: 'u-admin-k',
    role: 'admin',
    full_name: 'Admin Kelompok',
    daerah_id: 'daerah-001',
    desa_id: 'desa-001',
    kelompok_id: 'kelompok-001',
}

describe('resolveTargetScopeForSender', () => {
    describe('superadmin', () => {
        it('returns target as-is for any scope', () => {
            const target: NotificationTargetScope = { daerah_id: 'daerah-999' }
            const result = resolveTargetScopeForSender(baseSuperadmin, target)
            expect(result).toEqual({ ok: true, scope: target })
        })

        it('allows all-org broadcast (empty scope)', () => {
            const target: NotificationTargetScope = {}
            const result = resolveTargetScopeForSender(baseSuperadmin, target)
            expect(result).toEqual({ ok: true, scope: target })
        })

        it('preserves kelompok_id and roles in scope', () => {
            const target: NotificationTargetScope = {
                daerah_id: 'daerah-001',
                desa_id: 'desa-001',
                kelompok_id: 'kelompok-001',
                roles: ['teacher'],
            }
            const result = resolveTargetScopeForSender(baseSuperadmin, target)
            expect(result.ok).toBe(true)
            expect(result.scope).toEqual(target)
        })
    })

    describe('admin daerah', () => {
        it('forces own daerah_id onto the target scope', () => {
            const target: NotificationTargetScope = { daerah_id: 'daerah-other' }
            const result = resolveTargetScopeForSender(baseAdminDaerah, target)
            expect(result.ok).toBe(true)
            expect(result.scope?.daerah_id).toBe('daerah-001')
        })

        it('preserves desa_id when present', () => {
            const target: NotificationTargetScope = { desa_id: 'desa-001' }
            const result = resolveTargetScopeForSender(baseAdminDaerah, target)
            expect(result.ok).toBe(true)
            expect(result.scope?.daerah_id).toBe('daerah-001')
            expect(result.scope?.desa_id).toBe('desa-001')
        })

        it('preserves kelompok_id when present', () => {
            const target: NotificationTargetScope = {
                desa_id: 'desa-001',
                kelompok_id: 'kelompok-001',
            }
            const result = resolveTargetScopeForSender(baseAdminDaerah, target)
            expect(result.ok).toBe(true)
            expect(result.scope?.daerah_id).toBe('daerah-001')
            expect(result.scope?.kelompok_id).toBe('kelompok-001')
        })

        it('preserves roles when present', () => {
            const target: NotificationTargetScope = { roles: ['teacher', 'student'] }
            const result = resolveTargetScopeForSender(baseAdminDaerah, target)
            expect(result.ok).toBe(true)
            expect(result.scope?.roles).toEqual(['teacher', 'student'])
        })
    })

    describe('non-sender roles', () => {
        it('rejects teacher role', () => {
            const target: NotificationTargetScope = { kelompok_id: 'kelompok-001' }
            const result = resolveTargetScopeForSender(baseTeacher, target)
            expect(result.ok).toBe(false)
            expect(result.error).toBe('Tidak memiliki izin untuk mengirim notifikasi')
        })

        it('rejects admin with kelompok_id (admin kelompok)', () => {
            const target: NotificationTargetScope = {}
            const result = resolveTargetScopeForSender(baseAdminKelompok, target)
            expect(result.ok).toBe(false)
            expect(result.error).toBe('Tidak memiliki izin untuk mengirim notifikasi')
        })

        it('rejects admin with desa_id but no daerah_id (admin desa)', () => {
            const adminDesa: UserProfile = {
                id: 'u-admin-desa',
                role: 'admin',
                full_name: 'Admin Desa',
                daerah_id: null,
                desa_id: 'desa-001',
                kelompok_id: null,
            }
            const result = resolveTargetScopeForSender(adminDesa, {})
            expect(result.ok).toBe(false)
            expect(result.error).toBe('Tidak memiliki izin untuk mengirim notifikasi')
        })

        it('rejects student role', () => {
            const student: UserProfile = {
                id: 'u-siswa',
                role: 'student',
                full_name: 'Siswa',
                daerah_id: null,
                desa_id: null,
                kelompok_id: null,
            }
            const result = resolveTargetScopeForSender(student, {})
            expect(result.ok).toBe(false)
            expect(result.error).toBe('Tidak memiliki izin untuk mengirim notifikasi')
        })

        it('does not return scope on rejection', () => {
            const result = resolveTargetScopeForSender(baseTeacher, {})
            expect(result.scope).toBeUndefined()
        })
    })
})

// ─── buildRecipientProfileFilter ─────────────────────────────────────────────

describe('buildRecipientProfileFilter', () => {
    it('returns kelompok_id column when scope has kelompok_id', () => {
        const scope: NotificationTargetScope = {
            daerah_id: 'daerah-001',
            desa_id: 'desa-001',
            kelompok_id: 'kelompok-001',
        }
        const result = buildRecipientProfileFilter(scope)
        expect(result.column).toBe('kelompok_id')
        expect(result.value).toBe('kelompok-001')
    })

    it('returns desa_id column when scope has desa_id but no kelompok_id', () => {
        const scope: NotificationTargetScope = {
            daerah_id: 'daerah-001',
            desa_id: 'desa-001',
        }
        const result = buildRecipientProfileFilter(scope)
        expect(result.column).toBe('desa_id')
        expect(result.value).toBe('desa-001')
    })

    it('returns daerah_id column when scope has only daerah_id', () => {
        const scope: NotificationTargetScope = { daerah_id: 'daerah-001' }
        const result = buildRecipientProfileFilter(scope)
        expect(result.column).toBe('daerah_id')
        expect(result.value).toBe('daerah-001')
    })

    it('returns null column and null value for empty scope (all broadcast)', () => {
        const scope: NotificationTargetScope = {}
        const result = buildRecipientProfileFilter(scope)
        expect(result.column).toBeNull()
        expect(result.value).toBeNull()
    })

    it('preserves roles when present', () => {
        const scope: NotificationTargetScope = {
            daerah_id: 'daerah-001',
            roles: ['teacher', 'student'],
        }
        const result = buildRecipientProfileFilter(scope)
        expect(result.roles).toEqual(['teacher', 'student'])
    })

    it('returns undefined roles when not set in scope', () => {
        const scope: NotificationTargetScope = { daerah_id: 'daerah-001' }
        const result = buildRecipientProfileFilter(scope)
        expect(result.roles).toBeUndefined()
    })

    it('kelompok_id takes priority over desa_id and daerah_id', () => {
        const scope: NotificationTargetScope = {
            daerah_id: 'daerah-001',
            desa_id: 'desa-001',
            kelompok_id: 'kelompok-001',
        }
        const result = buildRecipientProfileFilter(scope)
        expect(result.column).toBe('kelompok_id')
        expect(result.value).toBe('kelompok-001')
    })

    it('desa_id takes priority over daerah_id when kelompok_id absent', () => {
        const scope: NotificationTargetScope = {
            daerah_id: 'daerah-001',
            desa_id: 'desa-005',
        }
        const result = buildRecipientProfileFilter(scope)
        expect(result.column).toBe('desa_id')
        expect(result.value).toBe('desa-005')
    })
})
