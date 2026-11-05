import { startOfDay, addDays } from 'date-fns'
import type { Occurrence } from './events'

// Assign stable lanes for connected overlap groups, including chains of overlaps.
export function layoutDay(events: Occurrence[], day: Date) {
  const start = +startOfDay(day), end = +addDays(startOfDay(day), 1)
  const items = events.filter(e => !e.allDay && +e.occurrenceStart < end && +e.occurrenceEnd > start)
    .sort((a, b) => +a.occurrenceStart - +b.occurrenceStart || +b.occurrenceEnd - +a.occurrenceEnd)
  const result = new Map<string, { lane: number; lanes: number }>()
  let group: { event: Occurrence; lane: number }[] = [], laneEnds: number[] = [], groupEnd = -Infinity
  const flush = () => { for (const item of group) result.set(item.event.key, { lane: item.lane, lanes: laneEnds.length }) }
  for (const event of items) {
    if (+event.occurrenceStart >= groupEnd) { flush(); group = []; laneEnds = [] }
    let lane = laneEnds.findIndex(value => value <= +event.occurrenceStart)
    if (lane === -1) lane = laneEnds.length
    laneEnds[lane] = +event.occurrenceEnd
    group.push({ event, lane }); groupEnd = Math.max(groupEnd, +event.occurrenceEnd)
  }
  flush()
  return result
}
