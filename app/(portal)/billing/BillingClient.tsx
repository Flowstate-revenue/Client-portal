'use client'

import { useState, useMemo } from 'react'
import { Search, SlidersHorizontal, ArrowUpDown, ChevronDown, Receipt, Calendar, CreditCard, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import type { BillableEvent } from '@/types/supabase'

interface BillingClientProps {
  initialEvents: BillableEvent[]
  role: string
  activeClientId: string | null
}

const OUTCOME_LABELS: Record<string, string> = {
  sit: 'Sit Appointment',
  proposal_followup: 'Proposal Follow-up',
  reactivation: 'Reactivation',
  referral: 'Referral',
  review: 'Review',
}

const OUTCOME_COLORS: Record<string, string> = {
  sit: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  proposal_followup: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  reactivation: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  referral: 'bg-teal-500/10 text-teal-500 border-teal-500/20',
  review: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
}

const STATUS_LABELS: Record<string, string> = {
  not_yet_billed: 'Not Yet Billed',
  covered_by_deposit: 'Covered By Deposit',
  invoice_created: 'Invoice Created',
  payment_pending: 'Payment Pending',
  paid: 'Paid',
  failed: 'Failed',
}

const STATUS_COLORS: Record<string, string> = {
  not_yet_billed: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  covered_by_deposit: 'bg-amber-500/15 text-amber-500 border-amber-500/30',
  invoice_created: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  payment_pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  paid: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
}

export default function BillingClient({ initialEvents, role, activeClientId }: BillingClientProps) {
  const [viewMode, setViewMode] = useState<'current' | 'previous'>('current') // 'current' = open items, 'previous' = previous month paid items
  const [searchQuery, setSearchQuery] = useState('')
  const [outcomeFilter, setOutcomeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'value'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  // Calculate previous calendar month date boundaries
  const prevMonthBounds = useMemo(() => {
    const now = new Date()
    const firstOfPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastOfPrev = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)
    return { first: firstOfPrev, last: lastOfPrev }
  }, [])

  // Filter & Sort Events
  const processedEvents = useMemo(() => {
    return initialEvents
      .filter((event) => {
        const eventDate = new Date(event.event_date)

        // View Mode Filter
        if (viewMode === 'current') {
          // Open items (not yet paid)
          const isOpenStatus = ['not_yet_billed', 'covered_by_deposit', 'invoice_created', 'payment_pending'].includes(event.status)
          if (!isOpenStatus) return false
        } else {
          // Paid items from prior calendar month
          const isPaid = event.status === 'paid'
          const inPrevMonth = eventDate >= prevMonthBounds.first && eventDate <= prevMonthBounds.last
          if (!isPaid || !inPrevMonth) return false
        }

        // Search Filter
        if (searchQuery) {
          const q = searchQuery.toLowerCase()
          const nameMatch = event.lead_name?.toLowerCase().includes(q)
          const emailMatch = event.lead_email?.toLowerCase().includes(q)
          if (!nameMatch && !emailMatch) return false
        }

        // Outcome Type Filter
        if (outcomeFilter !== 'all' && event.outcome_type !== outcomeFilter) {
          return false
        }

        // Status Filter
        if (statusFilter !== 'all' && event.status !== statusFilter) {
          return false
        }

        return true
      })
      .sort((a, b) => {
        let valA: any = a.event_date
        let valB: any = b.event_date

        if (sortBy === 'value') {
          valA = Number(a.unit_price) || 0
          valB = Number(b.unit_price) || 0
        } else {
          valA = new Date(a.event_date).getTime()
          valB = new Date(b.event_date).getTime()
        }

        if (sortOrder === 'desc') {
          return valA > valB ? -1 : valA < valB ? 1 : 0
        } else {
          return valA < valB ? -1 : valA > valB ? 1 : 0
        }
      })
  }, [initialEvents, viewMode, searchQuery, outcomeFilter, statusFilter, sortBy, sortOrder, prevMonthBounds])

  // Summary Metrics calculations based on the filtered list (or all open items)
  const metrics = useMemo(() => {
    // We compute metrics specifically from all matching/filtered events in the current view
    let openBalance = 0
    let totalCount = processedEvents.length
    const outcomeCounts: Record<string, number> = {
      sit: 0,
      proposal_followup: 0,
      reactivation: 0,
      referral: 0,
      review: 0,
    }

    processedEvents.forEach((event) => {
      // Open balance sum
      if (['not_yet_billed', 'covered_by_deposit', 'invoice_created', 'payment_pending'].includes(event.status)) {
        openBalance += Number(event.unit_price) || 0
      }
      
      // Breakdown counts
      if (event.outcome_type in outcomeCounts) {
        outcomeCounts[event.outcome_type]++
      }
    })

    return {
      openBalance,
      totalCount,
      outcomeCounts,
    }
  }, [processedEvents])

  const toggleSort = (field: 'date' | 'value') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const handleManageBilling = () => {
    toast.info('Stripe billing portal coming soon.')
  }

  // Format currency
  const formatUSD = (val: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(val)
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/New_York',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Billable Outcomes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {viewMode === 'current'
              ? 'Real-time ledger of active, billable events.'
              : `Billed items for ${prevMonthBounds.first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}.`}
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Toggle current/previous month */}
          <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-sm">
            <button
              onClick={() => {
                setViewMode('current')
                setStatusFilter('all')
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'current'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Current Period
            </button>
            <button
              onClick={() => {
                setViewMode('previous')
                setStatusFilter('all')
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                viewMode === 'previous'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Previous Month
            </button>
          </div>

          {/* Manage Billing CTA */}
          {activeClientId && (
            <button
              onClick={handleManageBilling}
              className="inline-flex items-center gap-2 bg-primary hover:bg-amber-600 text-primary-foreground font-semibold px-4 py-2 rounded-lg text-sm transition-colors duration-150 cursor-pointer shadow-md"
            >
              <CreditCard size={16} />
              <span>Manage Billing</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary metrics strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Open Balance card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">
              {viewMode === 'current' ? 'Period Open Balance' : 'Billed Total'}
            </span>
            <Receipt size={18} className="text-primary" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-2">
            {formatUSD(metrics.openBalance)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {viewMode === 'current' ? 'Sum of non-paid items' : 'Paid amount in previous period'}
          </div>
        </div>

        {/* Total Events card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Outcomes</span>
            <Calendar size={18} className="text-primary" />
          </div>
          <div className="text-2xl font-bold tracking-tight text-foreground mt-2">
            {metrics.totalCount}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Matching selected filters
          </div>
        </div>

        {/* Breakdown card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">
            Outcome Breakdown
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Sit Appts:</span>
              <span className="font-bold text-foreground">{metrics.outcomeCounts.sit}</span>
            </div>
            <div className="flex justify-between">
              <span>Follow-ups:</span>
              <span className="font-bold text-foreground">{metrics.outcomeCounts.proposal_followup}</span>
            </div>
            <div className="flex justify-between">
              <span>Reactivation:</span>
              <span className="font-bold text-foreground">{metrics.outcomeCounts.reactivation}</span>
            </div>
            <div className="flex justify-between">
              <span>Referrals:</span>
              <span className="font-bold text-foreground">{metrics.outcomeCounts.referral}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row gap-4 bg-card border border-border rounded-xl p-4 shadow-sm">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search lead name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-lg pl-10 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          />
        </div>

        {/* Outcome Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2">
            <SlidersHorizontal size={14} className="text-muted-foreground" />
            <select
              value={outcomeFilter}
              onChange={(e) => setOutcomeFilter(e.target.value)}
              className="bg-background border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
            >
              <option value="all">All Outcomes</option>
              {Object.entries(OUTCOME_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-background border border-border text-foreground rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background cursor-pointer"
          >
            <option value="all">All Statuses</option>
            {Object.entries(STATUS_LABELS)
              .filter(([k]) => {
                // If previous month view, only paid is relevant, but keep all for simplicity
                return viewMode === 'current' ? k !== 'paid' : k === 'paid'
              })
              .map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Events Table */}
      <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-card/70 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
                {role === 'admin' && (
                  <th className="px-6 py-4">Client / Company</th>
                )}
                <th className="px-6 py-4">Lead Name</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Phone</th>
                <th className="px-6 py-4">Outcome</th>
                <th
                  onClick={() => toggleSort('value')}
                  className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors group select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Value</span>
                    <ArrowUpDown size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </th>
                <th className="px-6 py-4">Status</th>
                <th
                  onClick={() => toggleSort('date')}
                  className="px-6 py-4 cursor-pointer hover:text-foreground transition-colors group select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>Date</span>
                    <ArrowUpDown size={14} className="text-muted-foreground group-hover:text-foreground transition-colors" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {processedEvents.length > 0 ? (
                processedEvents.map((event) => (
                  <tr key={event.id} className="hover:bg-muted/30 transition-colors">
                    {role === 'admin' && (
                      <td className="px-6 py-4 font-medium text-foreground">
                        {event.clients?.company_name || 'N/A'}
                      </td>
                    )}
                    <td className="px-6 py-4 font-semibold text-foreground">
                      {event.lead_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {event.lead_email || '—'}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {event.lead_phone || '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        OUTCOME_COLORS[event.outcome_type] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {OUTCOME_LABELS[event.outcome_type] || event.outcome_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-bold text-foreground">
                      {formatUSD(Number(event.unit_price) || 0)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        STATUS_COLORS[event.status] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {STATUS_LABELS[event.status] || event.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {formatDate(event.event_date)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={role === 'admin' ? 8 : 7}
                    className="px-6 py-12 text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Receipt size={32} className="text-muted-foreground/55 mb-1" />
                      <p className="font-semibold text-foreground">No billable outcomes yet.</p>
                      <p className="text-xs">No outcomes match the current filtering and view selection.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
