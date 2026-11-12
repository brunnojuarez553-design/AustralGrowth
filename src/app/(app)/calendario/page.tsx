'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { addDays, addMonths, addWeeks, startOfWeek, startOfMonth, endOfMonth, endOfWeek, startOfDay, format, isSameDay, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Plus, Search, CalendarDays, Check, Download } from 'lucide-react'
import { Topbar } from '@/components/layout/Topbar'
import { Modal, Input, Select, Textarea } from '@/components/ui/Modal'
import { CalendarEvent, Occurrence, occurrences, colors } from '@/lib/calendar/events'
import { mergeCalendarExport } from '@/lib/calendar/ical'
import { layoutDay } from '@/lib/calendar/layout'
import { ICloudConnect, useICloudState } from '@/components/calendar/ICloudConnect'
import './calendar.css'

type View = 'month' | 'week' | 'day' | 'agenda'
const labels: Record<View, string> = { month: 'Mes', week: 'Semana', day: 'Día', agenda: 'Agenda' }
const local = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm")
async function request(url: string, method?: string, body?: unknown) {
  const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación')
  return data
}
function blank(date: Date, hour = 9): CalendarEvent {
  const start = new Date(date); start.setHours(hour, 0, 0, 0)
  return { id: '', title: '', description: '', location: '', start: start.toISOString(), end: new Date(+start + 3600000).toISOString(), allDay: false, kind: 'EVENT', color: colors[0], completed: false, recurrence: 'NONE', repeatUntil: null, reminderMinutes: 10 }
}
export default function CalendarPage() {
  const qc = useQueryClient()
  const { data: cloud } = useICloudState()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [date, setDate] = useState(new Date())
  const [view, setView] = useState<View>('month')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('ALL')
  const [showCompleted, setShowCompleted] = useState(true)
  const [draft, setDraft] = useState<CalendarEvent | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const { data: events = [], isPending, error, refetch } = useQuery<CalendarEvent[]>({ queryKey: ['calendar'], gcTime: 0, staleTime: 0, refetchOnMount: 'always', queryFn: async () => (await request('/api/calendar')).data })
  const from = view === 'month' ? startOfWeek(startOfMonth(date), { weekStartsOn: 1 }) : view === 'week' ? startOfWeek(date, { weekStartsOn: 1 }) : startOfDay(date)
  const to = view === 'month' ? startOfDay(addDays(endOfWeek(endOfMonth(date), { weekStartsOn: 1 }), 1)) : addDays(from, view === 'week' ? 7 : view === 'agenda' ? 30 : 1)
  const visible = useMemo(() => occurrences(events.filter(e => (filter === 'ALL' || e.kind === filter) && (showCompleted || !e.completed) && `${e.title} ${e.description} ${e.location}`.toLowerCase().includes(search.toLowerCase())), from, to), [events, filter, showCompleted, search, +from, +to])
  const days = Array.from({ length: view === 'month' ? Math.round((+startOfDay(to) - +from) / 86400000) : view === 'week' ? 7 : view === 'agenda' ? 30 : 1 }, (_, i) => addDays(from, i))
  function newEvent(day: Date, hour = 9) { return { ...blank(day, hour), syncICloud: cloud?.connected ?? false } }
  function change(step: number) { setDate(view === 'month' ? addMonths(date, step) : view === 'week' ? addWeeks(date, step) : addDays(date, step * (view === 'agenda' ? 30 : 1))) }
  function onDay(e: Occurrence, day: Date) { return e.occurrenceStart < addDays(day, 1) && e.occurrenceEnd > day }
  function patch<K extends keyof CalendarEvent>(key: K, value: CalendarEvent[K]) { setDraft(d => d ? { ...d, [key]: value } : d) }
  async function save(event: CalendarEvent, close = true) {
    setBusy(true); setMessage('')
    try { await request(`/api/calendar${event.id ? '/' + event.id : ''}`, event.id ? 'PUT' : 'POST', event); await qc.invalidateQueries({ queryKey: ['calendar'] }); if (close) setDraft(null); window.dispatchEvent(new Event('icloud-calendar-changed')) }
    catch (e) { setMessage((e as Error).message) } finally { setBusy(false) }
  }
  async function remove() {
    if (!draft?.id || !window.confirm(draft.recurrence === 'NONE' ? '¿Eliminar este evento?' : '¿Eliminar toda la serie?')) return
    setBusy(true)
    try { await request(`/api/calendar/${draft.id}`, 'DELETE'); await qc.invalidateQueries({ queryKey: ['calendar'] }); setDraft(null); window.dispatchEvent(new Event('icloud-calendar-changed')) }
    catch (e) { setMessage((e as Error).message) } finally { setBusy(false) }
  }
  function drop(id: string, target: Date, hour?: number, source?: string) {
    const event = events.find(e => e.id === id)
    if (!event || event.readOnly) return
    const original = new Date(source || event.start)
    const shifted = new Date(target); shifted.setHours(hour ?? original.getHours(), original.getMinutes(), 0, 0)
    const delta = +shifted - +original
    if (event.recurrence !== 'NONE' && !window.confirm('Se moverá toda la serie. ¿Continuar?')) return
    void save({ ...event, start: new Date(+new Date(event.start) + delta).toISOString(), end: new Date(+new Date(event.end) + delta).toISOString(), repeatUntil: event.repeatUntil ? new Date(+new Date(event.repeatUntil) + delta).toISOString() : null }, false)
  }
  function eventButton(e: Occurrence, compact = false) {
    return <button key={e.key} className={`cal-event ${e.completed ? 'is-complete' : ''}`} style={{ '--event-color': e.color } as React.CSSProperties} draggable={!busy && !e.readOnly} onDragStart={ev => ev.dataTransfer.setData('text/plain', JSON.stringify({ id: e.id, start: e.occurrenceStart.toISOString() }))} onClick={() => { setMessage(''); setDraft(events.find(item => item.id === e.id) || null) }} title={`${e.title} · ${e.allDay ? 'Todo el día' : format(e.occurrenceStart, 'HH:mm')}`}>
      <span>{e.kind === 'TASK' ? (e.completed ? '✓' : '□') : '•'}</span><span className="truncate">{!e.allDay && !compact && <b>{format(e.occurrenceStart, 'HH:mm')} </b>}{e.title}</span>{e.icloud && <span className="ml-auto" title="Vinculado a iCloud">☁</span>}{e.recurrence !== 'NONE' && <span className="ml-auto">↻</span>}
    </button>
  }
  function droppable(day: Date, hour?: number) {
    return { onDragOver: (e: React.DragEvent) => e.preventDefault(), onDrop: (e: React.DragEvent) => { e.preventDefault(); try { const data = JSON.parse(e.dataTransfer.getData('text/plain')); drop(data.id, day, hour, data.start) } catch { /* Ignore unrelated dragged content. */ } } }
  }
  function exportCalendar() {
    const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
    const stamp = (s: string) => new Date(s).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//AustralGrowth//Calendario//ES', ...events.filter(e => !e.icloudData).flatMap(e => ['BEGIN:VEVENT', `UID:${e.id}@australgrowth`, `DTSTAMP:${stamp(new Date().toISOString())}`, e.allDay ? `DTSTART;VALUE=DATE:${format(new Date(e.start), 'yyyyMMdd')}` : `DTSTART:${stamp(e.start)}`, e.allDay ? `DTEND;VALUE=DATE:${format(new Date(e.end), 'yyyyMMdd')}` : `DTEND:${stamp(e.end)}`, `SUMMARY:${escape(e.title)}`, `DESCRIPTION:${escape(e.description)}`, `LOCATION:${escape(e.location)}`, ...(e.recurrence === 'NONE' ? [] : [`RRULE:FREQ=${e.recurrence}${e.repeatUntil ? ';UNTIL=' + stamp(e.repeatUntil) : ''}`]), ...(e.reminderMinutes === null ? [] : ['BEGIN:VALARM', `TRIGGER:-PT${e.reminderMinutes}M`, 'ACTION:DISPLAY', `DESCRIPTION:${escape(e.title)}`, 'END:VALARM']), 'END:VEVENT']), 'END:VCALENDAR']
    const blob = new Blob([mergeCalendarExport(lines.join('\r\n') + '\r\n', events.flatMap(e => e.icloudData ? [e.icloudData] : []))], { type: 'text/calendar;charset=utf-8' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'australgrowth-calendario.ics'; a.click(); URL.revokeObjectURL(url)
  }
  const todayTasks = occurrences(events.filter(e => !e.completed), startOfDay(new Date()), addDays(startOfDay(new Date()), 1))
  if (!mounted) return <div role="status" className="p-6 text-sm text-[var(--text-2)]">Cargando calendario…</div>
  return <div className="flex flex-col h-screen min-w-0">
    <Topbar title="Calendario" subtitle="Tu tiempo, tus prioridades, tu agencia." primaryAction={{ label: 'Crear evento', onClick: () => { setMessage(''); setDraft(newEvent(date)) } }} />
    <main className="calendar-page flex-1 overflow-y-auto p-3 md:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] uppercase tracking-[.2em] text-[var(--accent)] mb-2">Organizá tu día</p><h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Espacio para lo importante.</h2><p className="text-xs text-[var(--text-2)] mt-2">{todayTasks.length ? `${todayTasks.length} actividades pendientes para hoy.` : 'Tu agenda de hoy está despejada.'}</p></div><button className="cal-control" onClick={exportCalendar}><Download size={14} /> Exportar .ics</button></div>
      <ICloudConnect />
      <div className="cal-toolbar"><div className="flex items-center gap-2"><button className="cal-control" onClick={() => setDate(new Date())}>Hoy</button><button className="cal-icon" aria-label="Período anterior" onClick={() => change(-1)}><ChevronLeft size={18} /></button><button className="cal-icon" aria-label="Período siguiente" onClick={() => change(1)}><ChevronRight size={18} /></button><h3 className="text-base font-semibold capitalize ml-1">{format(date, view === 'day' ? 'd MMMM yyyy' : 'MMMM yyyy', { locale: es })}</h3></div><div className="cal-views">{(Object.keys(labels) as View[]).map(v => <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>{labels[v]}</button>)}</div></div>
      <div className="flex flex-wrap items-center gap-3 mb-4"><label className="cal-search"><Search size={15} /><input aria-label="Buscar en el calendario" placeholder="Buscar en tu calendario…" value={search} onChange={e => setSearch(e.target.value)} /></label><select className="cal-control" aria-label="Filtrar actividades" value={filter} onChange={e => setFilter(e.target.value)}><option value="ALL">Todas las actividades</option><option value="EVENT">Eventos</option><option value="TASK">Tareas</option></select><label className="text-xs text-[var(--text-2)] flex items-center gap-2"><input type="checkbox" checked={showCompleted} onChange={e => setShowCompleted(e.target.checked)} /> Mostrar completadas</label></div>
      {(message || error) && <div role="alert" className="cal-error">{message || error?.message}{error && <button onClick={() => refetch()} className="underline ml-3">Reintentar</button>}</div>}
      {isPending ? <div role="status" className="cal-empty">Cargando tu calendario…</div> : error ? null : <>
        {view === 'month' && <div className="cal-month"><div className="cal-weekdays">{['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => <span key={d}>{d}</span>)}</div><div className="cal-month-grid">{days.map(day => { const items = visible.filter(e => onDay(e, day)); return <div key={+day} className={`cal-day ${!isSameMonth(day, date) ? 'cal-muted' : ''}`} {...droppable(day)}><button className={`cal-date ${isSameDay(day, new Date()) ? 'cal-today' : ''}`} onClick={() => { setDate(day); setView('day') }} aria-label={format(day, 'EEEE d MMMM', { locale: es })}>{format(day, 'd')}</button><button className="cal-add" aria-label={`Crear evento el ${format(day, 'd MMMM', { locale: es })}`} onClick={() => { setMessage(''); setDraft(newEvent(day)) }}><Plus size={13} /></button><div className="space-y-1">{items.slice(0, 3).map(e => eventButton(e))}{items.length > 3 && <button className="text-[10px] text-[var(--text-2)] pl-1" onClick={() => { setDate(day); setView('day') }}>+{items.length - 3} más</button>}</div></div> })}</div></div>}
        {(view === 'week' || view === 'day') && <div className="cal-time-scroll"><div className="cal-time-grid" style={{ minWidth: view === 'week' ? 760 : 300, gridTemplateColumns: `52px repeat(${days.length}, minmax(0, 1fr))` }}><div className="cal-time-head text-[9px]">Hora local</div>{days.map(day => <button key={+day} className={`cal-time-head ${isSameDay(day, new Date()) ? 'text-[var(--accent)]' : ''}`} onClick={() => { setDate(day); setView('day') }}>{format(day, 'EEE d', { locale: es })}</button>)}<div className="cal-time-label">Todo el día</div>{days.map(day => <div key={+day} className="cal-all-day" {...droppable(day)}>{visible.filter(e => e.allDay && onDay(e, day)).map(e => eventButton(e, true))}<button className="text-[10px] text-[var(--text-3)]" onClick={() => setDraft({ ...newEvent(day), allDay: true, start: startOfDay(day).toISOString(), end: addDays(startOfDay(day), 1).toISOString() })}>+ Agregar</button></div>)}
        {Array.from({ length: 24 }, (_, hour) => <div key={hour} className="contents"><div className="cal-time-label">{`${hour}`.padStart(2, '0')}:00</div>{days.map(day => { const slot = new Date(day); slot.setHours(hour); const items = visible.filter(e => !e.allDay && ((e.occurrenceStart >= slot && e.occurrenceStart < new Date(+slot + 3600000)) || (hour === 0 && e.occurrenceStart < day && e.occurrenceEnd > day))); return <div className="cal-slot" key={+day} {...droppable(day, hour)}><button className="cal-slot-add" aria-label={`Crear el ${format(slot, 'd MMM HH:mm', { locale: es })}`} onClick={() => setDraft(newEvent(slot, hour))} />{items.map(e => {
                  const { lane, lanes } = layoutDay(visible, day).get(e.key)!
                  const start = new Date(Math.max(+e.occurrenceStart, +day))
                  const end = new Date(Math.min(+e.occurrenceEnd, +addDays(day, 1)))
                  const minutes = (end.getHours() || (isSameDay(end, day) ? 0 : 24)) * 60 + end.getMinutes() - start.getHours() * 60 - start.getMinutes()
                  return <div className="cal-positioned-event" key={e.key} style={{ top: `${start.getMinutes() / 60 * 64}px`, height: `${Math.max(24, minutes / 60 * 64 - 2)}px`, left: `calc(${lane / lanes * 100}% + 2px)`, width: `calc(${100 / lanes}% - 4px)` }}>{eventButton(e)}</div>
                })}</div> })}</div>)}
        </div></div>}
        {view === 'agenda' && <div className="cal-agenda">{!visible.length ? <div className="cal-empty"><CalendarDays size={30} /><p>Sin actividades en los próximos 30 días.</p><button className="cal-control" onClick={() => setDraft(newEvent(date))}>Crear mi primera actividad</button></div> : days.map(day => { const items = visible.filter(e => onDay(e, day)); return items.length ? <div className="cal-agenda-day" key={+day}><div className="text-sm capitalize"><strong>{format(day, 'd MMM', { locale: es })}</strong><p className="text-xs text-[var(--text-3)]">{format(day, 'EEEE', { locale: es })}</p></div><div className="space-y-2">{items.map(e => <div key={e.key} className="flex gap-2 items-center">{e.kind === 'TASK' && <button className="cal-icon" disabled={busy || e.readOnly} aria-label={e.completed ? 'Marcar pendiente' : 'Completar tarea'} onClick={() => save({ ...events.find(item => item.id === e.id)!, completed: !e.completed }, false)}>{e.completed ? <Check size={16} /> : '□'}</button>}<div className="flex-1">{eventButton(e)}<p className="text-[10px] text-[var(--text-3)] mt-1">{e.allDay ? 'Todo el día' : `${format(e.occurrenceStart, 'HH:mm')} – ${format(e.occurrenceEnd, 'HH:mm')}`}{e.location && ` · ${e.location}`}</p></div></div>)}</div></div> : null })}</div>}
      </>}
      <p className="text-[10px] text-[var(--text-3)] mt-4">Horarios en {Intl.DateTimeFormat().resolvedOptions().timeZone}. Arrastrá una actividad para cambiarla de fecha. Los cambios en actividades recurrentes afectan toda la serie.</p>
    </main>
    <Modal open={!!draft} onClose={() => { if (!busy) setDraft(null) }} title={draft?.id ? 'Editar actividad' : 'Nueva actividad'} subtitle="Dale un lugar a tu próxima prioridad.">
      {draft && <form role="dialog" aria-modal="true" aria-label={draft.id ? 'Editar actividad' : 'Nueva actividad'} onKeyDown={e => {
        if (e.key !== 'Tab') return
        const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled)'))
        const first = controls[0], last = controls[controls.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus() }
        if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus() }
      }} className="space-y-4" onSubmit={e => { e.preventDefault(); void save(draft) }}>
        {draft.readOnly && <p className="text-xs text-sky-200 rounded-xl bg-sky-400/10 p-3">Este evento tiene invitados o reglas avanzadas. Se actualiza desde iCloud; editalo desde tu iPhone.</p>}
        <fieldset disabled={busy || draft.readOnly} className="space-y-4 disabled:opacity-60">
        <label className="cal-field">Título<Input autoFocus required maxLength={200} placeholder="Ej. Reunión con Valentino Motors" value={draft.title} onChange={e => patch('title', e.target.value)} /></label>
        <div className="grid grid-cols-2 gap-3"><label className="cal-field">Tipo<Select disabled={draft.icloud} value={draft.kind} onChange={e => patch('kind', e.target.value as CalendarEvent['kind'])}><option value="EVENT">Evento</option><option value="TASK">Tarea</option></Select></label><label className="cal-field">Repetición<Select value={draft.recurrence} onChange={e => patch('recurrence', e.target.value as CalendarEvent['recurrence'])}><option value="NONE">No se repite</option><option value="DAILY">Todos los días</option><option value="WEEKLY">Cada semana</option><option value="MONTHLY">Cada mes</option></Select></label></div>
        <label className="text-xs flex gap-2"><input type="checkbox" checked={draft.allDay} onChange={e => { const allDay = e.target.checked; setDraft({ ...draft, allDay, start: (allDay ? startOfDay(new Date(draft.start)) : new Date(draft.start)).toISOString(), end: (allDay ? new Date(Math.max(+addDays(startOfDay(new Date(draft.start)), 1), +startOfDay(new Date(draft.end)) + (format(new Date(draft.end), 'HH:mm:ss') === '00:00:00' ? 0 : 86400000))) : new Date(draft.end)).toISOString() }) }} />Todo el día</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{(['start', 'end'] as const).map(key => <label className="cal-field" key={key}>{key === 'start' ? 'Inicio' : draft.allDay ? 'Fin (fecha no incluida)' : 'Fin'}<Input required type={draft.allDay ? 'date' : 'datetime-local'} value={draft.allDay ? format(new Date(draft[key]), 'yyyy-MM-dd') : local(new Date(draft[key]))} onChange={e => { if (e.target.value) { const d = new Date(e.target.value + (draft.allDay ? 'T00:00:00' : '')); if (!isNaN(+d)) patch(key, d.toISOString()) } }} /></label>)}</div>
        {draft.recurrence !== 'NONE' && <><label className="cal-field">Repetir hasta (opcional)<Input type="date" value={draft.repeatUntil ? format(new Date(draft.repeatUntil), 'yyyy-MM-dd') : ''} onChange={e => patch('repeatUntil', e.target.value ? new Date(e.target.value + 'T23:59:59').toISOString() : null)} /></label><p className="text-xs text-[var(--text-2)]">Estás editando toda la serie. Completar una tarea recurrente completa toda la serie.</p></>}
        <label className="cal-field">Ubicación o enlace de reunión<Input value={draft.location} maxLength={500} onChange={e => patch('location', e.target.value)} placeholder="Oficina, Google Meet, Zoom…" /></label>
        <label className="cal-field">Notas<Textarea rows={3} value={draft.description} maxLength={10000} onChange={e => patch('description', e.target.value)} placeholder="Lo que necesitás tener a mano." /></label>
        <div className="flex flex-wrap gap-4 items-end"><fieldset><legend className="text-xs text-[var(--text-2)] mb-2">Color</legend><div className="flex gap-2">{colors.map(color => <button type="button" key={color} aria-label={`Color ${color}`} aria-pressed={draft.color === color} onClick={() => patch('color', color)} className="cal-color" style={{ background: color, outline: draft.color === color ? '2px solid white' : undefined }} />)}</div></fieldset><label className="cal-field flex-1">Recordatorio<Select value={draft.reminderMinutes ?? ''} onChange={e => patch('reminderMinutes', e.target.value === '' ? null : Number(e.target.value))}><option value="">Sin aviso</option><option value="0">Al comenzar</option><option value="5">5 minutos antes</option><option value="10">10 minutos antes</option><option value="30">30 minutos antes</option><option value="60">1 hora antes</option><option value="1440">1 día antes</option></Select></label></div>
        <p className="text-[10px] text-[var(--text-3)]">Los recordatorios aparecen mientras AustralGrowth esté abierto.</p>
        {draft.kind === 'TASK' && <label className="text-xs flex gap-2"><input type="checkbox" checked={draft.completed} onChange={e => patch('completed', e.target.checked)} />Tarea completada</label>}
        {(cloud?.connected || draft.icloud) && draft.kind === 'EVENT' && <label className="text-xs flex items-start gap-2 text-[var(--text-2)]"><input type="checkbox" checked={!!draft.syncICloud || !!draft.icloud} disabled={draft.icloud} onChange={e => patch('syncICloud', e.target.checked)} /><span>{draft.icloud ? 'Vinculado a iCloud. Los cambios y la eliminación se reflejan en tu iPhone.' : 'Sincronizar este evento con mi calendario de iCloud.'}</span></label>}
        </fieldset>
        {message && <p role="alert" className="cal-error">{message}</p>}
        <div className="flex gap-2 justify-end pt-3 border-t border-[var(--border)]">{draft.id && !draft.readOnly && <button type="button" disabled={busy} className="cal-control mr-auto text-red-400" onClick={remove}>Eliminar</button>}<button type="button" className="cal-control" disabled={busy} onClick={() => setDraft(null)}>Cancelar</button>{!draft.readOnly && <button className="cal-control cal-primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button>}</div>
      </form>}
    </Modal>
  </div>
}
