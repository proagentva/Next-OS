import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'

const SIGNUP_CODE = import.meta.env.VITE_SIGNUP_CODE as string | undefined

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.57 2.7-3.88 2.7-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.95v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.16.28-1.7V4.97H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.03l3-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.97l3 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
    </svg>
  )
}

export default function AuthPage() {
  const { signIn, signUp, signInWithOAuth } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [signupCode, setSignupCode] = useState('')
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
      if (SIGNUP_CODE && signupCode !== SIGNUP_CODE) {
        setError('Invalid sign-up code')
        setLoading(false)
        return
      }
      const { error } = await signUp(email, password, displayName || email.split('@')[0])
      if (error) setError(error)
      else setError('Account created! Check your email for verification, then sign in.')
    }
    setLoading(false)
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    const { error } = await signInWithOAuth('google')
    if (error) setError(error)
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
          <p className="text-sm text-ink-500 dark:text-ink-400">KPI & Expense Operating System</p>
        </div>

        <div className="card p-8">
          <div className="flex gap-1 mb-6 bg-ink-100 dark:bg-ink-800 rounded-lg p-1">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'signin' ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'}`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${mode === 'signup' ? 'bg-white dark:bg-ink-900 text-ink-900 dark:text-ink-50 shadow-sm' : 'text-ink-500 dark:text-ink-400'}`}
            >
              Sign Up
            </button>
          </div>

          <div className="mb-6">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="btn-secondary w-full justify-center"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="h-px flex-1 bg-ink-200 dark:bg-ink-700" />
            <span className="text-xs text-ink-400 dark:text-ink-500">or use email</span>
            <div className="h-px flex-1 bg-ink-200 dark:bg-ink-700" />
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
            {mode === 'signup' && SIGNUP_CODE && (
              <div>
                <label className="label">Sign-up Code</label>
                <input
                  type="text"
                  value={signupCode}
                  onChange={(e) => setSignupCode(e.target.value)}
                  className="input"
                  placeholder="Ask your team for the code"
                  required
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
              <div className={`text-sm rounded-lg p-3 ${error.includes('created') || error.includes('verification') ? 'bg-accent-50 dark:bg-accent-900/30 text-accent-700 dark:text-accent-300' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300'}`}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center">
              {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-ink-400 dark:text-ink-500 mt-6">
          After signing in, you'll create or join your team's organization.
        </p>
      </div>
    </div>
  )
}
