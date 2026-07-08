import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const financeSchema = z.object({
  type: z.enum(['INCOME','EXPENSE','ADVANCE','PENDING']),
  category: z.string().min(1),
  description: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  date: z.string().datetime(),
  isPaid: z.boolean().default(true),
  leadId: z.string().optional(),
  projectId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({ where: { email: user.email! } })
    if (!dbUser) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') ?? new Date().getFullYear().toString())
    const month = searchParams.get('month')

    const startDate = month
      ? new Date(year, parseInt(month) - 1, 1)
      : new Date(year, 0, 1)
    const endDate = month
      ? new Date(year, parseInt(month), 0, 23, 59, 59)
      : new Date(year, 11, 31, 23, 59, 59)

    const [finances, summary] = await Promise.all([
      prisma.finance.findMany({
        where: { workspaceId: dbUser.workspaceId, date: { gte: startDate, lte: endDate } },
        orderBy: { date: 'desc' },
      }),
      prisma.finance.groupBy({
        by: ['type'],
        where: { workspaceId: dbUser.workspaceId, date: { gte: startDate, lte: endDate } },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const totalIncome = summary.find(s => s.type === 'INCOME')?._sum.amount ?? 0
    const totalExpenses = summary.find(s => s.type === 'EXPENSE')?._sum.amount ?? 0
    const pending = summary.find(s => s.type === 'PENDING')?._sum.amount ?? 0

    return NextResponse.json({
      data: {
        finances,
        summary: {
          totalIncome,
          totalExpenses,
          netProfit: totalIncome - totalExpenses,
          grossProfit: totalIncome,
          pending,
          margin: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0,
        },
      },
    })
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
    const validated = financeSchema.parse(body)

    const finance = await prisma.finance.create({
      data: { ...validated, workspaceId: dbUser.workspaceId, date: new Date(validated.date) },
    })

    return NextResponse.json({ data: finance }, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos', details: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
