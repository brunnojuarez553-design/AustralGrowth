'use client'

import { useState, useRef, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useDirectorAI } from '@/hooks/useAI'
import { formatCurrency } from '@/lib/utils'

export default function DirectorPage() {
  const { messages, sendMessage, isStreaming } = useDirectorAI()
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!input.trim() || isStreaming) return
    sendMessage(input.trim())
    setInput('')
  }

  return (
    <>
      <Topbar title="Director Comercial IA" subtitle="Tu socio estratégico de ventas" />
      <div className="flex-1 overflow-hidden flex gap-4 p-5">
        {/* Left: metrics + insights */}
        <div className="w-[280px] shrink-0 space-y-3 overflow-y-auto">
          <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[10.5px] text-[var(--text-3)] mb-1">Proyección mensual</div>
            <div className="text-[26px] font-bold text-[var(--green)] font-mono">$7.200</div>
            <div className="text-[11px] text-[var(--text-3)] mt-1">Si cerrás leads calientes · 72% prob.</div>
          </div>

          <div className="bg-[rgba(245,158,11,0.06)] border border-[rgba(245,158,11,0.18)] rounded-[10px] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[7px] bg-[rgba(245,158,11,0.15)] flex items-center justify-center text-[var(--amber)]">
                <i className="ti ti-robot text-[14px]" aria-hidden="true" />
              </div>
              <div className="text-[12.5px] font-semibold text-[var(--text)]">Análisis del Director</div>
            </div>
            {[
              { icon: 'ti-flame', bg: 'rgba(99,102,241,0.15)', color: '#A5B4FC', text: 'CodeCar tiene 91% de probabilidad — cerralo hoy.' },
              { icon: 'ti-alert-triangle', bg: 'rgba(239,68,68,0.15)', color: '#FCA5A5', text: 'Propuesta de JART Luxe sin respuesta 3 días.' },
              { icon: 'ti-trending-up', bg: 'rgba(16,185,129,0.15)', color: 'var(--green)', text: 'Automotriz VZ: tu rubro más rentable (74% cierre).' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-2 py-2 border-b border-[rgba(245,158,11,0.1)] last:border-0 last:pb-0">
                <div className="w-[22px] h-[22px] rounded-[5px] flex items-center justify-center text-[11px] shrink-0 mt-[1px]" style={{ background: item.bg, color: item.color }}>
                  <i className={`ti ${item.icon}`} aria-hidden="true" />
                </div>
                <p className="text-[11.5px] text-[var(--text-2)] leading-[1.5]">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[10px] p-4">
            <div className="text-[12px] font-semibold text-[var(--text)] mb-3">Acciones sugeridas hoy</div>
            <div className="space-y-2">
              {[
                { label: 'Seguir a Instaservice', priority: 'Alta', icon: 'ti-brand-whatsapp' },
                { label: 'Cerrar CodeCar', priority: 'Urgente', icon: 'ti-phone' },
                { label: 'Re-enviar propuesta JART', priority: 'Alta', icon: 'ti-mail' },
              ].map((action, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-[6px] hover:bg-[var(--surface-3)] cursor-pointer transition-all">
                  <div className="w-[26px] h-[26px] bg-[var(--surface-3)] rounded-[6px] flex items-center justify-center text-[var(--text-2)]">
                    <i className={`ti ${action.icon} text-[12px]`} aria-hidden="true" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[11.5px] text-[var(--text)]">{action.label}</div>
                    <div className="text-[10px] text-[var(--text-3)]">{action.priority}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: chat */}
        <div className="flex-1 flex flex-col bg-[var(--surface)] border border-[var(--border)] rounded-[10px] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse" />
            <span className="text-[12.5px] font-medium text-[var(--text)]">Director Comercial IA</span>
            <span className="text-[11px] text-[var(--text-3)] ml-1">· En línea</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`p-3 rounded-[8px] text-[12.5px] leading-[1.6] ${
                msg.role === 'assistant'
                  ? 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-2)] border-l-2 border-l-[var(--amber)]'
                  : 'bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] text-[var(--text)] text-right ml-8'
              }`}>
                {msg.content}
              </div>
            ))}
            {isStreaming && (
              <div className="flex gap-1 px-4">
                {[0,1,2].map(i => (
                  <div key={i} className="w-[6px] h-[6px] rounded-full bg-[var(--amber)] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="p-3 border-t border-[var(--border)] flex gap-2">
            <input
              className="flex-1 bg-[var(--surface-2)] border border-[var(--border)] rounded-[7px] px-3 py-2 text-[12.5px] text-[var(--text)] placeholder-[var(--text-3)] outline-none focus:border-[var(--accent)] transition-colors"
              placeholder="¿Cómo llego a $8.000 este mes?"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
            />
            <button
              onClick={handleSend}
              disabled={isStreaming || !input.trim()}
              className="px-3 py-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white rounded-[7px] transition-all"
              aria-label="Enviar mensaje"
            >
              <i className="ti ti-send text-[14px]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
