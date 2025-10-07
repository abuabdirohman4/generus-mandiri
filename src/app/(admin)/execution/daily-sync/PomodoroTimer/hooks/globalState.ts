// Global state management for timer persistence

// Global state to prevent multiple instances (Strict Mode safe)
let globalRecoveryInProgress = false;
let globalLastSaveTime = 0;
let globalIsSaving = false;
let globalRecoveryCompleted = false;

// Reset function for development mode
export const resetTimerPersistence = () => {
  globalRecoveryInProgress = false;
  globalRecoveryCompleted = false;
  globalLastSaveTime = 0;
  globalIsSaving = false;
};

// Make it available in development mode
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).resetTimerPersistence = resetTimerPersistence;
}

// Getters
export const getGlobalState = () => ({
  recoveryInProgress: globalRecoveryInProgress,
  lastSaveTime: globalLastSaveTime,
  isSaving: globalIsSaving,
  recoveryCompleted: globalRecoveryCompleted
});

// Setters
export const setGlobalRecoveryInProgress = (value: boolean) => {
  globalRecoveryInProgress = value;
};

export const setGlobalRecoveryCompleted = (value: boolean) => {
  globalRecoveryCompleted = value;
};

export const setGlobalLastSaveTime = (value: number) => {
  globalLastSaveTime = value;
};

export const setGlobalIsSaving = (value: boolean) => {
  globalIsSaving = value;
};
