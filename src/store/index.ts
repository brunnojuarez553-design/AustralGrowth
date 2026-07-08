// =============================================================================
// AUSTRAL GROWTH OS — ZUSTAND GLOBAL STORE
// =============================================================================

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { LeadWithRelations, DashboardMetrics, AIInsightData } from '@/types'

// UI Store
interface UIState {
  sidebarOpen: boolean
  commandPaletteOpen: boolean
  activeModule: string
  notifications: Notification[]
  
  setSidebarOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setActiveModule: (module: string) => void
  addNotification: (notif: Omit<Notification, 'id' | 'createdAt'>) => void
  dismissNotification: (id: string) => void
  clearNotifications: () => void
}

interface Notification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error'
  title: string
  message?: string
  createdAt: Date
}

export const useUIStore = create<UIState>()(
  devtools(
    persist(
      (set) => ({
        sidebarOpen: true,
        commandPaletteOpen: false,
        activeModule: 'dashboard',
        notifications: [],
        
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
        setActiveModule: (module) => set({ activeModule: module }),
        
        addNotification: (notif) => set((state) => ({
          notifications: [
            { ...notif, id: crypto.randomUUID(), createdAt: new Date() },
            ...state.notifications,
          ].slice(0, 20),
        })),
        
        dismissNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id),
        })),
        
        clearNotifications: () => set({ notifications: [] }),
      }),
      { name: 'ags-ui', partialize: (s) => ({ sidebarOpen: s.sidebarOpen }) }
    )
  )
)

// CRM Store
interface CRMState {
  leads: LeadWithRelations[]
  selectedLead: LeadWithRelations | null
  filterStage: string | null
  filterPriority: string | null
  filterIndustry: string | null
  searchQuery: string
  
  setLeads: (leads: LeadWithRelations[]) => void
  setSelectedLead: (lead: LeadWithRelations | null) => void
  updateLead: (id: string, updates: Partial<LeadWithRelations>) => void
  setFilter: (key: 'filterStage' | 'filterPriority' | 'filterIndustry', value: string | null) => void
  setSearchQuery: (query: string) => void
  getFilteredLeads: () => LeadWithRelations[]
}

export const useCRMStore = create<CRMState>()(
  devtools((set, get) => ({
    leads: [],
    selectedLead: null,
    filterStage: null,
    filterPriority: null,
    filterIndustry: null,
    searchQuery: '',
    
    setLeads: (leads) => set({ leads }),
    setSelectedLead: (lead) => set({ selectedLead: lead }),
    
    updateLead: (id, updates) => set((state) => ({
      leads: state.leads.map(l => l.id === id ? { ...l, ...updates } : l),
      selectedLead: state.selectedLead?.id === id 
        ? { ...state.selectedLead, ...updates } 
        : state.selectedLead,
    })),
    
    setFilter: (key, value) => set({ [key]: value }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    
    getFilteredLeads: () => {
      const { leads, filterStage, filterPriority, filterIndustry, searchQuery } = get()
      return leads.filter(lead => {
        if (filterStage && lead.stage !== filterStage) return false
        if (filterPriority && lead.priority !== filterPriority) return false
        if (filterIndustry && lead.industry !== filterIndustry) return false
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          return (
            lead.companyName.toLowerCase().includes(q) ||
            lead.contactName?.toLowerCase().includes(q) ||
            lead.industry?.toLowerCase().includes(q) ||
            lead.country?.toLowerCase().includes(q)
          )
        }
        return true
      })
    },
  }))
)

// Dashboard Store
interface DashboardState {
  metrics: DashboardMetrics | null
  isLoading: boolean
  lastUpdated: Date | null
  setMetrics: (metrics: DashboardMetrics) => void
  setLoading: (loading: boolean) => void
}

export const useDashboardStore = create<DashboardState>()(
  devtools((set) => ({
    metrics: null,
    isLoading: false,
    lastUpdated: null,
    setMetrics: (metrics) => set({ metrics, lastUpdated: new Date(), isLoading: false }),
    setLoading: (isLoading) => set({ isLoading }),
  }))
)

// AI Store
interface AIState {
  directorMessages: { role: string; content: string }[]
  insights: AIInsightData[]
  isGenerating: boolean
  
  addMessage: (message: { role: string; content: string }) => void
  setInsights: (insights: AIInsightData[]) => void
  setGenerating: (generating: boolean) => void
  clearMessages: () => void
}

export const useAIStore = create<AIState>()(
  devtools((set) => ({
    directorMessages: [],
    insights: [],
    isGenerating: false,
    
    addMessage: (message) => set((state) => ({
      directorMessages: [...state.directorMessages, message],
    })),
    
    setInsights: (insights) => set({ insights }),
    setGenerating: (isGenerating) => set({ isGenerating }),
    clearMessages: () => set({ directorMessages: [] }),
  }))
)
