'use client'

import { useState } from 'react'
import type { KbUrl, KbFaq } from '@/types/kb'
import KbUrlsClient from './KbUrlsClient'
import KbFaqsClient from './KbFaqsClient'

interface Props {
  urls: KbUrl[]
  faqs: KbFaq[]
  clientId: string
}

export default function KbTabs({ urls, faqs, clientId }: Props) {
  const [tab, setTab] = useState<'urls' | 'faqs'>('urls')

  return (
    <div>
      <div className="px-8 pt-6" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex gap-6">
          <TabButton active={tab === 'urls'} onClick={() => setTab('urls')}>
            URLs
          </TabButton>
          <TabButton active={tab === 'faqs'} onClick={() => setTab('faqs')}>
            FAQs
          </TabButton>
        </div>
      </div>

      {tab === 'urls' ? (
        <KbUrlsClient urls={urls} clientId={clientId} />
      ) : (
        <KbFaqsClient faqs={faqs} clientId={clientId} />
      )}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="pb-3 text-sm font-medium transition-colors duration-150 cursor-pointer"
      style={{
        color: active ? 'var(--foreground)' : 'var(--muted-foreground)',
        borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
        marginBottom: '-1px',
      }}
    >
      {children}
    </button>
  )
}
