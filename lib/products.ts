// Single source of truth for Flowstate's five billable products.
// Consumed by Billing (labels + badge classes) and the Dashboard (dot/chart
// hex). Colors are all-cool on purpose so no product reads as good vs bad.

export const PRODUCT_KEYS = [
  'sit',
  'proposal_followup',
  'reactivation',
  'referral',
  'review',
] as const

export type ProductKey = (typeof PRODUCT_KEYS)[number]

export interface Product {
  key: ProductKey
  label: string // singular — billing rows, badges, filters
  labelPlural: string // plural — dashboard cards
  hex: string // dots and charts
  badge: string // Tailwind classes for billing badges
}

export const PRODUCTS: Record<ProductKey, Product> = {
  sit: {
    key: 'sit',
    label: 'Sit Appointment',
    labelPlural: 'Sit Appointments',
    hex: '#3b82f6',
    badge: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  },
  proposal_followup: {
    key: 'proposal_followup',
    label: 'Proposal Follow-up',
    labelPlural: 'Proposal Follow-ups',
    hex: '#6366f1',
    badge: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20',
  },
  reactivation: {
    key: 'reactivation',
    label: 'Reactivation',
    labelPlural: 'Reactivations',
    hex: '#8b5cf6',
    badge: 'bg-violet-500/10 text-violet-500 border-violet-500/20',
  },
  referral: {
    key: 'referral',
    label: 'Referral',
    labelPlural: 'Referrals',
    hex: '#06b6d4',
    badge: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  },
  review: {
    key: 'review',
    label: 'Review',
    labelPlural: 'Reviews',
    hex: '#0ea5e9',
    badge: 'bg-sky-500/10 text-sky-500 border-sky-500/20',
  },
}

// Ordered list for iteration (dashboard cards, chart series, filters).
export const PRODUCT_LIST: Product[] = PRODUCT_KEYS.map((k) => PRODUCTS[k])

// Lookup maps matching the billing page's existing { key: value } shape.
export const PRODUCT_LABELS: Record<string, string> = Object.fromEntries(
  PRODUCT_LIST.map((p) => [p.key, p.label])
)
export const PRODUCT_BADGES: Record<string, string> = Object.fromEntries(
  PRODUCT_LIST.map((p) => [p.key, p.badge])
)
