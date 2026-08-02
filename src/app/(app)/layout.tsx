import { Sidebar } from '@/components/layout/Sidebar'
import { SidebarProvider } from '@/components/layout/SidebarContext'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden min-w-0">
          {children}
        </main>
      </div>
    </SidebarProvider>
  )
}
