import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const automationCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: z.enum([
    'LEAD_STAGE_CHANGED', 'LEAD_CREATED', 'NO_CONTACT_DAYS', 'PROPOSAL_SENT',
    'PROPOSAL_VIEWED', 'PROPOSAL_ACCEPTED', 'TASK_OVERDUE', 'DEAL_WON', 'DEAL_LOST',
  ]),
  triggerConfig: z.record(z.unknown()).default({}),
  actions: z.record(z.unknown()).default({}),
  isActive: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const automations = await prisma.automation.findMany({
      where: { workspaceId: dbUser.workspaceId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: automations })
  } catch (error) {
    console.error('GET /api/automations error:', error)
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

    const body = await req.json()
    const validated = automationCreateSchema.parse(body)

    const automation = await prisma.automation.create({
      data: {
        ...validated,
        workspaceId: dbUser.workspaceId,
        triggerConfig: validated.triggerConfig as Prisma.InputJsonValue,
        actions: validated.actions as Prisma.InputJsonValue,
      },
    })

    return NextResponse.json({ data: automation }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('POST /api/automations error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
