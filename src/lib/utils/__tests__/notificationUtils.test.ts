import { isPromotionCtaNotification } from '../notificationUtils'
import { NotificationWithStatus, NotificationBase } from '@/types/notification'

describe('notificationUtils', () => {
  describe('isPromotionCtaNotification', () => {
    it('returns true if cta_required and action_url includes /naik-kelas', () => {
      const notif: Partial<NotificationBase> = {
        action_url: '/(admin)/naik-kelas',
        display_config: {
          dismiss: 'cta_required',
          mode: 'modal',
          showInList: true
        }
      }
      expect(isPromotionCtaNotification(notif as NotificationWithStatus)).toBe(true)
    })

    it('returns false if dismiss is not cta_required', () => {
      const notif: Partial<NotificationBase> = {
        action_url: '/(admin)/naik-kelas',
        display_config: {
          dismiss: 'free',
          mode: 'modal',
          showInList: true
        }
      }
      expect(isPromotionCtaNotification(notif as NotificationWithStatus)).toBe(false)
    })

    it('returns false if action_url does not include /naik-kelas', () => {
      const notif: Partial<NotificationBase> = {
        action_url: '/(admin)/dashboard',
        display_config: {
          dismiss: 'cta_required',
          mode: 'modal',
          showInList: true
        }
      }
      expect(isPromotionCtaNotification(notif as NotificationWithStatus)).toBe(false)
    })

    it('returns false if display_config is missing', () => {
      const notif: Partial<NotificationBase> = {
        action_url: '/(admin)/naik-kelas',
      }
      expect(isPromotionCtaNotification(notif as NotificationWithStatus)).toBe(false)
    })

    it('returns false if action_url is missing', () => {
      const notif: Partial<NotificationBase> = {
        display_config: {
          dismiss: 'cta_required',
          mode: 'modal',
          showInList: true
        }
      }
      expect(isPromotionCtaNotification(notif as NotificationWithStatus)).toBe(false)
    })
  })
})
