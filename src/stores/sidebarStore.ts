import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isExpanded: boolean;
  isMobileOpen: boolean;
  isHovered: boolean;
  activeItem: string | null;
  openSubmenu: string | null;
  isMobile: boolean;
  toggleSidebar: () => void;
  toggleMobileSidebar: () => void;
  setIsHovered: (isHovered: boolean) => void;
  setActiveItem: (item: string | null) => void;
  toggleSubmenu: (item: string) => void;
  setIsMobile: (isMobile: boolean) => void;
  closeMobileSidebar: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      isExpanded: false,
      isMobileOpen: false,
      isHovered: false,
      activeItem: null,
      openSubmenu: null,
      isMobile: false,

      toggleSidebar: () => set((state) => ({ isExpanded: !state.isExpanded })),
      
      toggleMobileSidebar: () => set((state) => ({ isMobileOpen: !state.isMobileOpen })),
      
      setIsHovered: (isHovered: boolean) => set({ isHovered }),
      
      setActiveItem: (activeItem: string | null) => set({ activeItem }),
      
      toggleSubmenu: (item: string) => set((state) => ({
        openSubmenu: state.openSubmenu === item ? null : item
      })),
      
      setIsMobile: (isMobile: boolean) => set({ isMobile }),
      
      closeMobileSidebar: () => set({ isMobileOpen: false }),
    }),
    {
      name: 'sidebar-storage',
      partialize: (state) => ({ isExpanded: state.isExpanded }), // Only persist isExpanded
    }
  )
);

// Computed values
export const useSidebar = () => {
  const store = useSidebarStore();
  return {
    ...store,
    isExpanded: store.isMobile ? false : store.isExpanded, // Override for mobile
  };
};
