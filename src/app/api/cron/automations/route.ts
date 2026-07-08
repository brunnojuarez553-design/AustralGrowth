// CRON: /api/cron/automations — cada 15 minutos
// Ejecuta automatizaciones basadas en tiempo (ej: sin contacto X días)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const automations = await prisma.automation.findMany({
      where: { isActive: true, trigger: 'NO_CONTACT_DAYS' },
    })

    let executionsCount = 0

    for (const automation of automations) {
      const config = automation.triggerConfig as { days?: number }
      const days = config.days ?? 5
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

      const leads = await prisma.lead.findMany({
        where: {
          workspaceId: automation.workspaceId,
          stage: { notIn: ['WON', 'LOST'] },
          OR: [
            { lastContactedAt: { lte: cutoff } },
            { lastContactedAt: null, createdAt: { lte: cutoff } },
          ],
        },
        select: { id: true, companyName: true, assignedToId: true },
      })

      const actions = automation.actions as { type: string; config: Record<string, unknown> }[]

      for (const lead of leads) {
        for (const action of actions) {
          if (action.type === 'CREATE_TASK') {
            const existingTask = await prisma.task.findFirst({
              where: {
                leadId: lead.id,
                title: { contains: 'auto:' },
                createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
              },
            })
            if (!existingTask) {
              await prisma.task.create({
                data: {
                  leadId: lead.id,
                  assignedToId: lead.assignedToId,
                  title: `auto: Seguir a ${lead.companyName} (${days}d sin contacto)`,
                  status: 'TODO',
                  priority: 'HIGH',
                  dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
                },
              })
              executionsCount++
            }
          }
        }
      }

      await prisma.automation.update({
        where: { id: automation.id },
        data: { runCount: { increment: leads.length }, lastRunAt: new Date() },
      })
    }

    return NextResponse.json({ success: true, executionsCount })
  } catch (error) {
    console.error('CRON automations error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
