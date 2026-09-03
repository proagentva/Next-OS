import { useState } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { OrganizationProvider, useOrganization } from './contexts/OrganizationContext'
import { Sidebar, Layout } from './components/Sidebar'
import AuthPage from './pages/AuthPage'
import OrgOnboardingPage from './pages/OrgOnboardingPage'
import Dashboard from './pages/Dashboard'
import Acquisition from './pages/Acquisition'
import Disposition from './pages/Disposition'
import Marketing from './pages/Marketing'
import QuarterlyView from './pages/QuarterlyView'
import Settings from './pages/Settings'
import Reports from './pages/Reports'
import Profile from './pages/Profile'
import Team from './pages/Team'

// Capture an invite token from /invite/:token before any auth/org logic
// runs, and stash it in sessionStorage rather than relying on the URL —
// Google OAuth's redirectTo drops any path, so the token must survive
// that round trip. Runs once at module load.
;(() => {
  const match = window.location.pathname.match(/^\/invite\/([A-Za-z0-9-]+)$/)
  if (match) {
    sessionStorage.setItem('nextos_pending_invite', match[1])
    window.history.replaceState(null, '', '/')
  }
})()

function AppContent() {
  const { user, loading: authLoading } = useAuth()
  const { currentOrganization, loading: orgLoading } = useOrganization()
  const [page, setPage] = useState('dashboard')
  const [year, setYear] = useState(new Date().getFullYear())

  if (authLoading || (user && orgLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950">
        <div className="text-ink-400 dark:text-ink-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
  }

  if (!currentOrganization) {
    return <OrgOnboardingPage />
  }

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <Dashboard year={year} />
      case 'acquisition': return <Acquisition year={year} />
      case 'disposition': return <Disposition year={year} />
      case 'marketing': return <Marketing year={year} />
      case 'quarterly': return <QuarterlyView year={year} />
      case 'reports': return <Reports year={year} />
      case 'settings': return <Settings year={year} />
      case 'team': return <Team />
      case 'profile': return <Profile />
      default: return <Dashboard year={year} />
    }
  }

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {renderPage()}
    </Layout>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <OrganizationProvider>
          <AppContent />
        </OrganizationProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
