import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'

const automationUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  trigger: z.enum([
    'LEAD_STAGE_CHANGED', 'LEAD_CREATED', 'NO_CONTACT_DAYS', 'PROPOSAL_SENT',
    'PROPOSAL_VIEWED', 'PROPOSAL_ACCEPTED', 'TASK_OVERDUE', 'DEAL_WON', 'DEAL_LOST',
  ]).optional(),
  triggerConfig: z.record(z.unknown()).optional(),
  actions: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const { id } = await params
    const body = await req.json()
    const validated = automationUpdateSchema.parse(body)

    const automation = await prisma.automation.update({
      where: { id, workspaceId: dbUser.workspaceId },
      data: validated as Prisma.AutomationUpdateInput,
    })

    return NextResponse.json({ data: automation })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('PATCH /api/automations/[id] error:', error)
    return NextResponse.json({ error: 'Error interno', debug: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const { id } = await params
    await prisma.automation.delete({ where: { id, workspaceId: dbUser.workspaceId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/automations/[id] error:', error)
    return NextResponse.json({ error: 'Error interno', debug: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
