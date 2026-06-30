import type { GHLSyncStatus } from '@/types/consultant'

interface StatusBadgeProps {
  status: GHLSyncStatus
}

const CONFIG: Record<GHLSyncStatus, { label: string; style: React.CSSProperties }> = {
  synced: {
    label: 'Synced',
    style: {
      backgroundColor: 'rgba(16,185,129,0.14)',
      color: '#34D399',
      border: '1px solid rgba(16,185,129,0.3)',
    },
  },
  pending: {
    label: 'Pending',
    style: {
      backgroundColor: 'rgba(245,158,11,0.14)',
      color: '#FCD34D',
      border: '1px solid rgba(245,158,11,0.3)',
    },
  },
  error: {
    label: 'Error',
    style: {
      backgroundColor: 'rgba(239,68,68,0.14)',
      color: '#F87171',
      border: '1px solid rgba(239,68,68,0.3)',
    },
  },
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, style } = CONFIG[status]
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
      style={style}
    >
      <span style={{ fontSize: '8px', lineHeight: 1 }}>●</span>
      {label}
    </span>
  )
}
