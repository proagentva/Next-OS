import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'

const US_TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern' },
  { value: 'America/Chicago', label: 'Central' },
  { value: 'America/Denver', label: 'Mountain' },
  { value: 'America/Phoenix', label: 'Arizona (no DST)' },
  { value: 'America/Los_Angeles', label: 'Pacific' },
  { value: 'America/Anchorage', label: 'Alaska' },
  { value: 'Pacific/Honolulu', label: 'Hawaii' },
]

export default function OrgOnboardingPage() {
  const { signOut } = useAuth()
  const { createOrganization, joinByCode, inviteError } = useOrganization()
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [timezone, setTimezone] = useState('America/New_York')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState<string | null>(inviteError)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'create') {
      const cleanCode = code.trim().toLowerCase()
      if (!/^[a-z0-9-]{3,20}$/.test(cleanCode)) {
        setError('Code must be 3-20 characters, lowercase letters/numbers/hyphens only')
        setLoading(false)
        return
      }
      const { error } = await createOrganization(name.trim(), cleanCode, timezone)
      if (error) setError(error)
    } else {
      const { error } = await joinByCode(joinCode.trim())
      if (error) setError(error)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 dark:bg-ink-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg bg-ink-900 dark:bg-ink-700 flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">NextOS</h1>
          </div>
          <p className="text-sm text-ink-500 dark:text-ink-400">Set up your workspace</p>
        </div>

        <div className="card p-8">
          <div className="flex gap-1 mb-6 bg-ink-100 dark:bg-ink-800 rounded-lg p-1">
            <button
              onClick={() => setMode('create')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'create' ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'}`}
            >
              Create Organization
            </button>
            <button
              onClick={() => setMode('join')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'join' ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'}`}
            >
              Join Organization
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'create' ? (
              <>
                <div>
                  <label className="label">Organization Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="input"
                    placeholder="e.g. Pro Agent VA"
                    required
                  />
                </div>
                <div>
                  <label className="label">Organization Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="input"
                    placeholder="e.g. proagentva"
                    required
                  />
                  <p className="text-xs text-ink-400 dark:text-ink-500 mt-1">Teammates use this to join. Lowercase letters, numbers, hyphens only.</p>
                </div>
                <div>
                  <label className="label">Timezone</label>
                  <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className="input">
                    {US_TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
                  </select>
                </div>
              </>
            ) : (
              <div>
                <label className="label">Organization Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="input"
                  placeholder="Ask your team for the code"
                  required
                />
              </div>
            )}

            {error && (
              <div className="text-sm rounded-lg p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Please wait...' : mode === 'create' ? 'Create Organization' : 'Join Organization'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-400 dark:text-ink-500 mt-6">
          You'll only see data for organizations you're a member of.{' '}
          <button onClick={signOut} className="underline hover:text-ink-600 dark:hover:text-ink-300">Sign out</button>
        </p>
      </div>
    </div>
  )
}
