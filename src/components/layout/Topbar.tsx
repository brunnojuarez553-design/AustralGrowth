'use client'

import { useSidebar } from './SidebarContext'
import { Menu } from 'lucide-react'
import { WorkspaceTabs } from './Sidebar'

interface TopbarProps {
  title: string
  subtitle: string
  primaryAction?: { label: string; onClick: () => void }
}

export function Topbar({ title, subtitle, primaryAction }: TopbarProps) {
  const { isOpen, toggle, openSearch } = useSidebar()

  return (
    <header className="growth-topbar h-[64px] border-b border-white/[.055] flex items-center px-3 md:px-7 gap-2 md:gap-4 bg-[#0b0b0d]/72 backdrop-blur-2xl flex-shrink-0 sticky top-0 z-30">
      <button
        onClick={toggle}
        className="md:hidden p-1.5 -ml-1 rounded-[6px] text-[var(--text-2)] hover:bg-[var(--surface-3)] shrink-0"
        aria-label="Abrir menú"
        aria-expanded={isOpen}
        aria-controls="growth-sidebar"
      >
        <Menu size={20} />
      </button>

      <div className="min-w-0">
        <h1 className="text-[14px] md:text-[15px] font-semibold text-[var(--text)] tracking-[-.03em] truncate">{title}</h1>
        <p className="text-[10px] md:text-[11px] text-[var(--text-3)] truncate hidden sm:block">{subtitle}</p>
      </div>

      <WorkspaceTabs />
      <div className="flex-1 lg:hidden" />

      <button onClick={openSearch} className="p-[8px] rounded-[7px] text-[var(--text-2)] border border-[var(--border-2)] hover:bg-[var(--surface-3)] transition-all shrink-0" aria-label="Buscar">
        <i className="ti ti-search text-[14px]" aria-hidden="true" />
      </button>
      <button className="p-[8px] md:px-[10px] md:py-[6px] rounded-[7px] text-[12.5px] font-medium text-[var(--text-2)] border border-[var(--border-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-all shrink-0" aria-label="Notificaciones">
        <i className="ti ti-bell text-[14px]" aria-hidden="true" />
      </button>
      {primaryAction && (
        <button
          onClick={primaryAction.onClick} aria-label={primaryAction.label}
          className="flex items-center gap-[6px] px-[11px] md:px-[17px] py-[9px] rounded-full text-[12px] font-semibold growth-primary hover:scale-[1.02] active:scale-[.98] transition-all duration-300 shrink-0 whitespace-nowrap"
        >
          <i className="ti ti-plus text-[14px]" aria-hidden="true" />
          <span className="hidden sm:inline">{primaryAction.label}</span>
        </button>
      )}
    </header>
  )
}
