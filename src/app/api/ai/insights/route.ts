// =============================================================================
// API: /api/ai/insights — genera insights y los guarda en DB
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const insights = await prisma.aIInsight.findMany({
      where: { workspaceId: dbUser.workspaceId, isDismissed: false },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    })

    return NextResponse.json({ data: insights })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const workspaceId = dbUser.workspaceId
    const today = new Date()
    const fiveDaysAgo = new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)

    const [hotLeads, forgottenLeads, proposalLeads, stuckLeads] = await Promise.all([
      prisma.lead.findMany({
        where: { workspaceId, isHot: true, stage: { notIn: ['WON', 'LOST'] } },
        select: { id: true, companyName: true, estimatedValue: true, probability: true, stage: true },
      }),
      prisma.lead.findMany({
        where: {
          workspaceId,
          stage: { notIn: ['WON', 'LOST'] },
          OR: [
            { lastContactedAt: { lte: fiveDaysAgo } },
            { lastContactedAt: null, createdAt: { lte: fiveDaysAgo } },
          ],
        },
        select: { id: true, companyName: true, lastContactedAt: true, estimatedValue: true },
        take: 5,
      }),
      prisma.lead.findMany({
        where: { workspaceId, stage: 'PROPOSAL' },
        include: { proposals: { where: { status: 'SENT' }, orderBy: { sentAt: 'desc' }, take: 1 } },
      }),
      prisma.lead.findMany({
        where: {
          workspaceId,
          stage: { notIn: ['WON', 'LOST', 'DETECTED'] },
          updatedAt: { lte: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) },
        },
        select: { id: true, companyName: true, stage: true, estimatedValue: true },
        take: 3,
      }),
    ])

    const insightsToCreate = []

    if (hotLeads.length > 0) {
      const totalHotValue = hotLeads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0)
      insightsToCreate.push({
        workspaceId,
        type: 'HOT_LEAD' as const,
        title: `${hotLeads.length} lead${hotLeads.length > 1 ? 's' : ''} caliente${hotLeads.length > 1 ? 's' : ''} listo${hotLeads.length > 1 ? 's' : ''} para cerrar`,
        content: `Tenés ${hotLeads.length} leads calientes con valor potencial de $${totalHotValue.toFixed(0)}. Los principales: ${hotLeads.slice(0, 3).map(l => l.companyName).join(', ')}. Priorizá el seguimiento hoy.`,
        priority: 'HIGH' as const,
      })
    }

    for (const lead of forgottenLeads.slice(0, 3)) {
      const daysAgo = lead.lastContactedAt
        ? Math.floor((today.getTime() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24))
        : null
      insightsToCreate.push({
        workspaceId,
        type: 'FORGOTTEN_LEAD' as const,
        title: `${lead.companyName} sin contacto${daysAgo ? ` hace ${daysAgo} días` : ''}`,
        content: `${lead.companyName} no ha recibido seguimiento${daysAgo ? ` en ${daysAgo} días` : ''}. Las oportunidades sin contacto por más de 7 días pierden 40% de probabilidad de cierre. Valor estimado: $${lead.estimatedValue ?? 0}.`,
        priority: daysAgo && daysAgo > 7 ? 'HIGH' as const : 'MEDIUM' as const,
        leadId: lead.id,
      })
    }

    for (const lead of proposalLeads) {
      const proposal = lead.proposals[0]
      if (!proposal?.sentAt) continue
      const daysSinceSent = Math.floor((today.getTime() - new Date(proposal.sentAt).getTime()) / (1000 * 60 * 60 * 24))
      if (daysSinceSent >= 3) {
        insightsToCreate.push({
          workspaceId,
          type: 'FOLLOW_UP' as const,
          title: `Propuesta de ${lead.companyName} sin respuesta (${daysSinceSent}d)`,
          content: `La propuesta enviada a ${lead.companyName} lleva ${daysSinceSent} días sin respuesta. Enviá un seguimiento hoy: "Hola, quería saber si tuviste oportunidad de revisar la propuesta que te envié."`,
          priority: daysSinceSent >= 5 ? 'URGENT' as const : 'HIGH' as const,
          leadId: lead.id,
        })
      }
    }

    // Delete old non-dismissed insights and create new ones
    await prisma.aIInsight.deleteMany({
      where: {
        workspaceId,
        isDismissed: false,
        createdAt: { lte: new Date(today.getTime() - 24 * 60 * 60 * 1000) },
      },
    })

    const created = await prisma.aIInsight.createMany({
      data: insightsToCreate,
      skipDuplicates: true,
    })

    return NextResponse.json({ data: { created: created.count, insights: insightsToCreate } })
  } catch (error) {
    console.error('POST /api/ai/insights error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
