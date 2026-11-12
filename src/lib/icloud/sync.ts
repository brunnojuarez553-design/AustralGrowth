import { randomUUID } from 'node:crypto'
import { Prisma, type ICloudConnection, type ICloudObject, type CalendarEvent } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { AppleCalDAV } from './caldav'
import { decryptPassword } from './crypto'
import { ICloudError, safeError } from './errors'
import { fingerprint, readIcal, writeIcal } from './ical'

type Owner = { id: string; workspaceId: string }
export function scope(owner: Owner) { return { userId: owner.id, workspaceId: owner.workspaceId } }
export async function enqueueEvent(tx: Prisma.TransactionClient, event: CalendarEvent, connection: ICloudConnection) {
  if (!connection.active || !connection.calendarUrl) throw new ICloudError('DISCONNECTED', 'Conectá y elegí un calendario de iCloud primero.', 409)
  const uid = randomUUID() + '@australgrowth'
  return tx.iCloudObject.create({ data: { connectionId: connection.id, eventId: event.id, uid, url: new URL(encodeURIComponent(uid) + '.ics', connection.calendarUrl.endsWith('/') ? connection.calendarUrl : connection.calendarUrl + '/').href } })
}
async function preserveLocal(tx: Prisma.TransactionClient, event: CalendarEvent) {
  const { id: _id, createdAt: _created, updatedAt: _updated, ...data } = event
  await tx.calendarEvent.create({ data: { ...data, title: (event.title + ' (copia local)').slice(0, 200) } })
}
export async function syncCalendar(owner: Owner, force = false, db: typeof prisma = prisma) {
  const connection = await db.iCloudConnection.findFirst({ where: { ...scope(owner), active: true } })
  if (!connection?.calendarUrl || !connection.encryptedPassword) return { imported: 0, exported: 0, deleted: 0, conflicts: 0, pending: false, connected: false }
  const token = randomUUID(), now = new Date()
  const lock = await db.iCloudConnection.updateMany({ where: { id: connection.id, ...scope(owner), active: true,
    AND: [{ OR: [{ lockUntil: null }, { lockUntil: { lt: now } }] }, ...(force ? [] : [{ OR: [{ lastAttemptAt: null }, { lastAttemptAt: { lt: new Date(+now - 50000) } }] }])] }, data: { lockToken: token, lockUntil: new Date(+now + 120000), lastAttemptAt: now } })
  if (!lock.count) return { imported: 0, exported: 0, deleted: 0, conflicts: 0, pending: true, connected: true }
  const result = { imported: 0, exported: 0, deleted: 0, conflicts: 0, pending: false, connected: true }
  try {
    const apple = new AppleCalDAV({ email: connection.email, password: decryptPassword(connection.encryptedPassword, owner.id) })
    const deadline = Date.now() + 35000
    const inventory = await apple.inventory(connection.calendarUrl)
    const remote = new Map(inventory.map(item => [item.url, item]))
    const links = await db.iCloudObject.findMany({ where: { connectionId: connection.id }, include: { event: true } })
    const known = new Map(links.map(link => [link.url, link]))
    const changed = inventory.filter(item => !known.has(item.url) || known.get(item.url)!.etag !== item.etag)
    const assertLease = async () => {
      const valid = await db.iCloudConnection.count({ where: { id: connection.id, ...scope(owner), active: true, lockToken: token, lockUntil: { gt: new Date() } } })
      if (!valid) throw new ICloudError('LOCK', 'La conexión cambió. Volvé a sincronizar.', 409)
    }
    const importObject = async (url: string, etag: string, raw: string, old?: (ICloudObject & { event: CalendarEvent | null })) => {
      const parsed = readIcal(raw, connection.timeZone)
      await assertLease()
      await db.$transaction(async tx => {
        const current = old ? await tx.iCloudObject.findUnique({ where: { id: old.id }, include: { event: true } }) : null
        // Do not overwrite an edit that arrived during network I/O; retry it next time.
        if (current?.event && old?.event && +current.event.updatedAt !== +old.event.updatedAt) throw new ICloudError('CONFLICT', 'Hubo un cambio local durante la sincronización. Volvé a intentar.', 409)
        if (current?.event && (!old?.baseHash || fingerprint(current.event) !== old.baseHash)) { await preserveLocal(tx, current.event); result.conflicts++ }
        if (parsed.cancelled) {
          if (current?.event) await tx.calendarEvent.delete({ where: { id: current.event.id } })
          if (current) await tx.iCloudObject.update({ where: { id: current.id }, data: { eventId: null, etag, rawIcs: parsed.data, uid: parsed.uid, uploaded: true, deletedLocally: false } })
          return
        }
        const fields = { ...parsed.fields, recurrence: parsed.fields.recurrence as string }
        const event = current?.event ? await tx.calendarEvent.update({ where: { id: current.event.id }, data: fields }) : await tx.calendarEvent.create({ data: { ...fields, ...scope(owner), kind: 'EVENT', color: '#60a5fa' } })
        const data = { eventId: event.id, uid: parsed.uid, etag, rawIcs: parsed.data, baseHash: fingerprint(event), uploaded: true, deletedLocally: false, readOnly: parsed.readOnly }
        if (current) await tx.iCloudObject.update({ where: { id: current.id }, data })
        else await tx.iCloudObject.create({ data: { ...data, url, connectionId: connection.id } })
      })
      result.imported++
    }
    // Fetch changed objects in small complete batches. Failure never implies deletion.
    for (let offset = 0; offset < changed.length; offset += 20) {
      if (Date.now() > deadline) { result.pending = true; break }
      const batch = await apple.read(connection.calendarUrl, changed.slice(offset, offset + 20).map(item => item.url))
      for (const item of batch) {
        if (Date.now() > deadline) { result.pending = true; break }
        const old = known.get(item.url)
        // A retried create uses a deterministic URL. Adopt it if the PUT succeeded before a crash.
        if (old && !old.uploaded && old.event && fingerprint(old.event) === fingerprint({ ...old.event, ...readIcal(item.data!, connection.timeZone).fields })) {
          await db.iCloudObject.update({ where: { id: old.id }, data: { etag: item.etag, rawIcs: item.data, uploaded: true, baseHash: fingerprint(old.event) } }); continue
        }
        await importObject(item.url, item.etag, item.data!, old)
      }
    }
    for (const link of links) {
      if (Date.now() > deadline) { result.pending = true; break }
      // Changed remote objects were just imported (or are deferred), so do not push stale snapshots.
      if (remote.has(link.url) && remote.get(link.url)!.etag !== link.etag) continue
      await assertLease()
      if (!remote.has(link.url) && link.uploaded) {
        await db.$transaction(async tx => {
          const current = await tx.iCloudObject.findUnique({ where: { id: link.id }, include: { event: true } })
          if (current?.event && link.event && +current.event.updatedAt !== +link.event.updatedAt) throw new ICloudError('CONFLICT', 'Hubo un cambio local durante la sincronización.', 409)
          if (current?.event && link.baseHash && fingerprint(current.event) !== link.baseHash) { await preserveLocal(tx, current.event); result.conflicts++ }
          await tx.iCloudObject.deleteMany({ where: { id: link.id } })
          if (current?.event) await tx.calendarEvent.delete({ where: { id: current.event.id } })
        }); result.deleted++; continue
      }
      if (link.deletedLocally) {
        if (remote.has(link.url)) await apple.remove(connection.calendarUrl, link.url, link.etag!)
        await db.iCloudObject.deleteMany({ where: { id: link.id } }); result.deleted++; continue
      }
      if (!link.event || link.readOnly || link.baseHash === fingerprint(link.event)) continue
      const raw = writeIcal(link.event, link.uid, connection.timeZone, link.rawIcs)
      const etag = await apple.put(connection.calendarUrl, link.url, raw, link.uploaded ? link.etag : null)
      // Store the version sent, not a newer edit. A subsequent edit stays dirty and is retried.
      await db.iCloudObject.update({ where: { id: link.id }, data: { uploaded: true, etag, rawIcs: raw, baseHash: fingerprint(link.event) } })
      // A server may omit ETag after PUT; read the canonical representation to avoid unsafe writes.
      if (!etag) {
        const [canonical] = await apple.read(connection.calendarUrl, [link.url])
        await db.iCloudObject.update({ where: { id: link.id }, data: { etag: canonical.etag, rawIcs: canonical.data } })
      }
      result.exported++
    }
    await db.iCloudConnection.updateMany({ where: { id: connection.id, lockToken: token }, data: { ...(result.pending ? {} : { lastSyncAt: new Date() }), lastError: result.conflicts ? 'Se conservaron los cambios simultáneos como copias locales. Revisá tu calendario.' : result.pending ? 'Hay más eventos pendientes. Sincronizá nuevamente para continuar.' : null } })
    return result
  } catch (error) {
    await db.iCloudConnection.updateMany({ where: { id: connection.id, lockToken: token }, data: { lastError: safeError(error), ...(error instanceof ICloudError && error.code === 'AUTH' ? { active: false, encryptedPassword: '' } : {}) } }).catch(() => {})
    throw error
  } finally {
    await db.iCloudConnection.updateMany({ where: { id: connection.id, lockToken: token }, data: { lockToken: null, lockUntil: null } }).catch(() => {})
  }
}
