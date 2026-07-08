// =============================================================================
// AUSTRAL GROWTH OS — TYPESCRIPT TYPES
// =============================================================================

export type {
  User, Workspace, Lead, Pipeline, Note, Activity, Task,
  Proposal, Project, ProjectFile, Finance, Automation,
  Tag, LeadTag, AIInsight,
  UserRole, Plan, PipelineStage, Priority, LeadSource,
  CompanySize, ActivityType, TaskStatus, ProposalStatus,
  ProjectStatus, FinanceType, AutomationTrigger, InsightType,
} from '@prisma/client'

// Extended types with relations
export type LeadWithRelations = import('@prisma/client').Lead & {
  assignedTo?: import('@prisma/client').User | null
  notes?: import('@prisma/client').Note[]
  activities?: import('@prisma/client').Activity[]
  tasks?: import('@prisma/client').Task[]
  proposals?: import('@prisma/client').Proposal[]
  tags?: (import('@prisma/client').LeadTag & { tag: import('@prisma/client').Tag })[]
  project?: import('@prisma/client').Project | null
}

export type ProjectWithRelations = import('@prisma/client').Project & {
  lead?: import('@prisma/client').Lead | null
  tasks?: import('@prisma/client').Task[]
  files?: import('@prisma/client').ProjectFile[]
}

export type ProposalWithRelations = import('@prisma/client').Proposal & {
  lead?: import('@prisma/client').Lead
  createdBy?: import('@prisma/client').User
}

// Dashboard types
export interface DashboardMetrics {
  monthlyRevenue: number
  yearlyRevenue: number
  monthlyGoal: number
  yearlyGoal: number
  monthlyGoalProgress: number
  activeLeads: number
  hotLeads: number
  proposalsSent: number
  closeRate: number
  avgTicket: number
  upcomingFollowUps: LeadWithRelations[]
  funnelData: FunnelStage[]
  monthlyChart: MonthlyData[]
  revenueByIndustry: IndustryData[]
}

export interface FunnelStage {
  stage: string
  label: string
  count: number
  value: number
  conversionRate?: number
}

export interface MonthlyData {
  month: string
  revenue: number
  expenses: number
  leads: number
  deals: number
}

export interface IndustryData {
  industry: string
  revenue: number
  leads: number
  closeRate: number
}

// AI types
export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIInsightData {
  type: string
  title: string
  content: string
  priority: string
  leadId?: string
  actionable?: {
    label: string
    action: string
    data?: Record<string, unknown>
  }
}

// Pipeline
export interface PipelineColumn {
  stage: string
  label: string
  color: string
  leads: LeadWithRelations[]
  totalValue: number
}

// Finance
export interface FinanceSummary {
  totalIncome: number
  totalExpenses: number
  netProfit: number
  grossProfit: number
  pending: number
  monthlyData: MonthlyData[]
}

// Automation action types
export interface AutomationAction {
  type: 'CREATE_TASK' | 'MOVE_PIPELINE' | 'SEND_NOTIFICATION' | 'GENERATE_MESSAGE' | 'SEND_EMAIL'
  config: Record<string, unknown>
}

// API Response wrapper
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}
