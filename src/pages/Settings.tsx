import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useOrganization } from '../contexts/OrganizationContext'
import { formatCurrency } from '../lib/utils'
import { Plus, Trash2, Save } from 'lucide-react'
import type { MarketingChannel, CategoryMapping } from '../lib/types'

export default function Settings({ year }: { year: number }) {
  const { currentOrganization } = useOrganization()
  const orgId = currentOrganization!.id
  const [channels, setChannels] = useState<MarketingChannel[]>([])
  const [mappings, setMappings] = useState<CategoryMapping[]>([])
  const [buckets, setBuckets] = useState<string[]>([])
  const [acqRoles, setAcqRoles] = useState<string[]>([])
  const [dispoRoles, setDispoRoles] = useState<string[]>([])
  const [reportingYear, setReportingYear] = useState(year)
  const [activeTab, setActiveTab] = useState('channels')
  const [newChannel, setNewChannel] = useState({ name: '', aliases: '' })
  const [newMapping, setNewMapping] = useState({ category: '', bucket: 'Misc', channel: '' })
  const [newBucket, setNewBucket] = useState('')
  const [newAcqRole, setNewAcqRole] = useState('')
  const [newDispoRole, setNewDispoRole] = useState('')

  useEffect(() => {
    (async () => {
      const [ch, mp, cfg] = await Promise.all([
        supabase.from('marketing_channels').select('*').order('name'),
        supabase.from('category_mappings').select('*').order('category'),
        supabase.from('app_config').select('*'),
      ])
      setChannels(ch.data || [])
      setMappings(mp.data || [])
      const cfgMap = new Map((cfg.data || []).map(c => [c.key, c.value]))
      setBuckets(cfgMap.get('expense_buckets') || [])
      setAcqRoles(cfgMap.get('acq_roles') || [])
      setDispoRoles(cfgMap.get('dispo_roles') || [])
      setReportingYear(Number(cfgMap.get('reporting_year')) || year)
    })()
  }, [])

  const updateConfig = async (key: string, value: any) => {
    await supabase.from('app_config').upsert(
      { organization_id: orgId, key, value, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id,key' }
    )
  }

  const addChannel = async () => {
    if (!newChannel.name.trim()) return
    const aliases = newChannel.aliases.split(',').map(a => a.trim()).filter(Boolean)
    const { data } = await supabase.from('marketing_channels').insert({ organization_id: orgId, name: newChannel.name.trim(), aliases }).select().maybeSingle()
    if (data) setChannels([...channels, data])
    setNewChannel({ name: '', aliases: '' })
  }

  const deleteChannel = async (id: string) => {
    await supabase.from('marketing_channels').delete().eq('id', id)
    setChannels(channels.filter(c => c.id !== id))
  }

  const addMapping = async () => {
    if (!newMapping.category.trim()) return
    const { data } = await supabase.from('category_mappings').insert({
      organization_id: orgId,
      category: newMapping.category.trim(),
      bucket: newMapping.bucket,
      channel: newMapping.channel || null,
    }).select().maybeSingle()
    if (data) setMappings([...mappings, data])
    setNewMapping({ category: '', bucket: 'Misc', channel: '' })
  }

  const updateMapping = async (id: string, updates: Partial<CategoryMapping>) => {
    const { data } = await supabase.from('category_mappings').update(updates).eq('id', id).select().maybeSingle()
    if (data) setMappings(mappings.map(m => m.id === id ? data : m))
  }

  const deleteMapping = async (id: string) => {
    await supabase.from('category_mappings').delete().eq('id', id)
    setMappings(mappings.filter(m => m.id !== id))
  }

  const addBucket = async () => {
    if (!newBucket.trim() || buckets.includes(newBucket.trim())) return
    const updated = [...buckets, newBucket.trim()]
    setBuckets(updated)
    await updateConfig('expense_buckets', updated)
    setNewBucket('')
  }

  const removeBucket = async (b: string) => {
    const updated = buckets.filter(x => x !== b)
    setBuckets(updated)
    await updateConfig('expense_buckets', updated)
  }

  const addAcqRole = async () => {
    if (!newAcqRole.trim() || acqRoles.includes(newAcqRole.trim())) return
    const updated = [...acqRoles, newAcqRole.trim()]
    setAcqRoles(updated)
    await updateConfig('acq_roles', updated)
    setNewAcqRole('')
  }

  const addDispoRole = async () => {
    if (!newDispoRole.trim() || dispoRoles.includes(newDispoRole.trim())) return
    const updated = [...dispoRoles, newDispoRole.trim()]
    setDispoRoles(updated)
    await updateConfig('dispo_roles', updated)
    setNewDispoRole('')
  }

  const saveYear = async () => {
    await updateConfig('reporting_year', String(reportingYear))
  }

  const tabs = [
    { id: 'channels', label: 'Marketing Channels' },
    { id: 'mappings', label: 'Category Mappings' },
    { id: 'buckets', label: 'Expense Buckets' },
    { id: 'roles', label: 'Roles' },
    { id: 'general', label: 'General' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Settings</h1>
        <p className="text-sm text-ink-500 dark:text-ink-400">Manage classification tables and configuration</p>
      </div>

      <div className="flex gap-1 border-b border-ink-200 dark:border-ink-800">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-all ${activeTab === t.id ? 'border-ink-900 dark:border-ink-100 text-ink-900 dark:text-ink-50' : 'border-transparent text-ink-400 dark:text-ink-500 hover:text-ink-600 dark:hover:text-ink-300'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'channels' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3">Add Channel</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input type="text" value={newChannel.name} onChange={e => setNewChannel({ ...newChannel, name: e.target.value })} className="input" placeholder="Channel name" />
              <input type="text" value={newChannel.aliases} onChange={e => setNewChannel({ ...newChannel, aliases: e.target.value })} className="input" placeholder="Aliases (comma-separated)" />
              <button onClick={addChannel} className="btn-primary"><Plus size={16} /> Add</button>
            </div>
          </div>
          <div className="card p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {channels.map(ch => (
                <div key={ch.id} className="border border-ink-200 dark:border-ink-800 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{ch.name}</p>
                    {ch.aliases?.length > 0 && <p className="text-xs text-ink-400 dark:text-ink-500">{ch.aliases.join(', ')}</p>}
                  </div>
                  <button onClick={() => deleteChannel(ch.id)} className="p-1.5 rounded text-ink-300 dark:text-ink-600 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'mappings' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3">Add Category Mapping</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input type="text" value={newMapping.category} onChange={e => setNewMapping({ ...newMapping, category: e.target.value })} className="input" placeholder="Category name" />
              <select value={newMapping.bucket} onChange={e => setNewMapping({ ...newMapping, bucket: e.target.value })} className="input">
                {buckets.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <select value={newMapping.channel} onChange={e => setNewMapping({ ...newMapping, channel: e.target.value })} className="input">
                <option value="">— No Channel —</option>
                {channels.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <button onClick={addMapping} className="btn-primary"><Plus size={16} /> Add</button>
            </div>
          </div>
          <div className="card overflow-hidden">
            <table className="w-full">
              <thead className="bg-ink-50 dark:bg-ink-800">
                <tr>
                  <th className="table-header text-left px-4 py-2">Category</th>
                  <th className="table-header text-left px-4 py-2">Bucket</th>
                  <th className="table-header text-left px-4 py-2">Channel</th>
                  <th className="table-header px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {mappings.map(m => (
                  <tr key={m.id} className="border-t border-ink-100 dark:border-ink-800">
                    <td className="table-cell">{m.category}</td>
                    <td className="table-cell">
                      <select value={m.bucket} onChange={e => updateMapping(m.id, { bucket: e.target.value })} className="input py-1">
                        {buckets.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </td>
                    <td className="table-cell">
                      <select value={m.channel || ''} onChange={e => updateMapping(m.id, { channel: e.target.value || null })} className="input py-1">
                        <option value="">—</option>
                        {channels.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </td>
                    <td className="table-cell text-right">
                      <button onClick={() => deleteMapping(m.id)} className="p-1.5 rounded text-ink-300 dark:text-ink-600 hover:text-red-500 dark:hover:text-red-400"><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'buckets' && (
        <div className="card p-4 space-y-4">
          <div className="flex gap-2">
            <input type="text" value={newBucket} onChange={e => setNewBucket(e.target.value)} className="input" placeholder="New bucket name" />
            <button onClick={addBucket} className="btn-primary"><Plus size={16} /> Add</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {buckets.map(b => <span key={b} className="badge-gray flex items-center gap-1">{b} <button onClick={() => removeBucket(b)} className="text-ink-300 dark:text-ink-600 hover:text-red-500 dark:hover:text-red-400">×</button></span>)}
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="space-y-4">
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3">ACQ Roles</h3>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newAcqRole} onChange={e => setNewAcqRole(e.target.value)} className="input" placeholder="New role" />
              <button onClick={addAcqRole} className="btn-primary"><Plus size={16} /> Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {acqRoles.map(r => <span key={r} className="badge-gray">{r}</span>)}
            </div>
          </div>
          <div className="card p-4">
            <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-300 mb-3">Dispo Roles</h3>
            <div className="flex gap-2 mb-3">
              <input type="text" value={newDispoRole} onChange={e => setNewDispoRole(e.target.value)} className="input" placeholder="New role" />
              <button onClick={addDispoRole} className="btn-primary"><Plus size={16} /> Add</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {dispoRoles.map(r => <span key={r} className="badge-gray">{r}</span>)}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'general' && (
        <div className="card p-4 space-y-4">
          <div>
            <label className="label">Reporting Year</label>
            <div className="flex gap-2">
              <input type="number" value={reportingYear} onChange={e => setReportingYear(Number(e.target.value))} className="input w-32" />
              <button onClick={saveYear} className="btn-primary"><Save size={16} /> Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
