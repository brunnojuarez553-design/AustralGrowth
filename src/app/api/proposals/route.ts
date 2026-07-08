import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const proposalSchema = z.object({
  leadId: z.string(),
  title: z.string().min(1),
  serviceType: z.string().min(1),
  description: z.string().optional(),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  validUntil: z.string().datetime().optional(),
  plan: z.string().optional(),
  sections: z.object({
    scope: z.array(z.string()).optional(),
    deliverables: z.array(z.string()).optional(),
    timeline: z.string().optional(),
    paymentPlan: z.object({
      advance: z.number().optional(),
      final: z.number().optional(),
    }).optional(),
  }).optional(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const proposals = await prisma.proposal.findMany({
      where: { workspaceId: dbUser.workspaceId },
      include: {
        lead: { select: { id: true, companyName: true, contactName: true, country: true } },
        createdBy: { select: { id: true, name: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ data: proposals })
  } catch (error) {
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
    const validated = proposalSchema.parse(body)

    const proposal = await prisma.proposal.create({
      data: {
        ...validated,
        workspaceId: dbUser.workspaceId,
        createdById: dbUser.id,
        validUntil: validated.validUntil ? new Date(validated.validUntil) : undefined,
      },
      include: {
        lead: { select: { id: true, companyName: true } },
      },
    })

    await prisma.activity.create({
      data: {
        leadId: validated.leadId,
        userId: dbUser.id,
        type: 'PROPOSAL_SENT',
        description: `Propuesta creada: ${validated.title} ($${validated.amount})`,
        metadata: { proposalId: proposal.id, amount: validated.amount },
      },
    })

    return NextResponse.json({ data: proposal }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
