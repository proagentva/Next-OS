import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { useTheme } from '../contexts/ThemeContext'
import { TRAINING_TAGS } from '../lib/types'
import type { TrainingMaterial, TrainingMaterialType } from '../lib/types'
import { getTrainingTagColor, colorBadgeStyle } from '../lib/colors'
import { formatDate } from '../lib/utils'
import { Modal } from '../components/Modal'
import { Plus, Trash2, Link as LinkIcon, FileText, Image as ImageIcon, ExternalLink } from 'lucide-react'

const TYPE_ICONS: Record<TrainingMaterialType, typeof FileText> = {
  text: FileText,
  link: LinkIcon,
  image: ImageIcon,
}

const emptyForm = {
  title: '',
  material_type: 'text' as TrainingMaterialType,
  tag: TRAINING_TAGS[0] as string,
  content: '',
}

export default function Training() {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  const { theme } = useTheme()
  const dark = theme === 'dark'

  const [materials, setMaterials] = useState<TrainingMaterial[]>([])
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [tagFilter, setTagFilter] = useState('')
  const [openImage, setOpenImage] = useState<{ title: string; url: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchMaterials = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('training_materials').select('*').order('created_at', { ascending: false })
    if (error) console.error('Fetch training materials error:', error)
    const rows = data || []
    setMaterials(rows)

    const imageRows = rows.filter((m: TrainingMaterial) => m.material_type === 'image' && m.content)
    const urls: Record<string, string> = {}
    await Promise.all(imageRows.map(async (m: TrainingMaterial) => {
      const { data: signed } = await supabase.storage.from('training-media').createSignedUrl(m.content as string, 3600)
      if (signed) urls[m.id] = signed.signedUrl
    }))
    setImageUrls(urls)
    setLoading(false)
  }

  useEffect(() => { fetchMaterials() }, [currentOrganization?.id])

  const addMaterial = async () => {
    if (!currentOrganization || !user || !form.title.trim()) return
    setSaving(true)

    let content: string | null = form.content.trim() || null
    if (form.material_type === 'image') {
      if (!uploadFile) { setSaving(false); return }
      const ext = uploadFile.name.split('.').pop()
      const path = `${currentOrganization.id}/${crypto.randomUUID()}.${ext}`
      const { error: uploadErr } = await supabase.storage.from('training-media').upload(path, uploadFile)
      if (uploadErr) { console.error('Upload training image error:', uploadErr); setSaving(false); return }
      content = path
    }

    const { error } = await supabase.from('training_materials').insert({
      organization_id: currentOrganization.id,
      title: form.title.trim(),
      material_type: form.material_type,
      content,
      tag: form.tag,
      created_by: user.id,
    })
    if (error) { console.error('Add training material error:', error); setSaving(false); return }

    setForm(emptyForm)
    setUploadFile(null)
    setShowAdd(false)
    setSaving(false)
    fetchMaterials()
  }

  const deleteMaterial = async (m: TrainingMaterial) => {
    if (!window.confirm('Delete this training material?')) return
    if (m.material_type === 'image' && m.content) {
      await supabase.storage.from('training-media').remove([m.content])
    }
    await supabase.from('training_materials').delete().eq('id', m.id)
    setMaterials(materials.filter(x => x.id !== m.id))
  }

  const visibleMaterials = tagFilter ? materials.filter(m => m.tag === tagFilter) : materials

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Training</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{visibleMaterials.length} material{visibleMaterials.length === 1 ? '' : 's'}</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} className="input w-48">
            <option value="">All Tags</option>
            {TRAINING_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
            <Plus size={16} /> Add Material
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-4 animate-fade-in space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="label">Title</label>
              <input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input" placeholder="Material title" />
            </div>
            <div>
              <label className="label">Tag</label>
              <select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} className="input">
                {TRAINING_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-3">
              <label className="label">Type</label>
              <div className="flex gap-2">
                {(['text', 'link', 'image'] as TrainingMaterialType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm({ ...form, material_type: t, content: '' })}
                    className={form.material_type === t ? 'badge-green' : 'badge-gray'}
                  >
                    {t === 'text' ? 'Text' : t === 'link' ? 'Link' : 'Image'}
                  </button>
                ))}
              </div>
            </div>
            <div className="md:col-span-3">
              {form.material_type === 'text' && (
                <>
                  <label className="label">Content</label>
                  <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="input" rows={4} placeholder="Training text..." />
                </>
              )}
              {form.material_type === 'link' && (
                <>
                  <label className="label">URL</label>
                  <input type="url" value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="input" placeholder="https://..." />
                </>
              )}
              {form.material_type === 'image' && (
                <>
                  <label className="label">Image</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="input"
                  />
                </>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowAdd(false); setUploadFile(null) }} className="btn-ghost">Cancel</button>
            <button onClick={addMaterial} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Add Material'}</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
      ) : visibleMaterials.length === 0 ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">No training materials yet. Click "Add Material" to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleMaterials.map(m => {
            const color = getTrainingTagColor(m.tag)
            const Icon = TYPE_ICONS[m.material_type]
            return (
              <div key={m.id} className="card p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={14} className="text-ink-400 dark:text-ink-500 flex-shrink-0" />
                    <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50 truncate">{m.title}</h3>
                  </div>
                  <button onClick={() => deleteMaterial(m)} className="p-1 rounded text-ink-300 dark:text-ink-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 flex-shrink-0">
                    <Trash2 size={13} />
                  </button>
                </div>
                <span className="badge inline-block" style={colorBadgeStyle(color, dark)}>{m.tag}</span>

                {m.material_type === 'text' && (
                  <p className="text-sm text-ink-600 dark:text-ink-300 line-clamp-4 whitespace-pre-wrap">{m.content}</p>
                )}
                {m.material_type === 'link' && m.content && (
                  <a href={m.content} target="_blank" rel="noopener noreferrer" className="text-sm text-accent-600 dark:text-accent-400 hover:underline inline-flex items-center gap-1 break-all">
                    {m.content} <ExternalLink size={11} className="flex-shrink-0" />
                  </a>
                )}
                {m.material_type === 'image' && imageUrls[m.id] && (
                  <button onClick={() => setOpenImage({ title: m.title, url: imageUrls[m.id] })} className="block w-full">
                    <img src={imageUrls[m.id]} alt={m.title} className="w-full h-32 object-cover rounded-lg" />
                  </button>
                )}

                <p className="text-xs text-ink-400 dark:text-ink-500">{formatDate(m.created_at)}</p>
              </div>
            )
          })}
        </div>
      )}

      {openImage && (
        <Modal title={openImage.title} onClose={() => setOpenImage(null)}>
          <img src={openImage.url} alt={openImage.title} className="w-full rounded-lg" />
        </Modal>
      )}
    </div>
  )
}
