import { supabase } from './supabase'
import type { AcqRollup, DispoRollup, FinancialRollup, MarketingRollup, FunnelRatios } from './types'
import { safeDivide } from './utils'

const ACQ_FIELDS = 'dials,conversations,leads_pushed,pass_offs,process,appts_set,offers,contracts,closed,dropped'
const DISPO_FIELDS = 'total_dials,calls_connected,follow_ups,buyer_box_collected,scheduled_deals,deals_pitched,queries,offers,offers_made,deals_locked_up'

function emptyAcq(): AcqRollup {
  return { dials: 0, conversations: 0, leads_pushed: 0, pass_offs: 0, process: 0, appts_set: 0, offers: 0, contracts: 0, closed: 0, dropped: 0 }
}

function emptyDispo(): DispoRollup {
  return { total_dials: 0, calls_connected: 0, follow_ups: 0, buyer_box_collected: 0, scheduled_deals: 0, deals_pitched: 0, queries: 0, offers: 0, offers_made: 0, deals_locked_up: 0 }
}

function sumAcqRows(rows: any[]): AcqRollup {
  return rows.reduce((acc, r) => {
    acc.dials += r.dials || 0
    acc.conversations += r.conversations || 0
    acc.leads_pushed += r.leads_pushed || 0
    acc.pass_offs += r.pass_offs || 0
    acc.process += r.process || 0
    acc.appts_set += r.appts_set || 0
    acc.offers += r.offers || 0
    acc.contracts += r.contracts || 0
    acc.closed += r.closed || 0
    acc.dropped += r.dropped || 0
    return acc
  }, emptyAcq())
}

function sumDispoRows(rows: any[]): DispoRollup {
  return rows.reduce((acc, r) => {
    acc.total_dials += r.total_dials || 0
    acc.calls_connected += r.calls_connected || 0
    acc.follow_ups += r.follow_ups || 0
    acc.buyer_box_collected += r.buyer_box_collected || 0
    acc.scheduled_deals += r.scheduled_deals || 0
    acc.deals_pitched += r.deals_pitched || 0
    acc.queries += r.queries || 0
    acc.offers += r.offers || 0
    acc.offers_made += r.offers_made || 0
    acc.deals_locked_up += r.deals_locked_up || 0
    return acc
  }, emptyDispo())
}

export function computeFunnelRatios(a: AcqRollup): FunnelRatios {
  return {
    conv_rate: safeDivide(a.conversations, a.dials) * 100,
    pass_off_rate: safeDivide(a.pass_offs, a.conversations) * 100,
    offer_contract_rate: safeDivide(a.contracts, a.offers) * 100,
  }
}

// ============================================================
// ACQ ROLLUPS
// ============================================================

export async function getAcqRollupByQuarter(year: number, quarter?: number): Promise<Record<string, AcqRollup>> {
  let query = supabase.from('acq_activity').select(`${ACQ_FIELDS},quarter`).eq('year', year)
  if (quarter) query = query.eq('quarter', quarter)
  const { data, error } = await query
  if (error) throw error

  const result: Record<string, AcqRollup> = {}
  const rows = (data || []) as any[]
  if (quarter) {
    result[`Q${quarter}`] = sumAcqRows(rows)
  } else {
    for (let q = 1; q <= 4; q++) {
      result[`Q${q}`] = sumAcqRows(rows.filter(r => r.quarter === q))
    }
    result['YTD'] = sumAcqRows(rows)
  }
  return result
}

export async function getAcqRollupByMonth(year: number): Promise<Record<string, AcqRollup>> {
  const { data, error } = await supabase.from('acq_activity').select(`${ACQ_FIELDS},month`).eq('year', year)
  if (error) throw error

  const result: Record<string, AcqRollup> = {}
  for (let m = 1; m <= 12; m++) {
    result[String(m)] = sumAcqRows((data || []).filter(r => r.month === m))
  }
  return result
}

export async function getAcqByRole(year: number, quarter?: number): Promise<Record<string, AcqRollup>> {
  let query = supabase.from('acq_activity').select(`${ACQ_FIELDS},role`).eq('year', year)
  if (quarter) query = query.eq('quarter', quarter)
  const { data, error } = await query
  if (error) throw error

  const result: Record<string, AcqRollup> = {}
  for (const row of data || []) {
    if (!result[row.role]) result[row.role] = emptyAcq()
    Object.keys(result[row.role]).forEach(k => {
      (result[row.role] as any)[k] += (row as any)[k] || 0
    })
  }
  return result
}

// ============================================================
// DISPO ROLLUPS
// ============================================================

export async function getDispoRollupByQuarter(year: number, quarter?: number): Promise<Record<string, DispoRollup>> {
  let query = supabase.from('dispo_activity').select(`${DISPO_FIELDS},quarter`).eq('year', year)
  if (quarter) query = query.eq('quarter', quarter)
  const { data, error } = await query
  if (error) throw error

  const result: Record<string, DispoRollup> = {}
  const rows = (data || []) as any[]
  if (quarter) {
    result[`Q${quarter}`] = sumDispoRows(rows)
  } else {
    for (let q = 1; q <= 4; q++) {
      result[`Q${q}`] = sumDispoRows(rows.filter(r => r.quarter === q))
    }
    result['YTD'] = sumDispoRows(rows)
  }
  return result
}

export async function getDispoRollupByMonth(year: number): Promise<Record<string, DispoRollup>> {
  const { data, error } = await supabase.from('dispo_activity').select(`${DISPO_FIELDS},month`).eq('year', year)
  if (error) throw error

  const result: Record<string, DispoRollup> = {}
  for (let m = 1; m <= 12; m++) {
    result[String(m)] = sumDispoRows((data || []).filter(r => r.month === m))
  }
  return result
}

// ============================================================
// FINANCIAL ROLLUPS
// ============================================================

export async function getFinancialRollupByQuarter(year: number, quarter?: number): Promise<Record<string, FinancialRollup>> {
  let query = supabase.from('ledger_entries').select('amount,expense_amt,income_amt,bucket,quarter').eq('year', year)
  if (quarter) query = query.eq('quarter', quarter)
  const { data, error } = await query
  if (error) throw error

  const result: Record<string, FinancialRollup> = {}
  const rows = data || []
  const buildForRows = (r: any[]): FinancialRollup => {
    const income = r.reduce((s, x) => s + Number(x.income_amt), 0)
    const expenses = r.reduce((s, x) => s + Number(x.expense_amt), 0)
    const by_bucket: Record<string, number> = {}
    for (const x of r) {
      const b = x.bucket || 'Misc'
      by_bucket[b] = (by_bucket[b] || 0) + Number(x.expense_amt)
    }
    return { income, expenses, net_profit: income - expenses, by_bucket }
  }

  if (quarter) {
    result[`Q${quarter}`] = buildForRows(rows)
  } else {
    for (let q = 1; q <= 4; q++) {
      result[`Q${q}`] = buildForRows(rows.filter(r => r.quarter === q))
    }
    result['YTD'] = buildForRows(rows)
  }
  return result
}

export async function getMonthlyNetProfit(year: number): Promise<{ month: string; net: number }[]> {
  const { data, error } = await supabase.from('ledger_entries').select('expense_amt,income_amt,month').eq('year', year)
  if (error) throw error

  const result: { month: string; net: number }[] = []
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  for (let m = 1; m <= 12; m++) {
    const rows = (data || []).filter(r => r.month === m)
    const income = rows.reduce((s, x) => s + Number(x.income_amt), 0)
    const expenses = rows.reduce((s, x) => s + Number(x.expense_amt), 0)
    result.push({ month: monthNames[m - 1], net: income - expenses })
  }
  return result
}

// ============================================================
// MARKETING ROLLUPS (calculated from Ledger)
// ============================================================

export async function getMarketingCostByChannel(year: number, quarter?: number): Promise<MarketingRollup[]> {
  // Get all Acquisition-bucket ledger entries
  let query = supabase.from('ledger_entries').select('category,expense_amt,quarter').eq('year', year).eq('bucket', 'Acquisition')
  if (quarter) query = query.eq('quarter', quarter)
  const { data: ledgerRows, error } = await query
  if (error) throw error

  // Get category mappings
  const { data: mappings, error: mErr } = await supabase.from('category_mappings').select('category,channel')
  if (mErr) throw mErr

  const mappingMap = new Map<string, string | null>()
  for (const m of mappings || []) {
    mappingMap.set(m.category.toLowerCase(), m.channel)
  }

  // Get marketing channels for alias matching
  const { data: channels, error: cErr } = await supabase.from('marketing_channels').select('name,aliases')
  if (cErr) throw cErr

  const channelCosts: Record<string, number> = {}
  const unmappedCategories: Set<string> = new Set()

  for (const row of ledgerRows || []) {
    const cat = (row.category || '').trim()
    const catLower = cat.toLowerCase()
    const expense = Number(row.expense_amt)

    // Try direct mapping first
    let channel = mappingMap.get(catLower)

    // If no direct mapping, try alias matching
    if (!channel) {
      for (const ch of channels || []) {
        if (ch.aliases && ch.aliases.some((a: string) => catLower.includes(a.toLowerCase()))) {
          channel = ch.name
          break
        }
      }
    }

    if (channel) {
      channelCosts[channel] = (channelCosts[channel] || 0) + expense
    } else {
      unmappedCategories.add(cat)
      channelCosts['Unmapped'] = (channelCosts['Unmapped'] || 0) + expense
    }
  }

  return Object.entries(channelCosts)
    .map(([channel, cost]) => ({ channel, cost }))
    .sort((a, b) => b.cost - a.cost)
}

export async function getUnmappedCategories(year: number): Promise<string[]> {
  const { data: ledgerRows, error } = await supabase.from('ledger_entries')
    .select('category').eq('year', year).eq('bucket', 'Acquisition')
  if (error) throw error

  const { data: mappings, error: mErr } = await supabase.from('category_mappings').select('category,channel')
  if (mErr) throw mErr

  const mappingMap = new Set<string>()
  for (const m of mappings || []) {
    if (m.channel) mappingMap.add(m.category.toLowerCase())
  }

  const { data: channels, error: cErr } = await supabase.from('marketing_channels').select('name,aliases')
  if (cErr) throw cErr

  const unmapped = new Set<string>()
  for (const row of ledgerRows || []) {
    const cat = (row.category || '').trim()
    const catLower = cat.toLowerCase()
    if (mappingMap.has(catLower)) continue
    let matched = false
    for (const ch of channels || []) {
      if (ch.aliases && ch.aliases.some((a: string) => catLower.includes(a.toLowerCase()))) {
        matched = true
        break
      }
    }
    if (!matched) unmapped.add(cat)
  }
  return Array.from(unmapped).sort()
}

// ============================================================
// ARBITRARY DATE-RANGE SUMMARY (Dashboard range selector)
// ============================================================

export interface RangeSummary {
  income: number
  expenses: number
  net_profit: number
  acq_dials: number
  acq_contracts: number
  dispo_deals_locked: number
}

// Plain date BETWEEN filter — works identically for any preset (day, week,
// month, quarter, year, or a fully custom range), since the caller computes
// `from`/`to` client-side. No need to route through the generated
// year/month/quarter columns the other rollups use.
export async function getRangeSummary(from: string, to: string): Promise<RangeSummary> {
  const [ledgerRes, acqRes, dispoRes] = await Promise.all([
    supabase.from('ledger_entries').select('income_amt,expense_amt').gte('date', from).lte('date', to),
    supabase.from('acq_activity').select('dials,contracts').gte('date', from).lte('date', to),
    supabase.from('dispo_activity').select('deals_locked_up').gte('date', from).lte('date', to),
  ])
  if (ledgerRes.error) throw ledgerRes.error
  if (acqRes.error) throw acqRes.error
  if (dispoRes.error) throw dispoRes.error

  const income = (ledgerRes.data || []).reduce((s, r) => s + Number(r.income_amt), 0)
  const expenses = (ledgerRes.data || []).reduce((s, r) => s + Number(r.expense_amt), 0)
  const acq_dials = (acqRes.data || []).reduce((s, r) => s + (r.dials || 0), 0)
  const acq_contracts = (acqRes.data || []).reduce((s, r) => s + (r.contracts || 0), 0)
  const dispo_deals_locked = (dispoRes.data || []).reduce((s, r) => s + (r.deals_locked_up || 0), 0)

  return { income, expenses, net_profit: income - expenses, acq_dials, acq_contracts, dispo_deals_locked }
}

// ============================================================
// COMBINED DATA FOR REPORTS
// ============================================================

export interface ReportData {
  financial: Record<string, FinancialRollup>
  acq: Record<string, AcqRollup>
  dispo: Record<string, DispoRollup>
  marketing: MarketingRollup[]
  funnelRatios: FunnelRatios
}

export async function getReportData(year: number, quarter?: number): Promise<ReportData> {
  const [financial, acq, dispo, marketing] = await Promise.all([
    getFinancialRollupByQuarter(year, quarter),
    getAcqRollupByQuarter(year, quarter),
    getDispoRollupByQuarter(year, quarter),
    getMarketingCostByChannel(year, quarter),
  ])

  const ytdAcq = acq['YTD'] || emptyAcq()
  return {
    financial,
    acq,
    dispo,
    marketing,
    funnelRatios: computeFunnelRatios(ytdAcq),
  }
}
