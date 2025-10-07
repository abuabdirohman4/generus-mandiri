import React from 'react';
import MilestoneItem from './MilestoneItem';

interface Milestone {
  id: string;
  title: string;
  display_order: number;
  status?: 'TODO' | 'DONE';
}

interface MilestoneBarProps {
  milestones: Milestone[];
  newMilestoneInputs: string[];
  setNewMilestoneInputs: React.Dispatch<React.SetStateAction<string[]>>;
  newMilestoneLoading: boolean[];
  milestoneLoading: Record<string, boolean>;
  milestoneChanges: Record<string, boolean>;
  activeMilestoneIdx: number;
  setActiveMilestoneIdx: (idx: number) => void;
  handleSaveNewMilestone: (idx: number) => void;
  handleSaveMilestone: (id: string, val: string) => void;
  handleMilestoneChange: (id: string, newTitle: string) => void;
  onStatusToggle?: (id: string, currentStatus: 'TODO' | 'DONE') => void;
  onClearActiveMilestoneIdx?: () => void;
}

export default function MilestoneBar({
  milestones,
  newMilestoneInputs,
  setNewMilestoneInputs,
  newMilestoneLoading,
  milestoneLoading,
  milestoneChanges,
  activeMilestoneIdx,
  setActiveMilestoneIdx,
  handleSaveNewMilestone,
  handleSaveMilestone,
  handleMilestoneChange,
  onStatusToggle,
  onClearActiveMilestoneIdx,
}: MilestoneBarProps) {
  return (
    <div className="flex flex-col gap-4 justify-center mb-6">
      {Array.from({ length: 3 }).map((_, idx) => {
        // Find milestone with display_order matching this position (1-based)
        const milestone = milestones.find(m => m.display_order === idx + 1);
        
        return (
          <MilestoneItem
            key={milestone ? milestone.id : `empty-${idx}`}
            milestone={milestone || null}
            idx={idx}
            activeMilestoneIdx={activeMilestoneIdx}
            newMilestoneInputs={newMilestoneInputs}
            setNewMilestoneInputs={setNewMilestoneInputs}
            newMilestoneLoading={newMilestoneLoading}
            milestoneLoading={milestoneLoading}
            milestoneChanges={milestoneChanges}
            setActiveMilestoneIdx={setActiveMilestoneIdx}
            handleSaveNewMilestone={handleSaveNewMilestone}
            handleSaveMilestone={handleSaveMilestone}
            handleMilestoneChange={handleMilestoneChange}
            onStatusToggle={onStatusToggle}
            onClearActiveMilestoneIdx={onClearActiveMilestoneIdx}
          />
        );
      })}
    </div>
  );
}
