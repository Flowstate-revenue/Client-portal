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
  ghlSyncStatus: GHLSyncStatus
  active: boolean
  createdAt: string
}

export interface ConsultantFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  zipCodes: string[]
  spanishSpeaker: boolean
}
