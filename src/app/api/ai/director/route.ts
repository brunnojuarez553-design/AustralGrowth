// =============================================================================
// API: /api/ai/director — Director Comercial IA (streaming)
// Usa GPT-4o-mini o Groq LLaMA para velocidad/costo
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { prisma } from '@/lib/prisma'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const dbUser = await prisma.user.findUnique({
      where: { email: user.email! },
      select: { workspaceId: true, name: true, workspace: { select: { monthlyGoal: true, currency: true } } },
    })
    if (!dbUser) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const { messages } = await req.json()

    // Get CRM context for AI
    const [leads, finances, workspace] = await Promise.all([
      prisma.lead.findMany({
        where: { workspaceId: dbUser.workspaceId },
        select: {
          companyName: true, stage: true, estimatedValue: true,
          probability: true, isHot: true, industry: true,
          country: true, lastContactedAt: true, nextFollowUpAt: true,
          createdAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 50,
      }),
      prisma.finance.findMany({
        where: {
          workspaceId: dbUser.workspaceId,
          date: { gte: new Date(new Date().setMonth(new Date().getMonth() - 3)) },
        },
        select: { type: true, amount: true, date: true, category: true },
      }),
      prisma.workspace.findUnique({
        where: { id: dbUser.workspaceId },
        select: { monthlyGoal: true, yearlyGoal: true, currency: true },
      }),
    ])

    const wonLeads = leads.filter(l => l.stage === 'WON')
    const activeLeads = leads.filter(l => !['WON','LOST'].includes(l.stage))
    const hotLeads = leads.filter(l => l.isHot)
    const totalRevenue = finances.filter(f => f.type === 'INCOME').reduce((s, f) => s + f.amount, 0)
    const closeRate = leads.length > 0 ? (wonLeads.length / leads.length * 100).toFixed(1) : '0'
    
    const today = new Date()
    const forgottenLeads = activeLeads.filter(l => {
      if (!l.lastContactedAt) return true
      const days = (today.getTime() - new Date(l.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
      return days > 5
    })

    const systemPrompt = `Sos el Director Comercial IA de Austral Growth OS — el asistente estratégico de ventas para ${dbUser.name ?? 'el usuario'}, quien dirige Austral Web Studio, una agencia digital premium basada en Ushuaia, Argentina que sirve clientes en toda LATAM.

CONTEXTO ACTUAL DEL NEGOCIO:
- Objetivo mensual: $${workspace?.monthlyGoal ?? 6000} USD
- Leads activos: ${activeLeads.length} (${hotLeads.length} calientes)
- Tasa de cierre: ${closeRate}%
- Revenue últimos 3 meses: $${totalRevenue.toFixed(0)} USD
- Leads olvidados (+5 días sin contacto): ${forgottenLeads.length}

PIPELINE ACTUAL:
${activeLeads.slice(0, 20).map(l => `• ${l.companyName} (${l.industry ?? 'Sin rubro'}, ${l.country ?? '?'}) — Etapa: ${l.stage} — Valor: $${l.estimatedValue ?? 0} — Hot: ${l.isHot ? 'SÍ' : 'no'}`).join('\n')}

LEADS OLVIDADOS:
${forgottenLeads.slice(0, 10).map(l => `• ${l.companyName} — Último contacto: ${l.lastContactedAt ? new Date(l.lastContactedAt).toLocaleDateString('es') : 'nunca'}`).join('\n')}

INSTRUCCIONES:
- Respondé en español rioplatense (vos, sos, tenés)
- Sé directo, estratégico y accionable
- Usá números reales del contexto
- Cuando identifiques oportunidades, nombrá las empresas específicas
- Máximo 3-4 párrafos por respuesta
- Usá negrita (**) para destacar números y nombres clave
- No repitas el contexto, interpretalo y ofrecé estrategia`

    // Use Groq for speed if available, else OpenAI
    const useGroq = !!process.env.GROQ_API_KEY
    
    const apiUrl = useGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions'
    
    const apiKey = useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY
    const model = useGroq ? 'llama-3.3-70b-versatile' : 'gpt-4o-mini'

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        stream: true,
        max_tokens: 800,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      return NextResponse.json({ error: 'Error AI: ' + err }, { status: 500 })
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('POST /api/ai/director error:', error)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
