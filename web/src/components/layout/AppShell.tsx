import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar.tsx'
import { TopBar } from './TopBar.tsx'

/** Fixed sidebar (224px, icon rail below 1280px) + sticky top bar + a scrollable content area. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-bg">
      <Sidebar />
      <div className="flex h-dvh min-w-0 flex-1 flex-col pl-14 xl:pl-56">
        <TopBar />
        <main id="content" className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
