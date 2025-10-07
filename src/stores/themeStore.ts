import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  isInitialized: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      isInitialized: false,

      toggleTheme: () => set((state) => ({
        theme: state.theme === "light" ? "dark" : "light"
      })),

      setTheme: (theme: Theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isInitialized = true;
          // Apply theme to DOM
          if (typeof window !== 'undefined') {
            if (state.theme === "dark") {
              document.documentElement.classList.add("dark");
            } else {
              document.documentElement.classList.remove("dark");
            }
          }
        }
      },
    }
  )
);

// Hook with initialization logic
export const useTheme = () => {
  const store = useThemeStore();
  
  // Initialize theme on first render
  if (typeof window !== 'undefined' && !store.isInitialized) {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const initialTheme = savedTheme || "light";
    store.setTheme(initialTheme);
  }

  return {
    theme: store.theme,
    toggleTheme: store.toggleTheme,
  };
};
