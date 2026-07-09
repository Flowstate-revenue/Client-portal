export type GHLSyncStatus = 'synced' | 'pending' | 'error'

export interface Consultant {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  zipCodes: string[]
  spanishSpeaker: boolean
  ghlUserId: string | null
  ghlLocationId: string | null
  ghlSyncStatus: GHLSyncStatus
  active: boolean
  routingPaused: boolean
  routingWeight: number
  createdAt: string
}

export interface DeletedConsultant {
  id: string
  firstName: string
  lastName: string
  email: string
  deletedAt: string | null
  leadsReassignedAt: string | null
  ghlAccessRevokedAt: string | null
  hasGhlUser: boolean
  zipCodes: string[]
  uncoveredZips: string[]
}

export interface ConsultantFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  zipCodes: string[]
  spanishSpeaker: boolean
}
