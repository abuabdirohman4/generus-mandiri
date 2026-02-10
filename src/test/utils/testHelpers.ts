/**
 * Common test helper functions and utilities
 */

/**
 * Wait for a specified amount of time
 * Useful for testing async operations
 */
export const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Create a mock function that resolves after a delay
 */
export const createDelayedMock = <T>(value: T, delay = 100) => {
    return vi.fn(async () => {
        await wait(delay)
        return value
    })
}

/**
 * Generate a random ID (for testing purposes)
 */
export const generateTestId = () => {
    return `test-${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Create a mock date that's consistent across tests
 */
export const createMockDate = (dateString: string) => {
    return new Date(dateString)
}

import { vi } from 'vitest'
