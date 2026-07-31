import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export async function POST() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const existing = await prisma.user.findUnique({ where: { email: user.email } })
    if (existing) return NextResponse.json({ data: existing })

    // Primera vez que este email inicia sesión: le creamos su workspace y usuario.
    const slug = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9-]/g, '-')

    const workspace = await prisma.workspace.create({
      data: {
        name: 'Austral Web Studio',
        slug: `${slug}-${Date.now().toString(36)}`,
        currency: 'USD',
        monthlyGoal: 6000,
        yearlyGoal: 72000,
        plan: 'PROFESSIONAL',
      },
    })

    const dbUser = await prisma.user.create({
      data: {
        email: user.email,
        name: user.user_metadata?.name ?? user.email.split('@')[0],
        role: 'OWNER',
        workspaceId: workspace.id,
      },
    })

    return NextResponse.json({ data: dbUser }, { status: 201 })
  } catch (error) {
    console.error('POST /api/auth/bootstrap error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
