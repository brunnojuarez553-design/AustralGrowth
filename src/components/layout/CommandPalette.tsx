'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { formatCurrency } from '@/lib/utils'
import { useSidebar } from './SidebarContext'

interface Lead { id: string; companyName: string; contactName?: string | null; stage: string }
interface Finance { id: string; description: string; amount: number; type: string }
interface Project { id: string; name: string; status: string }

export function CommandPalette() {
  const { searchOpen: open, closeSearch: onClose } = useSidebar()
  const router = useRouter()
  const [query, setQuery] = useState('')

  const { data: leads } = useQuery({
    queryKey: ['leads', 'for-search'],
    queryFn: async () => (await (await fetch('/api/leads')).json()).data as Lead[],
    enabled: open,
    staleTime: 30_000,
  })
  const { data: financesData } = useQuery({
    queryKey: ['finances', 'for-search'],
    queryFn: async () => (await (await fetch('/api/finances')).json()).data as { finances: Finance[] },
    enabled: open,
    staleTime: 30_000,
  })
  const { data: projects } = useQuery({
    queryKey: ['projects', 'for-search'],
    queryFn: async () => (await (await fetch('/api/projects')).json()).data as Project[],
    enabled: open,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!open) setQuery('')
  }, [open])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  const q = query.trim().toLowerCase()

  const matchedLeads = useMemo(() => {
    if (!leads || q.length < 1) return []
    return leads.filter(l => l.companyName.toLowerCase().includes(q) || l.contactName?.toLowerCase().includes(q)).slice(0, 5)
  }, [leads, q])

  const matchedFinances = useMemo(() => {
    if (!financesData?.finances || q.length < 1) return []
    return financesData.finances.filter(f => f.description.toLowerCase().includes(q)).slice(0, 5)
  }, [financesData, q])

  const matchedProjects = useMemo(() => {
    if (!projects || q.length < 1) return []
    return projects.filter(p => p.name.toLowerCase().includes(q)).slice(0, 5)
  }, [projects, q])

  const hasResults = matchedLeads.length + matchedFinances.length + matchedProjects.length > 0

  const goTo = useCallback((path: string) => {
    router.push(path)
    onClose()
  }, [router, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: 'rgba(3,3,5,.72)', backdropFilter: 'blur(20px) saturate(120%)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-[600px] rounded-[24px] overflow-hidden future-enter"
        style={{ background: 'linear-gradient(145deg,rgba(33,33,37,.98),rgba(17,17,20,.98))', border: '1px solid rgba(255,255,255,.11)', boxShadow: 'inset 0 1px rgba(255,255,255,.06),0 35px 100px rgba(0,0,0,.65)' }}
      >
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[var(--border)]">
          <i className="ti ti-search text-[16px] text-[var(--text-3)]" aria-hidden="true" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar leads, movimientos, proyectos..."
            className="flex-1 bg-transparent outline-none text-[14px] text-[var(--text)] placeholder:text-[var(--text-3)]"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded-[5px] text-[var(--text-3)] border border-[var(--border-2)]">ESC</kbd>
        </div>

        <div className="max-h-[420px] overflow-y-auto py-2">
          {q.length === 0 && (
            <div className="px-4 py-8 text-center text-[12.5px] text-[var(--text-3)]">
              Escribí para buscar en todo tu pipeline.
            </div>
          )}

          {q.length > 0 && !hasResults && (
            <div className="px-4 py-8 text-center text-[12.5px] text-[var(--text-3)]">
              Sin resultados para &quot;{query}&quot;.
            </div>
          )}

          {matchedLeads.length > 0 && (
            <div className="mb-1">
              <div className="px-4 py-1.5 text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-[0.08em]">Leads</div>
              {matchedLeads.map(l => (
                <button key={l.id} onClick={() => goTo('/crm')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--surface-3)] transition-all text-left">
                  <div className="w-7 h-7 rounded-[7px] bg-[rgba(249,115,22,0.12)] text-[#FDBA74] flex items-center justify-center shrink-0"><i className="ti ti-user text-[13px]" aria-hidden="true" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] text-[var(--text)] truncate">{l.companyName}</div>
                    {l.contactName && <div className="text-[10.5px] text-[var(--text-3)] truncate">{l.contactName}</div>}
                  </div>
                  <span className="text-[10px] text-[var(--text-3)] shrink-0">{l.stage}</span>
                </button>
              ))}
            </div>
          )}

          {matchedFinances.length > 0 && (
            <div className="mb-1">
              <div className="px-4 py-1.5 text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-[0.08em]">Finanzas</div>
              {matchedFinances.map(f => (
                <button key={f.id} onClick={() => goTo('/finanzas')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--surface-3)] transition-all text-left">
                  <div className="w-7 h-7 rounded-[7px] bg-[rgba(16,185,129,0.12)] text-[var(--green)] flex items-center justify-center shrink-0"><i className="ti ti-coin text-[13px]" aria-hidden="true" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] text-[var(--text)] truncate">{f.description}</div>
                  </div>
                  <span className="text-[11px] font-mono text-[var(--text-2)] shrink-0">{formatCurrency(f.amount)}</span>
                </button>
              ))}
            </div>
          )}

          {matchedProjects.length > 0 && (
            <div className="mb-1">
              <div className="px-4 py-1.5 text-[10px] font-semibold text-[var(--text-3)] uppercase tracking-[0.08em]">Proyectos</div>
              {matchedProjects.map(p => (
                <button key={p.id} onClick={() => goTo('/proyectos')} className="w-full flex items-center gap-3 px-4 py-2 hover:bg-[var(--surface-3)] transition-all text-left">
                  <div className="w-7 h-7 rounded-[7px] bg-[rgba(59,130,246,0.12)] text-[#93C5FD] flex items-center justify-center shrink-0"><i className="ti ti-checklist text-[13px]" aria-hidden="true" /></div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] text-[var(--text)] truncate">{p.name}</div>
                  </div>
                  <span className="text-[10px] text-[var(--text-3)] shrink-0">{p.status}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
