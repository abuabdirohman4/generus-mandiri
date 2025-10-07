"use server";

import { createClient } from '@/lib/supabase/server';

// Get tasks available for selection from weekly goals for the current week
export async function getTasksForWeek(year: number, weekNumber: number, selectedDate?: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  const user_id = user.id;

  try {
    // Get all weekly goals for the week
    const { data: weeklyGoals, error: wgError } = await supabase
      .from('weekly_goals')
      .select('id, goal_slot')
      .eq('user_id', user_id)
      .eq('year', year)
      .eq('week_number', weekNumber);

    if (wgError) throw wgError;
    if (!weeklyGoals?.length) return [];

    const weeklyGoalIds = weeklyGoals.map(g => g.id);

    // Get all weekly goal items
    const { data: items, error: itemsError } = await supabase
      .from('weekly_goal_items')
      .select('id, weekly_goal_id, item_id')
      .in('weekly_goal_id', weeklyGoalIds);

    if (itemsError) throw itemsError;
    if (!items?.length) return [];

    // Get details for each item by fetching from tasks table
    const itemsWithDetails = await Promise.all(
      items.map(async (item) => {
        let title = '';
        let status = 'TODO';
        let quest_title = '';
        let task_type = '';
        const goal_slot = weeklyGoals.find(g => g.id === item.weekly_goal_id)?.goal_slot || 0;

        // Fetch task details directly from tasks table
        const { data: task } = await supabase
          .from('tasks')
          .select('id, title, status, milestone_id, type, parent_task_id')
          .eq('id', item.item_id)
          .single();
        
        if (task) {
          title = task.title || '';
          status = task.status || 'TODO';
          task_type = task.type || '';
          
          if (task.milestone_id) {
            const { data: milestone } = await supabase
              .from('milestones')
              .select('id, title, quest_id')
              .eq('id', task.milestone_id)
              .single();
            
            if (milestone?.quest_id) {
              const { data: quest } = await supabase
                .from('quests')
                .select('id, title')
                .eq('id', milestone.quest_id)
                .single();
              quest_title = quest?.title || '';
            }
          }
        }

        // Ensure type is valid for WeeklyTaskItem (matches task_type enum from database)
        const validTypes = ['MAIN_QUEST', 'WORK', 'SIDE_QUEST', 'LEARNING'] as const;
        const validType = validTypes.includes(task_type as any) ? task_type as 'MAIN_QUEST' | 'WORK' | 'SIDE_QUEST' | 'LEARNING' : 'MAIN_QUEST';

        return {
          id: item.item_id,
          type: validType,
          title,
          status,
          quest_title,
          goal_slot,
          parent_task_id: task?.parent_task_id || null
        };
      })
    );

    // Remove duplicates based on item_id only (not goal_slot combination)
    // This ensures each task appears only once in the daily sync list
    let uniqueItems = itemsWithDetails.reduce((acc, item) => {
      if (!acc.find(existing => existing.id === item.id)) {
        acc.push(item);
      }
      return acc;
    }, [] as typeof itemsWithDetails);

    // Filter out completed tasks (only show TODO tasks)
    // This ensures consistency with weekly sync which also filters by task status
    uniqueItems = uniqueItems.filter(item => item.status === 'TODO');

    // Filter out tasks that were completed in previous days within the current week
    if (selectedDate) {
      const selectedDateObj = new Date(selectedDate);
      
      // Calculate the start of the current week (Monday) - consistent with app logic
      const startOfWeek = new Date(selectedDateObj);
      const dayOfWeek = selectedDateObj.getDay();
      const diff = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek); // Sunday = 0, so -6 days to Monday
      startOfWeek.setDate(selectedDateObj.getDate() + diff);
      startOfWeek.setHours(0, 0, 0, 0); // Reset time to start of day
      
      // Calculate all previous days within the current week (from Monday up to the day before selected date)
      const previousDaysInWeek: string[] = [];
      const currentDate = new Date(startOfWeek);
      
      while (currentDate < selectedDateObj) {
        previousDaysInWeek.push(currentDate.toISOString().split('T')[0]);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Get tasks that were completed on any previous day within the current week
      const { data: completedTasksPreviousDays, error: completedError } = await supabase
        .from('daily_plan_items')
        .select(`
          item_id, 
          status, 
          updated_at,
          daily_plans!inner(plan_date, user_id)
        `)
        .eq('daily_plans.user_id', user_id)
        .in('daily_plans.plan_date', previousDaysInWeek)
        .eq('status', 'DONE');

      if (completedError) {
        console.error('Error fetching completed tasks:', completedError);
      }

      // Get tasks that are already added to today's plan
      const { data: todayTasks, error: todayError } = await supabase
        .from('daily_plan_items')
        .select(`
          item_id, 
          status,
          daily_plans!inner(plan_date, user_id)
        `)
        .eq('daily_plans.user_id', user_id)
        .eq('daily_plans.plan_date', selectedDate);

      if (todayError) {
        console.error('Error fetching today tasks:', todayError);
      }

      if (completedTasksPreviousDays?.length) {
        const completedTaskIds = new Set(completedTasksPreviousDays.map(t => t.item_id));
        const todayTaskIds = new Set(todayTasks?.map(t => t.item_id) || []);
        
        // Filter out completed tasks from any previous day in the week, but keep tasks that are already in today's plan
        uniqueItems = uniqueItems.filter(item => 
          !completedTaskIds.has(item.id) || todayTaskIds.has(item.id)
        );
      }
    }

    return uniqueItems;
  } catch (error) {
    console.error('Error fetching tasks for week:', error);
    throw error;
  }
}

