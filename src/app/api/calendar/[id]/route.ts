import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calendarUser, eventSchema, eventData } from '@/lib/calendar/server'

type Context = { params: Promise<{ id: string }> }
export async function PUT(req: NextRequest, context: Context) {
  try {
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { id } = await context.params
    const parsed = eventSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const result = await prisma.calendarEvent.updateMany({ where: { id, workspaceId: user.workspaceId, userId: user.id }, data: eventData(parsed.data) })
    return result.count ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  } catch { return NextResponse.json({ error: 'No se pudo actualizar el evento' }, { status: 500 }) }
}
export async function DELETE(_req: NextRequest, context: Context) {
  try {
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { id } = await context.params
    const result = await prisma.calendarEvent.deleteMany({ where: { id, workspaceId: user.workspaceId, userId: user.id } })
    return result.count ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  } catch { return NextResponse.json({ error: 'No se pudo eliminar el evento' }, { status: 500 }) }
}
