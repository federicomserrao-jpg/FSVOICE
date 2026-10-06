'use client'
import { registrar } from '@/lib/actividad'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { Perfil } from '@/types'

const VACIO = { apellido: '', nombre: '', dni: '', telefono: '', telefono_alternativo: '', email: '', concesionaria: '', marca: '', modelo: '', fecha_compra: '', prioridad: true, prioridad_motivo: '' }

export default function NuevoClienteModal({ perfil, onClose, onCreado }: { perfil: Perfil; onClose: () => void; onCreado: () => void }) {
  const [f, setF] = useState(VACIO)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const set = (k: keyof typeof VACIO, v: any) => setF(prev => ({ ...prev, [k]: v }))

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!f.apellido.trim() && !f.nombre.trim()) return setError('Completá el nombre o el apellido del cliente.')
    if (!f.telefono.trim()) return setError('Completá el teléfono: sin eso el asesor no puede llamar.')
    if (f.prioridad && !f.prioridad_motivo.trim()) return setError('Contá por qué es prioritario, así el asesor lo ve antes de llamar.')
    setGuardando(true); setError('')
    const t = (s: string) => s.trim() || null
    const { error: err } = await createClient().from('clientes').insert({
      apellido: f.apellido.trim().toUpperCase() || null, nombre: f.nombre.trim().toUpperCase() || null,
      dni: t(f.dni), telefono: t(f.telefono), telefono_alternativo: t(f.telefono_alternativo), email: t(f.email),
      concesionaria: t(f.concesionaria), marca: t(f.marca), modelo: t(f.modelo), fecha_compra: f.fecha_compra || null,
      prioridad: f.prioridad, prioridad_motivo: f.prioridad ? f.prioridad_motivo.trim() : null,
      creado_por: perfil.id, origen: 'manual',
    })
    setGuardando(false)
    if (err) { console.error(err); return setError('No se pudo guardar el cliente. Revisá los datos e intentá de nuevo.') }
    registrar('cliente_agregado', `${[f.apellido, f.nombre].filter(Boolean).join(', ').toUpperCase()}${f.prioridad ? ' (prioritario)' : ''}`)
    onCreado()
  }

  const label = { display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '5px' } as const
  const input = { width: '100%', border: '1px solid #BCC3CB', borderRadius: '8px', padding: '9px 11px', fontSize: '14px', color: '#14171A', background: '#fff' } as const
  const campo = (k: keyof typeof VACIO, texto: string, extra: any = {}) => (
    <div>
      <label style={label} htmlFor={`nc-${k}`}>{texto}</label>
      <input id={`nc-${k}`} style={input} value={f[k] as string} onChange={e => set(k, e.target.value)} {...extra} />
    </div>
  )

  return (
    <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <form onSubmit={guardar} className="modal-panel" style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '620px', maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '22px 24px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, fontStretch: '112%' }}>Agregar cliente</h2>
            <p style={{ fontSize: '13px', color: '#565D66', marginTop: '4px' }}>Queda en la lista como pendiente, listo para que un asesor lo gestione.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Cerrar" style={{ border: '1px solid #DDE1E6', background: '#fff', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          {campo('apellido', 'Apellido', { autoFocus: true })}
          {campo('nombre', 'Nombre')}
          {campo('telefono', 'Teléfono', { inputMode: 'tel' })}
          {campo('telefono_alternativo', 'Teléfono alternativo (opcional)', { inputMode: 'tel' })}
          {campo('dni', 'DNI o CUIT (opcional)')}
          {campo('email', 'Email (opcional)', { type: 'email' })}
          {campo('concesionaria', 'Concesionaria')}
          {campo('fecha_compra', 'Fecha de compra (opcional)', { type: 'date' })}
          {campo('marca', 'Marca')}
          {campo('modelo', 'Modelo')}
        </div>

        <div style={{ margin: '4px 24px 0', padding: '14px 16px', borderRadius: '10px', border: '1px solid #DDE1E6', borderLeft: '4px solid #FFC61A', background: '#F6F8FA' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
            <input type="checkbox" checked={f.prioridad} onChange={e => set('prioridad', e.target.checked)} style={{ width: '17px', height: '17px', accentColor: '#000' }} />
            Marcar como prioritario
          </label>
          <p style={{ fontSize: '12.5px', color: '#565D66', margin: '4px 0 0 27px' }}>Aparece primero en la lista de todos los asesores, con una marca visible.</p>
          {f.prioridad && (
            <div style={{ marginTop: '12px' }}>
              <label style={label} htmlFor="nc-motivo">Motivo de la prioridad</label>
              <textarea id="nc-motivo" rows={2} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} value={f.prioridad_motivo} onChange={e => set('prioridad_motivo', e.target.value)}
                placeholder="Ej.: caso crítico informado por Grupo Antelo el 5/10" />
            </div>
          )}
        </div>

        {error && <div role="alert" style={{ margin: '14px 24px 0', background: '#FAE0E0', border: '1px solid #F09595', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#8B2020' }}>{error}</div>}

        <div style={{ padding: '18px 24px 22px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={onClose} className="btn">Cancelar</button>
          <button type="submit" disabled={guardando} className="btn btn-primary" style={{ opacity: guardando ? 0.7 : 1 }}>{guardando ? 'Guardando…' : 'Agregar cliente'}</button>
        </div>
      </form>
    </div>
  )
}
