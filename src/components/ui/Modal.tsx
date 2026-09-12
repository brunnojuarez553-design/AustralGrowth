'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: React.ReactNode
  width?: 'sm' | 'md' | 'lg'
}

export function Modal({ open, onClose, title, subtitle, children, width = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-[420px]', md: 'max-w-[560px]', lg: 'max-w-[760px]' }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(3,3,5,0.72)', backdropFilter: 'blur(18px) saturate(120%)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={cn('w-full rounded-[26px] max-h-[90vh] overflow-y-auto future-enter', widths[width])}
        style={{ background: 'linear-gradient(145deg,rgba(34,34,38,.98),rgba(18,18,21,.98))', border: '1px solid rgba(255,255,255,.11)', boxShadow: 'inset 0 1px rgba(255,255,255,.06),0 35px 100px rgba(0,0,0,.65)' }}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b sticky top-0 z-10 backdrop-blur-2xl" style={{ borderColor: 'var(--border)', background: 'rgba(26,26,29,.88)' }}>
          <div>
            <h2 className="text-[14.5px] font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
            {subtitle && <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-3)' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-white/[.045] border border-white/[.06] transition-all hover:bg-white/[.1]" style={{ color: 'var(--text-3)' }} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>{label}</label>
      {children}
    </div>
  )
}

const inputClass = 'w-full bg-black/20 border border-white/[.085] rounded-[13px] px-3.5 py-2.5 text-[12.5px] outline-none focus:border-cyan-300/30 focus:ring-4 focus:ring-cyan-300/[.035] transition-all text-[var(--text)] placeholder:text-[var(--text-3)]'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, props.className)} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, 'resize-none', props.className)} />
}
