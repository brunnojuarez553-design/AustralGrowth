'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos.'
        : signInError.message)
      setLoading(false)
      return
    }

    try {
      await fetch('/api/auth/bootstrap', { method: 'POST' })
    } catch {
      // no bloqueamos el login si el bootstrap falla; las rutas protegidas lo reintentarán
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-[380px]">
        <div className="flex flex-col items-center mb-8">
          <div className="relative w-14 h-14 mb-4">
            <div className="absolute inset-0 rounded-[12px] bg-[var(--accent)] opacity-25 blur-[14px]" />
            <Image
              src="https://res.cloudinary.com/dgp7uhps3/image/upload/v1784260223/logo_austral_web_studio_wcitrd.png"
              alt="Austral Web Studio"
              width={56}
              height={56}
              className="relative object-contain"
              priority
            />
          </div>
          <h1 className="text-[17px] font-semibold" style={{ color: 'var(--text)' }}>Austral Growth</h1>
          <p className="text-[12px] mt-1" style={{ color: 'var(--text-3)' }}>Ingresá para ver tu pipeline</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-[12px] p-6 space-y-4"
          style={{ background: 'var(--surface)', border: '1px solid var(--border-2)' }}
        >
          {error && (
            <div className="text-[12px] rounded-[7px] px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="vos@australwebstudio.com"
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[7px] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--accent)] transition-all"
              style={{ color: 'var(--text)' }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-medium" style={{ color: 'var(--text-3)' }}>Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[var(--surface-2)] border border-[var(--border-2)] rounded-[7px] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--accent)] transition-all"
              style={{ color: 'var(--text)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-[7px] text-[13px] font-semibold text-white transition-all disabled:opacity-50"
            style={{ background: 'var(--accent)' }}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-[11px] mt-5" style={{ color: 'var(--text-3)' }}>
          Austral Web Studio · Ushuaia, Argentina
        </p>
      </div>
    </div>
  )
}
