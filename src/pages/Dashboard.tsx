import { useEffect, useState } from 'react'
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { getAcqRollupByQuarter, getDispoRollupByQuarter, getFinancialRollupByQuarter, getMonthlyNetProfit, getMarketingCostByChannel, getRangeSummary, type RangeSummary } from '../lib/rollups'
import { formatCurrency, formatNumber, safeRate } from '../lib/utils'
import { useTheme } from '../contexts/ThemeContext'
import { getBucketColor } from '../lib/colors'
import { useDateRange, DateRangeSelector } from '../components/DateRangeSelector'
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

function useChartColors() {
  const { theme } = useTheme()
  const dark = theme === 'dark'
  return {
    dark,
    grid: dark ? '#334155' : '#e2e8f0',
    tick: dark ? '#94a3b8' : '#64748b',
    tooltipBg: dark ? '#1e293b' : '#ffffff',
    tooltipBorder: dark ? '#334155' : '#e2e8f0',
    tooltipText: dark ? '#f8fafc' : '#0f172a',
    income: dark ? '#34d399' : '#10b981',
    expenses: dark ? '#f87171' : '#ef4444',
    net: dark ? '#818cf8' : '#6366f1',
    areaStroke: dark ? '#34d399' : '#10b981',
    areaFill: dark ? 'rgba(16,185,129,0.18)' : '#d1fae5',
    acqBar: dark ? '#34d399' : '#10b981',
    marketingBar: dark ? '#fbbf24' : '#f59e0b',
  }
}

export default function Dashboard({ year }: { year: number }) {
  const colors = useChartColors()
  const tooltipStyle = {
    contentStyle: { backgroundColor: colors.tooltipBg, border: `1px solid ${colors.tooltipBorder}`, borderRadius: 8 },
    labelStyle: { color: colors.tooltipText },
    itemStyle: { color: colors.tooltipText },
  }
  const [loading, setLoading] = useState(true)
  const [financial, setFinancial] = useState<Record<string, FinancialRollup>>({})
  const [acq, setAcq] = useState<Record<string, AcqRollup>>({})
  const [dispo, setDispo] = useState<Record<string, DispoRollup>>({})
  const [monthlyNet, setMonthlyNet] = useState<{ month: string; net: number }[]>([])
  const [marketing, setMarketing] = useState<MarketingRollup[]>([])
  const dateRange = useDateRange()
  const [rangeSummary, setRangeSummary] = useState<RangeSummary | null>(null)
  const [rangeLoading, setRangeLoading] = useState(false)

  useEffect(() => {
    if (!dateRange.range.from || !dateRange.range.to) {
      setRangeSummary(null)
      return
    }
    setRangeLoading(true)
    getRangeSummary(dateRange.range.from, dateRange.range.to)
      .then(setRangeSummary)
      .catch(e => console.error('Range summary error:', e))
      .finally(() => setRangeLoading(false))
  }, [dateRange.range.from, dateRange.range.to])

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
    return <div className="flex items-center justify-center h-full"><div className="text-ink-400 dark:text-ink-500">Loading dashboard...</div></div>
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
          <h1 className="text-2xl font-bold text-ink-900 dark:text-ink-50">Dashboard</h1>
          <p className="text-sm text-ink-500 dark:text-ink-400">Year {year} — YTD overview</p>
        </div>
      </div>

      {/* Date Range Summary — additive, doesn't affect the quarterly views below */}
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink-900 dark:text-ink-50">Range Summary</h2>
            <p className="text-xs text-ink-500 dark:text-ink-400">{dateRange.range.label}</p>
          </div>
          <DateRangeSelector {...dateRange} />
        </div>
        {dateRange.preset === 'custom' && (!dateRange.customFrom || !dateRange.customTo) ? (
          <p className="text-sm text-ink-400 dark:text-ink-500">Pick a start and end date above.</p>
        ) : rangeLoading || !rangeSummary ? (
          <div className="text-sm text-ink-400 dark:text-ink-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <StatCard icon={DollarSign} label="Income" value={formatCurrency(rangeSummary.income)} color="accent" />
            <StatCard icon={TrendingDown} label="Expenses" value={formatCurrency(rangeSummary.expenses)} color="red" />
            <StatCard icon={TrendingUp} label="Net Profit" value={formatCurrency(rangeSummary.net_profit)} color={rangeSummary.net_profit >= 0 ? 'accent' : 'red'} />
            <StatCard icon={Phone} label="ACQ Dials" value={formatNumber(rangeSummary.acq_dials)} color="ink" />
            <StatCard icon={FileCheck} label="ACQ Contracts" value={formatNumber(rangeSummary.acq_contracts)} color="ink" />
            <StatCard icon={Target} label="Dispo Deals Locked" value={formatNumber(rangeSummary.dispo_deals_locked)} color="ink" />
          </div>
        )}
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
        <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">Quarterly Bookkeeping</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-200 dark:border-ink-800">
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
                  <tr key={q} className="border-b border-ink-100 dark:border-ink-800 hover:bg-ink-50 dark:hover:bg-ink-800">
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
              <tr className="border-t-2 border-ink-300 dark:border-ink-700 bg-ink-50 dark:bg-ink-800 font-semibold">
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
        <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">Quarterly Analysis</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-200 dark:border-ink-800">
                <th className="table-header text-left px-4 py-2">Metric</th>
                {quarters.map(q => <th key={q} className="table-header text-right px-4 py-2">{q}</th>)}
                <th className="table-header text-right px-4 py-2">YTD</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-ink-100 dark:border-ink-800">
                <td className="table-cell font-medium">Income</td>
                {quarters.map(q => <td key={q} className="table-cell text-right font-mono">{formatCurrency(financial[q]?.income || 0)}</td>)}
                <td className="table-cell text-right font-mono font-semibold">{formatCurrency(ytdFin.income)}</td>
              </tr>
              <tr className="border-b border-ink-100 dark:border-ink-800">
                <td className="table-cell font-medium">Expenses</td>
                {quarters.map(q => <td key={q} className="table-cell text-right font-mono">{formatCurrency(financial[q]?.expenses || 0)}</td>)}
                <td className="table-cell text-right font-mono font-semibold">{formatCurrency(ytdFin.expenses)}</td>
              </tr>
              <tr className="border-b border-ink-100 dark:border-ink-800">
                <td className="table-cell font-medium">Net Profit</td>
                {quarters.map(q => <td key={q} className="table-cell text-right font-mono">{formatCurrency(financial[q]?.net_profit || 0)}</td>)}
                <td className="table-cell text-right font-mono font-semibold">{formatCurrency(ytdFin.net_profit)}</td>
              </tr>
              <tr className="border-b border-ink-100 dark:border-ink-800">
                <td className="table-cell font-medium">ACQ Dials</td>
                {quarters.map(q => <td key={q} className="table-cell text-right font-mono">{formatNumber((acq[q] as any)?.dials || 0)}</td>)}
                <td className="table-cell text-right font-mono font-semibold">{formatNumber(ytdAcq.dials)}</td>
              </tr>
              <tr className="border-b border-ink-100 dark:border-ink-800">
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
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50 mb-4">Quarterly P&L</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={pnlData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: colors.tick }} />
              <YAxis tick={{ fontSize: 12, fill: colors.tick }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} {...tooltipStyle} />
              <Legend wrapperStyle={{ color: colors.tooltipText }} />
              <Bar dataKey="Income" fill={colors.income} />
              <Bar dataKey="Expenses" fill={colors.expenses} />
              <Bar dataKey="Net" fill={colors.net} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50 mb-4">Monthly Net Profit Trend</h3>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyNet}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: colors.tick }} />
              <YAxis tick={{ fontSize: 12, fill: colors.tick }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} {...tooltipStyle} />
              <Area type="monotone" dataKey="net" stroke={colors.areaStroke} fill={colors.areaFill} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50 mb-4">Expense Breakdown by Bucket</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={expenseBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={(e: any) => e.name}>
                {expenseBreakdown.map((entry, i) => (
                  <Cell key={i} fill={getBucketColor(entry.name).dark} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => formatCurrency(v)} {...tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50 mb-4">ACQ Funnel (YTD)</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={acqFunnelData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis type="number" tick={{ fontSize: 12, fill: colors.tick }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: colors.tick }} width={100} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="value" fill={colors.acqBar} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Marketing Cost by Quarter */}
      {marketingData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-base font-semibold text-ink-900 dark:text-ink-50 mb-4">Acquisition Cost by Channel (YTD)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={marketingData}>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: colors.tick }} angle={-15} textAnchor="end" height={70} />
              <YAxis tick={{ fontSize: 12, fill: colors.tick }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} {...tooltipStyle} />
              <Bar dataKey="cost" fill={colors.marketingBar} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    accent: 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/30',
    red: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30',
    ink: 'text-ink-600 dark:text-ink-300 bg-ink-100 dark:bg-ink-800',
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
      <h2 className="text-lg font-semibold text-ink-900 dark:text-ink-50 mb-4">{title}</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-ink-200 dark:border-ink-800">
              <th className="table-header text-left px-3 py-2">Metric</th>
              {quarters.map(q => <th key={q} className="table-header text-right px-3 py-2">{q}</th>)}
              <th className="table-header text-right px-3 py-2">YTD</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.key} className="border-b border-ink-100 dark:border-ink-800 hover:bg-ink-50 dark:hover:bg-ink-800">
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
