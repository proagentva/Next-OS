import { type ReactNode } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { hasTabAccess } from '../lib/utils'
import { ThemeToggle } from './ThemeToggle'
import { Avatar } from './Avatar'
import { LayoutDashboard, TrendingUp, TrendingDown, Megaphone, CalendarDays, FileText, Settings, LogOut, User, Users, Handshake, ClipboardList, Kanban, ChevronLeft, ChevronRight, CalendarRange, Clock, GraduationCap, ScrollText } from 'lucide-react'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
  year: number
  onYearChange: (year: number) => void
}

// Pages whose data is scoped to a single calendar year.
const YEAR_SCOPED_PAGES = new Set(['dashboard', 'acquisition', 'disposition', 'marketing', 'quarterly', 'reports', 'settings', 'attendance'])

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'acquisition', label: 'Acquisition', icon: TrendingUp },
  { id: 'disposition', label: 'Disposition', icon: TrendingDown },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'quarterly', label: 'Quarterly View', icon: CalendarDays },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'deals', label: 'Deal Sheet', icon: Handshake },
  { id: 'deal_roster', label: 'Daily Deals', icon: ClipboardList },
  { id: 'kanban', label: 'Task Manager', icon: Kanban },
  { id: 'calendar', label: 'Calendar', icon: CalendarRange },
  { id: 'attendance', label: 'Attendance', icon: Clock },
  { id: 'training', label: 'Training', icon: GraduationCap },
  { id: 'scripts', label: 'Scripts', icon: ScrollText },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'profile', label: 'Profile', icon: User },
]

export function Sidebar({ currentPage, onNavigate, year, onYearChange }: SidebarProps) {
  const { profile, signOut } = useAuth()
  const { currentMembership } = useOrganization()

  const visibleItems = NAV_ITEMS.filter(item => item.id === 'profile' || hasTabAccess(currentMembership, item.id))

  return (
    <div className="w-60 h-screen bg-white dark:bg-ink-900 border-r border-ink-200 dark:border-ink-800 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-ink-200 dark:border-ink-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-ink-900 dark:bg-ink-700 flex items-center justify-center">
            <span className="text-white font-bold text-sm">N</span>
          </div>
          <span className="font-bold text-ink-900 dark:text-ink-50">NextOS</span>
        </div>
      </div>

      {/* Year selector — only relevant for year-scoped pages */}
      {YEAR_SCOPED_PAGES.has(currentPage) && (
        <div className="px-5 py-3 border-b border-ink-200 dark:border-ink-800 flex items-center justify-between">
          <button
            onClick={() => onYearChange(year - 1)}
            className="p-1 rounded text-ink-400 dark:text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-700 dark:hover:text-ink-200"
            title="Previous year"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-semibold text-ink-700 dark:text-ink-300">{year}</span>
          <button
            onClick={() => onYearChange(year + 1)}
            className="p-1 rounded text-ink-400 dark:text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-700 dark:hover:text-ink-200"
            title="Next year"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {visibleItems.map(item => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-ink-900 dark:bg-ink-700 text-white'
                  : 'text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* User card pinned to bottom */}
      <div className="border-t border-ink-200 dark:border-ink-800 p-3">
        <div className="flex items-center gap-3 px-2 py-2">
          <Avatar url={profile?.avatar_url} name={profile?.display_name || profile?.email || 'U'} size={9} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-ink-900 dark:text-ink-50 truncate">
              {profile?.display_name || 'User'}
            </p>
            <p className="text-xs text-ink-400 dark:text-ink-500 truncate">
              {profile?.email || ''}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <button
              onClick={signOut}
              className="p-2 rounded-lg text-ink-400 dark:text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 hover:text-ink-700 dark:hover:text-ink-200 transition-all"
              title="Sign out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Layout({ children, currentPage, onNavigate, year, onYearChange }: { children: ReactNode; currentPage: string; onNavigate: (p: string) => void; year: number; onYearChange: (y: number) => void }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} year={year} onYearChange={onYearChange} />
      <main className="flex-1 overflow-y-auto bg-ink-50 dark:bg-ink-950">
        {children}
      </main>
    </div>
  )
}
