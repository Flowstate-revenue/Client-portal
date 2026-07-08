'use client'

import { useState } from 'react'
import type { Consultant } from '@/types/consultant'
import type { TerritoryZip } from '@/types/territory'
import ConsultantsClient from './ConsultantsClient'
import TerritoriesView from './TerritoriesView'

interface Props {
  consultants: Consultant[]
  role: string
  activeClientId: string | null
  territories: TerritoryZip[]
}

export default function ConsultantsTabs({
  consultants,
  role,
  activeClientId,
  territories,
}: Props) {
  const [tab, setTab] = useState<'reps' | 'territories'>('reps')

  return (
    <div>
      <div className="px-8 pt-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex gap-6">
          <TabButton active={tab === 'reps'} onClick={() => setTab('reps')}>
            Sales Reps
          </TabButton>
          <TabButton active={tab === 'territories'} onClick={() => setTab('territories')}>
            Territories
          </TabButton>
        </div>
      </div>

      {tab === 'reps' ? (
        <ConsultantsClient consultants={consultants} role={role} activeClientId={activeClientId} />
      ) : (
        <TerritoriesView
          territories={territories}
          role={role}
          activeClientId={activeClientId}
          consultants={consultants}
        />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pb-3 text-sm font-medium transition-colors duration-150 cursor-pointer"
      style={{
        color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
        borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
        marginBottom: '-1px',
      }}
    >
      {children}
    </button>
  )
}
