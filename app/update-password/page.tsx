'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Logo from '@/components/ui/Logo'
import { createClient } from '@/utils/supabase/client'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  // The /auth/confirm route sets a session cookie before redirecting here.
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      setReady(Boolean(data.user))
      setChecking(false)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      toast.success('Password saved. Signing you in…')
      router.push('/billing')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save your password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <Logo variant="wordmark" height={36} className="mb-4" />
          <p className="mt-2 text-center text-sm text-muted-foreground">Set your password</p>
        </div>

        <div className="bg-card p-8 rounded-xl border border-border shadow-2xl">
          {checking ? (
            <div className="flex justify-center py-6">
              <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
            </div>
          ) : !ready ? (
            <div className="text-center space-y-4">
              <p className="text-sm text-foreground">This link is invalid or has expired.</p>
              <Link href="/forgot-password" className="inline-block text-sm text-primary hover:underline">
                Request a new link
              </Link>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              <PasswordField id="password" label="New Password" value={password} onChange={setPassword} loading={loading} autoComplete="new-password" />
              <PasswordField id="confirm" label="Confirm Password" value={confirm} onChange={setConfirm} loading={loading} autoComplete="new-password" />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-background transition-colors duration-150 disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function PasswordField({
  id, label, value, onChange, loading, autoComplete,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; loading: boolean; autoComplete: string
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-muted-foreground mb-2">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-muted-foreground">
          <Lock size={18} />
        </div>
        <input
          id={id}
          name={id}
          type="password"
          autoComplete={autoComplete}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="block w-full pl-10 pr-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
          placeholder="••••••••"
          disabled={loading}
        />
      </div>
    </div>
  )
}
