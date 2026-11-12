import ICAL from 'ical.js'

// The component resolves VTIMEZONE locally; no global timezone registry shared across users.
export function parsedCalendar(data: string) {
  const component = new ICAL.Component(ICAL.parse(data))
  const components = component.getAllSubcomponents('vevent')
  const master = components.find(item => !item.hasProperty('recurrence-id'))
  if (!master || !master.hasProperty('dtstart')) throw new Error('Evento sin fecha de inicio')
  const event = new ICAL.Event(master)
  for (const exception of components) if (exception !== master && exception.hasProperty('recurrence-id')) event.relateException(exception)
  return { component, event }
}
export function expandIcal(data: string, from: Date, to: Date) {
  const { event } = parsedCalendar(data)
  if (!event.isRecurring()) return [{ start: event.startDate.toJSDate(), end: event.endDate.toJSDate() }].filter(e => e.end > from && e.start < to)
  const iterator = event.iterator()
  const result: { start: Date; end: Date }[] = []
  // Bound pathological/untrusted recurrence rules. Import rejects secondly/minutely/hourly rules.
  for (let i = 0; i < 50000 && result.length < 5000; i++) {
    const next = iterator.next(); if (!next) break
    const occurrence = event.getOccurrenceDetails(next)
    const start = occurrence.startDate.toJSDate(), end = occurrence.endDate.toJSDate()
    if (start >= to) break
    if (end > from && String(occurrence.item.component.getFirstPropertyValue('status')) !== 'CANCELLED') result.push({ start, end })
  }
  return result
}

export function mergeCalendarExport(local: string, external: string[]) {
  const root = new ICAL.Component(ICAL.parse(local))
  const zones = new Set(root.getAllSubcomponents('vtimezone').map(c => String(c.getFirstPropertyValue('tzid'))))
  for (const raw of external) {
    const source = parsedCalendar(raw).component
    for (const component of source.getAllSubcomponents()) {
      if (component.name === 'vtimezone') {
        const id = String(component.getFirstPropertyValue('tzid'))
        if (zones.has(id)) continue
        zones.add(id)
      }
      if (['vtimezone', 'vevent'].includes(component.name)) root.addSubcomponent(new ICAL.Component(component.toJSON()))
    }
  }
  return root.toString() + '\r\n'
}
