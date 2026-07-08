// =============================================================================
// API: /api/dashboard — métricas ejecutivas completas
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export const revalidate = 300 // 5 min cache

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      include: { workspace: true },
    })
    if (!dbUser) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const { workspaceId, workspace } = dbUser
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const [
      allLeads,
      monthlyIncome,
      yearlyIncome,
      monthlyExpenses,
      upcomingFollowUps,
      monthlyChartData,
    ] = await Promise.all([
      prisma.lead.findMany({
        where: { workspaceId },
        select: {
          stage: true, industry: true, estimatedValue: true,
          isHot: true, createdAt: true, closedAt: true,
        },
      }),
      prisma.finance.aggregate({
        where: { workspaceId, type: 'INCOME', date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.finance.aggregate({
        where: { workspaceId, type: 'INCOME', date: { gte: startOfYear } },
        _sum: { amount: true },
      }),
      prisma.finance.aggregate({
        where: { workspaceId, type: 'EXPENSE', date: { gte: startOfMonth } },
        _sum: { amount: true },
      }),
      prisma.lead.findMany({
        where: {
          workspaceId,
          stage: { notIn: ['WON', 'LOST'] },
          nextFollowUpAt: { lte: in7Days },
        },
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          tags: { include: { tag: true } },
        },
        orderBy: { nextFollowUpAt: 'asc' },
        take: 5,
      }),
      // Last 6 months revenue
      Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
          const end = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0, 23, 59, 59)
          return Promise.all([
            prisma.finance.aggregate({
              where: { workspaceId, type: 'INCOME', date: { gte: d, lte: end } },
              _sum: { amount: true },
            }),
            prisma.finance.aggregate({
              where: { workspaceId, type: 'EXPENSE', date: { gte: d, lte: end } },
              _sum: { amount: true },
            }),
            prisma.lead.count({
              where: { workspaceId, createdAt: { gte: d, lte: end } },
            }),
            prisma.lead.count({
              where: { workspaceId, stage: 'WON', closedAt: { gte: d, lte: end } },
            }),
          ]).then(([income, expenses, leads, deals]) => ({
            month: d.toLocaleDateString('es', { month: 'short', year: '2-digit' }),
            revenue: income._sum.amount ?? 0,
            expenses: expenses._sum.amount ?? 0,
            leads,
            deals,
          }))
        })
      ),
    ])

    const activeLeads = allLeads.filter(l => !['WON', 'LOST'].includes(l.stage))
    const wonLeads = allLeads.filter(l => l.stage === 'WON')
    const proposalLeads = allLeads.filter(l => l.stage === 'PROPOSAL')
    const closeRate = allLeads.length > 0 ? (wonLeads.length / allLeads.length) * 100 : 0
    const avgTicket = wonLeads.filter(l => l.estimatedValue).length > 0
      ? wonLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0) / wonLeads.filter(l => l.estimatedValue).length
      : 0

    const monthlyRevenue = monthlyIncome._sum.amount ?? 0
    const monthlyGoalProgress = workspace.monthlyGoal > 0
      ? (monthlyRevenue / workspace.monthlyGoal) * 100
      : 0

    const stages = ['DETECTED','CONTACTED','REPLIED','MEETING','DEMO','PROPOSAL','NEGOTIATION','WON','LOST']
    const funnelData = stages.map((stage, i) => {
      const count = allLeads.filter(l => l.stage === stage).length
      const prevCount = i > 0 ? allLeads.filter(l => l.stage === stages[i-1]).length : null
      return {
        stage,
        label: stage.charAt(0) + stage.slice(1).toLowerCase().replace('_', ' '),
        count,
        value: allLeads.filter(l => l.stage === stage).reduce((s, l) => s + (l.estimatedValue ?? 0), 0),
        conversionRate: prevCount && prevCount > 0 ? (count / prevCount) * 100 : null,
      }
    })

    const industryMap = new Map<string, { revenue: number; leads: number; won: number }>()
    allLeads.forEach(l => {
      const industry = l.industry ?? 'Sin rubro'
      const existing = industryMap.get(industry) ?? { revenue: 0, leads: 0, won: 0 }
      industryMap.set(industry, {
        revenue: existing.revenue + (l.estimatedValue ?? 0),
        leads: existing.leads + 1,
        won: existing.won + (l.stage === 'WON' ? 1 : 0),
      })
    })

    const revenueByIndustry = Array.from(industryMap.entries())
      .map(([industry, data]) => ({
        industry,
        revenue: data.revenue,
        leads: data.leads,
        closeRate: data.leads > 0 ? (data.won / data.leads) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)

    return NextResponse.json({
      data: {
        monthlyRevenue,
        yearlyRevenue: yearlyIncome._sum.amount ?? 0,
        monthlyGoal: workspace.monthlyGoal,
        yearlyGoal: workspace.yearlyGoal,
        monthlyGoalProgress,
        monthlyExpenses: monthlyExpenses._sum.amount ?? 0,
        activeLeads: activeLeads.length,
        hotLeads: allLeads.filter(l => l.isHot).length,
        proposalsSent: proposalLeads.length,
        closeRate,
        avgTicket,
        upcomingFollowUps,
        funnelData,
        monthlyChart: monthlyChartData,
        revenueByIndustry,
      },
    })
  } catch (error) {
    console.error('GET /api/dashboard error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
