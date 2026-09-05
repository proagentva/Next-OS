import { useEffect, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { FIXED_COLORS } from '../lib/colors'
import { sanitizeScriptHtml } from '../lib/sanitizeHtml'
import { formatDate } from '../lib/utils'
import type { Script } from '../lib/types'
import { Plus, Bold, Italic, Underline as UnderlineIcon, Trash2, X } from 'lucide-react'

function stripHtml(html: string): string {
  const div = document.createElement('div')
  div.innerHTML = html
  return div.textContent || ''
}

export default function Scripts() {
  const { currentOrganization } = useOrganization()
  const [scripts, setScripts] = useState<Script[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null | 'new'>(null)

  const fetchScripts = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('scripts').select('*').order('updated_at', { ascending: false })
    if (error) console.error('Fetch scripts error:', error)
    setScripts(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchScripts() }, [currentOrganization?.id])

  if (editingId !== null) {
    const editing = editingId === 'new' ? null : scripts.find(s => s.id === editingId) || null
    return (
      <ScriptEditorView
        key={editingId}
        script={editing}
        onClose={() => setEditingId(null)}
        onSaved={() => { setEditingId(null); fetchScripts() }}
        onDeleted={() => { setEditingId(null); fetchScripts() }}
      />
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Scripts</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">{scripts.length} script{scripts.length === 1 ? '' : 's'}</p>
        </div>
        <button onClick={() => setEditingId('new')} className="btn-accent">
          <Plus size={16} /> New Script
        </button>
      </div>

      {loading ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">Loading...</div>
      ) : scripts.length === 0 ? (
        <div className="card p-8 text-center text-ink-400 dark:text-ink-500">No scripts yet. Click "New Script" to write one.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scripts.map(s => (
            <button key={s.id} onClick={() => setEditingId(s.id)} className="card p-4 text-left space-y-2 hover:border-ink-300 dark:hover:border-ink-700">
              <h3 className="text-sm font-semibold text-ink-900 dark:text-ink-50 truncate">{s.title}</h3>
              <p className="text-sm text-ink-500 dark:text-ink-400 line-clamp-3">{stripHtml(s.content_html) || 'Empty script'}</p>
              <p className="text-xs text-ink-400 dark:text-ink-500">{formatDate(s.updated_at)}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function ToolbarButton({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-all ${active ? 'bg-ink-900 dark:bg-ink-700 text-white' : 'text-ink-600 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-800'}`}
    >
      {children}
    </button>
  )
}

function ColorRow({ label, colors, activeColor, onPick, onClear }: { label: string; colors: typeof FIXED_COLORS; activeColor: string | null; onPick: (hex: string) => void; onClear: () => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-ink-400 dark:text-ink-500 w-14 flex-shrink-0">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {colors.map(c => (
          <button
            key={c.id}
            type="button"
            onClick={() => onPick(c.dark)}
            title={c.label}
            className="w-5 h-5 rounded-full border-2 transition-all"
            style={{ backgroundColor: c.dark, borderColor: activeColor === c.dark ? '#0f172a' : 'transparent' }}
          />
        ))}
        <button type="button" onClick={onClear} title="Clear" className="w-5 h-5 rounded-full border border-ink-300 dark:border-ink-600 flex items-center justify-center">
          <X size={10} className="text-ink-400 dark:text-ink-500" />
        </button>
      </div>
    </div>
  )
}

function ScriptEditorView({ script, onClose, onSaved, onDeleted }: { script: Script | null; onClose: () => void; onSaved: () => void; onDeleted: () => void }) {
  const { user } = useAuth()
  const { currentOrganization } = useOrganization()
  const [title, setTitle] = useState(script?.title || '')
  const [saving, setSaving] = useState(false)
  const [, forceRender] = useState(0)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
    ],
    content: script?.content_html || '',
    onUpdate: () => forceRender(n => n + 1),
    onSelectionUpdate: () => forceRender(n => n + 1),
  })

  const activeTextColor = editor?.getAttributes('textStyle').color || null
  const activeHighlight = editor?.getAttributes('highlight').color || null

  const save = async () => {
    if (!editor || !currentOrganization || !user || !title.trim()) return
    setSaving(true)
    const html = sanitizeScriptHtml(editor.getHTML())
    if (script) {
      await supabase.from('scripts').update({ title: title.trim(), content_html: html, updated_at: new Date().toISOString() }).eq('id', script.id)
    } else {
      await supabase.from('scripts').insert({
        organization_id: currentOrganization.id,
        title: title.trim(),
        content_html: html,
        created_by: user.id,
      })
    }
    setSaving(false)
    onSaved()
  }

  const remove = async () => {
    if (!script) return
    if (!window.confirm('Delete this script?')) return
    await supabase.from('scripts').delete().eq('id', script.id)
    onDeleted()
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="input text-lg font-semibold flex-1 mr-3"
          placeholder="Script title"
        />
        <div className="flex items-center gap-2 flex-shrink-0">
          {script && (
            <button onClick={remove} className="btn-ghost text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
              <Trash2 size={14} /> Delete
            </button>
          )}
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={save} disabled={saving || !title.trim()} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>

      <div className="card p-3 space-y-3">
        <div className="flex items-center gap-1 border-b border-ink-200 dark:border-ink-800 pb-3">
          <ToolbarButton active={!!editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} title="Bold">
            <Bold size={16} />
          </ToolbarButton>
          <ToolbarButton active={!!editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} title="Italic">
            <Italic size={16} />
          </ToolbarButton>
          <ToolbarButton active={!!editor?.isActive('underline')} onClick={() => editor?.chain().focus().toggleUnderline().run()} title="Underline">
            <UnderlineIcon size={16} />
          </ToolbarButton>
        </div>
        <ColorRow
          label="Text"
          colors={FIXED_COLORS}
          activeColor={activeTextColor}
          onPick={hex => editor?.chain().focus().setColor(hex).run()}
          onClear={() => editor?.chain().focus().unsetColor().run()}
        />
        <ColorRow
          label="Highlight"
          colors={FIXED_COLORS}
          activeColor={activeHighlight}
          onPick={hex => editor?.chain().focus().toggleHighlight({ color: hex }).run()}
          onClear={() => editor?.chain().focus().unsetHighlight().run()}
        />
        <EditorContent
          editor={editor}
          className="[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:text-sm [&_.ProseMirror]:text-ink-900 dark:[&_.ProseMirror]:text-ink-50 border border-ink-200 dark:border-ink-700 rounded-lg p-3"
        />
      </div>
    </div>
  )
}
