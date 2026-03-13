import { describe, it, expect } from 'vitest'
import {
    DEFAULT_MEETING_FORM_SETTINGS,
    extractMeetingFormSettings,
} from '../logic'

// ─── DEFAULT_MEETING_FORM_SETTINGS ────────────────────────────────────────────

describe('DEFAULT_MEETING_FORM_SETTINGS', () => {
    it('has all expected boolean fields', () => {
        const fields = [
            'showTitle', 'showTopic', 'showDescription', 'showDate',
            'showMeetingType', 'showClassSelection', 'showStudentSelection', 'showGenderFilter',
        ]
        fields.forEach(field => {
            expect(typeof DEFAULT_MEETING_FORM_SETTINGS[field as keyof typeof DEFAULT_MEETING_FORM_SETTINGS]).toBe('boolean')
        })
    })

    it('has all fields set to true by default', () => {
        Object.values(DEFAULT_MEETING_FORM_SETTINGS).forEach(v => expect(v).toBe(true))
    })
})

// ─── extractMeetingFormSettings ───────────────────────────────────────────────

describe('extractMeetingFormSettings', () => {
    it('returns meeting_form_settings from raw data row', () => {
        const settings = { showTitle: true, showTopic: false }
        const data = { meeting_form_settings: settings }
        expect(extractMeetingFormSettings(data)).toEqual(settings)
    })

    it('returns undefined when meeting_form_settings is null', () => {
        expect(extractMeetingFormSettings({ meeting_form_settings: null })).toBeUndefined()
    })

    it('returns undefined when data is null', () => {
        expect(extractMeetingFormSettings(null)).toBeUndefined()
    })
})
