import OpenAI from "openai";
import type { AiMessage, DashboardStats } from "@/types";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  // Fallback to Groq if needed — same OpenAI-compatible API
  ...(process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY
    ? {
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }
    : {}),
});

const MODEL = process.env.GROQ_API_KEY && !process.env.OPENAI_API_KEY
  ? "llama-3.1-70b-versatile"
  : "gpt-4o-mini";

export async function buildDirectorSystemPrompt(
  stats: DashboardStats,
  topLeads: Array<{ company: string; stage: string; value: number; score: number | null }>
): Promise<string> {
  return `Sos el Director Comercial IA de Austral Growth OS — la plataforma de gestión comercial de una agencia digital premium llamada Austral Web Studio, basada en Ushuaia, Argentina, con clientes en Venezuela, México, Colombia, Chile, Panamá, Paraguay y Argentina.

CONTEXTO ACTUAL DEL NEGOCIO:
- Facturación este mes: $${stats.monthlyRevenue}
- Objetivo mensual: $${stats.monthlyTarget}
- Progreso: ${Math.round((stats.monthlyRevenue / stats.monthlyTarget) * 100)}%
- Leads activos: ${stats.activeLeads} (${stats.hotLeads} calientes)
- Tasa de cierre: ${stats.closeRate}%
- Ticket promedio: $${stats.avgTicket}
- Valor total en pipeline: $${stats.pipelineValue}

TOP OPORTUNIDADES ACTIVAS:
${topLeads.map((l) => `- ${l.company}: etapa ${l.stage}, valor $${l.value}, score ${l.score ?? "N/D"}%`).join("\n")}

ROL:
Sos un socio estratégico de ventas, no un asistente genérico. Hablás en español rioplatense, sos directo, analítico y orientado a resultados concretos. Das recomendaciones específicas con números cuando sea posible. Detectás patrones en el CRM y proponés acciones inmediatas. Nunca decís "no tengo información suficiente" — trabajás con lo que tenés y das la mejor recomendación posible.

Ejemplos de cómo respondés:
- "Para llegar a $${stats.monthlyTarget} necesitás cerrar X deals más. Priorizo: [nombres concretos]."
- "Detecté un cuello de botella en la etapa Propuesta. El tiempo promedio de respuesta es alto."
- "Tu mejor segmento es automotriz venezolano. Hay X prospectos similares sin contactar."`;
}

export async function chatWithDirector(
  messages: AiMessage[],
  stats: DashboardStats,
  topLeads: Array<{ company: string; stage: string; value: number; score: number | null }>
): Promise<string> {
  const systemPrompt = await buildDirectorSystemPrompt(stats, topLeads);

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: systemPrompt },
      ...messages,
    ],
    max_tokens: 600,
    temperature: 0.7,
  });

  return response.choices[0].message.content ?? "No pude generar una respuesta.";
}

export async function generateDailyInsights(
  stats: DashboardStats,
  staleLeads: Array<{ company: string; daysSinceContact: number }>,
  hotLeads: Array<{ company: string; score: number }>
): Promise<string[]> {
  const prompt = `Analizá este CRM y generá exactamente 4 insights accionables en español rioplatense. Devolvé SOLO un JSON array de strings, sin explicaciones.

Datos:
- Leads sin contacto hace +5 días: ${staleLeads.map((l) => `${l.company} (${l.daysSinceContact}d)`).join(", ")}
- Leads calientes: ${hotLeads.map((l) => `${l.company} (${l.score}%)`).join(", ")}
- Tasa de cierre: ${stats.closeRate}%, Ticket promedio: $${stats.avgTicket}

Formato: ["insight 1", "insight 2", "insight 3", "insight 4"]`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 400,
    temperature: 0.6,
  });

  try {
    const content = response.choices[0].message.content ?? "[]";
    return JSON.parse(content.replace(/```json|```/g, "").trim());
  } catch {
    return [
      `Tenés ${stats.hotLeads} leads calientes con alta probabilidad de cierre.`,
      `Tu tasa de cierre actual es ${stats.closeRate}%. El promedio del sector es 25%.`,
      `Hay ${staleLeads.length} leads sin contacto reciente. El enfriamiento baja la conversión un 40%.`,
      `Con tu ticket promedio de $${stats.avgTicket}, necesitás ${Math.ceil((stats.monthlyTarget - stats.monthlyRevenue) / stats.avgTicket)} cierres más para el objetivo.`,
    ];
  }
}

export async function generateMessage(params: {
  channel: "whatsapp" | "email" | "phone";
  leadCompany: string;
  leadIndustry: string | null;
  dealStage: string;
  agencyName: string;
}): Promise<{ subject?: string; body: string }> {
  const channelInstructions = {
    whatsapp: "Mensaje de WhatsApp: máximo 5 oraciones, tono informal pero profesional, incluí un emoji estratégico, terminá con una pregunta de apertura.",
    email: "Email de seguimiento: incluí asunto, saludo, propuesta de valor concreta, llamada a acción clara. Máximo 150 palabras.",
    phone: "Script de llamada: apertura (15 seg), detección de dolor (1 pregunta), propuesta de valor (30 seg), cierre hacia siguiente paso.",
  };

  const prompt = `Generá un ${params.channel} para contactar a ${params.leadCompany} (rubro: ${params.leadIndustry ?? "no especificado"}) desde ${params.agencyName}.
El lead está en etapa: ${params.dealStage}.
${channelInstructions[params.channel]}
Respondé SOLO con un JSON: ${params.channel === "email" ? '{"subject": "...", "body": "..."}' : '{"body": "..."}'}`;

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 300,
    temperature: 0.8,
  });

  try {
    const content = response.choices[0].message.content ?? "{}";
    return JSON.parse(content.replace(/```json|```/g, "").trim());
  } catch {
    return { body: response.choices[0].message.content ?? "" };
  }
}
