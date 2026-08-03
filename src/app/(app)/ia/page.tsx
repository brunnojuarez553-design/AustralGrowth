'use client'
import { Topbar } from '@/components/layout/Topbar'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDashboard } from '@/hooks/useDashboard'
import { useGenerateMessage } from '@/hooks/useAI'

const PROB_COLOR = (p: number) => p >= 75 ? 'var(--green)' : p >= 50 ? '#FDBA74' : p >= 25 ? 'var(--amber)' : '#FCA5A5'
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '—'

const ALERT_META = {
  hot:     { icon: 'ti-flame', bg: 'rgba(249,115,22,0.15)', c: '#FDBA74' },
  stale:   { icon: 'ti-clock', bg: 'rgba(245,158,11,0.15)', c: 'var(--amber)' },
  insight: { icon: 'ti-bulb', bg: 'rgba(16,185,129,0.15)', c: 'var(--green)' },
  empty:   { icon: 'ti-info-circle', bg: 'rgba(148,163,184,0.15)', c: 'var(--text-3)' },
}

export default function IAPage() {
  const { data: m, isLoading } = useDashboard()
  const [selectedLeadId, setSelectedLeadId] = useState('')
  const [channel, setChannel] = useState<'whatsapp' | 'email' | 'call_script' | ''>('')
  const { generate, isGenerating, generatedMessage, error } = useGenerateMessage()

  const { data: leads } = useQuery({
    queryKey: ['leads', 'for-ia-select'],
    queryFn: async () => {
      const res = await fetch('/api/leads')
      const json = await res.json()
      return json.data as { id: string; companyName: string }[]
    },
    staleTime: 60_000,
  })

  async function handleGenerate(ch: 'whatsapp' | 'email' | 'call_script') {
    if (!selectedLeadId) return
    setChannel(ch)
    await generate(selectedLeadId, ch)
  }

  return (
    <>
      <Topbar title="IA Comercial" subtitle="Insights en tiempo real · Generador de mensajes" />
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.18)] rounded-[10px] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-[7px] bg-[rgba(245,158,11,0.15)] flex items-center justify-center text-[var(--amber)] text-[14px]"><i className="ti ti-brain" aria-hidden="true" /></div>
                <div><div className="text-[12.5px] font-semibold text-[var(--text)]">Insights de hoy</div><div className="text-[10.5px] text-[var(--text-3)]">Basado en tu CRM completo</div></div>
              </div>
              {isLoading && <div className="text-[12px] text-[var(--text-3)] py-2">Calculando...</div>}
              {(m?.alerts ?? []).map((alert, i) => {
                const meta = ALERT_META[alert.type]
                return (
                  <div key={i} className="flex items-start gap-2 py-[7px] border-b border-[rgba(245,158,11,0.1)] last:border-0 last:pb-0">
                    <div className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[11px] shrink-0 mt-[2px]" style={{ background: meta.bg, color: meta.c }}><i className={`ti ${meta.icon}`} aria-hidden="true" /></div>
                    <p className="text-[12px] text-[var(--text-2)] leading-[1.5]" dangerouslySetInnerHTML={{ __html: alert.text.replace(/\*\*(.+?)\*\*/g, '<strong class="text-[var(--text)]">$1</strong>') }} />
                  </div>
                )
              })}
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
              <div className="text-[13px] font-semibold text-[var(--text)] mb-3">Generador de mensajes</div>
              <select
                value={selectedLeadId}
                onChange={e => setSelectedLeadId(e.target.value)}
                className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[7px] px-3 py-2 text-[12.5px] text-[var(--text)] outline-none focus:border-[var(--accent)] mb-3"
              >
                <option value="">Elegí un lead...</option>
                {(leads ?? []).map(l => <option key={l.id} value={l.id}>{l.companyName}</option>)}
              </select>
              <div className="flex gap-2 mb-3 flex-wrap">
                {([['whatsapp','ti-brand-whatsapp','WhatsApp'],['email','ti-mail','Email'],['call_script','ti-phone','Script llamada']] as const).map(([k,icon,label]) => (
                  <button key={k} onClick={() => handleGenerate(k)} disabled={!selectedLeadId || isGenerating}
                    className={`flex items-center gap-[6px] px-3 py-[5px] rounded-[7px] text-[11.5px] font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed ${channel === k ? 'bg-[rgba(249,115,22,0.15)] text-[#FDBA74] border-[rgba(249,115,22,0.3)]' : 'text-[var(--text-2)] border-[var(--border-2)] hover:bg-[var(--surface-3)]'}`}>
                    <i className={`ti ${icon} text-[13px]`} aria-hidden="true" />{label}
                  </button>
                ))}
              </div>
              {!selectedLeadId && (
                <p className="text-[11px] text-[var(--text-3)]">Elegí un lead arriba para generar un mensaje personalizado con IA.</p>
              )}
              {isGenerating && (
                <div className="text-[12px] text-[var(--text-3)] py-2">Generando con IA...</div>
              )}
              {error && (
                <div className="text-[12px] rounded-[7px] px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
                  {error}
                </div>
              )}
              {generatedMessage && !isGenerating && (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] border-l-2 border-l-[var(--amber)] rounded-[7px] p-3 text-[12px] text-[var(--text-2)] leading-[1.6] whitespace-pre-wrap">
                  {generatedMessage}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Probabilidad de cierre</div>
            <div className="space-y-1">
              {isLoading && <div className="text-[12px] text-[var(--text-3)] py-2">Cargando...</div>}
              {!isLoading && (m?.topLeads ?? []).length === 0 && (
                <div className="text-[12px] text-[var(--text-3)] py-4 text-center">Todavía no hay leads con probabilidad de cierre cargada.</div>
              )}
              {(m?.topLeads ?? []).map(lead => {
                const color = PROB_COLOR(lead.probability)
                return (
                  <div key={lead.companyName} className="flex items-center gap-3 px-2 py-2 rounded-[7px] hover:bg-[var(--surface-3)] transition-all">
                    <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0" style={{ background: color }}>{initials(lead.companyName)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-medium text-[var(--text)] mb-[4px] truncate">{lead.companyName}</div>
                      <div className="h-[4px] bg-[var(--surface-3)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${lead.probability}%`, background: color }} />
                      </div>
                    </div>
                    <span className="font-mono text-[13px] font-semibold shrink-0" style={{ color }}>{lead.probability}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
