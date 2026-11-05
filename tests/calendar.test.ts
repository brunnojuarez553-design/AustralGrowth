import { strict as assert } from 'node:assert'
import { test } from 'node:test'
import { occurrences, type CalendarEvent } from '../src/lib/calendar/events'
import { layoutDay } from '../src/lib/calendar/layout'
const base: CalendarEvent = { id: 'a', title: 'Reunión', description: '', location: '', start: '2026-11-05T09:00:00-03:00', end: '2026-11-05T10:00:00-03:00', allDay: false, color: '#ff7a1a', kind: 'EVENT', completed: false, recurrence: 'NONE', repeatUntil: null, reminderMinutes: 10 }
const at = (s: string) => new Date(s)
test('exclusive boundaries and events crossing midnight', () => {
  assert.equal(occurrences([base], at(base.end), at('2026-11-06T00:00:00-03:00')).length, 0)
  const overnight = { ...base, start: '2026-11-04T23:00:00-03:00', end: '2026-11-05T01:00:00-03:00' }
  assert.equal(occurrences([overnight], at('2026-11-05T00:00:00-03:00'), at('2026-11-06T00:00:00-03:00')).length, 1)
})
test('daily repeat respects inclusive end and does not leak into the next period', () => {
  const result = occurrences([{ ...base, recurrence: 'DAILY', repeatUntil: '2026-11-07T23:59:59-03:00' }], at('2026-11-01T00:00:00-03:00'), at('2026-12-01T00:00:00-03:00'))
  assert.equal(result.length, 3)
})
test('weekly recurrence keeps duration and weekday', () => {
  const result = occurrences([{ ...base, recurrence: 'WEEKLY' }], at('2026-11-01T00:00:00-03:00'), at('2026-12-01T00:00:00-03:00'))
  assert.equal(result.length, 4)
  assert.ok(result.every(e => e.occurrenceStart.getDay() === 4 && +e.occurrenceEnd - +e.occurrenceStart === 3600000))
})
test('chained overlaps receive separate stable lanes', () => {
  const result = occurrences([base, { ...base, id: 'b', start: '2026-11-05T09:30:00-03:00', end: '2026-11-05T10:30:00-03:00' }, { ...base, id: 'c', start: '2026-11-05T10:00:00-03:00', end: '2026-11-05T11:00:00-03:00' }], at('2026-11-05T00:00:00-03:00'), at('2026-11-06T00:00:00-03:00'))
  const positions = layoutDay(result, at(base.start))
  assert.equal(positions.get(result[0].key)?.lanes, 2)
  assert.notEqual(positions.get(result[0].key)?.lane, positions.get(result[1].key)?.lane)
  assert.notEqual(positions.get(result[1].key)?.lane, positions.get(result[2].key)?.lane)
})
test('daily series preserves wall time and duration over daylight saving', () => {
  const result = occurrences([{ ...base, start: '2026-03-07T09:00:00', end: '2026-03-07T10:00:00', recurrence: 'DAILY' }], at('2026-03-07T00:00:00'), at('2026-03-10T00:00:00'))
  assert.equal(result.length, 3)
  assert.ok(result.every(e => e.occurrenceStart.getHours() === 9 && e.occurrenceEnd.getHours() === 10))
})
test('monthly recurrence skips months without the original day, matching iCalendar', () => {
  const result = occurrences([{ ...base, start: '2026-01-31T09:00:00', end: '2026-01-31T10:00:00', recurrence: 'MONTHLY' }], at('2026-01-01T00:00:00'), at('2026-04-01T00:00:00'))
  assert.equal(result.length, 2)
  assert.deepEqual(result.map(e => e.occurrenceStart.getDate()), [31, 31])
})
