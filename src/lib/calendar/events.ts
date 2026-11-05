import { addDays, addWeeks, addMonths } from 'date-fns'

export type CalendarEvent = {
  id: string; title: string; description: string; location: string;
  start: string; end: string; allDay: boolean; kind: 'EVENT' | 'TASK';
  color: string; completed: boolean; recurrence: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
  repeatUntil: string | null; reminderMinutes: number | null;
}
export type Occurrence = CalendarEvent & { occurrenceStart: Date; occurrenceEnd: Date; key: string }
export const colors = ['#ff7a1a', '#60a5fa', '#34d399', '#c084fc', '#fb7185']
export function occurrences(events: CalendarEvent[], from: Date, to: Date): Occurrence[] {
  const result: Occurrence[] = []
  for (const event of events) {
    const original = new Date(event.start), originalEnd = new Date(event.end)
    let current = original
    for (let n = 0; n < 36600 && current < to; n++) {
      if (event.repeatUntil && current > new Date(event.repeatUntil)) break
      // Calendar-day arithmetic preserves local wall time across DST changes.
      const dayOffset = Math.round((Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()) - Date.UTC(original.getFullYear(), original.getMonth(), original.getDate())) / 86400000)
      const end = addDays(originalEnd, dayOffset)
      const validMonthDay = event.recurrence !== 'MONTHLY' || current.getDate() === original.getDate()
      if (validMonthDay && end > from) result.push({ ...event, occurrenceStart: current, occurrenceEnd: end, key: `${event.id}:${current.toISOString()}` })
      if (event.recurrence === 'NONE') break
      current = event.recurrence === 'DAILY' ? addDays(original, n + 1) : event.recurrence === 'WEEKLY' ? addWeeks(original, n + 1) : addMonths(original, n + 1)
    }
  }
  return result.sort((a, b) => +a.occurrenceStart - +b.occurrenceStart)
}
