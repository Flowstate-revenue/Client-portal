interface ZipTagProps {
  zip: string
  onRemove?: () => void
}

export default function ZipTag({ zip, onRemove }: ZipTagProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-mono"
      style={{ backgroundColor: 'var(--border)', color: 'var(--muted-foreground)' }}
    >
      {zip}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="transition-colors duration-150 cursor-pointer leading-none"
          style={{ color: 'var(--subtle)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--foreground)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--subtle)')}
        >
          ×
        </button>
      )}
    </span>
  )
}
