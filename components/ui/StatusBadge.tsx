import type { GHLSyncStatus } from '@/types/consultant'

interface StatusBadgeProps {
  status: GHLSyncStatus
}

const CONFIG: Record<GHLSyncStatus, { label: string; style: React.CSSProperties }> = {
  synced: {
    label: 'Synced',
    style: {
      backgroundColor: 'rgba(6,78,59,0.6)',
      color: '#34D399',
      border: '1px solid rgba(6,95,70,0.4)',
    },
  },
  pending: {
    label: 'Pending',
    style: {
      backgroundColor: 'rgba(120,53,15,0.6)',
      color: '#FCD34D',
      border: '1px solid rgba(146,64,14,0.4)',
    },
  },
  error: {
    label: 'Error',
    style: {
      backgroundColor: 'rgba(127,29,29,0.6)',
      color: '#F87171',
      border: '1px solid rgba(153,27,27,0.4)',
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
