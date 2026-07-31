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
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={cn('w-full rounded-[12px] max-h-[90vh] overflow-y-auto', widths[width])}
        style={{ background: 'var(--surface)', border: '1px solid var(--border-2)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b sticky top-0 z-10" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          <div>
            <h2 className="text-[14.5px] font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
            {subtitle && <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--text-3)' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-[6px] transition-all hover:bg-[var(--surface-3)]" style={{ color: 'var(--text-3)' }} aria-label="Cerrar">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
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

const inputClass = 'w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[7px] px-3 py-2 text-[12.5px] outline-none focus:border-[var(--accent)] transition-all text-[var(--text)] placeholder:text-[var(--text-3)]'

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputClass, props.className)} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputClass, props.className)} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(inputClass, 'resize-none', props.className)} />
}
