import OpenAI from 'openai'
import type { Lead, DashboardStats, AiInsight } from '@/types'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// ─────────────────────────────────────────
// IA Comercial — Análisis de CRM
// ─────────────────────────────────────────

export async function analyzeCRM(leads: Lead[], stats: DashboardStats): Promise<AiInsight[]> {
  const hotLeads = leads.filter(l => l.isHot)
  const staleLeads = leads.filter(l => {
    if (!l.lastContactDate) return false
    const daysSince = Math.floor((Date.now() - new Date(l.lastContactDate).getTime()) / 86400000)
    return daysSince > 5 && l.stage !== 'WON' && l.stage !== 'LOST'
  })
  const proposalStuck = leads.filter(l => l.stage === 'PROPOSAL_SENT')

  const context = `
Sos un Director Comercial experto para agencias de diseño web y marketing digital en LATAM.

Datos del CRM:
- Total leads activos: ${leads.length}
- Leads calientes: ${hotLeads.length} (${hotLeads.map(l => l.companyName).join(', ')})
- Leads sin contacto +5 días: ${staleLeads.length} (${staleLeads.map(l => l.companyName).join(', ')})
- Propuestas sin respuesta: ${proposalStuck.length}
- Tasa de cierre actual: ${stats.conversion.rate.toFixed(1)}%
- Ticket promedio: $${stats.conversion.avgDealValue}
- Facturación mensual: $${stats.revenue.monthly}
- Objetivo mensual: $${stats.revenue.monthlyTarget}

Generá exactamente 4 insights accionables en JSON con este formato:
[
  {
    "id": "1",
    "type": "opportunity|risk|action|tip",
    "priority": "high|medium|low",
    "title": "Título corto",
    "description": "Descripción concreta y accionable (máx 120 caracteres)",
    "leadId": "opcional",
    "action": "Texto del botón de acción opcional"
  }
]

Respondé SOLO con el JSON array, sin markdown ni explicaciones.
`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: context }],
      temperature: 0.7,
      max_tokens: 800,
    })

    const content = response.choices[0].message.content ?? '[]'
    return JSON.parse(content) as AiInsight[]
  } catch {
    return getDefaultInsights(hotLeads, staleLeads, stats)
  }
}

function getDefaultInsights(hotLeads: Lead[], staleLeads: Lead[], stats: DashboardStats): AiInsight[] {
  const insights: AiInsight[] = []

  if (hotLeads.length > 0) {
    insights.push({
      id: '1',
      type: 'opportunity',
      priority: 'high',
      title: `${hotLeads.length} leads calientes listos para cerrar`,
      description: `${hotLeads[0].companyName} lidera con ${hotLeads[0].closeProbability}% de probabilidad. Contactar hoy.`,
      leadId: hotLeads[0].id,
      action: 'Ver leads calientes',
    })
  }

  if (staleLeads.length > 0) {
    insights.push({
      id: '2',
      type: 'risk',
      priority: 'high',
      title: `${staleLeads.length} leads sin contacto por más de 5 días`,
      description: `${staleLeads[0].companyName} está enfriándose. Cada día sin contacto baja la tasa de cierre un 8%.`,
      leadId: staleLeads[0].id,
      action: 'Reactivar ahora',
    })
  }

  const gap = stats.revenue.monthlyTarget - stats.revenue.monthly
  if (gap > 0) {
    insights.push({
      id: '3',
      type: 'action',
      priority: 'medium',
      title: `Faltan $${gap.toFixed(0)} para el objetivo mensual`,
      description: `Con tu ticket promedio de $${stats.conversion.avgDealValue}, necesitás cerrar ${Math.ceil(gap / stats.conversion.avgDealValue)} deals más.`,
      action: 'Ver pipeline',
    })
  }

  insights.push({
    id: '4',
    type: 'tip',
    priority: 'low',
    title: 'Mejor momento para enviar propuestas',
    description: 'Los martes y miércoles antes de las 11am tienen mayor tasa de apertura en tu historial.',
  })

  return insights
}

// ─────────────────────────────────────────
// Generador de mensajes comerciales
// ─────────────────────────────────────────

export async function generateCommercialMessage(
  type: 'whatsapp' | 'email' | 'call_script',
  lead: Lead,
  context?: string
): Promise<string> {
  const prompts = {
    whatsapp: `Generá un mensaje de WhatsApp profesional pero cercano para contactar a ${lead.companyName} del rubro ${lead.industry}. 
    Ofrecemos servicios de diseño web premium. Máximo 150 palabras. Sin saludos genéricos. ${context || ''}`,
    email: `Generá un email de prospección frío para ${lead.companyName}. Asunto + cuerpo del email. 
    Rubro: ${lead.industry}. Ofrecemos landing pages y sitios web premium para LATAM. Incluí un CTA claro. ${context || ''}`,
    call_script: `Generá un script de llamada comercial para contactar a ${lead.contactName || 'el responsable'} de ${lead.companyName}. 
    Incluí: apertura, detección de necesidades, propuesta de valor y cierre para reunión. ${context || ''}`,
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Sos un experto en ventas de agencias digitales en LATAM. Generás mensajes directos, profesionales y que convierten.',
        },
        { role: 'user', content: prompts[type] },
      ],
      temperature: 0.8,
      max_tokens: 500,
    })
    return response.choices[0].message.content ?? 'Error generando mensaje.'
  } catch {
    return getFallbackMessage(type, lead)
  }
}

function getFallbackMessage(type: string, lead: Lead): string {
  if (type === 'whatsapp') {
    return `Hola! Te escribo de Austral Web Studio 👋\n\nVi que ${lead.companyName} podría beneficiarse de una presencia digital más sólida. Trabajamos con empresas del sector ${lead.industry} en LATAM y los resultados han sido muy concretos.\n\n¿Tenés 5 minutos para ver algunos casos reales?`
  }
  if (type === 'email') {
    return `Asunto: Sitio web que convierte — caso real para ${lead.companyName}\n\nHola,\n\nTe contacto porque trabajamos con empresas del rubro ${lead.industry} y siempre hay oportunidades de mejora en la presencia digital.\n\n¿Te interesa ver cómo lo hicimos para otros clientes similares?\n\nSaludos,\nAustral Web Studio`
  }
  return `Apertura: "Hola, habla con [nombre] de Austral Web Studio. ¿Estoy hablando con el responsable de marketing de ${lead.companyName}?"\n\nDetección: "¿Actualmente están recibiendo consultas por internet o redes sociales?"\n\nPropuesta: "Trabajamos con empresas como la de ustedes y les generamos [resultado concreto]. ¿Les interesa ver cómo?"\n\nCierre: "¿Podríamos agendar 15 minutos esta semana para mostrarte casos reales?"`
}

// ─────────────────────────────────────────
// Director Comercial IA — Chat
// ─────────────────────────────────────────

export async function directorChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  stats: DashboardStats,
  leads: Lead[]
): Promise<string> {
  const systemPrompt = `Sos el Director Comercial IA de Austral Growth OS, una plataforma para agencias digitales.
  
Contexto actual del negocio:
- Facturación mensual: $${stats.revenue.monthly} de $${stats.revenue.monthlyTarget} objetivo
- Leads activos: ${leads.length} (${leads.filter(l => l.isHot).length} calientes)
- Tasa de cierre: ${stats.conversion.rate.toFixed(1)}%
- Ticket promedio: $${stats.conversion.avgDealValue}
- Tiempo promedio de cierre: ${stats.conversion.avgCloseTime} días

Respondés como un socio estratégico de ventas: directo, concreto, con números reales.
Máximo 150 palabras por respuesta. En español rioplatense.`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 400,
    })
    return response.choices[0].message.content ?? 'No pude procesar esa consulta.'
  } catch {
    return `Con los datos actuales: si mantenés tu tasa de cierre del ${stats.conversion.rate.toFixed(0)}% y contactás 20 empresas por semana, podés generar $${Math.round(stats.revenue.monthly * 1.35)} este mes. Priorizo que contactes los ${leads.filter(l => l.isHot).length} leads calientes que ya tenés en pipeline.`
  }
}

// ─────────────────────────────────────────
// Generador de propuestas con IA
// ─────────────────────────────────────────

export async function generateProposal(params: {
  lead: Lead
  serviceType: string
  plan: string
  price: number
}): Promise<{ scope: string[]; deliverables: string[]; description: string }> {
  const prompt = `Generá el contenido de una propuesta comercial premium para una agencia de diseño web.

Cliente: ${params.lead.companyName} (${params.lead.industry})
Servicio: ${params.serviceType}
Plan: ${params.plan}
Precio: $${params.price}

Respondé SOLO con JSON:
{
  "description": "Párrafo de introducción personalizado (60 palabras)",
  "scope": ["Item 1 del alcance", "Item 2", ...] (6-8 items),
  "deliverables": ["Entregable 1", "Entregable 2", ...] (4-6 items)
}`

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 600,
    })
    const content = response.choices[0].message.content ?? '{}'
    return JSON.parse(content)
  } catch {
    return {
      description: `Propuesta diseñada específicamente para ${params.lead.companyName}. Desarrollamos soluciones web de alta conversión para el sector ${params.lead.industry}.`,
      scope: ['Diseño UI/UX personalizado', 'Desarrollo frontend responsive', 'Optimización de velocidad', 'SEO técnico on-page', 'Integración de formularios y analytics', 'Testing y control de calidad'],
      deliverables: ['Sitio web completo deployado', 'Código fuente', 'Panel de control', 'Manual de uso', 'Soporte post-lanzamiento 30 días'],
    }
  }
}
