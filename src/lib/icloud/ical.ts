import ICAL from 'ical.js'
import { getVtimezoneComponent } from '@touch4it/ical-timezones'
import { createHash } from 'node:crypto'
import type { CalendarEvent as DBEvent } from '@prisma/client'
import { parsedCalendar } from '@/lib/calendar/ical'
import { ICloudError } from './errors'

type EventFields = Pick<DBEvent, 'title' | 'description' | 'location' | 'start' | 'end' | 'allDay' | 'recurrence' | 'repeatUntil' | 'reminderMinutes'>
export function fingerprint(event: EventFields) {
  return createHash('sha256').update(JSON.stringify([event.title, event.description, event.location, event.start.toISOString(), event.end.toISOString(), event.allDay, event.recurrence, event.repeatUntil?.toISOString() ?? null, event.reminderMinutes])).digest('hex')
}
const zoneAliases: Record<string, string> = {
  'America/Buenos_Aires': 'America/Argentina/Buenos_Aires',
  'America/Catamarca': 'America/Argentina/Catamarca',
  'America/ComodRivadavia': 'America/Argentina/Catamarca',
  'America/Cordoba': 'America/Argentina/Cordoba',
  'America/Jujuy': 'America/Argentina/Jujuy',
  'America/Mendoza': 'America/Argentina/Mendoza',
}
function attachZone(component: ICAL.Component, zone: string) {
  if (zone === 'UTC' || zone === 'Etc/UTC') return ICAL.Timezone.utcTimezone
  const found = component.getAllSubcomponents('vtimezone').find(c => c.getFirstPropertyValue('tzid') === zone)
  if (!found) {
    const definition = getVtimezoneComponent(zoneAliases[zone] || zone)
    if (!definition) throw new ICloudError('TIMEZONE', `La zona horaria ${zone.slice(0, 80)} no está disponible. Elegí otra zona.`)
    const timezone = new ICAL.Component(ICAL.parse(definition))
    // Keep the requested TZID: existing Apple events and Chromium may use the
    // legacy IANA alias while the bundled definitions use the canonical name.
    timezone.updatePropertyWithValue('tzid', zone)
    component.addSubcomponent(timezone)
  }
  return component.getTimeZoneByID(zone)
}
export function normalizeIcal(data: string, timeZone = 'America/Argentina/Buenos_Aires') {
  if (Buffer.byteLength(data) > 256000) throw new ICloudError('LIMIT', 'Un evento supera el tamaño admitido.')
  let component: ICAL.Component
  try { component = new ICAL.Component(ICAL.parse(data)) } catch { throw new ICloudError('ICAL', 'No se pudo interpretar un evento de iCloud.') }
  for (const item of component.getAllSubcomponents('vevent')) {
    for (const name of ['dtstart', 'dtend', 'recurrence-id']) {
      const zone = item.getFirstProperty(name)?.getParameter('tzid')
      if (typeof zone === 'string') attachZone(component, zone)
      else {
        const property = item.getFirstProperty(name)
        const value = property?.getFirstValue()
        if (value instanceof ICAL.Time && !value.isDate && value.zone === ICAL.Timezone.localTimezone) {
          const floating = value.clone(); floating.zone = attachZone(component, timeZone)
          property!.setValue(floating)
          if (timeZone !== 'UTC' && timeZone !== 'Etc/UTC') property!.setParameter('tzid', timeZone)
        }
      }
    }
    const rule = item.getFirstPropertyValue('rrule') as ICAL.Recur | null
    if (rule && ['SECONDLY', 'MINUTELY', 'HOURLY'].includes(rule.freq)) throw new ICloudError('FREQUENCY', 'Este calendario tiene una serie de frecuencia muy alta. Usá un calendario de trabajo separado.')
  }
  return component.toString()
}
function instant(time: ICAL.Time, component: ICAL.Component, timeZone: string) {
  if (time.zone !== ICAL.Timezone.localTimezone) return time.toJSDate()
  const zoned = time.clone(); zoned.isDate = false; zoned.zone = attachZone(component, timeZone)
  return zoned.toJSDate()
}
export function readIcal(raw: string, timeZone = 'America/Argentina/Buenos_Aires') {
  const data = normalizeIcal(raw, timeZone), { component, event } = parsedCalendar(data)
  const start = instant(event.startDate, component, timeZone)
  let end = instant(event.endDate, component, timeZone)
  const instantEvent = +end === +start && !event.startDate.isDate
  if (instantEvent) end = new Date(+start + 60000)
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || end <= start || !event.uid) throw new ICloudError('ICAL', 'Un evento de iCloud tiene fechas no compatibles.')
  const rule = event.component.getFirstPropertyValue('rrule') as ICAL.Recur | null
  const json = rule?.toJSON() as Record<string, unknown> | undefined
  const simple = !json || Object.keys(json).every(k => ['freq', 'interval', 'until'].includes(k)) && (!rule!.interval || rule!.interval === 1) && ['DAILY', 'WEEKLY', 'MONTHLY'].includes(rule!.freq)
  let readOnly = !simple || component.getAllSubcomponents('vevent').length > 1 || event.component.hasProperty('rdate') || event.component.hasProperty('exdate') || event.component.hasProperty('organizer') || event.component.hasProperty('attendee')
  readOnly ||= instantEvent || (event.description || '').length > 10000 || (event.summary || '').length > 200 || String(event.component.getFirstPropertyValue('location') || '').length > 500
  const alarm = event.component.getAllSubcomponents('valarm').find(a => a.getFirstPropertyValue('action') === 'DISPLAY')
  const trigger = alarm?.getFirstPropertyValue('trigger')
  const reminderMinutes = trigger instanceof ICAL.Duration && trigger.toSeconds() <= 0 && !alarm?.getFirstProperty('trigger')?.getParameter('related') ? Math.min(10080, Math.max(0, Math.round(-trigger.toSeconds() / 60))) : null
  if (alarm && (!(trigger instanceof ICAL.Duration) || !!alarm.getFirstProperty('trigger')?.getParameter('related') || event.component.getAllSubcomponents('valarm').filter(a => a.getFirstPropertyValue('action') === 'DISPLAY').length > 1)) readOnly = true
  return { uid: event.uid, data, readOnly, cancelled: event.component.getFirstPropertyValue('status') === 'CANCELLED', fields: {
    title: (event.summary || 'Sin título').slice(0, 200), description: (event.description || '').slice(0, 10000), location: String(event.component.getFirstPropertyValue('location') || '').slice(0, 500),
    start, end, allDay: event.startDate.isDate, recurrence: simple && rule ? rule.freq : 'NONE', repeatUntil: simple && rule?.until ? rule.until.toJSDate() : null, reminderMinutes,
  } }
}
function zonedTime(date: Date, zone: ICAL.Timezone, name: string, isDate: boolean) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: name, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]))
  return ICAL.Time.fromData({ year: +parts.year, month: +parts.month, day: +parts.day, hour: isDate ? 0 : +parts.hour, minute: isDate ? 0 : +parts.minute, second: isDate ? 0 : +parts.second, isDate }, isDate ? ICAL.Timezone.localTimezone : zone)
}
export function writeIcal(fields: EventFields, uid: string, timeZone: string, previous?: string | null) {
  const component = previous ? parsedCalendar(previous).component : new ICAL.Component(['vcalendar', [], []])
  component.updatePropertyWithValue('version', '2.0'); component.updatePropertyWithValue('prodid', '-//AustralGrowth//iCloud Sync//ES')
  let master = component.getFirstSubcomponent('vevent')
  if (!master) { master = new ICAL.Component('vevent'); component.addSubcomponent(master) }
  const event = new ICAL.Event(master)
  const zone = attachZone(component, timeZone)
  event.uid = uid; event.summary = fields.title; event.description = fields.description
  master.updatePropertyWithValue('location', fields.location)
  event.startDate = zonedTime(fields.start, zone, timeZone, fields.allDay)
  event.endDate = zonedTime(fields.end, zone, timeZone, fields.allDay)
  master.removeAllProperties('duration'); master.removeAllProperties('rrule')
  if (fields.recurrence !== 'NONE') {
    const rule = new ICAL.Recur({ freq: fields.recurrence as 'DAILY' | 'WEEKLY' | 'MONTHLY', interval: 1 })
    if (fields.repeatUntil) rule.until = fields.allDay ? zonedTime(fields.repeatUntil, zone, timeZone, true) : ICAL.Time.fromJSDate(fields.repeatUntil, true)
    master.addPropertyWithValue('rrule', rule)
  }
  // Preserve other alarm types and unrelated event properties.
  for (const alarm of master.getAllSubcomponents('valarm')) if (alarm.getFirstPropertyValue('action') === 'DISPLAY') master.removeSubcomponent(alarm)
  if (fields.reminderMinutes !== null) {
    const alarm = new ICAL.Component('valarm'); alarm.addPropertyWithValue('action', 'DISPLAY'); alarm.addPropertyWithValue('description', fields.title)
    alarm.addPropertyWithValue('trigger', ICAL.Duration.fromSeconds(-fields.reminderMinutes * 60)); master.addSubcomponent(alarm)
  }
  master.updatePropertyWithValue('dtstamp', ICAL.Time.fromJSDate(new Date(), true))
  master.updatePropertyWithValue('last-modified', ICAL.Time.fromJSDate(new Date(), true))
  event.sequence = (event.sequence || 0) + 1
  return component.toString() + '\r\n'
}
