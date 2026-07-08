'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn, getInitials } from '@/lib/utils'

const navItems = [
  { group: 'Principal', items: [
    { href: '/dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard' },
    { href: '/crm', label: 'CRM Pipeline', icon: 'ti-layout-kanban', badge: '24' },
    { href: '/ia', label: 'IA Comercial', icon: 'ti-brain', aiBadge: true },
  ]},
  { group: 'Ventas', items: [
    { href: '/prospeccion', label: 'Prospección', icon: 'ti-radar' },
    { href: '/propuestas', label: 'Propuestas', icon: 'ti-file-description' },
  ]},
  { group: 'Operaciones', items: [
    { href: '/proyectos', label: 'Proyectos', icon: 'ti-checklist' },
    { href: '/finanzas', label: 'Finanzas', icon: 'ti-chart-pie-2' },
    { href: '/director', label: 'Director IA', icon: 'ti-robot', aiBadge: true },
  ]},
  { group: 'Sistema', items: [
    { href: '/automatizaciones', label: 'Automatizaciones', icon: 'ti-api' },
    { href: '/metricas', label: 'Métricas', icon: 'ti-chart-bar' },
  ]},
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-[220px] min-w-[220px] bg-[var(--surface)] border-r border-[var(--border)] flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-[18px] border-b border-[var(--border)] flex items-center gap-2">
        <div className="w-7 h-7 bg-[var(--accent)] rounded-[7px] flex items-center justify-center text-[13px] font-bold text-white">AG</div>
        <div>
          <div className="text-[13px] font-semibold text-[var(--text)]">Austral Growth</div>
          <div className="text-[10px] text-[var(--text-3)] font-mono">v2.1 · OS</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
        {navItems.map(group => (
          <div key={group.group}>
            <div className="text-[10px] font-semibold text-[var(--text-3)] tracking-[0.08em] uppercase px-2 py-2 mt-2">
              {group.group}
            </div>
            {group.items.map(item => {
              const isActive = pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-[9px] px-2 py-[7px] rounded-[7px] text-[12.5px] font-normal transition-all duration-150 mb-[1px]',
                    isActive
                      ? 'bg-[rgba(99,102,241,0.15)] text-[#818CF8] font-medium'
                      : 'text-[var(--text-2)] hover:bg-[var(--surface-3)] hover:text-[var(--text)]'
                  )}
                >
                  <i className={`ti ${item.icon} text-[15px] w-4 text-center`} aria-hidden="true" />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto text-[10px] bg-[var(--accent)] text-white rounded-full px-[6px] py-[1px] font-semibold">
                      {item.badge}
                    </span>
                  )}
                  {item.aiBadge && (
                    <span className="ml-auto text-[9px] bg-[rgba(245,158,11,0.15)] text-[var(--amber)] rounded-full px-[5px] py-[1px] font-semibold border border-[rgba(245,158,11,0.2)]">
                      IA
                    </span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-[var(--border)]">
        <div className="flex items-center gap-2 px-2 py-[7px] rounded-[7px] cursor-pointer hover:bg-[var(--surface-3)]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[var(--accent)] to-[#8B5CF6] flex items-center justify-center text-[11px] font-semibold text-white">
            BM
          </div>
          <div>
            <p className="text-[12px] font-medium text-[var(--text)]">Bruno M.</p>
            <span className="text-[10px] text-[var(--text-3)]">Austral Web Studio</span>
          </div>
        </div>
      </div>
    </aside>
  )
}
