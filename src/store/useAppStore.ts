import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AppState {
  // UI State
  sidebarOpen: boolean;
  commandOpen: boolean;
  activeModule: string;
  // User prefs
  currency: string;
  theme: "dark" | "light";
  // Actions
  setSidebarOpen: (v: boolean) => void;
  setCommandOpen: (v: boolean) => void;
  setActiveModule: (v: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      commandOpen: false,
      activeModule: "dashboard",
      currency: "USD",
      theme: "dark",
      setSidebarOpen: (v) => set({ sidebarOpen: v }),
      setCommandOpen: (v) => set({ commandOpen: v }),
      setActiveModule: (v) => set({ activeModule: v }),
    }),
    { name: "ags-app-store" }
  )
);
