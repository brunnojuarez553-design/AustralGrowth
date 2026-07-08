'use client'

interface TopbarProps {
  title: string
  subtitle: string
  primaryAction?: { label: string; onClick: () => void }
}

export function Topbar({ title, subtitle, primaryAction }: TopbarProps) {
  return (
    <header className="h-[52px] border-b border-[var(--border)] flex items-center px-5 gap-3 bg-[var(--surface)] flex-shrink-0 sticky top-0 z-10">
      <div>
        <h1 className="text-[14px] font-semibold text-[var(--text)]">{title}</h1>
        <p className="text-[12px] text-[var(--text-3)]">{subtitle}</p>
      </div>
      <div className="flex-1" />
      <button className="flex items-center gap-[6px] px-[14px] py-[6px] rounded-[7px] text-[12.5px] font-medium text-[var(--text-2)] border border-[var(--border-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-all">
        <i className="ti ti-search text-[14px]" aria-hidden="true" />
        Buscar
      </button>
      <button className="flex items-center gap-[6px] px-[10px] py-[6px] rounded-[7px] text-[12.5px] font-medium text-[var(--text-2)] border border-[var(--border-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)] transition-all" aria-label="Notificaciones">
        <i className="ti ti-bell text-[14px]" aria-hidden="true" />
      </button>
      {primaryAction && (
        <button
          onClick={primaryAction.onClick}
          className="flex items-center gap-[6px] px-[14px] py-[6px] rounded-[7px] text-[12.5px] font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] transition-all border border-[var(--accent-hover)]"
        >
          <i className="ti ti-plus text-[14px]" aria-hidden="true" />
          {primaryAction.label}
        </button>
      )}
    </header>
  )
}
