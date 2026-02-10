import { describe, it, expect, vi, afterEach } from 'vitest'
import { cn, isMac, isDesktop, isMobile, isTouchDevice, isIOS, shouldUseMobileUI } from '../utils'

describe('utils (Common Utilities)', () => {
    describe('cn (Classname merging)', () => {
        it('should merge classes correctly', () => {
            expect(cn('a', 'b')).toBe('a b')
            expect(cn('a', { 'b': true, 'c': false })).toBe('a b')
            expect(cn('px-2 py-2', 'px-4')).toBe('py-2 px-4') // tailwind-merge in action
        })
    })

    describe('Device & OS Detection', () => {
        afterEach(() => {
            vi.restoreAllMocks()
        })

        it('isMac should return true if platform is Mac', () => {
            vi.stubGlobal('navigator', { platform: 'MacIntel' })
            expect(isMac()).toBe(true)
        })

        it('isMac should return false if platform is Win32', () => {
            vi.stubGlobal('navigator', { platform: 'Win32' })
            expect(isMac()).toBe(false)
        })

        it('isDesktop should return true if innerWidth >= 768', () => {
            vi.stubGlobal('window', { innerWidth: 1024 })
            expect(isDesktop()).toBe(true)
        })

        it('isMobile should return true if innerWidth < 768', () => {
            vi.stubGlobal('window', { innerWidth: 375 })
            expect(isMobile()).toBe(true)
        })

        it('isTouchDevice should detect touch capability', () => {
            // Test with ontouchstart
            vi.stubGlobal('window', { ontouchstart: {} })
            vi.stubGlobal('navigator', { maxTouchPoints: 0 })
            expect(isTouchDevice()).toBe(true)

            // Test with maxTouchPoints
            vi.stubGlobal('window', {})
            vi.stubGlobal('navigator', { maxTouchPoints: 5 })
            expect(isTouchDevice()).toBe(true)
        })

        it('isIOS should detect iOS user agent', () => {
            vi.stubGlobal('window', {
                navigator: {
                    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X)'
                }
            })
            expect(isIOS()).toBe(true)
        })

        it('shouldUseMobileUI should combine mobile check and touch check', () => {
            // Mobile + Touch = UI
            vi.stubGlobal('window', { innerWidth: 375, ontouchstart: {} })
            vi.stubGlobal('navigator', { maxTouchPoints: 0 })
            expect(shouldUseMobileUI()).toBe(true)

            // Desktop + Touch = No UI
            vi.stubGlobal('window', { innerWidth: 1024, ontouchstart: {} })
            expect(shouldUseMobileUI()).toBe(false)
        })
    })
})
