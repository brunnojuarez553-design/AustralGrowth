import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calendarUser, eventSchema, eventData } from '@/lib/calendar/server'

export async function GET() {
  try {
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const data = await prisma.calendarEvent.findMany({ where: { workspaceId: user.workspaceId, userId: user.id }, orderBy: { start: 'asc' } })
    return NextResponse.json({ data })
  } catch { return NextResponse.json({ error: 'No se pudo cargar el calendario. Verificá que la base esté actualizada.' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try {
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const parsed = eventSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const data = await prisma.calendarEvent.create({ data: { ...eventData(parsed.data), workspaceId: user.workspaceId, userId: user.id } })
    return NextResponse.json({ data }, { status: 201 })
  } catch { return NextResponse.json({ error: 'No se pudo guardar el evento' }, { status: 500 }) }
}
