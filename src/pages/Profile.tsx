import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'
import { User, Mail, Shield, LogOut } from 'lucide-react'

export default function Profile() {
  const { profile, updateProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await updateProfile({ display_name: displayName })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const initials = (profile?.display_name || profile?.email || 'U')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-ink-900 mb-6">Profile</h1>

      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-ink-900 text-white flex items-center justify-center text-xl font-medium">
            {initials}
          </div>
          <div>
            <p className="text-lg font-semibold text-ink-900">{profile?.display_name || 'User'}</p>
            <p className="text-sm text-ink-500">{profile?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-50 border border-ink-200">
              <Mail size={16} className="text-ink-400" />
              <span className="text-sm text-ink-500">{profile?.email}</span>
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-50 border border-ink-200">
              <Shield size={16} className="text-ink-400" />
              <span className="text-sm text-ink-500">{profile?.role || 'Member'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-accent-600">Saved!</span>}
        </div>
      </div>

      <div className="mt-6">
        <button onClick={signOut} className="btn-secondary text-red-600 hover:bg-red-50">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  )
}
