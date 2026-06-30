'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import Modal from '@/components/ui/Modal'
import ZipTag from '@/components/ui/ZipTag'
import type { Consultant, ConsultantFormData } from '@/types/consultant'

interface ConsultantFormProps {
  mode: 'add' | 'edit'
  consultant?: Consultant
  onSave: (data: ConsultantFormData) => void
  onClose: () => void
}

const EMPTY_FORM: ConsultantFormData = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  zipCodes: [],
  spanishSpeaker: false,
}

const inputStyle: React.CSSProperties = {
  backgroundColor: '#08090D',
  border: '1px solid #1E2130',
  borderRadius: '0.5rem',
  padding: '0.625rem 0.75rem',
  color: '#F8F9FA',
  fontSize: '0.875rem',
  width: '100%',
  outline: 'none',
  transition: 'border-color 150ms, box-shadow 150ms',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: '#6B7280',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.375rem',
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

function StyledInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  const [focused, setFocused] = useState(false)
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        ...inputStyle,
        borderColor: focused ? '#F59E0B' : '#1E2130',
        boxShadow: focused ? '0 0 0 2px #F59E0B' : 'none',
      }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  )
}

function ZipInput({
  zipCodes,
  onChange,
}: {
  zipCodes: string[]
  onChange: (zips: string[]) => void
}) {
  const [input, setInput] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function addZip(raw: string) {
    const zip = raw.trim().replace(',', '')
    if (/^\d{5}$/.test(zip) && !zipCodes.includes(zip)) {
      onChange([...zipCodes, zip])
    }
    setInput('')
  }

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addZip(input)
    } else if (e.key === 'Backspace' && input === '' && zipCodes.length > 0) {
      onChange(zipCodes.slice(0, -1))
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 items-center cursor-text rounded-lg px-3 py-2.5"
      style={{
        ...inputStyle,
        padding: '0.5rem 0.75rem',
        borderColor: focused ? '#F59E0B' : '#1E2130',
        boxShadow: focused ? '0 0 0 2px #F59E0B' : 'none',
        minHeight: '42px',
        width: '100%',
        height: 'auto',
      }}
      onClick={() => inputRef.current?.focus()}
    >
      {zipCodes.map((zip) => (
        <ZipTag
          key={zip}
          zip={zip}
          onRemove={() => onChange(zipCodes.filter((z) => z !== zip))}
        />
      ))}
      <input
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKey}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          if (input) addZip(input)
        }}
        placeholder={zipCodes.length === 0 ? 'Type a zip code and press Enter' : ''}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: '#F8F9FA',
          fontSize: '0.875rem',
          flexGrow: 1,
          minWidth: '120px',
        }}
      />
    </div>
  )
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="cursor-pointer relative flex-shrink-0"
      style={{
        width: '40px',
        height: '22px',
        borderRadius: '11px',
        backgroundColor: checked ? '#F59E0B' : '#1E2130',
        border: 'none',
        padding: 0,
        transition: 'background-color 150ms',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: '3px',
          left: checked ? '21px' : '3px',
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          backgroundColor: checked ? '#ffffff' : '#6B7280',
          transition: 'left 150ms, background-color 150ms',
        }}
      />
    </button>
  )
}

export default function ConsultantForm({
  mode,
  consultant,
  onSave,
  onClose,
}: ConsultantFormProps) {
  const [form, setForm] = useState<ConsultantFormData>(
    mode === 'edit' && consultant
      ? {
          firstName: consultant.firstName,
          lastName: consultant.lastName,
          email: consultant.email,
          phone: consultant.phone,
          zipCodes: consultant.zipCodes,
          spanishSpeaker: consultant.spanishSpeaker,
        }
      : EMPTY_FORM
  )

  function update<K extends keyof ConsultantFormData>(key: K, value: ConsultantFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSave(form)
  }

  const title =
    mode === 'add'
      ? 'Add Consultant'
      : `Edit Consultant — ${consultant?.firstName} ${consultant?.lastName}`

  return (
    <Modal onClose={onClose}>
      <h2
        className="text-lg font-semibold mb-5 pr-6"
        style={{ color: '#F8F9FA' }}
      >
        {title}
      </h2>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* First / Last */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="First Name">
            <StyledInput
              value={form.firstName}
              onChange={(v) => update('firstName', v)}
              placeholder="Maria"
            />
          </Field>
          <Field label="Last Name">
            <StyledInput
              value={form.lastName}
              onChange={(v) => update('lastName', v)}
              placeholder="Garcia"
            />
          </Field>
        </div>

        {/* Email */}
        <Field label="Email Address">
          <StyledInput
            type="email"
            value={form.email}
            onChange={(v) => update('email', v)}
            placeholder="consultant@sunpro.com"
          />
        </Field>

        {/* Phone */}
        <Field label="Mobile Phone">
          <StyledInput
            type="tel"
            value={form.phone}
            onChange={(v) => update('phone', v)}
            placeholder="(512) 555-0100"
          />
        </Field>

        {/* Zip Codes */}
        <Field label="Territory — Zip Codes">
          <ZipInput
            zipCodes={form.zipCodes}
            onChange={(zips) => update('zipCodes', zips)}
          />
        </Field>

        {/* Spanish Speaker */}
        <div className="flex items-center justify-between">
          <span style={labelStyle}>Spanish Speaker</span>
          <Toggle
            checked={form.spanishSpeaker}
            onChange={(v) => update('spanishSpeaker', v)}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm transition-colors duration-150 cursor-pointer"
            style={{
              border: '1px solid #1E2130',
              color: '#9CA3AF',
              backgroundColor: 'transparent',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#F59E0B'
              e.currentTarget.style.color = '#F8F9FA'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#1E2130'
              e.currentTarget.style.color = '#9CA3AF'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-sm font-semibold transition-colors duration-150 cursor-pointer"
            style={{ backgroundColor: '#F59E0B', color: '#030712' }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#D97706')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#F59E0B')}
          >
            {mode === 'add' ? 'Save Consultant' : 'Update Consultant'}
          </button>
        </div>

        {mode === 'add' && (
          <p className="text-xs italic" style={{ color: '#6B7280' }}>
            Saving will create this user in GoHighLevel and return their User ID.
          </p>
        )}
      </form>
    </Modal>
  )
}
