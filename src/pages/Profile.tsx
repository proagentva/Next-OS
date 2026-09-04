import { useAuth } from '../contexts/AuthContext'
import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Avatar } from '../components/Avatar'
import { Mail, Shield, LogOut, Camera } from 'lucide-react'

export default function Profile() {
  const { user, profile, updateProfile, signOut } = useAuth()
  const [displayName, setDisplayName] = useState(profile?.display_name || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSave = async () => {
    setSaving(true)
    await updateProfile({ display_name: displayName })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleAvatarPick = async (file: File) => {
    if (!user) return
    if (!file.type.startsWith('image/')) { setUploadError('Please choose an image file.'); return }
    if (file.size > 5 * 1024 * 1024) { setUploadError('Image must be under 5MB.'); return }
    setUploadError(null)
    setUploading(true)

    const ext = file.name.split('.').pop()
    const path = `${user.id}/avatar.${ext}`
    const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
    if (uploadErr) { setUploadError(uploadErr.message); setUploading(false); return }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    // Cache-bust so the new image shows immediately even though the path is stable.
    const bustUrl = `${urlData.publicUrl}?t=${Date.now()}`
    await updateProfile({ avatar_url: bustUrl })
    setUploading(false)
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50 mb-6">Profile</h1>

      <div className="card p-6 space-y-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar url={profile?.avatar_url} name={profile?.display_name || profile?.email || 'U'} size={16} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-ink-900 dark:bg-ink-700 text-white flex items-center justify-center border-2 border-white dark:border-ink-900 hover:bg-ink-800 dark:hover:bg-ink-600"
              title="Change profile picture"
            >
              <Camera size={13} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarPick(f); e.target.value = '' }}
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-ink-900 dark:text-ink-50">{profile?.display_name || 'User'}</p>
            <p className="text-sm text-ink-500 dark:text-ink-400">{profile?.email}</p>
            {uploading && <p className="text-xs text-ink-400 dark:text-ink-500 mt-1">Uploading...</p>}
            {uploadError && <p className="text-xs text-red-500 dark:text-red-400 mt-1">{uploadError}</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label">Display Name</label>
            <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Email</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 border border-ink-200 dark:border-ink-800">
              <Mail size={16} className="text-ink-400 dark:text-ink-500" />
              <span className="text-sm text-ink-500 dark:text-ink-400">{profile?.email}</span>
            </div>
          </div>
          <div>
            <label className="label">Role</label>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-ink-50 dark:bg-ink-800 border border-ink-200 dark:border-ink-800">
              <Shield size={16} className="text-ink-400 dark:text-ink-500" />
              <span className="text-sm text-ink-500 dark:text-ink-400">{profile?.role || 'Member'}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
          {saved && <span className="text-sm text-accent-600 dark:text-accent-400">Saved!</span>}
        </div>
      </div>

      <div className="mt-6">
        <button onClick={signOut} className="btn-secondary text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </div>
  )
}
