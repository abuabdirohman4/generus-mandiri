import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Language, translations } from '@/lib/translations';

interface LanguageState {
  language: Language;
  setLanguage: (language: Language) => void;
  t: typeof translations.en;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (newLanguage: Language) => {
        set({ language: newLanguage, t: translations[newLanguage] });
      },
      t: translations.en,
    }),
    {
      name: 'language-storage', // unique name for localStorage key
      partialize: (state) => ({ language: state.language }), // only persist language, not t
    }
  )
);

// Helper hook for easier usage
export const useLanguage = () => {
  const { language, setLanguage, t } = useLanguageStore();
  return { language, setLanguage, t };
};
