import { useState, useEffect } from 'react';
import type { Quest } from '../../WeeklySyncClient/types';

export function useExpansionManagement(hierarchicalData: Quest[], dataLoading: boolean) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (hierarchicalData.length > 0 && !dataLoading) {
      const questIds = hierarchicalData.map(quest => quest.id);
      setExpandedItems(new Set(questIds));
    }
  }, [hierarchicalData, dataLoading]);

  const getAllExpandableIds = () => {
    const ids: string[] = [];
    hierarchicalData.forEach(quest => {
      ids.push(quest.id);
      quest.milestones?.forEach(milestone => {
        ids.push(milestone.id);
        milestone.tasks?.forEach(task => {
          ids.push(task.id);
        });
      });
    });
    return ids;
  };

  const handleExpandAll = () => {
    setExpandedItems(new Set(getAllExpandableIds()));
  };

  const handleCollapseAll = () => {
    setExpandedItems(new Set());
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  return {
    expandedItems,
    handleExpandAll,
    handleCollapseAll,
    toggleExpanded
  };
}
