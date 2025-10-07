import { DailyPlanItem } from '../types';

export const groupItemsByType = (items: DailyPlanItem[] = []) => {
  const groups = {
    'MAIN_QUEST': [] as DailyPlanItem[],
    'WORK': [] as DailyPlanItem[],
    'SIDE_QUEST': [] as DailyPlanItem[],
    'WORK_QUEST': [] as DailyPlanItem[]
  };
  
  items.forEach(item => {
    if (item.item_type === 'MAIN_QUEST') {
      groups['MAIN_QUEST'].push(item);
    } else if (item.item_type === 'SIDE_QUEST') {
      groups['SIDE_QUEST'].push(item);
    } else if (item.item_type === 'WORK_QUEST') {
      groups['WORK_QUEST'].push(item);
    }
  });
  
  return groups;
};
