import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const financeUpdateSchema = z.object({
  type: z.enum(['INCOME','EXPENSE','ADVANCE','PENDING']).optional(),
  category: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  currency: z.string().optional(),
  date: z.string().datetime().optional(),
  isPaid: z.boolean().optional(),
  leadId: z.string().optional(),
  projectId: z.string().optional(),
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
    const validated = financeUpdateSchema.parse(body)

    const finance = await prisma.finance.update({
      where: { id, workspaceId: dbUser.workspaceId },
      data: {
        ...validated,
        date: validated.date ? new Date(validated.date) : undefined,
      },
    })

    return NextResponse.json({ data: finance })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('PATCH /api/finances/[id] error:', error)
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
    await prisma.finance.delete({ where: { id, workspaceId: dbUser.workspaceId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/finances/[id] error:', error)
    return NextResponse.json({ error: 'Error interno', debug: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
