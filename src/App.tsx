import { useState, useEffect } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Sidebar, Layout } from './components/Sidebar'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Acquisition from './pages/Acquisition'
import Disposition from './pages/Disposition'
import Marketing from './pages/Marketing'
import QuarterlyView from './pages/QuarterlyView'
import Settings from './pages/Settings'
import Reports from './pages/Reports'
import Profile from './pages/Profile'

function AppContent() {
  const { user, loading } = useAuth()
  const [page, setPage] = useState('dashboard')
  const [year, setYear] = useState(new Date().getFullYear())

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink-50">
        <div className="text-ink-400">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthPage />
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
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
