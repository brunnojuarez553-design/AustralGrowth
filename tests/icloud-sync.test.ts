import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { prisma } from '../src/lib/prisma'
import { syncCalendar } from '../src/lib/icloud/sync'
import { AppleCalDAV } from '../src/lib/icloud/caldav'
import { encryptPassword } from '../src/lib/icloud/crypto'
import { fingerprint, writeIcal } from '../src/lib/icloud/ical'

const owner = { id: 'owner-a', workspaceId: 'workspace-a' }
const url = 'https://p01-caldav.icloud.com/123/calendars/work/event.ics'
const original = { id: 'local-event', ...{ userId: owner.id, workspaceId: owner.workspaceId }, title: 'Original', description: '', location: '', start: new Date('2026-11-12T12:00:00Z'), end: new Date('2026-11-12T13:00:00Z'), allDay: false, kind: 'EVENT', color: '#ff7a1a', completed: false, recurrence: 'NONE', repeatUntil: null, reminderMinutes: 10, createdAt: new Date('2026-11-12T00:00:00Z'), updatedAt: new Date('2026-11-12T00:00:00Z') }
function setup(t: any, options: { localTitle?: string; uploaded?: boolean; deletedLocally?: boolean; locked?: boolean; remoteTitle?: string; missing?: boolean; failInventory?: boolean } = {}) {
  process.env.CALENDAR_ENCRYPTION_KEY = randomBytes(32).toString('hex')
  const connection = { id: 'connection-a', ...{ userId: owner.id, workspaceId: owner.workspaceId }, email: 'sample@example.com', encryptedPassword: encryptPassword('aaaa-bbbb-cccc-dddd', owner.id), active: true, calendarUrl: 'https://p01-caldav.icloud.com/123/calendars/work/', timeZone: 'America/Argentina/Buenos_Aires' }
  const event = { ...original, title: options.localTitle || original.title }
  const link: any = { id: 'link-a', connectionId: connection.id, eventId: event.id, url, uid: 'stable-uid', etag: options.uploaded === false ? null : '"v1"', uploaded: options.uploaded !== false, deletedLocally: !!options.deletedLocally, readOnly: false, baseHash: options.uploaded === false ? null : fingerprint(original), rawIcs: null, event: options.deletedLocally ? null : event }
  const noop = async () => undefined
  const db: any = { iCloudConnection: { findFirst: noop, updateMany: noop, count: noop }, iCloudObject: { findMany: noop, findUnique: noop, update: noop, deleteMany: noop }, calendarEvent: { create: noop, update: noop, delete: noop }, $transaction: noop }
  const created: any[] = [], deleted: any[] = [], writes: any[] = [], objectUpdates: any[] = []
  t.mock.method(db.iCloudConnection, 'findFirst', async ({ where }: any) => { assert.equal(where.userId, owner.id); assert.equal(where.workspaceId, owner.workspaceId); return connection })
  t.mock.method(db.iCloudConnection, 'updateMany', async () => ({ count: options.locked ? 0 : 1 }))
  t.mock.method(db.iCloudConnection, 'count', async () => 1)
  t.mock.method(db.iCloudObject, 'findMany', async () => [link])
  t.mock.method(db.iCloudObject, 'findUnique', async () => link)
  t.mock.method(db.iCloudObject, 'update', async ({ data }: any) => { objectUpdates.push(data); return { ...link, ...data } })
  t.mock.method(db.iCloudObject, 'deleteMany', async () => ({ count: 1 }))
  t.mock.method(db.calendarEvent, 'create', async ({ data }: any) => { created.push(data); return { ...original, ...data, id: 'copy' } })
  t.mock.method(db.calendarEvent, 'update', async ({ data }: any) => ({ ...original, ...data }))
  t.mock.method(db.calendarEvent, 'delete', async ({ where }: any) => { deleted.push(where.id); return original })
  t.mock.method(db, '$transaction', async (callback: any) => callback(db))
  t.mock.method(AppleCalDAV.prototype, 'inventory', async () => {
    if (options.failInventory) throw new Error('upstream failed')
    return options.missing || options.uploaded === false ? [] : [{ url, etag: options.remoteTitle ? '"v2"' : '"v1"' }]
  })
  t.mock.method(AppleCalDAV.prototype, 'read', async () => [{ url, etag: '"v2"', data: writeIcal({ ...original, title: options.remoteTitle || original.title }, 'stable-uid', connection.timeZone) }])
  t.mock.method(AppleCalDAV.prototype, 'put', async (...args: any[]) => { writes.push(args); return '"v2"' })
  t.mock.method(AppleCalDAV.prototype, 'remove', async (...args: any[]) => { writes.push(args) })
  return { db, created, deleted, writes, objectUpdates }
}
test('outbox retries an unuploaded event at its stable URL without duplication', async t => {
  const state = setup(t, { uploaded: false })
  const result = await syncCalendar(owner, false, state.db)
  assert.equal(result.exported, 1); assert.equal(state.writes[0][1], url); assert.equal(state.writes[0][3], null)
  assert.equal(state.objectUpdates[0].uploaded, true)
})
test('an existing local edit uses the last remote ETag', async t => {
  const state = setup(t, { localTitle: 'Editado desde AustralGrowth' })
  const result = await syncCalendar(owner, false, state.db)
  assert.equal(result.exported, 1); assert.equal(state.writes[0][3], '"v1"')
})
test('simultaneous remote and local edits preserve the local copy and import remote', async t => {
  const state = setup(t, { localTitle: 'Cambio local', remoteTitle: 'Cambio iPhone' })
  const result = await syncCalendar(owner, false, state.db)
  assert.equal(result.conflicts, 1); assert.equal(result.imported, 1); assert.equal(result.exported, 0)
  assert.equal(state.created[0].title, 'Cambio local (copia local)'); assert.equal(state.writes.length, 0)
})
test('deletion on iPhone removes the linked copy but preserves unsent local changes', async t => {
  const state = setup(t, { localTitle: 'Cambio pendiente', missing: true })
  const result = await syncCalendar(owner, false, state.db)
  assert.equal(result.deleted, 1); assert.equal(result.conflicts, 1)
  assert.equal(state.created[0].title, 'Cambio pendiente (copia local)'); assert.deepEqual(state.deleted, ['local-event'])
})
test('local tombstones delete iCloud conditionally, not by unprotected URL', async t => {
  const state = setup(t, { deletedLocally: true })
  const result = await syncCalendar(owner, false, state.db)
  assert.equal(result.deleted, 1); assert.equal(state.writes[0][2], '"v1"')
})
test('an incomplete remote inventory never deletes or overwrites anything', async t => {
  const state = setup(t, { failInventory: true })
  await assert.rejects(() => syncCalendar(owner, false, state.db))
  assert.equal(state.deleted.length, 0); assert.equal(state.writes.length, 0)
})
test('concurrent sync is skipped when another worker holds the lease', async t => {
  const state = setup(t, { locked: true })
  const result = await syncCalendar(owner, false, state.db)
  assert.equal(result.pending, true); assert.equal(state.writes.length, 0)
})
