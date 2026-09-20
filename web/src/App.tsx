import { Route, Routes } from 'react-router-dom'
import { ErrorBanners } from './components/ErrorBanner.tsx'
import { AppShell } from './components/layout/AppShell.tsx'
import { Page } from './components/layout/Page.tsx'
import { EmptyState } from './components/ui/EmptyState.tsx'
import DocumentsPage from './pages/DocumentsPage.tsx'
import EvalsPage from './pages/EvalsPage.tsx'
import MetricsPage from './pages/MetricsPage.tsx'
import RedTeamPage from './pages/RedTeamPage.tsx'
import TicketDetail from './pages/TicketDetail.tsx'
import TicketQueue from './pages/TicketQueue.tsx'

// Route list (Phase 9):
//   /                    TicketQueue
//   /tickets/:ticketId   TicketDetail
//   /evals               EvalsPage
//   /documents           DocumentsPage
//   /metrics             MetricsPage (Phase 11)
//   /red-team            RedTeamPage (Phase 11)
export default function App() {
  return (
    <AppShell>
      <ErrorBanners />
      <Routes>
        <Route path="/" element={<TicketQueue />} />
        <Route path="/tickets/:ticketId" element={<TicketDetail />} />
        <Route path="/evals" element={<EvalsPage />} />
        <Route path="/documents" element={<DocumentsPage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/red-team" element={<RedTeamPage />} />
        <Route
          path="*"
          element={
            <Page>
              <EmptyState title="No such page." description="Use the sidebar to get back to the ticket queue." />
            </Page>
          }
        />
      </Routes>
    </AppShell>
  )
}
