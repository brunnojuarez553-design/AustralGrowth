// =============================================================================
// API: /api/leads
// GET: listar leads con filtros | POST: crear lead
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const leadCreateSchema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  whatsapp: z.string().optional(),
  instagram: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  country: z.string().optional(),
  city: z.string().optional(),
  industry: z.string().optional(),
  companySize: z.enum(['SOLO','SMALL','MEDIUM','LARGE','ENTERPRISE']).optional(),
  source: z.enum(['MANUAL','INSTAGRAM','WHATSAPP','EMAIL','REFERRAL','COLD_OUTREACH','INBOUND','CSV_IMPORT','AI_DETECTED']).default('MANUAL'),
  stage: z.enum(['DETECTED','CONTACTED','REPLIED','MEETING','DEMO','PROPOSAL','NEGOTIATION','WON','LOST']).default('DETECTED'),
  priority: z.enum(['LOW','MEDIUM','HIGH','URGENT']).default('MEDIUM'),
  estimatedValue: z.number().optional(),
  nextFollowUpAt: z.string().datetime().optional(),
})

async function getWorkspaceId(req: NextRequest): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const dbUser = await prisma.user.findUnique({
    where: { email: user.email! },
    select: { workspaceId: true },
  })
  return dbUser?.workspaceId ?? null
}

export async function GET(req: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(req)
    if (!workspaceId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const stage = searchParams.get('stage')
    const priority = searchParams.get('priority')
    const industry = searchParams.get('industry')
    const search = searchParams.get('search')
    const isHot = searchParams.get('isHot')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '50')

    const where = {
      workspaceId,
      ...(stage && { stage: stage as never }),
      ...(priority && { priority: priority as never }),
      ...(industry && { industry }),
      ...(isHot === 'true' && { isHot: true }),
      ...(search && {
        OR: [
          { companyName: { contains: search, mode: 'insensitive' as const } },
          { contactName: { contains: search, mode: 'insensitive' as const } },
          { industry: { contains: search, mode: 'insensitive' as const } },
          { country: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
          tags: { include: { tag: true } },
          proposals: { select: { id: true, status: true, amount: true } },
          _count: { select: { notes: true, tasks: true, activities: true } },
        },
        orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({ data: leads, total, page, limit })
  } catch (error) {
    console.error('GET /api/leads error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const workspaceId = await getWorkspaceId(req)
    if (!workspaceId) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    const dbUser = await prisma.user.findUnique({ where: { email: user!.email! } })

    const body = await req.json()
    const validated = leadCreateSchema.parse(body)

    const lead = await prisma.lead.create({
      data: {
        ...validated,
        workspaceId,
        assignedToId: dbUser?.id,
        activities: {
          create: {
            type: 'STAGE_CHANGED',
            description: `Lead creado en etapa: ${validated.stage}`,
            userId: dbUser?.id,
          },
        },
      },
      include: {
        assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        tags: { include: { tag: true } },
      },
    })

    return NextResponse.json({ data: lead }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    console.error('POST /api/leads error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
