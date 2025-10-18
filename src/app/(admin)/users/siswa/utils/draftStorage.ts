'use client'

import { BatchStudent } from '../stores/batchImportStore'

interface DraftData {
  classId: string
  students: BatchStudent[]
  timestamp: number
}

const DRAFT_KEY_PREFIX = 'siswa-draft-'
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

/**
 * Save draft to localStorage
 */
export const saveDraft = (classId: string, students: BatchStudent[]): void => {
  try {
    const draftData: DraftData = {
      classId,
      students,
      timestamp: Date.now()
    }
    
    const key = `${DRAFT_KEY_PREFIX}${classId}`
    localStorage.setItem(key, JSON.stringify(draftData))
  } catch (error) {
    console.error('Failed to save draft:', error)
  }
}

/**
 * Load draft from localStorage
 */
export const loadDraft = (classId: string): BatchStudent[] | null => {
  try {
    const key = `${DRAFT_KEY_PREFIX}${classId}`
    const stored = localStorage.getItem(key)
    
    if (!stored) return null
    
    const draftData: DraftData = JSON.parse(stored)
    
    // Check if draft is expired
    if (Date.now() - draftData.timestamp > DRAFT_EXPIRY_MS) {
      clearDraft(classId)
      return null
    }
    
    // Check if draft is for the same class
    if (draftData.classId !== classId) {
      return null
    }
    
    return draftData.students
  } catch (error) {
    console.error('Failed to load draft:', error)
    return null
  }
}

/**
 * Clear draft from localStorage
 */
export const clearDraft = (classId: string): void => {
  try {
    const key = `${DRAFT_KEY_PREFIX}${classId}`
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Failed to clear draft:', error)
  }
}

/**
 * Check if draft exists for class
 */
export const hasDraft = (classId: string): boolean => {
  return loadDraft(classId) !== null
}

/**
 * Get all draft keys (for cleanup purposes)
 */
export const getAllDraftKeys = (): string[] => {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
        keys.push(key)
      }
    }
    return keys
  } catch (error) {
    console.error('Failed to get draft keys:', error)
    return []
  }
}

/**
 * Clear all expired drafts
 */
export const clearExpiredDrafts = (): void => {
  try {
    const keys = getAllDraftKeys()
    const now = Date.now()
    
    keys.forEach(key => {
      const stored = localStorage.getItem(key)
      if (stored) {
        try {
          const draftData: DraftData = JSON.parse(stored)
          if (now - draftData.timestamp > DRAFT_EXPIRY_MS) {
            localStorage.removeItem(key)
          }
        } catch {
          // Invalid data, remove it
          localStorage.removeItem(key)
        }
      }
    })
  } catch (error) {
    console.error('Failed to clear expired drafts:', error)
  }
}
