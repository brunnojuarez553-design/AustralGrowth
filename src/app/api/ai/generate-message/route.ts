// =============================================================================
// API: /api/ai/generate-message — genera mensajes personalizados por canal
// =============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { z } from 'zod'

const schema = z.object({
  leadId: z.string(),
  channel: z.enum(['whatsapp', 'email', 'call_script']),
  context: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { leadId, channel, context } = schema.parse(body)

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        notes: { orderBy: { createdAt: 'desc' }, take: 3 },
        activities: { orderBy: { createdAt: 'desc' }, take: 5 },
        proposals: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    })
    if (!lead) return NextResponse.json({ error: 'Lead no encontrado' }, { status: 404 })

    const channelInstructions = {
      whatsapp: 'Mensaje corto para WhatsApp (máximo 3 párrafos), tono amigable y directo, con emoji moderado.',
      email: 'Email profesional con asunto y cuerpo. Máximo 200 palabras. Llamada a la acción clara al final.',
      call_script: 'Script de llamada con: apertura (15 seg), detección de necesidad (2 preguntas), propuesta de valor, y cierre suave.',
    }

    const prompt = `Generá un ${channel === 'whatsapp' ? 'mensaje de WhatsApp' : channel === 'email' ? 'email' : 'script de llamada'} para contactar a ${lead.companyName}${lead.contactName ? ` (contacto: ${lead.contactName})` : ''}.

DATOS DEL LEAD:
- Empresa: ${lead.companyName}
- Rubro: ${lead.industry ?? 'No especificado'}
- País: ${lead.country ?? 'No especificado'}
- Etapa actual: ${lead.stage}
- Valor estimado: $${lead.estimatedValue ?? 'no definido'}
- Sitio web: ${lead.website ?? 'no disponible'}

HISTORIAL RECIENTE:
${lead.activities.map(a => `• ${a.type}: ${a.description}`).join('\n') || '• Sin historial previo'}

${context ? `CONTEXTO ADICIONAL: ${context}` : ''}

INSTRUCCIÓN: ${channelInstructions[channel]}

Somos Austral Web Studio — agencia de diseño web y marketing digital premium especializada en el sector automotriz y servicios en LATAM. Respondé solo con el mensaje/script, sin explicaciones ni comentarios adicionales.`

    const useGroq = !!process.env.GROQ_API_KEY
    const apiUrl = useGroq
      ? 'https://api.groq.com/openai/v1/chat/completions'
      : 'https://api.openai.com/v1/chat/completions'
    const apiKey = useGroq ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY
    const model = useGroq ? 'llama-3.1-8b-instant' : 'gpt-4o-mini'

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.8,
      }),
    })

    const data = await response.json()
    const message = data.choices?.[0]?.message?.content ?? ''

    await prisma.activity.create({
      data: {
        leadId,
        type: channel === 'whatsapp' ? 'WHATSAPP_SENT' : channel === 'email' ? 'EMAIL_SENT' : 'CALL_MADE',
        description: `Mensaje generado por IA para ${channel}`,
        metadata: { channel, generatedMessage: message },
      },
    })

    return NextResponse.json({ data: { message, channel } })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
