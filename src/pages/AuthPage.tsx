import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function AuthPage() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signin') {
      const { error } = await signIn(email, password)
      if (error) setError(error)
    } else {
      if (password.length < 6) {
        setError('Password must be at least 6 characters')
        setLoading(false)
        return
      }
      const { error } = await signUp(email, password, displayName || email.split('@')[0])
      if (error) setError(error)
      else setError('Account created! Check your email for verification, then sign in.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-lg bg-ink-900 flex items-center justify-center">
              <span className="text-white font-bold text-lg">N</span>
            </div>
            <h1 className="text-2xl font-bold text-ink-900">NextOS</h1>
          </div>
          <p className="text-sm text-ink-500">KPI & Expense Operating System</p>
        </div>

        <div className="card p-8">
          <div className="flex gap-1 mb-6 bg-ink-100 rounded-lg p-1">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'signin' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'signup' ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500'}`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="label">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="input"
                  placeholder="John Doe"
                />
              </div>
            )}
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                placeholder="you@company.com"
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className={`text-sm rounded-lg p-3 ${error.includes('created') || error.includes('verification') ? 'bg-accent-50 text-accent-700' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-400 mt-6">
          Single shared workspace — all team members see the same data.
        </p>
      </div>
    </div>
  )
}
