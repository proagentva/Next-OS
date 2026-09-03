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

// Canonical tab keys — identical across every organization, only which
// subset each member is granted (organization_members.allowed_tabs) varies.
export const ORG_TAB_IDS = [
  'dashboard', 'acquisition', 'disposition', 'marketing', 'quarterly',
  'reports', 'settings', 'team', 'profile',
] as const
export type OrgTabId = typeof ORG_TAB_IDS[number]

export type OrgRole = 'owner' | 'admin' | 'member'

export interface Organization {
  id: string
  name: string
  code: string
  timezone: string
  created_by: string | null
  created_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: string
  kpi_role: string | null
  allowed_tabs: string[]
  joined_at: string
}

export interface OrganizationInvite {
  id: string
  organization_id: string
  token: string
  email: string | null
  invited_role: string
  invited_kpi_role: string | null
  invited_allowed_tabs: string[]
  created_by: string | null
  expires_at: string | null
  used_at: string | null
  created_at: string
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
