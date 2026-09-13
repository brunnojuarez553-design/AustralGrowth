import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'

const postSchema = z.object({
  leadId: z.string(),
  message: z.string().trim().min(1).max(6000),
})

async function context() {
  const supabase = await createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.email) return null
  const user = await prisma.user.findUnique({ where: { email: session.user.email } })
  return user ? { user } : null
}

function friendlyError(data: any) {
  const code = data?.error?.code
  if (code === 'credit_balance_exhausted') return 'La cuenta de OpenAI no tiene saldo. Cargá créditos en platform.openai.com/settings/organization/billing.'
  if (code === 'rate_limit_exceeded') return 'El coach está recibiendo demasiadas consultas. Esperá unos segundos y volvé a intentar.'
  return data?.error?.message || 'OpenAI no respondió'
}

export async function GET(req: NextRequest) {
  try {
    const auth = await context()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const leadId = req.nextUrl.searchParams.get('leadId')
    if (!leadId) return NextResponse.json({ error: 'Falta el taller' }, { status: 400 })
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, workspaceId: auth.user.workspaceId },
      include: { activities: { where: { type: 'AI_INSIGHT' }, orderBy: { createdAt: 'asc' }, take: 80 } },
    })
    if (!lead) return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 })
    const messages = lead.activities
      .filter(a => (a.metadata as any)?.kind === 'acquisition_chat')
      .map(a => {
        const meta = a.metadata as any
        return { id: a.id, role: meta.role as 'user' | 'assistant', content: meta.content as string, createdAt: a.createdAt.toISOString() }
      })
    return NextResponse.json({ data: messages })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'No pudimos cargar el chat' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await context()
    if (!auth) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { leadId, message } = postSchema.parse(await req.json())
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, workspaceId: auth.user.workspaceId },
      include: {
        activities: { orderBy: { createdAt: 'desc' }, take: 35 },
        notes: { orderBy: { createdAt: 'desc' }, take: 8 },
      },
    })
    if (!lead) return NextResponse.json({ error: 'Taller no encontrado' }, { status: 404 })
    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: 'Falta configurar OPENAI_API_KEY en Vercel' }, { status: 503 })

    const profileEntry = lead.activities.find(a => (a.metadata as any)?.kind === 'acquisition_profile')
    const profile = (profileEntry?.metadata as any)?.profile || {}
    const chat = lead.activities
      .filter(a => (a.metadata as any)?.kind === 'acquisition_chat')
      .slice(0, 20)
      .reverse()
      .map(a => {
        const meta = a.metadata as any
        return `${meta.role === 'assistant' ? 'COACH' : 'BRUNO'}: ${meta.content}`
      })
      .join('\n')

    const input = `Sos el asesor comercial privado de Bruno, director de Austral Web Studio. La agencia vende sitios web premium, SEO local, Google Business, automatizaciones e IA principalmente a talleres automotrices de Argentina, Latinoamérica, España y Estados Unidos.

Tu trabajo es ayudarlo a convertir este prospecto en cliente. Respondé en español rioplatense, con criterio comercial profesional y humano. Analizá la etapa real. No inventes datos, no prometas resultados garantizados y no presiones de forma artificial. Si Bruno pega un mensaje del prospecto, explicá brevemente qué significa y entregá una respuesta lista para copiar. Si pide estrategia, definí el próximo movimiento concreto. Si faltan datos decisivos, hacé como máximo dos preguntas. Evitá respuestas genéricas y textos demasiado largos.

PROSPECTO
Empresa: ${lead.companyName}
Contacto: ${lead.contactName || 'Sin identificar'}
País: ${lead.country || 'Sin identificar'}
Industria: ${lead.industry || 'Taller automotriz'}
Etapa: ${lead.stage}
Valor estimado: ${lead.estimatedValue || 'Sin definir'}
Instagram: ${lead.instagram || 'No cargado'}
Web: ${lead.website || 'No cargada'}
Ficha comercial: ${JSON.stringify(profile)}
Notas: ${lead.notes.map(n => n.content).join(' | ') || 'Sin notas'}

CONVERSACIÓN RECIENTE CON EL COACH
${chat || 'Primera consulta'}

CONSULTA DE BRUNO
${message}

Contestá con este formato natural:
Lectura: una interpretación breve.
Qué haría: próximo paso concreto.
Mensaje sugerido: texto listo para copiar, solamente cuando corresponda.
Alerta: un riesgo u oportunidad importante, solamente cuando corresponda.`

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({ model: process.env.OPENAI_ACQUISITION_MODEL || 'gpt-5-mini', input, max_output_tokens: 1200 }),
    })
    const data = await response.json()
    if (!response.ok) return NextResponse.json({ error: friendlyError(data) }, { status: response.status === 429 ? 429 : 502 })
    const answer = data.output?.flatMap((item: any) => item.content || []).find((item: any) => item.type === 'output_text')?.text
    if (!answer) return NextResponse.json({ error: 'El coach devolvió una respuesta vacía' }, { status: 502 })

    await prisma.$transaction([
      prisma.activity.create({ data: { leadId, userId: auth.user.id, type: 'AI_INSIGHT', description: 'Consulta al coach comercial', metadata: { kind: 'acquisition_chat', role: 'user', content: message } } }),
      prisma.activity.create({ data: { leadId, userId: auth.user.id, type: 'AI_INSIGHT', description: 'Respuesta del coach comercial', metadata: { kind: 'acquisition_chat', role: 'assistant', content: answer } } }),
    ])

    return NextResponse.json({ data: { role: 'assistant', content: answer } })
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Escribí una consulta válida' }, { status: 400 })
    console.error(error)
    return NextResponse.json({ error: 'No pudimos consultar al coach' }, { status: 500 })
  }
}
