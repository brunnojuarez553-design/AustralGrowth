import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { AppleCalDAV, appleUrl, objectUrl } from '../src/lib/icloud/caldav'
import { encryptPassword, decryptPassword } from '../src/lib/icloud/crypto'
import { readIcal, writeIcal, fingerprint } from '../src/lib/icloud/ical'
import { expandIcal } from '../src/lib/calendar/ical'

const credentials = { email: 'sample@example.com', password: 'aaaa-bbbb-cccc-dddd' }
const collection = 'https://p01-caldav.icloud.com/123/calendars/work/'
const eventUrl = collection + 'event.ics'
const fields = { title: 'Reunión, diseño; presentación', description: 'Línea 1\nLínea 2', location: 'Oficina', start: new Date('2026-11-12T12:00:00Z'), end: new Date('2026-11-12T13:00:00Z'), allDay: false, recurrence: 'NONE', repeatUntil: null, reminderMinutes: 10 }
const multi = (items: string) => new Response(`<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">${items}</d:multistatus>`, { status: 207 })
const prop = (href: string, properties: string) => `<d:response><d:href>${href}</d:href><d:propstat><d:prop>${properties}</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>`
const client = (transport: (url: string, init: RequestInit) => Promise<Response>) => new AppleCalDAV(credentials, transport as typeof fetch)

test('credentials are authenticated encrypted and bound to the signed-in owner', () => {
  process.env.CALENDAR_ENCRYPTION_KEY = randomBytes(32).toString('hex')
  const sealed = encryptPassword(credentials.password, 'owner-a')
  assert.ok(!sealed.includes(credentials.password))
  assert.equal(decryptPassword(sealed, 'owner-a'), credentials.password)
  assert.throws(() => decryptPassword(sealed, 'owner-b'))
  const parts = sealed.split('.'); parts[3] = Buffer.from('corrupted').toString('base64')
  assert.throws(() => decryptPassword(parts.join('.'), 'owner-a'))
})
test('rejects credential redirects, private hosts, encoded traversal and foreign calendar objects', async () => {
  for (const url of ['http://caldav.icloud.com/', 'https://caldav.icloud.com.evil.test/', 'https://localhost/', 'https://127.0.0.1/', 'https://user@caldav.icloud.com/', 'https://caldav.icloud.com:8443/']) assert.throws(() => appleUrl(url))
  assert.throws(() => objectUrl('https://p01-caldav.icloud.com/123/calendars/other/a.ics', collection))
  assert.throws(() => objectUrl(collection + '%2e%2e%2fother.ics', collection))
  let calls = 0
  const apple = client(async () => { calls++; return new Response(null, { status: 302, headers: { location: 'https://evil.test/steal' } }) })
  await assert.rejects(() => apple.discover()); assert.equal(calls, 1)
})
test('discovery returns writable VEVENT calendars and omits read-only ones', async () => {
  let n = 0
  const apple = client(async (_url, init) => {
    assert.equal(init.method, 'PROPFIND'); assert.equal(init.redirect, 'manual')
    const props = '<d:displayname>Trabajo &amp; agencia</d:displayname><d:resourcetype><c:calendar/></d:resourcetype><d:current-user-privilege-set><d:privilege><d:write/></d:privilege></d:current-user-privilege-set><c:supported-calendar-component-set><c:comp name="VEVENT"/></c:supported-calendar-component-set>'
    return ++n === 1 ? multi(prop('/123/principal/', '<d:current-user-principal><d:href>/123/principal/</d:href></d:current-user-principal>')) : n === 2 ? multi(prop('/123/principal/', `<c:calendar-home-set><d:href>${collection}</d:href></c:calendar-home-set>`)) : multi(prop(collection, props) + prop(collection + 'readonly/', props.replace('<d:write/>', '<d:read/>')))
  })
  assert.deepEqual(await apple.discover(), [{ url: collection, name: 'Trabajo & agencia' }])
})
test('incomplete listings and XML entities never become remote deletions', async () => {
  const failed = client(async () => multi('<d:response><d:href>/bad</d:href><d:status>HTTP/1.1 500 Error</d:status></d:response>'))
  await assert.rejects(() => failed.inventory(collection))
  const entity = client(async () => new Response('<!DOCTYPE x [<!ENTITY secret SYSTEM "file:///etc/passwd">]><d:multistatus/>', { status: 207 }))
  await assert.rejects(() => entity.inventory(collection))
})
test('create and edits use conditional writes and conflicts are surfaced', async () => {
  const calls: RequestInit[] = []
  const apple = client(async (_url, init) => { calls.push(init); return new Response(null, { status: calls.length === 3 ? 412 : 201, headers: { etag: '"v2"' } }) })
  await apple.put(collection, eventUrl, 'BEGIN:VCALENDAR', null)
  await apple.put(collection, eventUrl, 'BEGIN:VCALENDAR', '"v1"')
  await assert.rejects(() => apple.remove(collection, eventUrl, '"v1"'), /cambió/)
  assert.equal((calls[0].headers as Record<string,string>)['If-None-Match'], '*')
  assert.equal((calls[1].headers as Record<string,string>)['If-Match'], '"v1"')
  assert.equal((calls[2].headers as Record<string,string>)['If-Match'], '"v1"')
})
test('new events round-trip title, notes, instants, reminders, UID and timezone', () => {
  const raw = writeIcal(fields, 'stable@australgrowth', 'America/Argentina/Buenos_Aires')
  const read = readIcal(raw)
  assert.equal(read.uid, 'stable@australgrowth'); assert.equal(read.readOnly, false)
  assert.equal(read.fields.title, fields.title); assert.equal(read.fields.description, fields.description)
  assert.equal(+read.fields.start, +fields.start); assert.equal(read.fields.reminderMinutes, 10)
  assert.ok(raw.includes('BEGIN:VTIMEZONE'))
  assert.equal(fingerprint(fields), fingerprint(read.fields))
})
test('all-day dates stay on the chosen local calendar day with exclusive end', () => {
  const raw = writeIcal({ ...fields, allDay: true, start: new Date('2026-11-12T03:00:00Z'), end: new Date('2026-11-13T03:00:00Z') }, 'day@australgrowth', 'America/Argentina/Buenos_Aires')
  assert.ok(raw.includes('DTSTART;VALUE=DATE:20261112')); assert.ok(raw.includes('DTEND;VALUE=DATE:20261113'))
  const read = readIcal(raw)
  assert.equal(read.fields.start.toISOString(), '2026-11-12T03:00:00.000Z')
  assert.equal(read.fields.end.toISOString(), '2026-11-13T03:00:00.000Z')
})
test('recurring events preserve wall time across daylight saving', () => {
  const raw = writeIcal({ ...fields, start: new Date('2026-03-07T14:00:00Z'), end: new Date('2026-03-07T15:00:00Z'), recurrence: 'DAILY' }, 'dst@australgrowth', 'America/New_York')
  const result = expandIcal(raw, new Date('2026-03-07T00:00:00Z'), new Date('2026-03-10T00:00:00Z'))
  assert.deepEqual(result.map(e => e.start.toISOString()), ['2026-03-07T14:00:00.000Z', '2026-03-08T13:00:00.000Z', '2026-03-09T13:00:00.000Z'])
})
test('advanced recurrence, exclusions and invitations stay read-only', () => {
  const raw = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:advanced\r\nDTSTART:20261101T120000Z\r\nDTEND:20261101T130000Z\r\nRRULE:FREQ=DAILY;COUNT=4\r\nEXDATE:20261102T120000Z\r\nATTENDEE:mailto:guest@example.com\r\nSUMMARY:Reunión\r\nEND:VEVENT\r\nEND:VCALENDAR'
  const read = readIcal(raw)
  assert.equal(read.readOnly, true)
  const result = expandIcal(read.data, new Date('2026-11-01T00:00:00Z'), new Date('2026-11-06T00:00:00Z'))
  assert.equal(result.length, 3); assert.ok(!result.some(e => e.start.getUTCDate() === 2))
})
test('editing an ordinary event retains unrelated Apple properties and stable UID', () => {
  const raw = writeIcal(fields, 'same-uid', 'America/Argentina/Buenos_Aires').replace('END:VEVENT', 'X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC\r\nEND:VEVENT')
  const updated = writeIcal({ ...fields, title: 'Actualizado' }, 'same-uid', 'America/Argentina/Buenos_Aires', raw)
  assert.ok(updated.includes('X-APPLE-TRAVEL-ADVISORY-BEHAVIOR:AUTOMATIC'))
  assert.equal(readIcal(updated).uid, 'same-uid')
})
test('simple recurring series remain editable while high-frequency rules are rejected', () => {
  const raw = writeIcal({ ...fields, recurrence: 'WEEKLY' }, 'simple', 'America/Argentina/Buenos_Aires')
  assert.equal(readIcal(raw).readOnly, false)
  assert.throws(() => readIcal(raw.replace('FREQ=WEEKLY', 'FREQ=SECONDLY')))
})
test('floating iCloud times use the selected timezone instead of the server timezone', () => {
  const raw = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:floating\r\nDTSTART:20261112T090000\r\nDTEND:20261112T100000\r\nSUMMARY:Local\r\nEND:VEVENT\r\nEND:VCALENDAR'
  const event = readIcal(raw, 'America/Argentina/Buenos_Aires')
  assert.equal(event.fields.start.toISOString(), '2026-11-12T12:00:00.000Z')
  const occurrences = expandIcal(event.data, new Date('2026-11-12T00:00:00Z'), new Date('2026-11-13T00:00:00Z'))
  assert.equal(occurrences[0].start.toISOString(), '2026-11-12T12:00:00.000Z')
})
