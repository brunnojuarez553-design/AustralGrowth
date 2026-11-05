'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addDays } from 'date-fns'
import { Bell, X } from 'lucide-react'
import { CalendarEvent, Occurrence, occurrences } from '@/lib/calendar/events'

export function CalendarReminders() {
  const [alerts, setAlerts] = useState<Occurrence[]>([])
  const shown = useRef(new Set<string>())
  const { data = [] } = useQuery<CalendarEvent[]>({
    queryKey: ['calendar'], gcTime: 0, staleTime: 0, refetchOnMount: 'always',
    queryFn: async () => {
      const response = await fetch('/api/calendar')
      if (!response.ok) throw new Error('Calendario no disponible')
      return (await response.json()).data
    },
    refetchInterval: 60000,
    retry: false,
  })
  useEffect(() => {
    const check = () => {
      const now = new Date()
      const upcoming = occurrences(data.filter(e => !e.completed && e.reminderMinutes !== null), now, addDays(now, 8))
      const due = upcoming.filter(e => {
        const reminder = +e.occurrenceStart - e.reminderMinutes! * 60000
        const key = `${e.key}:${e.reminderMinutes}`
        if (+now < reminder || +now >= +e.occurrenceStart + 60000 || shown.current.has(key)) return false
        shown.current.add(key)
        return true
      })
      if (due.length) setAlerts(previous => [...previous, ...due].slice(-5))
    }
    check()
    const timer = setInterval(check, 15000)
    return () => clearInterval(timer)
  }, [data])
  if (!alerts.length) return null
  return <aside aria-label="Recordatorios del calendario" aria-live="polite" className="fixed bottom-4 right-4 left-4 sm:left-auto sm:w-80 z-[70] space-y-2">
    {alerts.map(event => <div key={event.key} className="rounded-2xl border border-white/15 bg-[#222225] p-4 shadow-2xl flex items-start gap-3">
      <Bell size={18} className="text-[var(--accent)] shrink-0 mt-1" />
      <Link href="/calendario" className="flex-1 min-w-0"><p className="text-[10px] uppercase tracking-wider text-[var(--accent)]">Recordatorio</p><p className="text-sm font-medium break-words mt-1">{event.title}</p><p className="text-xs text-[var(--text-2)] mt-1">{event.allDay ? 'Todo el día' : event.occurrenceStart.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</p></Link>
      <button aria-label="Descartar recordatorio" onClick={() => setAlerts(items => items.filter(item => item.key !== event.key))}><X size={15} /></button>
    </div>)}
  </aside>
}
