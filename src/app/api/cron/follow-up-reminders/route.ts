// CRON: /api/cron/follow-up-reminders — L-V a las 9am
// Identifica leads con seguimiento pendiente y crea tareas

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const now = new Date()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)

    const leadsWithFollowUp = await prisma.lead.findMany({
      where: {
        stage: { notIn: ['WON', 'LOST'] },
        nextFollowUpAt: { lte: endOfDay },
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
        tasks: { where: { status: { in: ['TODO', 'IN_PROGRESS'] }, title: { contains: 'Seguimiento' } } },
      },
    })

    let tasksCreated = 0

    for (const lead of leadsWithFollowUp) {
      // Avoid duplicating follow-up tasks
      const hasExistingTask = lead.tasks.some(t =>
        t.title.includes('Seguimiento') &&
        t.dueDate && t.dueDate.toDateString() === now.toDateString()
      )
      if (hasExistingTask) continue

      await prisma.task.create({
        data: {
          leadId: lead.id,
          assignedToId: lead.assignedToId,
          title: `Seguimiento — ${lead.companyName}`,
          description: `Hacer seguimiento comercial programado para hoy con ${lead.companyName}.`,
          status: 'TODO',
          priority: lead.isHot ? 'HIGH' : 'MEDIUM',
          dueDate: endOfDay,
        },
      })

      tasksCreated++
    }

    return NextResponse.json({ success: true, tasksCreated, leadsProcessed: leadsWithFollowUp.length })
  } catch (error) {
    console.error('CRON follow-up-reminders error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
