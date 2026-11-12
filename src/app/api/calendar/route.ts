import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calendarUser, eventSchema, eventData } from '@/lib/calendar/server'
import { scope, enqueueEvent } from '@/lib/icloud/sync'
import { fingerprint } from '@/lib/icloud/ical'
import { ICloudError, isMissingSchema } from '@/lib/icloud/errors'
import { cloudResponse, guardConnection, sameOrigin } from '@/lib/icloud/api'

export async function GET() {
  try {
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const events = await prisma.calendarEvent.findMany({ where: scope(user), orderBy: { start: 'asc' } })
    let links: { eventId: string | null; rawIcs: string | null; readOnly: boolean; baseHash: string | null }[]
    try { links = await prisma.iCloudObject.findMany({ where: { connection: scope(user), eventId: { not: null } }, select: { eventId: true, rawIcs: true, readOnly: true, baseHash: true } }) }
    catch (error) { if (!isMissingSchema(error)) throw error; links = [] }
    const index = new Map(links.map(link => [link.eventId, link]))
    const data = events.map(event => { const link = index.get(event.id); return { ...event, icloud: !!link, syncICloud: !!link, readOnly: link?.readOnly ?? false, icloudData: link?.baseHash === fingerprint(event) ? link.rawIcs : null } })
    return NextResponse.json({ data }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch { return NextResponse.json({ error: 'No se pudo cargar el calendario.' }, { status: 500 }) }
}
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req)
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const parsed = eventSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const data = await prisma.$transaction(async tx => {
      const connection = parsed.data.syncICloud ? await tx.iCloudConnection.findFirst({ where: { ...scope(user), active: true } }) : null
      if (parsed.data.syncICloud && (!connection || parsed.data.kind !== 'EVENT')) throw new ICloudError('CALENDAR', 'Conectá iCloud y elegí el tipo Evento para sincronizar.', 409)
      if (connection) await guardConnection(tx, connection.id, user.id, user.workspaceId)
      const event = await tx.calendarEvent.create({ data: { ...eventData(parsed.data), ...scope(user) } })
      if (connection) await enqueueEvent(tx, event, connection)
      return event
    })
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) { return cloudResponse(error) }
}
