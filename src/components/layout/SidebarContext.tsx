'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

interface SidebarContextValue {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar el drawer automáticamente al navegar a otra página (mobile)
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  return (
    <SidebarContext.Provider value={{ isOpen, toggle: () => setIsOpen(v => !v), close: () => setIsOpen(false) }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('useSidebar debe usarse dentro de SidebarProvider')
  return ctx
}
