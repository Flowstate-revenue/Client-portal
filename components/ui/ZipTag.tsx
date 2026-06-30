interface ZipTagProps {
  zip: string
  onRemove?: () => void
}

export default function ZipTag({ zip, onRemove }: ZipTagProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono"
      style={{ backgroundColor: '#1E2130', color: '#9CA3AF' }}
    >
      {zip}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="transition-colors duration-150 cursor-pointer leading-none"
          style={{ color: '#6B7280' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#F8F9FA')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#6B7280')}
        >
          ×
        </button>
      )}
    </span>
  )
}
