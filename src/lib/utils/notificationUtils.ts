import { NotificationBase } from '@/types/notification'

export function isPromotionCtaNotification(notif: Partial<NotificationBase>): boolean {
  if (!notif.display_config) return false
  if (!notif.action_url) return false
  
  return notif.display_config.dismiss === 'cta_required' && 
         notif.action_url.includes('/naik-kelas')
}
