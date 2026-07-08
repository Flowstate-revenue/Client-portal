'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search } from 'lucide-react'
import { toast } from 'sonner'
import type { Consultant } from '@/types/consultant'
import ConsultantTable from '@/components/consultants/ConsultantTable'
import DeleteModal from '@/components/consultants/DeleteModal'
import EditModal from '@/components/consultants/EditModal'
import AddConsultantModal from '@/components/consultants/AddConsultantModal'
import Button from '@/components/ui/Button'

interface Props {
  consultants: Consultant[]
  role: string
  activeClientId: string | null
}

export default function ConsultantsClient({ consultants, role, activeClientId }: Props) {
  const router = useRouter()
  const [list, setList] = useState<Consultant[]>(consultants)
  const [deleting, setDeleting] = useState<Consultant | null>(null)
  const [editing, setEditing] = useState<Consultant | null>(null)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')

  // re-sync when the server re-renders with fresh data
  // (React-recommended "reset state on prop change" pattern — not an effect)
  const [prevConsultants, setPrevConsultants] = useState(consultants)
  if (consultants !== prevConsultants) {
    setPrevConsultants(consultants)
    setList(consultants)
  }

  // pull fresh data when the tab regains focus (e.g. after GHL provisioning)
  useEffect(() => {
    function onFocus() {
      router.refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [router])

  async function confirmDelete() {
    if (!deleting) return
    const c = deleting
    setDeleting(null)
    // optimistic removal; focus-refresh reconciles with the server
    setList((prev) => prev.filter((x) => x.id !== c.id))
    try {
      const res = await fetch('/api/consultants/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: c.id,
          ghlUserId: c.ghlUserId,
          ghlLocationId: c.ghlLocationId,
        }),
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success(
        `Removal triggered for ${c.firstName} ${c.lastName}. GHL will reassign their leads.`
      )
    } catch {
      toast.error('Could not trigger the removal — restoring the row.')
      setList((prev) => [c, ...prev])
    }
  }

  const q = query.trim().toLowerCase()
  const filtered = q
    ? list.filter(
        (c) =>
          `${c.firstName} ${c.lastName}`.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.zipCodes.some((z) => z.includes(q))
      )
    : list

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Solar Consultants
          </h1>
          <span
            className="rounded-full px-2.5 py-0.5 text-sm"
            style={{ backgroundColor: 'var(--border)', color: 'var(--muted-foreground)' }}
          >
            {filtered.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <div
              className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none"
              style={{ color: 'var(--subtle)' }}
            >
              <Search size={16} />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name, email, phone, or zip"
              className="w-48 sm:w-64 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              style={{ backgroundColor: 'var(--background)', border: '1px solid var(--border)', color: 'var(--foreground)' }}
            />
          </div>
          <Button
            type="button"
            variant="primary"
            onClick={() => setAdding(true)}
            disabled={!activeClientId}
            title={activeClientId ? 'Add a consultant' : 'Select a client first'}
          >
            <Plus size={16} />
            Add Consultant
          </Button>
        </div>
      </div>

      {list.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center text-sm"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--muted-foreground)',
          }}
        >
          {role === 'admin' && !activeClientId
            ? 'No consultants to show — select a client to manage their team.'
            : 'No consultants yet. Use “Add Consultant” to create the first one.'}
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="rounded-xl p-10 text-center text-sm"
          style={{
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            color: 'var(--muted-foreground)',
          }}
        >
          No consultants match your search.
        </div>
      ) : (
        <ConsultantTable consultants={filtered} onEdit={setEditing} onDelete={setDeleting} />
      )}

      {editing && (
        <EditModal
          consultant={editing}
          onSaved={(updated) =>
            setList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
          }
          onClose={() => setEditing(null)}
        />
      )}

      {adding && activeClientId && (
        <AddConsultantModal
          clientId={activeClientId}
          onAdded={() => router.refresh()}
          onClose={() => setAdding(false)}
        />
      )}

      {deleting && (
        <DeleteModal
          consultant={deleting}
          onConfirm={confirmDelete}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
