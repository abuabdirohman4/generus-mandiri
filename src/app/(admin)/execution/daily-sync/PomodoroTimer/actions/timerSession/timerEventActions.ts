"use server";

// Timer event logging actions

import { createClient } from '@/lib/supabase/server';
import { getDeviceId } from './deviceUtils';

// Helper function to log timer events
export async function logTimerEvent(sessionId: string, eventType: string, eventData: any, deviceId?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  try {
    await supabase
      .from('timer_events')
      .insert({
        session_id: sessionId,
        event_type: eventType,
        event_data: eventData,
        device_id: deviceId || getDeviceId() // ✅ Use provided deviceId or generate new one
      });
  } catch (error) {
    console.error('[logTimerEvent] Error:', error);
    // Don't throw error for logging failures
  }
}
