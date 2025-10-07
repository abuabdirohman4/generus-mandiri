/**
 * Sound Utilities for Timer Notifications
 * Menggunakan Web Audio API untuk built-in sounds dan custom sounds
 */

export interface SoundOption {
  id: string;
  name: string;
  type: 'custom';
  description: string;
  emoji: string;
  filePath: string; // Path untuk custom audio files
}

// Timer sound options using WAV files (for Pomodoro timer)
export const TIMER_SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'none',
    name: 'No Sound',
    type: 'custom',
    description: 'Silent - no timer sound',
    emoji: '🔇',
    filePath: ''
  },
  {
    id: 'boxing',
    name: 'Boxing',
    type: 'custom',
    description: 'Punchy boxing bell',
    emoji: '🥊',
    filePath: '/audio/boxing.WAV'
  },
  {
    id: 'children',
    name: 'Children',
    type: 'custom',
    description: 'Playful children chime',
    emoji: '👶',
    filePath: '/audio/children.WAV'
  },
  {
    id: 'cinematic',
    name: 'Cinematic',
    type: 'custom',
    description: 'Epic cinematic sound',
    emoji: '🎬',
    filePath: '/audio/cinematic.WAV'
  },
  {
    id: 'crowd',
    name: 'Crowd',
    type: 'custom',
    description: 'Crowd cheering',
    emoji: '👥',
    filePath: '/audio/crowd.WAV'
  },
  {
    id: 'crystal',
    name: 'Crystal',
    type: 'custom',
    description: 'Crystal clear chime',
    emoji: '💎',
    filePath: '/audio/crystal.WAV'
  },
  {
    id: 'forecast',
    name: 'Forecast',
    type: 'custom',
    description: 'Weather forecast tone',
    emoji: '🌤️',
    filePath: '/audio/forecast.WAV'
  }
];

// Task completion sound options (for task completion notifications)
export const COMPLETION_SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'none',
    name: 'No Sound',
    type: 'custom',
    description: 'Silent - no task completion sound',
    emoji: '🔇',
    filePath: ''
  },
  {
    id: 'smooth-notify',
    name: 'Smooth Notify',
    type: 'custom',
    description: 'Smooth notification alert',
    emoji: '🔔',
    filePath: '/audio/smooth-notify-alert-toast-warn.wav'
  },
  {
    id: 'pop-up-notify',
    name: 'Pop Up Notify',
    type: 'custom',
    description: 'Pop up notification alert',
    emoji: '🎉',
    filePath: '/audio/pop-up-notify-smooth-modern.wav'
  }
];

// Focus sound options (for background ticking during Pomodoro timer)
export const FOCUS_SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'none',
    name: 'No Sound',
    type: 'custom',
    description: 'Silent - no focus background sound',
    emoji: '🔇',
    filePath: ''
  },
  {
    id: 'ticking-clock',
    name: 'Ticking Clock',
    type: 'custom',
    description: 'Classic ticking clock sound',
    emoji: '🕐',
    filePath: '/audio/ticking-clock.wav'
  }
];

// Load custom audio file
async function loadCustomAudio(filePath: string): Promise<AudioBuffer> {
  try {
    const response = await fetch(filePath);
    
    if (!response.ok) {
      throw new Error(`Failed to load audio file: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
    return audioBuffer;
  } catch (error) {
    console.error('Error loading custom audio:', error);
    throw error;
  }
}

// Global audio context and source management
let globalAudioContext: AudioContext | null = null;
let currentAudioSource: AudioBufferSourceNode | null = null;
let focusSoundInterval: NodeJS.Timeout | null = null;
let audioContextInitialized = false;

// Check if audio permission is granted
export async function checkAudioPermission(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const testAudio = new Audio();
      testAudio.volume = 0.01; // Very quiet test
      testAudio.muted = true; // Mute to avoid actual sound
      
      // Set timeout to prevent hanging
      const timeout = setTimeout(() => {
        resolve(false);
      }, 3000); // 3 second timeout
      
      // Use promise-based approach
      const playPromise = testAudio.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            clearTimeout(timeout);
            testAudio.pause();
            resolve(true);
          })
          .catch((error) => {
            clearTimeout(timeout);
            resolve(false);
          });
      } else {
        // Fallback for older browsers
        clearTimeout(timeout);
        resolve(true);
      }
    } catch (error) {
      resolve(false);
    }
  });
}

// Open browser permission settings
export function openAudioPermissionSettings(): void {
  const userAgent = navigator.userAgent.toLowerCase();
  
  try {
    if (userAgent.includes('chrome')) {
      // Chrome - try to open settings, fallback to general settings
      try {
        window.open('chrome://settings/content/sound', '_blank');
      } catch (error) {
        window.open('chrome://settings/', '_blank');
      }
    } else if (userAgent.includes('firefox')) {
      // Firefox
      window.open('about:preferences#privacy', '_blank');
    } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
      // Safari
      window.open('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone', '_blank');
    } else if (userAgent.includes('edge')) {
      // Edge - try to open settings, fallback to general settings
      try {
        window.open('edge://settings/content/sound', '_blank');
      } catch (error) {
        window.open('edge://settings/', '_blank');
      }
    } else {
      // Generic fallback - try Chrome settings first
      try {
        window.open('chrome://settings/content/sound', '_blank');
      } catch (error) {
        alert('Please manually open your browser settings and enable audio permissions for this site.');
      }
    }
  } catch (error) {
    console.error('Error opening browser settings:', error);
    // Ultimate fallback - show instructions
    alert('Please manually open your browser settings and enable audio permissions for this site.');
  }
}

// Initialize AudioContext with user interaction
export function initializeAudioContext(): Promise<void> {
  return new Promise((resolve) => {
    if (audioContextInitialized && globalAudioContext && globalAudioContext.state === 'running') {
      resolve();
      return;
    }

    const initAudio = async () => {
      try {
        if (!globalAudioContext) {
          globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        
        if (globalAudioContext.state === 'suspended') {
          await globalAudioContext.resume();
        }
        
        audioContextInitialized = true;
        resolve();
      } catch (error) {
        console.error('Failed to initialize AudioContext:', error);
        resolve(); // Continue anyway
      }
    };

    // Try to initialize immediately
    initAudio();
  });
}

// Stop current playing sound
export function stopCurrentSound(): void {
  if (currentAudioSource) {
    try {
      currentAudioSource.stop();
      currentAudioSource.disconnect();
      currentAudioSource = null;
    } catch (error) {
      // Source might already be stopped
    }
  }
  
  // Stop focus sound loop
  if (focusSoundInterval) {
    clearInterval(focusSoundInterval);
    focusSoundInterval = null;
  }
}

// Play sound function
export async function playSound(soundId: string, volume: number = 0.5): Promise<void> {
  try {
    // Stop any currently playing sound
    stopCurrentSound();

    // Handle "No Sound" option
    if (soundId === 'none') {
      return; // Silent - no sound played
    }

    // Create or reuse audio context
    if (!globalAudioContext) {
      globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    if (!globalAudioContext) {
      console.warn('Web Audio API not supported, falling back to system sound');
      // Fallback to system beep
      return;
    }

    // Resume audio context if suspended (required for user interaction)
    if (globalAudioContext.state === 'suspended') {
      await globalAudioContext.resume();
    }

    // Find sound option in all sound categories
    const soundOption = [...TIMER_SOUND_OPTIONS, ...COMPLETION_SOUND_OPTIONS, ...FOCUS_SOUND_OPTIONS].find(option => option.id === soundId);
    if (!soundOption) {
      throw new Error(`Sound option not found: ${soundId}`);
    }

    let buffer: AudioBuffer;

    if (soundOption.type === 'custom' && soundOption.filePath) {
      // Load custom audio file
      buffer = await loadCustomAudio(soundOption.filePath);
    } else {
      throw new Error(`Unsupported sound type: ${soundOption.type}`);
    }

    const source = globalAudioContext.createBufferSource();
    const gainNode = globalAudioContext.createGain();
    
    source.buffer = buffer;
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(globalAudioContext.destination);
    
    // Store reference to current source for stopping
    currentAudioSource = source;
    
    // Clean up reference when sound ends
    source.onended = () => {
      currentAudioSource = null;
    };
    
    source.start();
  } catch (error) {
    console.error('Error playing sound:', error);
    
    // Try fallback with HTML5 Audio
    try {
      const audio = new Audio();
      const soundOption = [...TIMER_SOUND_OPTIONS, ...COMPLETION_SOUND_OPTIONS, ...FOCUS_SOUND_OPTIONS].find(option => option.id === soundId);
      
      if (soundOption && soundOption.filePath) {
        audio.src = soundOption.filePath;
        audio.volume = volume;
        audio.play().catch(fallbackError => {
          console.error('HTML5 Audio fallback failed:', fallbackError);
        });
      }
    } catch (fallbackError) {
      console.error('HTML5 Audio fallback error:', fallbackError);
    }
    
    // Final fallback to system notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Timer Complete!');
    }
  }
}

// Play timer completion sound
export async function playTimerCompleteSound(
  soundId: string, 
  volume: number = 0.5, 
  taskTitle?: string
): Promise<void> {
  // Play the selected sound
  await playSound(soundId, volume);
}

// Get sound option by ID
export function getSoundOption(soundId: string): SoundOption | undefined {
  return TIMER_SOUND_OPTIONS.find(option => option.id === soundId);
}

// Play focus sound in loop (for ticking clock during Pomodoro timer)
export async function playFocusSoundLoop(soundId: string, volume: number = 0.5): Promise<void> {
  try {
    // Stop any currently playing sound and focus loop
    stopCurrentSound();

    // Handle "No Sound" option
    if (soundId === 'none') {
      return; // Silent - no sound played
    }

    // Initialize AudioContext first
    await initializeAudioContext();
    
    if (!globalAudioContext) {
      console.warn('Web Audio API not supported, falling back to system sound');
      return;
    }

    // Resume audio context if suspended (required for user interaction)
    if (globalAudioContext.state === 'suspended') {
      try {
        await globalAudioContext.resume();
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
        // Try to create new context
        globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
    }

    // Find sound option in focus sound options
    const soundOption = FOCUS_SOUND_OPTIONS.find(option => option.id === soundId);
    if (!soundOption) {
      throw new Error(`Focus sound option not found: ${soundId}`);
    }

    if (soundOption.type === 'custom' && soundOption.filePath) {
      // Load custom audio file
      const buffer = await loadCustomAudio(soundOption.filePath);
      
      // Play sound in loop every 1 second for ticking clock
      const playTick = () => {
        if (focusSoundInterval) { // Check if still playing
          const source = globalAudioContext!.createBufferSource();
          const gainNode = globalAudioContext!.createGain();
          
          source.buffer = buffer;
          gainNode.gain.value = volume;
          
          source.connect(gainNode);
          gainNode.connect(globalAudioContext!.destination);
          
          source.start();
        }
      };
      
      // Start the loop
      focusSoundInterval = setInterval(playTick, 1000); // Every 1 second
      
    } else {
      throw new Error(`Unsupported focus sound type: ${soundOption.type}`);
    }
    
  } catch (error) {
    console.error('Error playing focus sound loop:', error);
    
    // Try fallback with HTML5 Audio
    try {
      const soundOption = FOCUS_SOUND_OPTIONS.find(option => option.id === soundId);
      
      if (soundOption && soundOption.filePath) {
        const playTick = () => {
          if (focusSoundInterval) { // Check if still playing
            const audio = new Audio();
            audio.src = soundOption.filePath;
            audio.volume = volume;
            audio.play().catch(fallbackError => {
              console.error('HTML5 Audio fallback failed:', fallbackError);
            });
          }
        };
        
        // Start the loop
        focusSoundInterval = setInterval(playTick, 1000); // Every 1 second
      }
    } catch (fallbackError) {
      console.error('HTML5 Audio fallback error:', fallbackError);
    }
  }
}

// Default sound settings
export const DEFAULT_SOUND_SETTINGS = {
  soundId: 'success',
  volume: 0.5,
  enabled: true
};
