'use client'
import { Topbar } from '@/components/layout/Topbar'
import { useState } from 'react'

const mockLeads = [
  { name: 'CodeCar', prob: 91, color: 'var(--green)', bg: 'rgba(16,185,129,0.12)', initials: 'CC' },
  { name: 'WitcherTorque', prob: 84, color: '#FDBA74', bg: 'rgba(249,115,22,0.12)', initials: 'WT' },
  { name: 'Roco4WD', prob: 78, color: '#C4B5FD', bg: 'rgba(124,58,237,0.12)', initials: 'R4' },
  { name: 'JART Luxe', prob: 52, color: 'var(--amber)', bg: 'rgba(245,158,11,0.12)', initials: 'JL' },
  { name: 'High Perf. SLP', prob: 34, color: '#FCA5A5', bg: 'rgba(239,68,68,0.12)', initials: 'HP' },
]

export default function IAPage() {
  const [generatedMsg, setGeneratedMsg] = useState('')
  const [channel, setChannel] = useState('')

  const msgs: Record<string, string> = {
    whatsapp: 'Hola! 👋 Te escribo de Austral Web Studio. Vi que tenés una presencia digital que podría estar generando más clientes. Hacemos landing pages premium con IA integrada — trabajamos en Venezuela, México y Argentina. ¿Te interesa ver casos reales?',
    email: 'Asunto: Tu sitio web podría estar generando más clientes\n\nHola,\n\nTe escribo porque trabajamos con negocios del sector automotriz en LATAM con resultados concretos. ¿Tenés 15 minutos esta semana para una demo?\n\nSaludos,\nBruno — Austral Web Studio',
    script: 'Apertura: "Hola, te llamo de Austral Web Studio. Trabajamos con negocios como el tuyo..."\nDetección: "¿Recibís consultas actualmente por redes o WhatsApp?"\nPropuesta: "Te mostraría resultados de clientes similares en menos de 10 minutos."\nCierre: "¿Te parece bien que te envíe ejemplos hoy?"',
  }

  return (
    <>
      <Topbar title="IA Comercial" subtitle="Insights en tiempo real · Generador de mensajes" />
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.18)] rounded-[10px] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-[7px] bg-[rgba(245,158,11,0.15)] flex items-center justify-center text-[var(--amber)] text-[14px]"><i className="ti ti-brain" aria-hidden="true" /></div>
                <div><div className="text-[12.5px] font-semibold text-[var(--text)]">Insights de hoy</div><div className="text-[10.5px] text-[var(--text-3)]">Basado en tu CRM completo</div></div>
              </div>
              {[
                { icon: 'ti-flame', bg: 'rgba(249,115,22,0.15)', c: '#FDBA74', text: 'Tenés 6 leads calientes. Si cerrás la mitad, superás el objetivo mensual.' },
                { icon: 'ti-clock', bg: 'rgba(245,158,11,0.15)', c: 'var(--amber)', text: 'Hace 5 días sin seguimiento a Instaservice Panama. Riesgo de perderlo.' },
                { icon: 'ti-alert-triangle', bg: 'rgba(239,68,68,0.15)', c: '#FCA5A5', text: 'JART Luxe no abrió la propuesta en 3 días. Necesita seguimiento urgente.' },
                { icon: 'ti-bulb', bg: 'rgba(16,185,129,0.15)', c: 'var(--green)', text: 'Tu mejor rubro es automotriz VZ. Hay 12 prospectos similares sin contactar.' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 py-[7px] border-b border-[rgba(245,158,11,0.1)] last:border-0 last:pb-0">
                  <div className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[11px] shrink-0 mt-[2px]" style={{ background: item.bg, color: item.c }}><i className={`ti ${item.icon}`} aria-hidden="true" /></div>
                  <p className="text-[12px] text-[var(--text-2)] leading-[1.5]">{item.text}</p>
                </div>
              ))}
            </div>
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
              <div className="text-[13px] font-semibold text-[var(--text)] mb-3">Generador de mensajes</div>
              <div className="flex gap-2 mb-3 flex-wrap">
                {[['whatsapp','ti-brand-whatsapp','WhatsApp'],['email','ti-mail','Email'],['script','ti-phone','Script llamada']].map(([k,icon,label]) => (
                  <button key={k} onClick={() => { setChannel(k); setGeneratedMsg(msgs[k]); }}
                    className={`flex items-center gap-[6px] px-3 py-[5px] rounded-[7px] text-[11.5px] font-medium border transition-all ${channel === k ? 'bg-[rgba(249,115,22,0.15)] text-[#FDBA74] border-[rgba(249,115,22,0.3)]' : 'text-[var(--text-2)] border-[var(--border-2)] hover:bg-[var(--surface-3)]'}`}>
                    <i className={`ti ${icon} text-[13px]`} aria-hidden="true" />{label}
                  </button>
                ))}
              </div>
              {generatedMsg && (
                <div className="bg-[var(--surface-2)] border border-[var(--border)] border-l-2 border-l-[var(--amber)] rounded-[7px] p-3 text-[12px] text-[var(--text-2)] leading-[1.6] whitespace-pre-wrap">
                  {generatedMsg}
                </div>
              )}
            </div>
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[13px] font-semibold text-[var(--text)] mb-4">Probabilidad de cierre</div>
            <div className="space-y-1">
              {mockLeads.map(lead => (
                <div key={lead.name} className="flex items-center gap-3 px-2 py-2 rounded-[7px] hover:bg-[var(--surface-3)] transition-all">
                  <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-semibold text-white shrink-0" style={{ background: lead.color }}>{lead.initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-medium text-[var(--text)] mb-[4px]">{lead.name}</div>
                    <div className="h-[4px] bg-[var(--surface-3)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${lead.prob}%`, background: lead.color }} />
                    </div>
                  </div>
                  <span className="font-mono text-[13px] font-semibold shrink-0" style={{ color: lead.color }}>{lead.prob}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
