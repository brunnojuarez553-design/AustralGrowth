'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Cloud, RefreshCw, Link2, CheckCircle2 } from 'lucide-react'
import { Modal, Input, Select } from '@/components/ui/Modal'

type CloudState = { configured: boolean; connected: boolean; setupRequired?: boolean; pendingSelection?: boolean; email?: string; calendarUrl?: string; calendarName?: string; calendars?: { url: string; name: string }[]; lastSyncAt?: string; lastError?: string; syncing?: boolean; timeZone?: string }
async function call(method: string, body?: unknown, suffix = '') {
  const response = await fetch('/api/calendar/icloud' + suffix, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'No se pudo conectar con iCloud.')
  return data
}
export function useICloudState() {
  return useQuery<CloudState>({ queryKey: ['icloud-connection'], queryFn: () => call('GET'), staleTime: 15000, gcTime: 0, retry: false })
}
export function ICloudConnect() {
  const qc = useQueryClient(), { data: state, error: stateError } = useICloudState()
  const [open, setOpen] = useState(false), [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [selected, setSelected] = useState(''), [zone, setZone] = useState('America/Argentina/Buenos_Aires')
  const [includeExisting, setIncludeExisting] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const syncing = useRef(false)
  useEffect(() => { setZone(Intl.DateTimeFormat().resolvedOptions().timeZone) }, [])
  const sync = useCallback(async () => {
    if (syncing.current) return
    syncing.current = true; setBusy(true); setMessage('')
    try {
      const result = await call('POST', undefined, '/sync')
      if (result.conflicts) setMessage('Se conservaron cambios simultáneos como copias locales. Revisá tu calendario.')
      else if (result.pending) setMessage('La sincronización sigue pendiente. Se reintentará automáticamente.')
      await Promise.all([qc.invalidateQueries({ queryKey: ['calendar'] }), qc.invalidateQueries({ queryKey: ['icloud-connection'] })])
    } catch (error) { setMessage((error as Error).message) }
    finally { syncing.current = false; setBusy(false) }
  }, [qc])
  useEffect(() => {
    if (!state?.connected) return
    void sync()
    const timer = setInterval(() => { if (document.visibilityState === 'visible') void sync() }, 60000)
    const focus = () => { if (document.visibilityState === 'visible') void sync() }
    const changed = () => { void sync() }
    document.addEventListener('visibilitychange', focus); window.addEventListener('icloud-calendar-changed', changed)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', focus); window.removeEventListener('icloud-calendar-changed', changed) }
  }, [state?.connected, sync])
  function close() { if (!busy) { setPassword(''); setMessage(''); setOpen(false) } }
  async function connect(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    try { const result = await call('POST', { email, password }); setPassword(''); setSelected(state?.calendarUrl || result.calendars[0]?.url || ''); await qc.invalidateQueries({ queryKey: ['icloud-connection'] }) }
    catch (error) { setPassword(''); setMessage((error as Error).message) }
    finally { setBusy(false) }
  }
  async function activate(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setMessage('')
    try { await call('PATCH', { calendarUrl: selected || state?.calendarUrl || state?.calendars?.[0]?.url, timeZone: zone, includeExisting }); await qc.invalidateQueries({ queryKey: ['icloud-connection'] }); setOpen(false) }
    catch (error) { setMessage((error as Error).message) } finally { setBusy(false) }
  }
  async function disconnect() {
    if (!window.confirm('¿Detener la sincronización con iCloud? No se borran eventos en ninguno de los dos calendarios. Para reanudarla, reconectá la misma cuenta y calendario.')) return
    setBusy(true); setMessage('')
    try { await call('DELETE'); setPassword(''); await qc.invalidateQueries({ queryKey: ['icloud-connection'] }); setOpen(false) }
    catch (error) { setMessage((error as Error).message) } finally { setBusy(false) }
  }
  return <>
    <section className="mb-5 rounded-2xl border border-white/[.08] bg-white/[.025] p-4" aria-label="Conexión con Calendario de iPhone">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-sky-400/10 p-2.5 text-sky-300"><Cloud size={19} /></div><div><h3 className="text-xs font-medium">Calendario de iPhone · iCloud</h3><p className="text-[10px] text-[var(--text-2)] mt-1">{state?.connected ? `${state.calendarName} · ${state.lastSyncAt ? 'Actualizado ' + new Date(state.lastSyncAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'Primera sincronización pendiente'}` : 'Conectá tu cuenta y mantené tus eventos actualizados.'}</p></div></div><div className="flex items-center gap-2">{state?.connected && <button className="cal-control" disabled={busy || state.syncing} onClick={() => void sync()}><RefreshCw size={14} className={busy ? 'animate-spin' : ''} />{busy ? 'Sincronizando…' : 'Sincronizar'}</button>}<button className="cal-control" onClick={() => { setEmail(state?.email || ''); setSelected(state?.calendarUrl || state?.calendars?.[0]?.url || ''); setMessage(''); setOpen(true) }}><Link2 size={14} />{state?.connected ? 'Administrar' : 'Conectar iCloud'}</button></div></div>
      {(message || state?.lastError || stateError) && <p role="status" className="mt-3 text-xs text-amber-300">{state?.lastError || message || 'No se pudo comprobar la conexión. Volvé a intentar.'}</p>}
      {state?.connected && <p className="mt-3 text-[10px] text-[var(--text-3)]">Se sincroniza al abrir esta sección, cada minuto mientras esté visible y después de tus cambios. Con la plataforma cerrada, hay una actualización diaria. Las tareas permanecen en AustralGrowth.</p>}
    </section>
    <Modal open={open} onClose={close} title="Conectar Calendario de iPhone" subtitle="Sincronización directa con el calendario de tu cuenta de iCloud.">
      {state?.connected ? <div className="space-y-4"><div className="flex items-center gap-2 text-emerald-300"><CheckCircle2 size={18} /><p className="text-sm">iCloud conectado</p></div><p className="text-xs text-[var(--text-2)]">{state.email}<br />Calendario: {state.calendarName}<br />Zona horaria: {state.timeZone}</p><p className="text-xs text-[var(--text-2)]">Los eventos nuevos de tipo Evento se envían al calendario elegido. Podés desmarcar esa opción al crearlos. Los cambios y eliminaciones de eventos vinculados se reflejan en ambos lados.</p><button className="cal-control text-red-300" disabled={busy} onClick={() => void disconnect()}>Desconectar iCloud</button></div>
      : !state?.configured ? <div className="space-y-3"><p className="text-sm">Falta activar la integración en el servidor.</p><p className="text-xs text-[var(--text-2)]">Tu calendario local sigue funcionando. Una vez habilitada la conexión, podrás autorizar tu cuenta desde acá.</p></div>
      : state.pendingSelection ? <form onSubmit={activate} className="space-y-4"><label className="cal-field">Elegí tu calendario<Select required value={selected || state.calendarUrl || state.calendars?.[0]?.url || ''} onChange={e => setSelected(e.target.value)}>{state.calendars?.map(calendar => <option value={calendar.url} key={calendar.url}>{calendar.name}</option>)}</Select></label><label className="cal-field">Zona horaria<Input required value={zone} onChange={e => setZone(e.target.value)} placeholder="America/Argentina/Buenos_Aires" /></label><label className="flex items-start gap-2 text-xs text-[var(--text-2)]"><input type="checkbox" checked={includeExisting} onChange={e => setIncludeExisting(e.target.checked)} /><span>Enviar también mis eventos actuales de AustralGrowth a este calendario. Las tareas no se envían.</span></label><p className="text-[11px] text-[var(--text-2)]">Se leerán los eventos del calendario seleccionado. Las invitaciones y repeticiones avanzadas se mostrarán en modo lectura para conservar sus detalles.</p><button className="cal-control cal-primary" disabled={busy}>{busy ? 'Conectando…' : 'Activar sincronización'}</button></form>
      : <form onSubmit={connect} className="space-y-4"><ol className="list-decimal pl-4 space-y-2 text-xs leading-5 text-[var(--text-2)]"><li>En tu iPhone, verificá que Calendarios esté activado en iCloud.</li><li>Abrí <a className="text-orange-300 underline" href="https://account.apple.com" target="_blank" rel="noopener noreferrer">tu cuenta de Apple</a> → Inicio de sesión y seguridad → Contraseñas específicas de apps.</li><li>Generá una contraseña para “AustralGrowth” y usala acá. Requiere autenticación de doble factor.</li></ol><label className="cal-field">Correo de tu cuenta de Apple<Input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label><label className="cal-field">Contraseña específica de aplicación<Input type="password" autoComplete="new-password" required placeholder="xxxx-xxxx-xxxx-xxxx" value={password} onChange={e => setPassword(e.target.value)} /></label><p className="text-[10px] text-[var(--text-3)]">No uses tu contraseña principal de Apple. La contraseña específica se guarda cifrada y podés revocarla desde tu cuenta de Apple.</p><button className="cal-control cal-primary" disabled={busy}>{busy ? 'Buscando calendarios…' : 'Continuar'}</button></form>}
      {message && <p role="alert" className="cal-error mt-4">{message}</p>}
    </Modal>
  </>
}
