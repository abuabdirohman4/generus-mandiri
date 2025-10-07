import { useState, useCallback } from 'react';
import { updateMilestone, getMilestonesForQuest, addMilestone } from '../../actions/milestoneActions';

interface Milestone {
  id: string;
  title: string;
  display_order: number;
  status?: 'TODO' | 'DONE';
}

export function useMilestoneState(questId: string) {
  // Milestone state
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [originalMilestones, setOriginalMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(true);
  const [newMilestoneInputs, setNewMilestoneInputs] = useState(['', '', '']);
  const [newMilestoneLoading, setNewMilestoneLoading] = useState([false, false, false]);
  const [milestoneLoading, setMilestoneLoading] = useState<Record<string, boolean>>({});
  const [milestoneChanges, setMilestoneChanges] = useState<Record<string, boolean>>({});
  const [activeMilestoneIdx, setActiveMilestoneIdx] = useState(0);

  // Fetch milestones
  const fetchMilestones = useCallback(async () => {
    setLoadingMilestones(true);
    try {
      const data = await getMilestonesForQuest(questId);
      const sortedData = data?.sort((a: Milestone, b: Milestone) => a.display_order - b.display_order) || [];
      setMilestones(sortedData);
      setOriginalMilestones(sortedData);
    } finally {
      setLoadingMilestones(false);
    }
  }, [questId]);

  // Save new milestone
  const handleSaveNewMilestone = useCallback(async (idx: number) => {
    const val = newMilestoneInputs[idx];
    if (!val.trim()) return;

    setNewMilestoneLoading(l => l.map((v, i) => i === idx ? true : v));
    try {
      const formData = new FormData();
      formData.append('quest_id', questId);
      formData.append('title', val.trim());
      formData.append('display_order', String(idx + 1));
      await addMilestone(formData);
      fetchMilestones();
      setNewMilestoneInputs(inputs => inputs.map((v, i) => i === idx ? '' : v));
    } catch (error) {
    } finally {
      setNewMilestoneLoading(l => l.map((v, i) => i === idx ? false : v));
    }
  }, [questId, newMilestoneInputs, fetchMilestones]);

  // Save existing milestone
  const handleSaveMilestone = useCallback(async (id: string, val: string) => {
    setMilestoneLoading(prev => ({ ...prev, [id]: true }));
    try {
      await updateMilestone(id, val);
      setMilestoneChanges(prev => ({ ...prev, [id]: false }));
      fetchMilestones();
    } catch (error) {
    } finally {
      setMilestoneLoading(prev => ({ ...prev, [id]: false }));
    }
  }, [fetchMilestones]);

  // Handle milestone title change
  const handleMilestoneChange = useCallback((id: string, newTitle: string) => {
    setMilestones(ms => ms.map(m => m.id === id ? { ...m, title: newTitle } : m));
    const originalMilestone = originalMilestones.find(m => m.id === id);
    setMilestoneChanges(prev => ({ 
      ...prev, 
      [id]: newTitle.trim() !== originalMilestone?.title && newTitle.trim() !== '' 
    }));
  }, [originalMilestones]);

  return {
    // State
    milestones,
    originalMilestones,
    loadingMilestones,
    newMilestoneInputs,
    setNewMilestoneInputs,
    newMilestoneLoading,
    milestoneLoading,
    milestoneChanges,
    activeMilestoneIdx,
    setActiveMilestoneIdx,
    
    // Actions
    fetchMilestones,
    handleSaveNewMilestone,
    handleSaveMilestone,
    handleMilestoneChange,
  };
}
