// =============================================================================
// API: /api/pipeline
// GET: pipeline completo agrupado por etapas
// PATCH /api/pipeline/[id]/stage: mover lead entre etapas
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { STAGE_LABELS, STAGE_COLORS } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { workspaceId: true },
    })
    if (!dbUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const stages = ['DETECTED','CONTACTED','REPLIED','MEETING','DEMO','PROPOSAL','NEGOTIATION','WON','LOST']

    const leads = await prisma.lead.findMany({
      where: {
        workspaceId: dbUser.workspaceId,
        stage: { in: stages as never[] },
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        tags: { include: { tag: true } },
        proposals: { select: { id: true, status: true } },
        _count: { select: { tasks: true, notes: true } },
      },
      orderBy: [{ isHot: 'desc' }, { priority: 'desc' }, { updatedAt: 'desc' }],
    })

    const columns = stages.map(stage => ({
      stage,
      label: STAGE_LABELS[stage],
      color: STAGE_COLORS[stage],
      leads: leads.filter(l => l.stage === stage),
      totalValue: leads
        .filter(l => l.stage === stage)
        .reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0),
    }))

    const summary = {
      totalLeads: leads.length,
      totalPipelineValue: leads.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0),
      hotLeads: leads.filter(l => l.isHot).length,
      avgTicket: leads.filter(l => l.estimatedValue).length > 0
        ? leads.reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0) / leads.filter(l => l.estimatedValue).length
        : 0,
    }

    return NextResponse.json({ data: { columns, summary } })
  } catch (error) {
    console.error('GET /api/pipeline error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
