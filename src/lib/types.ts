// Type definitions for all NextOS data models

export type AcqRole = 'ACQ Manager' | 'Cold Caller' | 'FUS' | 'OM' | 'Admin' | 'SMM' | 'PPC' | 'PPL'
export type DispoRole = 'Disposition Agent' | 'Sr Dispo' | 'Jr Dispo'
export type LedgerType = 'Expense' | 'Income' | 'Transfer'
export type ExpenseBucket = 'Acquisition' | 'Processing' | 'Commissions' | 'Admin' | 'Misc' | 'Non-Operating'

export interface AcqActivity {
  id: string
  date: string
  employee: string
  role: string
  dials: number
  conversations: number
  leads_pushed: number
  pass_offs: number
  process: number
  appts_set: number
  offers: number
  contracts: number
  closed: number
  dropped: number
  notes: string | null
  year: number
  month: number
  quarter: number
  week_start: string | null
}

export interface DispoActivity {
  id: string
  date: string
  employee: string
  role: string
  total_dials: number
  calls_connected: number
  follow_ups: number
  buyer_box_collected: number
  scheduled_deals: number
  deals_pitched: number
  queries: number
  offers: number
  offers_made: number
  deals_locked_up: number
  notes: string | null
  year: number
  month: number
  quarter: number
  week_start: string | null
}

export interface LedgerEntry {
  id: string
  date: string
  description: string
  category: string
  type: string
  amount: number
  payment_method: string | null
  payment_type: string | null
  bucket: string
  notes: string | null
  year: number
  month: number
  quarter: number
  expense_amt: number
  income_amt: number
}

export interface MarketingChannel {
  id: string
  name: string
  aliases: string[]
}

export interface CategoryMapping {
  id: string
  category: string
  bucket: string
  channel: string | null
}

export interface Profile {
  id: string
  display_name: string
  email: string | null
  role: string
}

// Rollup types
export interface PeriodRollup {
  year: number
  quarter: number
  total: number
}

export interface AcqRollup {
  dials: number
  conversations: number
  leads_pushed: number
  pass_offs: number
  process: number
  appts_set: number
  offers: number
  contracts: number
  closed: number
  dropped: number
}

export interface DispoRollup {
  total_dials: number
  calls_connected: number
  follow_ups: number
  buyer_box_collected: number
  scheduled_deals: number
  deals_pitched: number
  queries: number
  offers: number
  offers_made: number
  deals_locked_up: number
}

export interface FinancialRollup {
  income: number
  expenses: number
  net_profit: number
  by_bucket: Record<string, number>
}

export interface MarketingRollup {
  channel: string
  cost: number
}

export interface FunnelRatios {
  conv_rate: number
  pass_off_rate: number
  offer_contract_rate: number
}
