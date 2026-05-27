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
    <main style={{ minHeight: '100vh', background: '#F5F4F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 16px' }}>

        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '52px', height: '52px', borderRadius: '12px',
            background: '#1A1917', color: '#F5F4F0',
            fontSize: '20px', fontWeight: 600, marginBottom: '12px'
          }}>FS</div>
          <h1 style={{ fontSize: '20px', fontWeight: 600, letterSpacing: '-0.3px', color: '#1A1917', margin: 0 }}>
            FSVOICE
          </h1>
          <p style={{ fontSize: '13px', color: '#9E9C95', marginTop: '2px', fontFamily: 'DM Mono, monospace', letterSpacing: '0.5px' }}>
            CAR ONE
          </p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '28px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '20px', margin: '0 0 20px 0' }}>Iniciar sesión</h2>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B6A64', marginBottom: '4px' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
                autoFocus
                style={{
                  width: '100%', background: '#F0EFE9', border: '1px solid #E2E0D8',
                  borderRadius: '6px', padding: '8px 11px', fontSize: '13.5px',
                  color: '#1A1917', outline: 'none', fontFamily: 'DM Sans, sans-serif',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#6B6A64', marginBottom: '4px' }}>Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: '100%', background: '#F0EFE9', border: '1px solid #E2E0D8',
                  borderRadius: '6px', padding: '8px 11px', fontSize: '13.5px',
                  color: '#1A1917', outline: 'none', fontFamily: 'DM Sans, sans-serif',
                  boxSizing: 'border-box'
                }}
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
              disabled={loading}
              style={{
                width: '100%', height: '40px', background: '#1A1917', color: '#F5F4F0',
                border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#9E9C95' }}>
          MERA Solutions · Gestión CSAT
        </p>
      </div>
    </main>
  )
}
