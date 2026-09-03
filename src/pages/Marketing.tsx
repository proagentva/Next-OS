import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useOrganization } from '../contexts/OrganizationContext'
import { getMarketingCostByChannel, getUnmappedCategories } from '../lib/rollups'
import { formatCurrency } from '../lib/utils'
import type { MarketingChannel } from '../lib/types'
import { Plus, AlertTriangle, Trash2, Megaphone } from 'lucide-react'

export default function Marketing({ year }: { year: number }) {
  const { currentOrganization } = useOrganization()
  const [channels, setChannels] = useState<MarketingChannel[]>([])
  const [marketingData, setMarketingData] = useState<{ channel: string; cost: number }[]>([])
  const [unmapped, setUnmapped] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [quarter, setQuarter] = useState<number | undefined>(undefined)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAliases, setNewAliases] = useState('')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [ch, md, unm] = await Promise.all([
        supabase.from('marketing_channels').select('*').order('name'),
        getMarketingCostByChannel(year, quarter),
        getUnmappedCategories(year),
      ])
      setChannels(ch.data || [])
      setMarketingData(md)
      setUnmapped(unm)
    } catch (e) {
      console.error('Marketing load error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [year, quarter])

  const addChannel = async () => {
    if (!newName.trim()) return
    const aliases = newAliases.split(',').map(a => a.trim()).filter(Boolean)
    const { error } = await supabase.from('marketing_channels').insert({ organization_id: currentOrganization!.id, name: newName.trim(), aliases })
    if (error) {
      console.error('Add channel error:', error)
      return
    }
    setNewName('')
    setNewAliases('')
    setShowAdd(false)
    fetchData()
  }

  const deleteChannel = async (id: string) => {
    await supabase.from('marketing_channels').delete().eq('id', id)
    fetchData()
  }

  const totalCost = marketingData.reduce((s, m) => s + m.cost, 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Marketing</h1>
          <p className="text-sm text-ink-500">Calculated from Ledger — Acquisition bucket costs only</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={quarter ?? ''} onChange={e => setQuarter(e.target.value ? Number(e.target.value) : undefined)} className="input w-32">
            <option value="">YTD</option>
            <option value="1">Q1</option>
            <option value="2">Q2</option>
            <option value="3">Q3</option>
            <option value="4">Q4</option>
          </select>
          <button onClick={() => setShowAdd(!showAdd)} className="btn-accent">
            <Plus size={16} /> Add Channel
          </button>
        </div>
      </div>

      {showAdd && (
        <div className="card p-4 animate-fade-in">
          <h3 className="text-sm font-semibold text-ink-700 mb-3">New Marketing Channel</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="label">Channel Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} className="input" placeholder="e.g. LinkedIn Ads" />
            </div>
            <div>
              <label className="label">Aliases (comma-separated)</label>
              <input type="text" value={newAliases} onChange={e => setNewAliases(e.target.value)} className="input" placeholder="e.g. linkedin, li ads" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => setShowAdd(false)} className="btn-ghost">Cancel</button>
            <button onClick={addChannel} className="btn-primary">Add</button>
          </div>
        </div>
      )}

      {/* Unmapped Warning */}
      {unmapped.length > 0 && (
        <div className="card p-4 border-gold-300 bg-gold-50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-gold-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-gold-800">Unmapped Categories in Acquisition Bucket</p>
              <p className="text-xs text-gold-700 mt-1">These ledger categories don't map to any channel. Add them to a channel's aliases or create a category mapping in Settings.</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {unmapped.map(c => <span key={c} className="badge-gold">{c}</span>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cost Table */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Acquisition Cost by Channel</h2>
        {loading ? (
          <div className="text-center text-ink-400 py-8">Loading...</div>
        ) : marketingData.length === 0 ? (
          <div className="text-center text-ink-400 py-8">
            <Megaphone size={32} className="mx-auto mb-2 opacity-30" />
            <p>No Acquisition-bucket ledger entries found for {year}.</p>
            <p className="text-xs mt-1">Import a Ledger CSV to see marketing costs here.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-ink-200">
                  <th className="table-header text-left px-4 py-2">Channel</th>
                  <th className="table-header text-right px-4 py-2">Acquisition Cost</th>
                  <th className="table-header text-right px-4 py-2">% of Total</th>
                </tr>
              </thead>
              <tbody>
                {marketingData.map(m => (
                  <tr key={m.channel} className="border-b border-ink-100 hover:bg-ink-50">
                    <td className="table-cell font-medium">
                      {m.channel === 'Unmapped' ? <span className="text-gold-600">{m.channel}</span> : m.channel}
                    </td>
                    <td className="table-cell text-right font-mono">{formatCurrency(m.cost)}</td>
                    <td className="table-cell text-right font-mono text-ink-500">
                      {totalCost > 0 ? `${((m.cost / totalCost) * 100).toFixed(1)}%` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-ink-300 bg-ink-50 font-semibold">
                  <td className="table-cell">Total</td>
                  <td className="table-cell text-right font-mono">{formatCurrency(totalCost)}</td>
                  <td className="table-cell text-right font-mono">100%</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}
      </div>

      {/* Channel Manager */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Marketing Channels</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {channels.map(ch => (
            <div key={ch.id} className="border border-ink-200 rounded-lg p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-ink-900">{ch.name}</p>
                {ch.aliases && ch.aliases.length > 0 && (
                  <p className="text-xs text-ink-400 mt-0.5">Aliases: {ch.aliases.join(', ')}</p>
                )}
              </div>
              <button onClick={() => deleteChannel(ch.id)} className="p-1.5 rounded text-ink-300 hover:text-red-500 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
