import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'
import { periodBounds, inPeriod, summarize, annualProjection } from '@/lib/finance/calculations'

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
    const year = Number(searchParams.get('year') ?? new Date().getFullYear())
    const month = searchParams.has('month') ? Number(searchParams.get('month')) : undefined
    const currency = searchParams.get('currency') ?? 'USD'
    try { periodBounds({ year, month }) } catch { return NextResponse.json({ error: 'Período inválido' }, { status: 400 }) }
    const annualBounds = periodBounds({ year })
    const annualEntries = await prisma.finance.findMany({
      where: { workspaceId: dbUser.workspaceId, date: { gte: annualBounds.start, lt: annualBounds.end } },
      orderBy: [{ date: 'desc' }, { id: 'asc' }],
    })
    const finances = annualEntries.filter(entry => inPeriod(entry, { year, month }) && entry.currency === currency)
    const summary = summarize(finances, currency)
    return NextResponse.json({ data: {
      finances,
      summary: { ...summary, totalIncome: summary.billed, totalExpenses: summary.expenses, netProfit: summary.netCash, grossProfit: summary.billed },
      annualProjection: annualProjection(annualEntries, year, currency),
      currencies: Array.from(new Set(['USD', ...annualEntries.map(entry => entry.currency)])),
    } })
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    const user = session?.user
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
