"use server";

import { createClient } from '@/lib/supabase/server';

export async function getWeeklySync(year: number, quarter: number, weekNumber: number, startDate: string, endDate: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      goals: [],
      progress: {},
      rules: [],
      weekDates: []
    };
  }

  try {
    const { data, error } = await supabase.rpc('get_weekly_sync', {
      p_user_id: user.id,
      p_year: year,
      p_quarter: quarter,
      p_week_number: weekNumber,
      p_start_date: startDate,
      p_end_date: endDate
    });

    if (error) {
      console.error("Error calling get_weekly_sync:", error);
      return {
        goals: [],
        rules: []
      };
    }

    const optimizedData = {
      goals: data?.goals || [],
      rules: data?.rules || []
    };

    return optimizedData;
  } catch (error) {
    console.error("Error in getWeeklySyncUltraFast:", error);
    return {
      goals: [],
      rules: []
    };
  }
}
