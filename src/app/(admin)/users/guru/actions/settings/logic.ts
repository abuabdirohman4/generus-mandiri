/**
 * Settings Logic (Layer 2)
 *
 * Pure business logic for teacher settings.
 * NO 'use server' directive. No database access. No side effects.
 */

import type { MeetingFormSettings } from '../types'

/**
 * Default meeting form settings
 */
export const DEFAULT_MEETING_FORM_SETTINGS: MeetingFormSettings = {
    showTitle: true,
    showTopic: true,
    showDescription: true,
    showDate: true,
    showMeetingType: true,
    showClassSelection: true,
    showStudentSelection: true,
    showGenderFilter: true,
}

/**
 * Extract meeting form settings from profile row data
 * Returns undefined if no settings found (PGRST116 or empty)
 */
export function extractMeetingFormSettings(data: any): MeetingFormSettings | undefined {
    return data?.meeting_form_settings as MeetingFormSettings || undefined
}
