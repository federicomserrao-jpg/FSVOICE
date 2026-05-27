'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Perfil } from '@/types'

interface Props {
  perfiles: Perfil[]
  clientes: any[]
  totalClientes: number
}

export default function AdminPanel({ perfiles, clientes, totalClientes }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<'usuarios' | 'clientes'>('usuarios')

  // Form nuevo usuario
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoEmail, setNuevoEmail] = useState('')
  const [nuevoPassword, setNuevoPassword] = useState('')
  const [nuevoRol, setNuevoRol] = useState<'operador' | 'admin'>('operador')
  const [creando, setCreando] = useState(false)
  const [msgUsuario, setMsgUsuario] = useState('')

  async function crearUsuario() {
    if (!nuevoNombre || !nuevoEmail || !nuevoPassword) { setMsgUsuario('Completá todos los campos'); return }
    setCreando(true)
    setMsgUsuario('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email: nuevoEmail,
      password: nuevoPassword,
      options: { data: { nombre: nuevoNombre, rol: nuevoRol } }
    })
    if (error) {
      setMsgUsuario(`Error: ${error.message}`)
    } else {
      setMsgUsuario(`✓ Usuario ${nuevoNombre} creado. Debe confirmar el email.`)
      setNuevoNombre(''); setNuevoEmail(''); setNuevoPassword('')
      router.refresh()
    }
    setCreando(false)
  }

  return (
    <>
      {/* TOPBAR */}
      <div style={{ height: '56px', borderBottom: '1px solid #E2E0D8', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px', background: '#fff', flexShrink: 0 }}>
        <h1 style={{ fontSize: '15px', fontWeight: 600 }}>Gestión admin</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {/* TABS */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: '#F0EFE9', padding: '4px', borderRadius: '8px', width: 'fit-content' }}>
          {(['usuarios', 'clientes'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '6px 20px', borderRadius: '6px', fontSize: '13.5px', fontWeight: 500,
              border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
              background: tab === t ? '#1A1917' : 'none',
              color: tab === t ? '#F5F4F0' : '#6B6A64',
            }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>

        {/* USUARIOS */}
        {tab === 'usuarios' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

            {/* Crear usuario */}
            <div className="card">
              <div className="section-title">Crear nuevo usuario</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label className="form-label">Nombre completo</label>
                  <input className="form-input" value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Juan López" />
                </div>
                <div>
                  <label className="form-label">Email</label>
                  <input className="form-input" type="email" value={nuevoEmail} onChange={e => setNuevoEmail(e.target.value)} placeholder="juan@empresa.com" />
                </div>
                <div>
                  <label className="form-label">Contraseña temporal</label>
                  <input className="form-input" type="password" value={nuevoPassword} onChange={e => setNuevoPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
                </div>
                <div>
                  <label className="form-label">Rol</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {(['operador', 'admin'] as const).map(r => (
                      <button key={r} onClick={() => setNuevoRol(r)} style={{
                        flex: 1, padding: '8px', borderRadius: '6px', fontSize: '13px', fontWeight: 500,
                        border: '1px solid', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.12s',
                        borderColor: nuevoRol === r ? '#1A1917' : '#E2E0D8',
                        background: nuevoRol === r ? '#1A1917' : '#F0EFE9',
                        color: nuevoRol === r ? '#F5F4F0' : '#6B6A64',
                      }}>{r.charAt(0).toUpperCase() + r.slice(1)}</button>
                    ))}
                  </div>
                </div>
                {msgUsuario && (
                  <div style={{
                    padding: '10px 12px', borderRadius: '6px', fontSize: '13px',
                    background: msgUsuario.startsWith('✓') ? '#D8F3DC' : '#FAE0E0',
                    color: msgUsuario.startsWith('✓') ? '#2D6A4F' : '#8B2020',
                    border: `1px solid ${msgUsuario.startsWith('✓') ? '#9FE1CB' : '#F09595'}`
                  }}>{msgUsuario}</div>
                )}
                <button className="btn btn-primary" onClick={crearUsuario} disabled={creando} style={{ justifyContent: 'center', height: '40px' }}>
                  {creando ? 'Creando...' : '+ Crear usuario'}
                </button>
              </div>
            </div>

            {/* Lista usuarios */}
            <div className="card">
              <div className="section-title">Usuarios activos ({perfiles.length})</div>
              <div>
                {perfiles.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0', borderBottom: '1px solid #F0EFE9' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%', background: p.rol === 'admin' ? '#1A1917' : '#DDE9F8',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 600, color: p.rol === 'admin' ? '#F5F4F0' : '#1B4F8A', flexShrink: 0
                    }}>
                      {p.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13.5px', fontWeight: 500 }}>{p.nombre}</div>
                      <div style={{ fontSize: '12px', color: '#9E9C95' }}>{p.email}</div>
                    </div>
                    <span style={{
                      padding: '3px 9px', borderRadius: '20px', fontSize: '11.5px', fontWeight: 500,
                      background: p.rol === 'admin' ? '#1A1917' : '#DDE9F8',
                      color: p.rol === 'admin' ? '#F5F4F0' : '#1B4F8A',
                    }}>{p.rol}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {tab === 'clientes' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', color: '#6B6A64' }}>{totalClientes} clientes cargados</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                <a href="/api/clientes/template" download>
                  <button className="btn">⬇ Descargar template CSV</button>
                </a>
              </div>
            </div>

            <div style={{ background: '#DDE9F8', border: '1px solid #85B7EB', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', fontSize: '13.5px', color: '#1B4F8A' }}>
              <strong>Para cargar clientes:</strong> Importá el CSV directamente en Supabase → Table Editor → clientes → Import data, o usá el script de importación incluido en <code>/supabase/import_clientes.py</code>.
            </div>

            <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#F0EFE9' }}>
                    {['Cliente', 'DNI', 'Concesionaria', 'Vehículo', 'Operador asignado'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11.5px', fontWeight: 500, color: '#9E9C95', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #E2E0D8' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientes.slice(0, 20).map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #E2E0D8' }}>
                      <td style={{ padding: '10px 14px', fontSize: '13.5px' }}><strong>{c.apellido}, {c.nombre}</strong></td>
                      <td style={{ padding: '10px 14px', fontSize: '13px', fontFamily: 'DM Mono, monospace', color: '#6B6A64' }}>{c.dni ?? '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px' }}>{c.concesionaria ?? '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: '13px' }}>{c.marca} {c.modelo}</td>
                      <td style={{ padding: '10px 14px', fontSize: '12.5px', color: '#6B6A64' }}>{(c.perfil as any)?.nombre ?? <span style={{ color: '#9E9C95' }}>Sin asignar</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {totalClientes > 20 && (
                <div style={{ padding: '12px 14px', fontSize: '12.5px', color: '#9E9C95', borderTop: '1px solid #E2E0D8' }}>
                  Mostrando 20 de {totalClientes} registros
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
