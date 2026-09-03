import { type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { LayoutDashboard, TrendingUp, TrendingDown, Megaphone, CalendarDays, FileText, Settings, LogOut, User } from 'lucide-react'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'acquisition', label: 'Acquisition', icon: TrendingUp },
  { id: 'disposition', label: 'Disposition', icon: TrendingDown },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'quarterly', label: 'Quarterly View', icon: CalendarDays },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'profile', label: 'Profile', icon: User },
]

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const initials = (profile?.display_name || profile?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="w-60 h-screen bg-white border-r border-ink-200 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-ink-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ink-900 flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-bold text-ink-900">NextOS</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-ink-900 text-white'
                  : 'text-ink-600 hover:bg-ink-100'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User card pinned to bottom */}
      <div className="border-t border-ink-200 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-ink-900 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900 truncate">
              {profile?.display_name || 'User'}
            </p>
            <p className="text-xs text-ink-400 truncate">
              {profile?.email || ''}
            </p>
          </div>
          <button
            onClick={signOut}
            className="p-2 rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-700 transition-all"
            title="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function Layout({ children, currentPage, onNavigate }: { children: ReactNode; currentPage: string; onNavigate: (p: string) => void }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="flex-1 overflow-y-auto bg-ink-50">
        {children}
      </main>
    </div>
  )
}
