'use client'

import { useSidebar } from './SidebarContext'
import { Menu } from 'lucide-react'

interface TopbarProps {
  title: string
  subtitle: string
  primaryAction?: { label: string; onClick: () => void }
}

export function Topbar({ title, subtitle, primaryAction }: TopbarProps) {
  const { toggle } = useSidebar()

  return (
    <header className="h-[52px] border-b border-[var(--border)] flex items-center px-3 md:px-5 gap-2 md:gap-3 bg-[var(--surface)] flex-shrink-0 sticky top-0 z-10">
      <button
        onClick={toggle}
        className="md:hidden p-1.5 -ml-1 rounded-[6px] text-[var(--text-2)] hover:bg-[var(--surface-3)] shrink-0"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0">
        <h1 className="text-[13px] md:text-[14px] font-semibold text-[var(--text)] truncate">{title}</h1>
        <p className="text-[11px] md:text-[12px] text-[var(--text-3)] truncate hidden sm:block">{subtitle}</p>
      </div>
      <div className="flex-1" />
      <button className="hidden md:flex items-center gap-[6px] px-[14px] py-[6px] rounded-[7px] text-[12.5px] font-medium text-[var(--text-2)] border border-[var(--border-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-all">
        <i className="ti ti-search text-[14px]" aria-hidden="true" />
        Buscar
      </button>
      <button className="p-[8px] md:px-[10px] md:py-[6px] rounded-[7px] text-[12.5px] font-medium text-[var(--text-2)] border border-[var(--border-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-all shrink-0" aria-label="Notificaciones">
        <i className="ti ti-bell text-[14px]" aria-hidden="true" />
      </button>
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          className="flex items-center gap-[6px] px-[10px] md:px-[14px] py-[6px] rounded-[7px] text-[12.5px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all border border-[var(--accent-hover)] shrink-0 whitespace-nowrap"
        >
          <i className="ti ti-plus text-[14px]" aria-hidden="true" />
          <span className="hidden sm:inline">{primaryAction.label}</span>
        </button>
      )}
    </header>
  )
}
