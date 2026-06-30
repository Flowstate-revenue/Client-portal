'use client'

import { useState } from 'react'
import { SlidersHorizontal, Plus } from 'lucide-react'
import type { Consultant, ConsultantFormData } from '@/types/consultant'
import ConsultantTable from '@/components/consultants/ConsultantTable'
import ConsultantForm from '@/components/consultants/ConsultantForm'
import DeleteModal from '@/components/consultants/DeleteModal'
import Button from '@/components/ui/Button'

const MOCK_CONSULTANTS: Consultant[] = [
  {
    id: '1',
    firstName: 'Maria',
    lastName: 'Garcia',
    email: 'maria.garcia@sunpro.com',
    phone: '(512) 555-0101',
    zipCodes: ['78701', '78702', '78703'],
    spanishSpeaker: true,
    ghlUserId: 'usr_abc123',
    ghlSyncStatus: 'synced',
    active: true,
    createdAt: '2026-01-15',
  },
  {
    id: '2',
    firstName: 'James',
    lastName: 'Chen',
    email: 'j.chen@sunpro.com',
    phone: '(512) 555-0202',
    zipCodes: ['78704', '78705'],
    spanishSpeaker: false,
    ghlUserId: 'usr_def456',
    ghlSyncStatus: 'synced',
    active: true,
    createdAt: '2026-02-03',
  },
  {
    id: '3',
    firstName: 'Rosa',
    lastName: 'Mendez',
    email: 'rosa.m@sunpro.com',
    phone: '(512) 555-0303',
    zipCodes: ['78701', '78706', '78707'],
    spanishSpeaker: true,
    ghlUserId: null,
    ghlSyncStatus: 'pending',
    active: true,
    createdAt: '2026-04-20',
  },
  {
    id: '4',
    firstName: 'Derek',
    lastName: 'Okafor',
    email: 'd.okafor@sunpro.com',
    phone: '(512) 555-0404',
    zipCodes: ['78708', '78709', '78710', '78711'],
    spanishSpeaker: false,
    ghlUserId: 'usr_ghi789',
    ghlSyncStatus: 'error',
    active: true,
    createdAt: '2026-03-11',
  },
]

type ModalState =
  | { type: 'none' }
  | { type: 'add' }
  | { type: 'edit'; consultant: Consultant }
  | { type: 'delete'; consultant: Consultant }

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

export default function ConsultantsPage() {
  const [consultants, setConsultants] = useState<Consultant[]>(MOCK_CONSULTANTS)
  const [modal, setModal] = useState<ModalState>({ type: 'none' })

  function closeModal() {
    setModal({ type: 'none' })
  }

  function handleSave(data: ConsultantFormData) {
    if (modal.type === 'add') {
      const next: Consultant = {
        ...data,
        id: genId(),
        ghlUserId: null,
        ghlSyncStatus: 'pending',
        active: true,
        createdAt: new Date().toISOString().slice(0, 10),
      }
      setConsultants((prev) => [...prev, next])
    } else if (modal.type === 'edit') {
      setConsultants((prev) =>
        prev.map((c) =>
          c.id === modal.consultant.id ? { ...c, ...data } : c
        )
      )
    }
    closeModal()
  }

  function handleDelete() {
    if (modal.type !== 'delete') return
    setConsultants((prev) => prev.filter((c) => c.id !== modal.consultant.id))
    closeModal()
  }

  return (
    <div className="p-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground)' }}>
            Solar Consultants
          </h1>
          <span
            className="rounded-full px-2.5 py-0.5 text-sm"
            style={{ backgroundColor: 'var(--border)', color: 'var(--muted-foreground)' }}
          >
            {consultants.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filters — UI only / disabled */}
          <Button type="button" variant="secondary" disabled>
            <SlidersHorizontal size={16} />
            Filters
          </Button>

          <Button type="button" variant="primary" onClick={() => setModal({ type: 'add' })}>
            <Plus size={16} />
            Add Consultant
          </Button>
        </div>
      </div>

      {/* Table */}
      <ConsultantTable
        consultants={consultants}
        onEdit={(c) => setModal({ type: 'edit', consultant: c })}
        onDelete={(c) => setModal({ type: 'delete', consultant: c })}
      />

      {/* Modals */}
      {modal.type === 'add' && (
        <ConsultantForm mode="add" onSave={handleSave} onClose={closeModal} />
      )}
      {modal.type === 'edit' && (
        <ConsultantForm
          mode="edit"
          consultant={modal.consultant}
          onSave={handleSave}
          onClose={closeModal}
        />
      )}
      {modal.type === 'delete' && (
        <DeleteModal
          consultant={modal.consultant}
          onConfirm={handleDelete}
          onClose={closeModal}
        />
      )}
    </div>
  )
}
