'use client'

import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Search, Plus, Pencil, Trash2, X, Check, UploadCloud } from 'lucide-react'
import StatusBadge from '@/components/ui/StatusBadge'
import type { KbFaq } from '@/types/kb'

interface KbFaqsClientProps {
  faqs: KbFaq[]
  clientId: string
}

const PAGE_SIZE = 20

// Section: "Knowledge Base > FAQs". Unlike the URLs review page, this is a
// real edit surface -- question/answer text, add, delete -- so edits are
// staged locally (ghlSyncStatus flips to 'pending' the moment you save) and
// only actually pushed to GHL when "Publish changes" is clicked. That
// matches the batched-publish decision: fewer API calls, and a clear
// review-then-commit moment instead of every keystroke silently going live.
export default function KbFaqsClient({ faqs: initialFaqs, clientId }: KbFaqsClientProps) {
  const [faqs, setFaqs] = useState(initialFaqs)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<{ question: string; answer: string }>({ question: '', answer: '' })
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set())
  const [showAddForm, setShowAddForm] = useState(false)
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' })
  const [publishing, setPublishing] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return faqs
    return faqs.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q))
  }, [faqs, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const pendingCount = faqs.filter((f) => f.ghlSyncStatus === 'pending').length

  function startEdit(faq: KbFaq) {
    setEditingId(faq.id)
    setDraft({ question: faq.question, answer: faq.answer })
  }

  async function saveEdit(faqId: string | null) {
    if (!draft.question.trim() || !draft.answer.trim()) {
      toast.error('Question and answer are both required.')
      return
    }
    const key = faqId ?? 'new'
    setSavingIds((prev) => new Set(prev).add(key))
    try {
      const res = await fetch('/api/kb/faqs/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, faq_id: faqId, question: draft.question, answer: draft.answer }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'save_failed')

      if (faqId) {
        setFaqs((prev) =>
          prev.map((f) =>
            f.id === faqId ? { ...f, question: draft.question.trim(), answer: draft.answer.trim(), ghlSyncStatus: 'pending' } : f
          )
        )
        setEditingId(null)
      } else {
        setFaqs((prev) => [
          {
            id: json.id,
            question: draft.question.trim(),
            answer: draft.answer.trim(),
            status: 'active',
            source: 'portal',
            ghlSyncStatus: 'pending',
            updatedAt: new Date().toISOString(),
          },
          ...prev,
        ])
        setShowAddForm(false)
        setNewFaq({ question: '', answer: '' })
      }
      toast.success('Saved. Publish changes to push it to your knowledge base.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save FAQ.')
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    }
  }

  async function deleteFaq(faq: KbFaq) {
    if (!window.confirm(`Delete "${faq.question}"? This will remove it from your knowledge base on next publish.`)) return
    setSavingIds((prev) => new Set(prev).add(faq.id))
    try {
      const res = await fetch('/api/kb/faqs/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, faq_id: faq.id }),
      })
      if (!res.ok) throw new Error()
      setFaqs((prev) => prev.filter((f) => f.id !== faq.id))
      toast.success('Removed. Publish changes to remove it from your knowledge base.')
    } catch {
      toast.error('Failed to delete FAQ.')
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev)
        next.delete(faq.id)
        return next
      })
    }
  }

  async function publish() {
    setPublishing(true)
    try {
      const res = await fetch('/api/kb/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'publish_failed')
      toast.success('Publishing to your knowledge base — status will update shortly.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Publish failed.')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Knowledge Base — FAQs</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Edit, add, or remove FAQs. Changes stay in review until you publish them.
          </p>
        </div>
        <button
          onClick={publish}
          disabled={publishing || pendingCount === 0}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
        >
          <UploadCloud size={16} />
          {publishing ? 'Publishing…' : `Publish changes${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
        </button>
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
            placeholder="Search FAQs..."
            className="w-full rounded-lg border border-border bg-card pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          onClick={() => setShowAddForm((v) => !v)}
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-muted cursor-pointer"
        >
          <Plus size={16} />
          Add FAQ
        </button>
      </div>

      {showAddForm && (
        <div className="space-y-3 rounded-xl border border-border bg-card p-4">
          <input
            value={newFaq.question}
            onChange={(e) => setNewFaq((v) => ({ ...v, question: e.target.value }))}
            placeholder="Question"
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <textarea
            value={newFaq.answer}
            onChange={(e) => setNewFaq((v) => ({ ...v, answer: e.target.value }))}
            placeholder="Answer"
            rows={3}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewFaq({ question: '', answer: '' })
              }}
              className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setDraft(newFaq)
                saveEdit(null)
              }}
              disabled={savingIds.has('new')}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
            >
              Save FAQ
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {pageRows.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
            No FAQs match your search.
          </div>
        ) : (
          pageRows.map((faq) => {
            const isEditing = editingId === faq.id
            const isSaving = savingIds.has(faq.id)
            return (
              <div key={faq.id} className="rounded-xl border border-border bg-card p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <input
                      value={draft.question}
                      onChange={(e) => setDraft((v) => ({ ...v, question: e.target.value }))}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <textarea
                      value={draft.answer}
                      onChange={(e) => setDraft((v) => ({ ...v, answer: e.target.value }))}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
                      >
                        <X size={14} />
                        Cancel
                      </button>
                      <button
                        onClick={() => saveEdit(faq.id)}
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50 cursor-pointer"
                      >
                        <Check size={14} />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-foreground">{faq.question}</h3>
                        <StatusBadge status={faq.ghlSyncStatus} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{faq.answer}</p>
                    </div>
                    <div className="flex shrink-0 gap-1.5">
                      <button
                        onClick={() => startEdit(faq)}
                        disabled={isSaving}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50 cursor-pointer"
                        aria-label="Edit FAQ"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => deleteFaq(faq)}
                        disabled={isSaving}
                        className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 cursor-pointer"
                        aria-label="Delete FAQ"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
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
