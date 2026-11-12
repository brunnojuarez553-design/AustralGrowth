import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { calendarUser } from '@/lib/calendar/server'
import { AppleCalDAV, type CloudCalendar } from '@/lib/icloud/caldav'
import { encryptionReady, encryptPassword } from '@/lib/icloud/crypto'
import { cloudResponse, guardConnection, sameOrigin } from '@/lib/icloud/api'
import { enqueueEvent, scope } from '@/lib/icloud/sync'
import { ICloudError, isMissingSchema } from '@/lib/icloud/errors'

export const maxDuration = 60
export const runtime = 'nodejs'
const connectSchema = z.object({ email: z.string().trim().email().max(254).transform(v => v.toLowerCase()), password: z.string().trim().regex(/^[a-z]{4}(?:-?[a-z]{4}){3}$/i, 'Usá la contraseña específica de 16 letras que genera Apple.') })
export async function GET() {
  try {
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!encryptionReady()) return NextResponse.json({ configured: false, connected: false, setupRequired: true })
    const connection = await prisma.iCloudConnection.findFirst({ where: scope(user), select: { email: true, active: true, calendarUrl: true, calendarName: true, calendars: true, lastSyncAt: true, lastError: true, lockUntil: true, timeZone: true, encryptedPassword: true } })
    // Never serialize stored credentials, even encrypted ones.
    return NextResponse.json({ configured: true, connected: connection?.active ?? false, pendingSelection: !!connection?.encryptedPassword && !connection.active,
      email: connection?.email, calendarUrl: connection?.calendarUrl, calendarName: connection?.calendarName, calendars: connection?.calendars ?? [], lastSyncAt: connection?.lastSyncAt, lastError: connection?.lastError, timeZone: connection?.timeZone,
      syncing: !!connection?.lockUntil && connection.lockUntil > new Date() })
  } catch (error) { if (isMissingSchema(error)) return NextResponse.json({ configured: false, connected: false, setupRequired: true }); return cloudResponse(error) }
}
export async function POST(req: NextRequest) {
  try {
    sameOrigin(req)
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    if (!encryptionReady()) throw new ICloudError('CONFIG', 'La conexión con iCloud todavía no está habilitada en el servidor.', 503)
    const parsed = connectSchema.safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
    const existing = await prisma.iCloudConnection.findFirst({ where: scope(user), include: { _count: { select: { objects: true } } } })
    if (existing?.active) throw new ICloudError('CONNECTED', 'Desconectá iCloud antes de actualizar la autorización.', 409)
    if (existing?.lockUntil && existing.lockUntil > new Date()) throw new ICloudError('BUSY', 'Esperá a que termine la sincronización.', 409)
    if (existing && existing._count.objects && existing.email !== parsed.data.email) throw new ICloudError('ACCOUNT', 'Reconectá la misma cuenta de Apple para conservar la relación con tus eventos.', 409)
    if (existing?.lastAttemptAt && +existing.lastAttemptAt > Date.now() - 15000) throw new ICloudError('RATE', 'Esperá unos segundos antes de volver a conectar.', 429)
    if (existing) await prisma.iCloudConnection.update({ where: { id: existing.id }, data: { lastAttemptAt: new Date() } })
    const calendars = await new AppleCalDAV(parsed.data).discover()
    if (!calendars.length) throw new ICloudError('EMPTY', 'No encontramos calendarios editables. Creá uno en iCloud y volvé a conectar.', 400)
    const encryptedPassword = encryptPassword(parsed.data.password, user.id)
    await prisma.$transaction(async tx => {
      if (existing) await guardConnection(tx, existing.id, user.id, user.workspaceId)
      await tx.iCloudConnection.upsert({ where: { userId: user.id }, create: { ...scope(user), email: parsed.data.email, encryptedPassword, calendars, lastAttemptAt: new Date() }, update: { email: parsed.data.email, encryptedPassword, calendars, active: false, lastError: null, lastAttemptAt: new Date() } })
    })
    return NextResponse.json({ success: true, calendars })
  } catch (error) { return cloudResponse(error) }
}
export async function PATCH(req: NextRequest) {
  try {
    sameOrigin(req)
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    const parsed = z.object({ calendarUrl: z.string().url().max(2000), timeZone: z.string().max(100), includeExisting: z.boolean().default(false) }).safeParse(await req.json())
    if (!parsed.success) return NextResponse.json({ error: 'Elegí un calendario y una zona horaria.' }, { status: 400 })
    try { new Intl.DateTimeFormat('en', { timeZone: parsed.data.timeZone }).format() } catch { throw new ICloudError('TIMEZONE', 'La zona horaria no es válida.', 400) }
    await prisma.$transaction(async tx => {
      const connection = await tx.iCloudConnection.findFirst({ where: scope(user), include: { _count: { select: { objects: true } } } })
      if (!connection?.encryptedPassword) throw new ICloudError('DISCONNECTED', 'Primero autorizá tu cuenta de Apple.', 409)
      await guardConnection(tx, connection.id, user.id, user.workspaceId)
      const selected = (connection.calendars as CloudCalendar[]).find(c => c.url === parsed.data.calendarUrl)
      if (!selected) throw new ICloudError('CALENDAR', 'Ese calendario no está autorizado para tu cuenta.', 400)
      if (connection._count.objects && connection.calendarUrl !== selected.url) throw new ICloudError('CALENDAR', 'Elegí el mismo calendario para conservar la sincronización de tus eventos.', 409)
      const active = await tx.iCloudConnection.update({ where: { id: connection.id }, data: { active: true, calendarUrl: selected.url, calendarName: selected.name, timeZone: parsed.data.timeZone, lastError: null, lastAttemptAt: null } })
      if (parsed.data.includeExisting) {
        const events = await tx.calendarEvent.findMany({ where: { ...scope(user), kind: 'EVENT', iCloudObject: null }, take: 501 })
        if (events.length > 500) throw new ICloudError('LIMIT', 'Tenés más de 500 eventos locales. Conectá sin enviar los anteriores.', 400)
        for (const event of events) await enqueueEvent(tx, event, active)
      }
    })
    return NextResponse.json({ success: true })
  } catch (error) { return cloudResponse(error) }
}
export async function DELETE(req: NextRequest) {
  try {
    sameOrigin(req)
    const user = await calendarUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    await prisma.$transaction(async tx => {
      const connection = await tx.iCloudConnection.findFirst({ where: scope(user) })
      if (!connection) return
      await guardConnection(tx, connection.id, user.id, user.workspaceId)
      await tx.iCloudConnection.update({ where: { id: connection.id }, data: { active: false, encryptedPassword: '', lastError: null } })
    })
    return NextResponse.json({ success: true })
  } catch (error) { return cloudResponse(error) }
}
