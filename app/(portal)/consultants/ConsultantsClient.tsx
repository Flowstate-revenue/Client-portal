'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SlidersHorizontal, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { Consultant } from '@/types/consultant'
import ConsultantTable from '@/components/consultants/ConsultantTable'
import DeleteModal from '@/components/consultants/DeleteModal'
import Button from '@/components/ui/Button'

interface Props {
  consultants: Consultant[]
  role: string
  activeClientId: string | null
  formUrl: string | null
}

// Build a prefilled GHL form URL. The form's query keys must match these names.
function buildFormUrl(base: string, c?: Consultant): string {
  try {
    const u = new URL(base)
    if (c) {
      u.searchParams.set('ghl_user_id', c.ghlUserId ?? '')
      u.searchParams.set('first_name', c.firstName)
      u.searchParams.set('last_name', c.lastName)
      u.searchParams.set('email', c.email)
      u.searchParams.set('phone', c.phone)
      u.searchParams.set('zip_codes', c.zipCodes.join(','))
      u.searchParams.set('spanish', String(c.spanishSpeaker))
    }
    return u.toString()
  } catch {
    return base
  }
}

export default function ConsultantsClient({ consultants, role, activeClientId, formUrl }: Props) {
  const router = useRouter()
  const [list, setList] = useState<Consultant[]>(consultants)
  const [deleting, setDeleting] = useState<Consultant | null>(null)

  // re-sync when the server re-renders with fresh data
  // (React-recommended "reset state on prop change" pattern — not an effect)
  const [prevConsultants, setPrevConsultants] = useState(consultants)
  if (consultants !== prevConsultants) {
    setPrevConsultants(consultants)
    setList(consultants)
  }

  // pull fresh data when the user returns from the GHL form
  useEffect(() => {
    function onFocus() {
      router.refresh()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [router])

  function openForm(c?: Consultant) {
    if (!formUrl) {
      toast.error('No consultant form is configured for this client yet.')
      return
    }
    window.open(buildFormUrl(formUrl, c), '_blank', 'noopener,noreferrer')
    toast.info(
      c
        ? 'Edit form opened — your changes sync back here after you submit.'
        : 'New consultant form opened.'
    )
  }

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
            {list.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" disabled>
            <SlidersHorizontal size={16} />
            Filters
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={() => openForm()}
            disabled={!formUrl}
            title={formUrl ? 'Add a consultant' : 'Select a client to manage consultants'}
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
      ) : (
        <ConsultantTable consultants={list} onEdit={openForm} onDelete={setDeleting} />
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
