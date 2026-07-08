import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const stageSchema = z.object({
  stage: z.enum(['DETECTED','CONTACTED','REPLIED','MEETING','DEMO','PROPOSAL','NEGOTIATION','WON','LOST']),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    const body = await req.json()
    const { stage } = stageSchema.parse(body)

    const lead = await prisma.lead.findUnique({ where: { id }, select: { stage: true, workspaceId: true } })
    if (!lead || lead.workspaceId !== dbUser?.workspaceId) {
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    }

    const [updatedLead] = await prisma.$transaction([
      prisma.lead.update({
        where: { id },
        data: {
          stage,
          ...(stage === 'WON' && { closedAt: new Date() }),
          ...(stage === 'LOST' && { closedAt: new Date() }),
        },
      }),
      prisma.activity.create({
        data: {
          leadId: id,
          userId: dbUser.id,
          type: 'STAGE_CHANGED',
          description: `Movido de ${lead.stage} a ${stage}`,
          metadata: { from: lead.stage, to: stage },
        },
      }),
    ])

    // Trigger automations
    await triggerAutomations(dbUser.workspaceId, 'LEAD_STAGE_CHANGED', { leadId: id, stage })

    return NextResponse.json({ data: updatedLead })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Stage inválido' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

async function triggerAutomations(workspaceId: string, trigger: string, context: Record<string, unknown>) {
  const automations = await prisma.automation.findMany({
    where: { workspaceId, trigger: trigger as never, isActive: true },
  })
  
  for (const automation of automations) {
    const config = automation.triggerConfig as Record<string, unknown>
    if (trigger === 'LEAD_STAGE_CHANGED' && config.stage && config.stage !== context.stage) continue
    
    await prisma.automation.update({
      where: { id: automation.id },
      data: { runCount: { increment: 1 }, lastRunAt: new Date() },
    })
  }
}
