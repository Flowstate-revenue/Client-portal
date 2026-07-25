'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Search, ExternalLink } from 'lucide-react'
import type { KbUrl } from '@/types/kb'

interface KbUrlsClientProps {
  urls: KbUrl[]
  clientId: string
}

const PAGE_SIZE = 50

// Section: "Knowledge Base > URLs" tab. Firecrawl/GHL's own crawler can surface
// hundreds of discovered pages (470+ on our test client) -- this is a
// review-and-exclude surface, not a create/edit one, so the interaction is
// deliberately narrow: search, exclude/include per row, and bulk
// exclude/include over whatever the current search matches (not just the
// visible page) so a client isn't stuck clicking 470 checkboxes one at a
// time.
export default function KbUrlsClient({ urls: initialUrls, clientId }: KbUrlsClientProps) {
  const [urls, setUrls] = useState(initialUrls)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return urls
    return urls.filter((u) => u.url.toLowerCase().includes(q) || u.title?.toLowerCase().includes(q))
  }, [urls, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const includedCount = urls.filter((u) => !u.excluded).length
  const excludedCount = urls.length - includedCount

  async function toggleOne(url: KbUrl, excluded: boolean) {
    setPendingIds((prev) => new Set(prev).add(url.id))
    setUrls((prev) => prev.map((u) => (u.id === url.id ? { ...u, excluded } : u)))
    try {
      const res = await fetch('/api/kb/urls/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, url_id: url.id, excluded }),
      })
      if (!res.ok) throw new Error()
    } catch {
      // revert on failure
      setUrls((prev) => prev.map((u) => (u.id === url.id ? { ...u, excluded: !excluded } : u)))
      toast.error('Failed to update. Please try again.')
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev)
        next.delete(url.id)
        return next
      })
    }
  }

  async function bulkSet(excluded: boolean) {
    if (filtered.length === 0) return
    setBulkLoading(true)
    const ids = filtered.map((u) => u.id)
    try {
      const res = await fetch('/api/kb/urls/bulk-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, url_ids: ids, excluded }),
      })
      if (!res.ok) throw new Error()
      const idSet = new Set(ids)
      setUrls((prev) => prev.map((u) => (idSet.has(u.id) ? { ...u, excluded } : u)))
      toast.success(`${excluded ? 'Excluded' : 'Included'} ${ids.length} URL${ids.length === 1 ? '' : 's'}`)
    } catch {
      toast.error('Bulk update failed. Please try again.')
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="text-lg font-semibold text-foreground">URLs</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Review the pages discovered for this client&rsquo;s knowledge base. Uncheck anything that shouldn&rsquo;t be trained on.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4">
        <span className="text-sm text-foreground">
          <strong className="tabular-nums">{urls.length}</strong> URLs total
        </span>
        <span className="text-sm text-muted-foreground">
          <strong className="tabular-nums text-foreground">{includedCount}</strong> included
        </span>
        <span className="text-sm text-muted-foreground">
          <strong className="tabular-nums text-foreground">{excludedCount}</strong> excluded
        </span>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-subtle pointer-events-none" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search URLs..."
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filtered.length} match{filtered.length === 1 ? '' : 'es'}
          </span>
          <button
            onClick={() => bulkSet(true)}
            disabled={bulkLoading || filtered.length === 0}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
          >
            Exclude all matching
          </button>
          <button
            onClick={() => bulkSet(false)}
            disabled={bulkLoading || filtered.length === 0}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
          >
            Include all matching
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="w-12 px-4 py-3"></th>
              <th className="px-4 py-3">URL</th>
              <th className="w-28 px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No URLs match your search.
                </td>
              </tr>
            ) : (
              pageRows.map((url) => (
                <tr key={url.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                  <td className="px-4 py-2.5">
                    <input
                      type="checkbox"
                      checked={!url.excluded}
                      disabled={pendingIds.has(url.id)}
                      onChange={(e) => toggleOne(url, !e.target.checked)}
                      className="h-4 w-4 cursor-pointer accent-primary"
                      title="Include in knowledge base"
                    />
                  </td>
                  <td className="px-4 py-2.5">
                    <a
                      href={url.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-foreground hover:text-primary break-all"
                    >
                      {url.url}
                      <ExternalLink size={12} className="shrink-0 text-subtle" />
                    </a>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                        url.excluded
                          ? 'bg-muted text-muted-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}
                    >
                      {url.excluded ? 'Excluded' : 'Included'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted disabled:opacity-50 cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
