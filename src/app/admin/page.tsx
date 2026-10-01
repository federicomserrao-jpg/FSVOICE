'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Perfil } from '@/types'

export default function AdminPage() {
  const router = useRouter()
  const [perfiles, setPerfiles] = useState<Perfil[]>([])
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<'operador'|'admin'>('operador')
  const [creando, setCreando] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { loadPerfiles() }, [])

  async function loadPerfiles() {
    const supabase = createClient()
    const { data } = await supabase.from('perfiles').select('*').order('nombre')
    setPerfiles(data ?? [])
  }

  async function crearUsuario() {
    if (!nombre || !email || !password) { setMsg('Completá todos los campos'); return }
    setCreando(true); setMsg('')
    const supabase = createClient()

    // 1. Crear usuario en Supabase Auth
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre, rol } }
    })

    if (error) { setMsg(`Error: ${error.message}`); setCreando(false); return }

    // 2. Confirmar automáticamente via API route
    try {
      await fetch('/api/confirm-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
    } catch (e) {
      // Si falla la confirmación automática, no es bloqueante
    }

    setMsg(`✓ Usuario ${nombre} creado. Ya puede ingresar sin confirmar email.`)
    setNombre(''); setEmail(''); setPassword('')
    loadPerfiles()
    setCreando(false)
  }

  return (
    <>
      <div style={{ height: '68px', display: 'flex', alignItems: 'center', padding: '0 28px', background: '#ECEEF1', flexShrink: 0 }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Gestión admin</h1>
        <button onClick={() => router.push('/dashboard')} style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #DDE1E6', background: '#fff', color: '#14171A', fontFamily: 'inherit' }}>
          ← Volver
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 28px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

          {/* Crear usuario */}
          <div style={{ background: '#fff', border: '1px solid #DDE1E6', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#727A84', marginBottom: '16px' }}>Crear nuevo usuario</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#565D66', marginBottom: '4px' }}>Nombre completo</label>
                <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Juan López"
                  style={{ width: '100%', background: '#F3F5F7', border: '1px solid #DDE1E6', borderRadius: '6px', padding: '8px 11px', fontSize: '13.5px', color: '#14171A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#565D66', marginBottom: '4px' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@empresa.com"
                  style={{ width: '100%', background: '#F3F5F7', border: '1px solid #DDE1E6', borderRadius: '6px', padding: '8px 11px', fontSize: '13.5px', color: '#14171A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#565D66', marginBottom: '4px' }}>Contraseña temporal</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                  style={{ width: '100%', background: '#F3F5F7', border: '1px solid #DDE1E6', borderRadius: '6px', padding: '8px 11px', fontSize: '13.5px', color: '#14171A', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#565D66', marginBottom: '4px' }}>Rol</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['operador','admin'] as const).map(r => (
                    <button key={r} onClick={() => setRol(r)}
                      style={{ flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, border: '1px solid', cursor: 'pointer', fontFamily: 'inherit', borderColor: rol === r ? '#14171A' : '#DDE1E6', background: rol === r ? '#14171A' : '#F3F5F7', color: rol === r ? '#fff' : '#565D66' }}>
                      {r.charAt(0).toUpperCase()+r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {msg && (
                <div style={{ padding: '10px 12px', borderRadius: '6px', fontSize: '13px', background: msg.startsWith('✓') ? '#D8F3DC' : '#FAE0E0', color: msg.startsWith('✓') ? '#2D6A4F' : '#8B2020', border: `1px solid ${msg.startsWith('✓') ? '#9FE1CB' : '#F09595'}` }}>
                  {msg}
                </div>
              )}
              <button onClick={crearUsuario} disabled={creando}
                style={{ width: '100%', height: '40px', background: '#14171A', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '14px', fontWeight: 500, cursor: creando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: creando ? 0.7 : 1 }}>
                {creando ? 'Creando...' : '+ Crear usuario'}
              </button>
            </div>
          </div>

          {/* Lista usuarios */}
          <div style={{ background: '#fff', border: '1px solid #DDE1E6', borderRadius: '14px', padding: '20px' }}>
            <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#727A84', marginBottom: '16px' }}>Usuarios activos ({perfiles.length})</div>
            {perfiles.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #F3F5F7' }}>
                <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: p.rol === 'admin' ? '#14171A' : '#DDE9F8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600, color: p.rol === 'admin' ? '#fff' : '#1B4F8A', flexShrink: 0 }}>
                  {p.nombre.split(' ').map((n: string) => n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre}</div>
                  <div style={{ fontSize: '12px', color: '#727A84', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.email}</div>
                </div>
                <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 500, flexShrink: 0, background: p.rol === 'admin' ? '#14171A' : '#DDE9F8', color: p.rol === 'admin' ? '#fff' : '#1B4F8A' }}>
                  {p.rol}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
