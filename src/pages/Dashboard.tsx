import { useEffect, useState } from 'react'
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getAcqRollupByQuarter, getDispoRollupByQuarter, getFinancialRollupByQuarter, getMonthlyNetProfit, getMarketingCostByChannel } from '../lib/rollups'
import { formatCurrency, formatNumber, safeRate } from '../lib/utils'
import type { AcqRollup, DispoRollup, FinancialRollup, MarketingRollup } from '../lib/types'
import { TrendingUp, TrendingDown, DollarSign, Phone, FileCheck, Target } from 'lucide-react'

const ACQ_METRICS = [
  { key: 'dials', label: 'Dials' },
  { key: 'conversations', label: 'Conversations' },
  { key: 'leads_pushed', label: 'Leads Pushed' },
  { key: 'pass_offs', label: 'Pass-Offs' },
  { key: 'process', label: 'Process' },
  { key: 'appts_set', label: 'Appts Set' },
  { key: 'offers', label: 'Offers' },
  { key: 'contracts', label: 'Contracts' },
  { key: 'closed', label: 'Closed' },
  { key: 'dropped', label: 'Dropped' },
]

const DISPO_METRICS = [
  { key: 'total_dials', label: 'Total Dials' },
  { key: 'calls_connected', label: 'Calls Connected' },
  { key: 'follow_ups', label: 'Follow-Ups' },
  { key: 'buyer_box_collected', label: 'Buyer Box Collected' },
  { key: 'scheduled_deals', label: 'Scheduled Deals' },
  { key: 'deals_pitched', label: 'Deals Pitched' },
  { key: 'queries', label: 'Queries' },
  { key: 'offers', label: 'Offers' },
  { key: 'offers_made', label: 'Offers Made' },
  { key: 'deals_locked_up', label: 'Deals Locked Up' },
]

const BUCKET_COLORS: Record<string, string> = {
  Acquisition: '#10b981',
  Processing: '#3b82f6',
  Commissions: '#f59e0b',
  Admin: '#6366f1',
  Misc: '#94a3b8',
  'Non-Operating': '#ec4899',
}

export default function Dashboard({ year }: { year: number }) {
  const [loading, setLoading] = useState(true)
  const [financial, setFinancial] = useState<Record<string, FinancialRollup>>({})
  const [acq, setAcq] = useState<Record<string, AcqRollup>>({})
  const [dispo, setDispo] = useState<Record<string, DispoRollup>>({})
  const [monthlyNet, setMonthlyNet] = useState<{ month: string; net: number }[]>([])
  const [marketing, setMarketing] = useState<MarketingRollup[]>([])

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const [f, a, d, mn, m] = await Promise.all([
          getFinancialRollupByQuarter(year),
          getAcqRollupByQuarter(year),
          getDispoRollupByQuarter(year),
          getMonthlyNetProfit(year),
          getMarketingCostByChannel(year),
        ])
        setFinancial(f)
        setAcq(a)
        setDispo(d)
        setMonthlyNet(mn)
        setMarketing(m)
      } catch (e) {
        console.error('Dashboard load error:', e)
      } finally {
        setLoading(false)
      }
    })()
  }, [year])

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="text-ink-400">Loading dashboard...</div></div>
  }

  const ytdFin = financial['YTD'] || { income: 0, expenses: 0, net_profit: 0, by_bucket: {} }
  const ytdAcq = acq['YTD'] || { dials: 0, conversations: 0, leads_pushed: 0, pass_offs: 0, process: 0, appts_set: 0, offers: 0, contracts: 0, closed: 0, dropped: 0 }
  const ytdDispo = dispo['YTD'] || { total_dials: 0, calls_connected: 0, follow_ups: 0, buyer_box_collected: 0, scheduled_deals: 0, deals_pitched: 0, queries: 0, offers: 0, offers_made: 0, deals_locked_up: 0 }

  // Chart data
  const pnlData = [1, 2, 3, 4].map(q => ({
    quarter: `Q${q}`,
    Income: financial[`Q${q}`]?.income || 0,
    Expenses: financial[`Q${q}`]?.expenses || 0,
    Net: financial[`Q${q}`]?.net_profit || 0,
  }))

  const expenseBreakdown = Object.entries(ytdFin.by_bucket).map(([bucket, amt]) => ({
    name: bucket,
    value: amt,
  })).filter(d => d.value > 0)

  const acqFunnelData = ACQ_METRICS.slice(0, 8).map(m => ({
    name: m.label,
    value: (ytdAcq as any)[m.key] || 0,
  }))

  const marketingData = marketing.filter(m => m.cost > 0).map(m => ({
    name: m.channel,
    cost: m.cost,
  }))

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Dashboard</h1>
          <p className="text-sm text-ink-500">Year {year} — YTD overview</p>
        </div>
      </div>

      {/* YTD Highlight Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={DollarSign} label="Total Income" value={formatCurrency(ytdFin.income)} color="accent" />
        <StatCard icon={TrendingDown} label="Total Expenses" value={formatCurrency(ytdFin.expenses)} color="red" />
        <StatCard icon={TrendingUp} label="Net Profit" value={formatCurrency(ytdFin.net_profit)} color={ytdFin.net_profit >= 0 ? 'accent' : 'red'} />
        <StatCard icon={Phone} label="ACQ Dials" value={formatNumber(ytdAcq.dials)} color="ink" />
        <StatCard icon={FileCheck} label="ACQ Contracts" value={formatNumber(ytdAcq.contracts)} color="ink" />
        <StatCard icon={Target} label="Dispo Deals Locked" value={formatNumber(ytdDispo.deals_locked_up)} color="ink" />
      </div>

      {/* Quarterly Bookkeeping Table */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Quarterly Bookkeeping</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-200">
                <th className="table-header text-left px-4 py-2">Quarter</th>
                <th className="table-header text-right px-4 py-2">Income</th>
                <th className="table-header text-right px-4 py-2">Expenses</th>
                <th className="table-header text-right px-4 py-2">Net Profit</th>
                <th className="table-header text-right px-4 py-2">Acquisition</th>
                <th className="table-header text-right px-4 py-2">Processing</th>
                <th className="table-header text-right px-4 py-2">Commissions</th>
                <th className="table-header text-right px-4 py-2">Admin+Misc</th>
              </tr>
            </thead>
            <tbody>
              {quarters.map(q => {
                const f = financial[q] || { income: 0, expenses: 0, net_profit: 0, by_bucket: {} }
                const adminMisc = (f.by_bucket['Admin'] || 0) + (f.by_bucket['Misc'] || 0)
                return (
                  <tr key={q} className="border-b border-ink-100 hover:bg-ink-50">
                    <td className="table-cell font-medium">{q}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(f.income)}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(f.expenses)}</td>
                    <td className="table-cell text-right font-mono font-medium">{formatCurrency(f.net_profit)}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(f.by_bucket['Acquisition'] || 0)}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(f.by_bucket['Processing'] || 0)}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(f.by_bucket['Commissions'] || 0)}</td>
                    <td className="table-cell text-right font-mono">{formatCurrency(adminMisc)}</td>
                  </tr>
                )
              })}
              <tr className="border-t-2 border-ink-300 bg-ink-50 font-semibold">
                <td className="table-cell">YTD</td>
                <td className="table-cell text-right font-mono">{formatCurrency(ytdFin.income)}</td>
                <td className="table-cell text-right font-mono">{formatCurrency(ytdFin.expenses)}</td>
                <td className="table-cell text-right font-mono">{formatCurrency(ytdFin.net_profit)}</td>
                <td className="table-cell text-right font-mono">{formatCurrency(ytdFin.by_bucket['Acquisition'] || 0)}</td>
                <td className="table-cell text-right font-mono">{formatCurrency(ytdFin.by_bucket['Processing'] || 0)}</td>
                <td className="table-cell text-right font-mono">{formatCurrency(ytdFin.by_bucket['Commissions'] || 0)}</td>
                <td className="table-cell text-right font-mono">{formatCurrency((ytdFin.by_bucket['Admin'] || 0) + (ytdFin.by_bucket['Misc'] || 0))}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ACQ + Dispo Quarterly Funnel Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunnelTable title="ACQ Quarterly Funnel" metrics={ACQ_METRICS} data={acq} quarters={quarters} />
        <FunnelTable title="Dispo Quarterly Funnel" metrics={DISPO_METRICS} data={dispo} quarters={quarters} />
      </div>

      {/* Mini Quarterly Analysis Strip */}
      <div className="card p-5">
        <h2 className="text-lg font-semibold text-ink-900 mb-4">Quarterly Analysis</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-200">
                <th className="table-header text-left px-4 py-2">Metric</th>
                {quarters.map(q => <th key={q} className="table-header text-right px-4 py-2">{q}</th>)}
                <th className="table-header text-right px-4 py-2">YTD</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ink-100">
                <td className="table-cell font-medium">Income</td>
                {quarters.map(q => <td key={q} className="table-cell text-right font-mono">{formatCurrency(financial[q]?.income || 0)}</td>)}
                <td className="table-cell text-right font-mono font-semibold">{formatCurrency(ytdFin.income)}</td>
              </tr>
              <tr className="border-b border-ink-100">
                <td className="table-cell font-medium">Expenses</td>
                {quarters.map(q => <td key={q} className="table-cell text-right font-mono">{formatCurrency(financial[q]?.expenses || 0)}</td>)}
                <td className="table-cell text-right font-mono font-semibold">{formatCurrency(ytdFin.expenses)}</td>
              </tr>
              <tr className="border-b border-ink-100">
                <td className="table-cell font-medium">Net Profit</td>
                {quarters.map(q => <td key={q} className="table-cell text-right font-mono">{formatCurrency(financial[q]?.net_profit || 0)}</td>)}
                <td className="table-cell text-right font-mono font-semibold">{formatCurrency(ytdFin.net_profit)}</td>
              </tr>
              <tr className="border-b border-ink-100">
                <td className="table-cell font-medium">ACQ Dials</td>
                {quarters.map(q => <td key={q} className="table-cell text-right font-mono">{formatNumber((acq[q] as any)?.dials || 0)}</td>)}
                <td className="table-cell text-right font-mono font-semibold">{formatNumber(ytdAcq.dials)}</td>
              </tr>
              <tr className="border-b border-ink-100">
                <td className="table-cell font-medium">ACQ Contracts</td>
                {quarters.map(q => <td key={q} className="table-cell text-right font-mono">{formatNumber((acq[q] as any)?.contracts || 0)}</td>)}
                <td className="table-cell text-right font-mono font-semibold">{formatNumber(ytdAcq.contracts)}</td>
              </tr>
              <tr>
                <td className="table-cell font-medium">Dispo Deals Locked</td>
                {quarters.map(q => <td key={q} className="table-cell text-right font-mono">{formatNumber((dispo[q] as any)?.deals_locked_up || 0)}</td>)}
                <td className="table-cell text-right font-mono font-semibold">{formatNumber(ytdDispo.deals_locked_up)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="text-base font-semibold text-ink-900 mb-4">Quarterly P&L</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={pnlData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="Income" fill="#10b981" />
              <Bar dataKey="Expenses" fill="#ef4444" />
              <Bar dataKey="Net" fill="#6366f1" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-ink-900 mb-4">Monthly Net Profit Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyNet}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Area type="monotone" dataKey="net" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-ink-900 mb-4">Expense Breakdown by Bucket</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => e.name}>
                {expenseBreakdown.map((entry, i) => (
                  <Cell key={i} fill={BUCKET_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-ink-900 mb-4">ACQ Funnel (YTD)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={acqFunnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Marketing Cost by Quarter */}
      {marketingData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-base font-semibold text-ink-900 mb-4">Acquisition Cost by Channel (YTD)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={marketingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="cost" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    accent: 'text-accent-600 bg-accent-50',
    red: 'text-red-600 bg-red-50',
    ink: 'text-ink-600 bg-ink-100',
  }
  return (
    <div className="stat-card">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="stat-label">{label}</p>
          <p className="stat-value">{value}</p>
        </div>
      </div>
    </div>
  )
}

function FunnelTable({ title, metrics, data, quarters }: { title: string; metrics: { key: string; label: string }[]; data: Record<string, any>; quarters: string[] }) {
  const ytd = data['YTD'] || {}
  return (
    <div className="card p-5">
      <h2 className="text-lg font-semibold text-ink-900 mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink-200">
              <th className="table-header text-left px-3 py-2">Metric</th>
              {quarters.map(q => <th key={q} className="table-header text-right px-3 py-2">{q}</th>)}
              <th className="table-header text-right px-3 py-2">YTD</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.key} className="border-b border-ink-100 hover:bg-ink-50">
                <td className="table-cell font-medium">{m.label}</td>
                {quarters.map(q => <td key={q} className="table-cell text-right font-mono">{formatNumber((data[q] as any)?.[m.key] || 0)}</td>)}
                <td className="table-cell text-right font-mono font-semibold">{formatNumber((ytd as any)[m.key] || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
