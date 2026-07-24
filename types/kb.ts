import type { GHLSyncStatus } from './consultant'

export interface KbUrl {
  id: string
  url: string
  title: string | null
  excluded: boolean
}

export interface KbFaq {
  id: string
  question: string
  answer: string
  status: 'active' | 'deleted'
  source: 'generated' | 'portal'
  ghlSyncStatus: GHLSyncStatus
  updatedAt: string
}
