import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const projectUpdateSchema = z.object({
  leadId: z.string().optional(),
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).optional(),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
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
    const validated = projectUpdateSchema.parse(body)

    const project = await prisma.project.update({
      where: { id, workspaceId: dbUser.workspaceId },
      data: {
        ...validated,
        completedAt: validated.status === 'COMPLETED' ? new Date() : undefined,
      },
    })

    return NextResponse.json({ data: project })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('PATCH /api/projects/[id] error:', error)
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
    await prisma.project.delete({ where: { id, workspaceId: dbUser.workspaceId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE /api/projects/[id] error:', error)
    return NextResponse.json({ error: 'Error interno', debug: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
