import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { supabase } from '../lib/supabase'
import type { Organization, OrganizationMember } from '../lib/types'

const CURRENT_ORG_KEY = 'nextos_current_org_id'
const PENDING_INVITE_KEY = 'nextos_pending_invite'

interface Membership extends OrganizationMember {
  organizations: Organization
}

interface OrganizationContextType {
  organizations: Organization[]
  currentOrganization: Organization | null
  currentMembership: OrganizationMember | null
  loading: boolean
  inviteError: string | null
  switchOrganization: (orgId: string) => void
  createOrganization: (name: string, code: string, timezone: string) => Promise<{ error: string | null }>
  joinByCode: (code: string) => Promise<{ error: string | null }>
  refreshOrganizations: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [inviteError, setInviteError] = useState<string | null>(null)

  const fetchMemberships = async () => {
    if (!user) {
      setMemberships([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select('*, organizations(*)')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching organizations:', error)
      setLoading(false)
      return
    }

    const rows = (data || []) as Membership[]
    setMemberships(rows)

    const stored = localStorage.getItem(CURRENT_ORG_KEY)
    const validStored = rows.find(m => m.organization_id === stored)
    setCurrentOrgId(validStored ? stored! : rows[0]?.organization_id ?? null)
    setLoading(false)
  }

  useEffect(() => {
    if (!user) {
      setMemberships([])
      setCurrentOrgId(null)
      setLoading(false)
      return
    }

    (async () => {
      setLoading(true)

      const pendingToken = sessionStorage.getItem(PENDING_INVITE_KEY)
      if (pendingToken) {
        sessionStorage.removeItem(PENDING_INVITE_KEY)
        const { error } = await supabase.rpc('redeem_invite', { p_token: pendingToken })
        if (error) setInviteError(error.message)
      }

      await fetchMemberships()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const switchOrganization = (orgId: string) => {
    setCurrentOrgId(orgId)
    localStorage.setItem(CURRENT_ORG_KEY, orgId)
  }

  const createOrganization = async (name: string, code: string, timezone: string) => {
    const { data, error } = await supabase.rpc('create_organization', {
      p_name: name,
      p_code: code,
      p_timezone: timezone,
    })
    if (error) return { error: error.message }
    await fetchMemberships()
    if (data?.id) switchOrganization(data.id)
    return { error: null }
  }

  const joinByCode = async (code: string) => {
    const { data, error } = await supabase.rpc('redeem_join_code', { p_code: code })
    if (error) return { error: error.message }
    await fetchMemberships()
    if (data?.id) switchOrganization(data.id)
    return { error: null }
  }

  const organizations = memberships.map(m => m.organizations)
  const currentMembership = memberships.find(m => m.organization_id === currentOrgId) ?? null
  const currentOrganization = currentMembership?.organizations ?? null

  return (
    <OrganizationContext.Provider
      value={{
        organizations,
        currentOrganization,
        currentMembership,
        loading,
        inviteError,
        switchOrganization,
        createOrganization,
        joinByCode,
        refreshOrganizations: fetchMemberships,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const ctx = useContext(OrganizationContext)
  if (!ctx) throw new Error('useOrganization must be used within OrganizationProvider')
  return ctx
}
