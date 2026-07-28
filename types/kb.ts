import type { GHLSyncStatus } from './consultant'

export interface KbUrl {
  id: string
  url: string
  title: string | null
  excluded: boolean
}

export type KbType = 'core' | 'sit' | 'proposal_followup' | 'reactivation' | 'review' | 'referral'

// Single source of truth for the 6 knowledge bases -- portal UI (filter tabs,
// add-FAQ picker) and the publish route's per-KB url-id columns both key off
// these same slugs, so keep this list in sync with the kb_type check
// constraints on kb_faqs / client_knowledge_bases.
export const KB_TYPES: { value: KbType; label: string }[] = [
  { value: 'core', label: 'Core & Customer Service' },
  { value: 'sit', label: 'Appointment Setter' },
  { value: 'proposal_followup', label: 'Proposal Follow-Up' },
  { value: 'reactivation', label: 'Lead Reactivation' },
  { value: 'review', label: 'Reviews' },
  { value: 'referral', label: 'Referrals' },
]

export function kbTypeLabel(kbType: string | null): string {
  return KB_TYPES.find((k) => k.value === kbType)?.label ?? 'Unassigned'
}

export interface KbFaq {
  id: string
  question: string
  answer: string
  status: 'active' | 'deleted'
  source: 'generated' | 'portal'
  ghlSyncStatus: GHLSyncStatus
  updatedAt: string
  kbType: KbType | null
}
