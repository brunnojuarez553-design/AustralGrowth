import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { calendarUser, eventSchema, eventData } from '@/lib/calendar/server'
import { scope, enqueueEvent } from '@/lib/icloud/sync'
import { ICloudError, isMissingSchema } from '@/lib/icloud/errors'
import { cloudResponse, guardConnection, sameOrigin } from '@/lib/icloud/api'

type Context = { params: Promise<{ id: string }> }
async function linkFor(id: string, user: { id: string; workspaceId: string }) {
  try { return await prisma.iCloudObject.findFirst({ where: { eventId: id, connection: scope(user) } }) }
  catch (error) { if (isMissingSchema(error)) return null; throw error }
}
export async function PUT(req: NextRequest, context: Context) {
  try {
    sameOrigin(req)
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { id } = await context.params
    const parsed = eventSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const link = await linkFor(id, user)
    if (link && parsed.data.kind !== 'EVENT') throw new ICloudError('KIND', 'Los eventos vinculados a iCloud deben conservar el tipo Evento.', 400)
    if (link?.readOnly) throw new ICloudError('READONLY', 'Editá este evento en tu iPhone: tiene invitados o una repetición avanzada.', 409)
    const event = await prisma.$transaction(async tx => {
      const existing = await tx.calendarEvent.findFirst({ where: { id, ...scope(user) } })
      if (!existing) throw new ICloudError('NOTFOUND', 'Evento no encontrado.', 404)
      if (link) await guardConnection(tx, link.connectionId, user.id, user.workspaceId)
      const connection = !link && parsed.data.syncICloud ? await tx.iCloudConnection.findFirst({ where: { ...scope(user), active: true } }) : null
      if (!link && parsed.data.syncICloud && (!connection || parsed.data.kind !== 'EVENT')) throw new ICloudError('CALENDAR', 'Conectá iCloud y elegí el tipo Evento para sincronizar.', 409)
      if (connection) await guardConnection(tx, connection.id, user.id, user.workspaceId)
      const updated = await tx.calendarEvent.update({ where: { id }, data: eventData(parsed.data) })
      if (connection) await enqueueEvent(tx, updated, connection)
      return updated
    })
    return NextResponse.json({ data: event, success: true })
  } catch (error) { return cloudResponse(error) }
}
export async function DELETE(req: NextRequest, context: Context) {
  try {
    sameOrigin(req)
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const { id } = await context.params, link = await linkFor(id, user)
    if (link?.readOnly) throw new ICloudError('READONLY', 'Eliminá este evento desde tu iPhone para conservar sus invitados y reglas.', 409)
    const result = await prisma.$transaction(async tx => {
      if (link) {
        await guardConnection(tx, link.connectionId, user.id, user.workspaceId)
        await tx.iCloudObject.update({ where: { id: link.id }, data: { deletedLocally: true } })
      }
      return tx.calendarEvent.deleteMany({ where: { id, ...scope(user) } })
    })
    return result.count ? NextResponse.json({ success: true }) : NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  } catch (error) { return cloudResponse(error) }
}
