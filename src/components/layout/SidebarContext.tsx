'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface SidebarContextValue {
  isOpen: boolean
  toggle: () => void
  close: () => void
  searchOpen: boolean
  openSearch: () => void
  closeSearch: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar el drawer automáticamente al navegar a otra página (mobile)
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Atajo de teclado global: Cmd+K / Ctrl+K abre la búsqueda, Escape la cierra
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(v => !v)
      }
      if (e.key === 'Escape') setSearchOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <SidebarContext.Provider value={{
      isOpen, toggle: () => setIsOpen(v => !v), close: () => setIsOpen(false),
      searchOpen, openSearch: () => setSearchOpen(true), closeSearch: () => setSearchOpen(false),
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar debe usarse dentro de SidebarProvider')
  return ctx
}
