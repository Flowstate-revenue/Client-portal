export interface TerritoryRep {
  name: string
  sharePct: number
  paused: boolean
}

export interface TerritoryZip {
  zip: string
  city: string | null
  state: string | null
  reps: TerritoryRep[]
  lastAssigned: string | null
}
