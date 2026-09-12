'use client'

import { useSidebar } from './SidebarContext'
import { Menu } from 'lucide-react'

interface TopbarProps {
  title: string
  subtitle: string
  primaryAction?: { label: string; onClick: () => void }
}

export function Topbar({ title, subtitle, primaryAction }: TopbarProps) {
  const { toggle, openSearch } = useSidebar()

  return (
    <header className="h-[72px] border-b border-white/[.065] flex items-center px-3 md:px-7 gap-2 md:gap-4 bg-[#0b0b0d]/75 backdrop-blur-2xl flex-shrink-0 sticky top-0 z-30">
      <button
        onClick={toggle}
        className="md:hidden p-1.5 -ml-1 rounded-[6px] text-[var(--text-2)] hover:bg-[var(--surface-3)] shrink-0"
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0 shrink-0">
        <h1 className="text-[14px] md:text-[16px] font-semibold text-[var(--text)] tracking-[-.02em] truncate">{title}</h1>
        <p className="text-[10px] md:text-[11px] text-[var(--text-3)] truncate hidden sm:block">{subtitle}</p>
      </div>

      <div className="flex-1 hidden md:flex justify-center px-6">
        <button
          onClick={openSearch}
          className="w-full max-w-[410px] flex items-center gap-2.5 px-4 py-[10px] rounded-[13px] text-[12px] text-[var(--text-3)] bg-white/[.055] border border-white/[.075] hover:bg-white/[.08] transition-all duration-300"
        >
          <i className="ti ti-search text-[14px]" aria-hidden="true" />
          <span className="flex-1 text-left">Buscar leads, movimientos, proyectos...</span>
          <kbd className="text-[10px] px-1.5 py-[1px] rounded-[5px] border border-[var(--border-2)] text-[var(--text-3)] font-mono">⌘K</kbd>
        </button>
      </div>

      <div className="flex-1 md:hidden" />

      <button onClick={openSearch} className="md:hidden p-[8px] rounded-[7px] text-[var(--text-2)] border border-[var(--border-2)] hover:bg-[var(--surface-3)] transition-all shrink-0" aria-label="Buscar">
        <i className="ti ti-search text-[14px]" aria-hidden="true" />
      </button>
      <button className="p-[8px] md:px-[10px] md:py-[6px] rounded-[7px] text-[12.5px] font-medium text-[var(--text-2)] border border-[var(--border-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-all shrink-0" aria-label="Notificaciones">
        <i className="ti ti-bell text-[14px]" aria-hidden="true" />
      </button>
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          className="flex items-center gap-[6px] px-[11px] md:px-[17px] py-[9px] rounded-full text-[12px] font-semibold text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] hover:scale-[1.02] active:scale-[.98] transition-all duration-300 shadow-[0_6px_20px_rgba(255,122,26,.18)] shrink-0 whitespace-nowrap"
        >
          <i className="ti ti-plus text-[14px]" aria-hidden="true" />
          <span className="hidden sm:inline">{primaryAction.label}</span>
        </button>
      )}
    </header>
  )
}
