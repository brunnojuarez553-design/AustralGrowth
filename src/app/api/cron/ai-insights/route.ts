// =============================================================================
// CRON: /api/cron/ai-insights — ejecuta diariamente a las 8am
// Genera insights para todos los workspaces activos
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const workspaces = await prisma.workspace.findMany({
      select: { id: true },
    })

    let totalInsights = 0

    for (const workspace of workspaces) {
      const today = new Date()
      const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)

      const [hotLeads, forgottenLeads] = await Promise.all([
        prisma.lead.findMany({
          where: { workspaceId: workspace.id, isHot: true, stage: { notIn: ['WON', 'LOST'] } },
          select: { id: true, companyName: true, estimatedValue: true },
        }),
        prisma.lead.findMany({
          where: {
            workspaceId: workspace.id,
            stage: { notIn: ['WON', 'LOST'] },
            OR: [
              { lastContactedAt: { lte: fiveDaysAgo } },
              { lastContactedAt: null, createdAt: { lte: fiveDaysAgo } },
            ],
          },
          select: { id: true, companyName: true, lastContactedAt: true, estimatedValue: true },
          take: 10,
        }),
      ])

      const insightsToCreate = []

      if (hotLeads.length > 0) {
        const value = hotLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0)
        insightsToCreate.push({
          workspaceId: workspace.id,
          type: 'HOT_LEAD' as const,
          title: `${hotLeads.length} leads calientes para cerrar hoy`,
          content: `Tenés ${hotLeads.length} leads calientes con valor potencial total de $${value}. Priorizalos.`,
          priority: 'HIGH' as const,
        })
      }

      for (const lead of forgottenLeads.slice(0, 5)) {
        insightsToCreate.push({
          workspaceId: workspace.id,
          type: 'FORGOTTEN_LEAD' as const,
          title: `${lead.companyName} necesita seguimiento`,
          content: `Sin contacto por más de 5 días. Valor: $${lead.estimatedValue ?? 0}.`,
          priority: 'MEDIUM' as const,
          leadId: lead.id,
        })
      }

      if (insightsToCreate.length > 0) {
        await prisma.aIInsight.createMany({ data: insightsToCreate })
        totalInsights += insightsToCreate.length
      }
    }

    return NextResponse.json({ success: true, totalInsights, workspacesProcessed: workspaces.length })
  } catch (error) {
    console.error('CRON ai-insights error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
