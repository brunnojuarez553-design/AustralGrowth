import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const projectCreateSchema = z.object({
  leadId: z.string().optional(),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).default('PLANNING'),
  startDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')

    const projects = await prisma.project.findMany({
      where: {
        workspaceId: dbUser.workspaceId,
        ...(status && { status: status as never }),
      },
      include: {
        lead: { select: { id: true, companyName: true, contactName: true } },
        tasks: { select: { id: true, status: true } },
      },
      orderBy: { updatedAt: 'desc' },
    })

    return NextResponse.json({ data: projects })
  } catch (error) {
    console.error('GET /api/projects error:', error)
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
    const validated = projectCreateSchema.parse(body)

    const project = await prisma.project.create({
      data: {
        ...validated,
        workspaceId: dbUser.workspaceId,
        startDate: validated.startDate ? new Date(validated.startDate) : undefined,
        dueDate: validated.dueDate ? new Date(validated.dueDate) : undefined,
      },
      include: {
        lead: { select: { id: true, companyName: true } },
      },
    })

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('POST /api/projects error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
