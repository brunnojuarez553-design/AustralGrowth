'use client'

import { useEffect, useId } from 'react'
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
  const titleId = useId()

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
        role="dialog" aria-modal="true" aria-labelledby={titleId}
        className={cn('growth-dialog w-full rounded-[20px] max-h-[90dvh] overflow-y-auto', widths[width])}
      >
        <div className="growth-dialog-header flex items-start justify-between px-6 py-5 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)' }}>
          <div>
            <h2 id={titleId} className="text-[14.5px] font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
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

const inputClass = 'w-full bg-black/20 border border-white/[.085] rounded-[13px] px-3.5 py-2.5 text-[12.5px] outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] transition-all text-[var(--text)] placeholder:text-[var(--text-3)]'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, props.className)} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, 'resize-none', props.className)} />
}
