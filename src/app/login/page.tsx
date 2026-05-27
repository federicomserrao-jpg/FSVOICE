'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos.')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-content-center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 16px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '12px',
            background: '#1A1917', color: '#F5F4F0',
            fontSize: '20px', fontWeight: '600', marginBottom: '12px'
          }}>FS</div>
          <h1 style={{ fontSize: '20px', fontWeight: '600', letterSpacing: '-0.3px', color: '#1A1917' }}>
            FSVOICE
          </h1>
          <p style={{ fontSize: '13px', color: '#9E9C95', marginTop: '2px', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px' }}>
            CAR ONE
          </p>
        </div>

        {/* Card */}
        <div className="card" style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px' }}>Iniciar sesión</h2>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div style={{
                background: '#FAE0E0', border: '1px solid #F09595', borderRadius: '6px',
                padding: '10px 12px', fontSize: '13px', color: '#8B2020', marginBottom: '16px'
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', height: '40px', fontSize: '14px' }}
              disabled={loading}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#9E9C95' }}>
          MERA Solutions · Gestión CSAT
        </p>
      </div>
    </div>
  )
}
