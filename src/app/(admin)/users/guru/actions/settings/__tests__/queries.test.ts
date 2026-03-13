import { describe, it, expect, vi } from 'vitest'
import {
    fetchMeetingFormSettings,
    updateMeetingFormSettingsQuery,
    updateTeacherPermissionsQuery,
} from '../queries'
import type { MeetingFormSettings } from '../../types'

// ─── Mock helper ──────────────────────────────────────────────────────────────

function makeChain(returnValue: any = { data: null, error: null }) {
    const chain: any = {}
    chain.select = vi.fn().mockReturnValue(chain)
    chain.update = vi.fn().mockReturnValue(chain)
    chain.eq = vi.fn().mockReturnValue(chain)
    chain.single = vi.fn().mockResolvedValue(returnValue)
    chain.then = (resolve: (v: any) => any) => Promise.resolve(returnValue).then(resolve)
    return chain
}

function makeSupa(returnValue?: any) {
    const chain = makeChain(returnValue)
    return { from: vi.fn().mockReturnValue(chain), _chain: chain } as any
}

const sampleSettings: MeetingFormSettings = {
    showTitle: true,
    showTopic: true,
    showDescription: false,
    showDate: true,
    showMeetingType: false,
    showClassSelection: true,
    showStudentSelection: true,
    showGenderFilter: false,
}

// ─── fetchMeetingFormSettings ─────────────────────────────────────────────────

describe('fetchMeetingFormSettings', () => {
    it('queries profiles.meeting_form_settings for given userId', async () => {
        const supa = makeSupa({ data: { meeting_form_settings: sampleSettings }, error: null })
        const result = await fetchMeetingFormSettings(supa, 'u1')
        expect(supa.from).toHaveBeenCalledWith('profiles')
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'u1')
        expect(supa._chain.single).toHaveBeenCalled()
        expect(result.data?.meeting_form_settings).toEqual(sampleSettings)
    })

    it('returns error when user not found', async () => {
        const supa = makeSupa({ data: null, error: { code: 'PGRST116', message: 'not found' } })
        const result = await fetchMeetingFormSettings(supa, 'nonexistent')
        expect(result.error?.code).toBe('PGRST116')
    })
})

// ─── updateMeetingFormSettingsQuery ───────────────────────────────────────────

describe('updateMeetingFormSettingsQuery', () => {
    it('updates meeting_form_settings in profiles for userId', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })

        await updateMeetingFormSettingsQuery(supa, 'u1', sampleSettings)

        expect(supa.from).toHaveBeenCalledWith('profiles')
        expect(supa._chain.update).toHaveBeenCalledWith(
            expect.objectContaining({ meeting_form_settings: sampleSettings })
        )
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'u1')
    })

    it('includes updated_at in the update payload', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })

        await updateMeetingFormSettingsQuery(supa, 'u1', sampleSettings)

        const updatePayload = supa._chain.update.mock.calls[0][0]
        expect(updatePayload.updated_at).toBeTruthy()
    })
})

// ─── updateTeacherPermissionsQuery ────────────────────────────────────────────

describe('updateTeacherPermissionsQuery', () => {
    it('updates permissions in profiles for userId', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })

        const permissions = { can_archive_students: true, can_transfer_students: false }
        await updateTeacherPermissionsQuery(supa, 'u1', permissions)

        expect(supa.from).toHaveBeenCalledWith('profiles')
        expect(supa._chain.update).toHaveBeenCalledWith(
            expect.objectContaining({ permissions })
        )
        expect(supa._chain.eq).toHaveBeenCalledWith('id', 'u1')
    })

    it('includes updated_at in the update payload', async () => {
        const supa = makeSupa({ error: null })
        supa._chain.eq = vi.fn().mockResolvedValue({ error: null })

        await updateTeacherPermissionsQuery(supa, 'u1', {})

        const updatePayload = supa._chain.update.mock.calls[0][0]
        expect(updatePayload.updated_at).toBeTruthy()
    })
})
