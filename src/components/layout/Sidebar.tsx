'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSidebar } from './SidebarContext'
import { X } from 'lucide-react'

const navItems = [
  { group: 'Principal', items: [
    { href: '/dashboard', label: 'Dashboard', icon: 'ti-layout-dashboard' },
    { href: '/crm', label: 'CRM Pipeline', icon: 'ti-layout-kanban' },
    { href: '/ia', label: 'IA Comercial', icon: 'ti-brain', aiBadge: true },
  ]},
  { group: 'Ventas', items: [
    { href: '/adquisicion', label: 'Acquisition OS', icon: 'ti-route', aiBadge: true },
    { href: '/prospeccion', label: 'Prospección', icon: 'ti-radar' },
    { href: '/propuestas', label: 'Propuestas', icon: 'ti-file-description' },
  ]},
  { group: 'Operaciones', items: [
    { href: '/calendario', label: 'Calendario', icon: 'ti-calendar' },
    { href: '/proyectos', label: 'Proyectos', icon: 'ti-checklist' },
    { href: '/finanzas', label: 'Finanzas', icon: 'ti-chart-pie-2' },
    { href: '/director', label: 'Director IA', icon: 'ti-robot', aiBadge: true },
  ]},
  { group: 'Sistema', items: [
    { href: '/automatizaciones', label: 'Automatizaciones', icon: 'ti-api' },
    { href: '/metricas', label: 'Métricas', icon: 'ti-chart-bar' },
  ]},
]

const workspaceTabs = ['/dashboard', '/crm', '/calendario', '/finanzas', '/metricas', '/proyectos']
const workspaceLabels = ['Resumen', 'Pipeline', 'Agenda', 'Finanzas', 'Métricas', 'Proyectos']

export function WorkspaceTabs() {
  const pathname = usePathname()
  return (
    <nav className="workspace-tabs" aria-label="Secciones principales">
      {workspaceTabs.map((href, index) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link key={href} href={href} aria-current={active ? 'page' : undefined}>
            {active && <motion.span layoutId="workspace-tab" className="workspace-tab-marker" aria-hidden="true" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
            <span>{workspaceLabels[index]}</span>
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { isOpen, close } = useSidebar()

  return (
    <>
      {/* Overlay oscuro detrás del drawer, solo en mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      <aside id="growth-sidebar"
        className={cn(
          'growth-sidebar w-[228px] min-w-[228px] border-r border-white/[.055] flex flex-col h-screen',
          'fixed md:sticky top-0 left-0 z-50 md:z-auto transition-transform duration-200',
          'md:translate-x-0',
          isOpen ? 'translate-x-0' : 'invisible -translate-x-full md:visible'
        )}
      >
        {/* Logo */}
        <div className="workspace-brand px-5 py-[20px] flex items-center gap-3">
          <div className="relative w-9 h-9 flex items-center justify-center shrink-0 rounded-xl bg-white/[.04] border border-white/[.07] p-1.5">
            <Image
              src="https://res.cloudinary.com/dgp7uhps3/image/upload/v1784260223/logo_austral_web_studio_wcitrd.png"
              alt="Austral Web Studio"
              width={36}
              height={36}
              className="relative object-contain"
              priority
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[14px] font-semibold text-white tracking-[-.025em] truncate">Austral Growth</div>
            <div className="text-[9px] text-[var(--text-3)] tracking-wide">Business OS</div>
          </div>
          <button
            onClick={close}
            className="md:hidden p-1.5 rounded-[6px] text-[var(--text-3)] hover:bg-[var(--surface-3)]"
            aria-label="Cerrar menú"
          >
            <X size={18} />
          </button>
        </div>

        {/* Studio card */}
        <div className="workspace-studio px-3 pt-1 pb-2">
          <div className="relative rounded-[18px] p-3.5 overflow-hidden border border-white/[.065]" style={{ background: 'linear-gradient(145deg,rgba(255,255,255,.055),rgba(255,255,255,.025))', boxShadow: 'inset 0 1px rgba(255,255,255,.04)' }}>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[12px] bg-[var(--accent)] flex items-center justify-center text-[var(--on-accent)] text-[15px] font-semibold shrink-0">
                A
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold text-white truncate">Austral Web Studio</div>
                <div className="flex items-center gap-1 text-[10px] text-[var(--text-3)]">
                  <i className="ti ti-map-pin text-[10px]" aria-hidden="true" />
                  Ushuaia, Argentina
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto p-2 space-y-1">
          {navItems.map(group => (
            <div key={group.group}>
              <div className="workspace-group text-[10px] font-semibold text-[var(--text-3)] tracking-wide px-2 py-2 mt-2">
                {group.group}
              </div>
              {group.items.map(item => {
                const isActive = pathname.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href} title={item.label} aria-label={item.label} aria-current={isActive ? 'page' : undefined}
                    onClick={close}
                    className={cn(
                      'relative flex items-center gap-[10px] px-3 py-[10px] rounded-[12px] text-[13px] md:text-[12px] font-normal transition-all duration-200 mb-[2px]',
                      isActive
                        ? 'bg-white/[.095] text-white font-medium border border-white/[.075] shadow-[inset_0_1px_rgba(255,255,255,.04)]'
                        : 'text-[var(--text-2)] hover:bg-white/[.045] hover:text-white border border-transparent'
                    )}
                  >
                    {isActive && <motion.span layoutId="growth-nav-indicator" className="growth-nav-indicator" aria-hidden="true" transition={{ type: 'spring', stiffness: 390, damping: 34 }} />}
                    <i className={`ti ${item.icon} text-[15px] w-4 text-center`} aria-hidden="true" />
                    <span className="workspace-link-label">{item.label}</span>
                    {item.aiBadge && (
                      <span className="workspace-link-label ml-auto text-[9px] bg-[rgba(245,158,11,0.15)] text-[var(--amber)] rounded-full px-[5px] py-[1px] font-semibold border border-[rgba(245,158,11,0.2)]">
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
        <div className="workspace-profile p-2 border-t border-[var(--border)]">
          <div className="flex items-center gap-2 px-2 py-[7px] rounded-[7px] cursor-pointer hover:bg-[var(--surface-3)]">
            <div className="w-7 h-7 rounded-full bg-[var(--surface-3)] flex items-center justify-center text-[11px] font-semibold text-[var(--accent)] shrink-0">
              BM
            </div>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-[var(--text)] truncate">Bruno M.</p>
              <span className="text-[10px] text-[var(--text-3)] truncate">Austral Web Studio</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
