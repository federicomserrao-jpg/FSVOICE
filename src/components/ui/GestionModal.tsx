'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Perfil, EstadoGestion, ESTADO_LABELS } from '@/types'
import { fmtFecha, fmtFechaHora } from '@/lib/utils'
import Toast from './Toast'

interface Props { cliente: any; perfil: Perfil; onClose: () => void }

const ESTADOS: { value: EstadoGestion; label: string; color?: string }[] = [
  { value: 'encuestado', label: 'Encuestado', color: '#2D6A4F' },
  { value: 'fin_gestion', label: 'Fin de gestión', color: '#1B4F8A' },
  { value: 'no_acepta_encuesta', label: 'No acepta encuesta', color: '#8B2020' },
  { value: 'rellamar', label: 'Rellamar', color: '#7D4F00' },
  { value: 'sin_contacto', label: 'Sin contacto', color: '#374151' },
  { value: 'numero_equivocado', label: 'Número equivocado', color: '#6B21A8' },
  { value: 'dato_erroneo', label: 'Dato erróneo', color: '#92400E' },
  { value: 'pendiente', label: 'Pendiente', color: '#565D66' },
  { value: 'no_es_titular', label: 'No es titular', color: '#8B2020' },
]

const INIT = {
  estado: 'pendiente' as EstadoGestion,
  fecha_rellamar: '', motivo_rellamar: '', observaciones: '',
  nombre_verificado: null as boolean|null, nombre_corregido: '',
  email_verificado: null as boolean|null, email_corregido: '',
  telefono_verificado: null as boolean|null, telefono_corregido: '',
  direccion_verificada: null as boolean|null, direccion_corregida: '',
  patente_verificada: null as boolean|null, patente_corregida: '',
  marca_verificada: null as boolean|null, marca_corregida: '',
  modelo_verificado: null as boolean|null, modelo_corregido: '',
  score_vendedor: null as number|null, vendedor_respondio_consultas: '',
  score_administrativo: null as number|null, info_vehiculo_clara: '',
  explicaron_funciones: '', info_postventa: '', volvio_contactar: '',
  coloco_accesorios: '', accesorios_detalle: '', satisfaccion_equipamiento: '',
  score_contacto_posterior: null as number|null, score_recomendacion: null as number|null,
}

export default function GestionModal({ cliente, perfil, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [historial, setHistorial] = useState<any[]>([])
  const [showHistorial, setShowHistorial] = useState(false)
  const [gestionExistente, setGestionExistente] = useState<any>(null)
  const [form, setForm] = useState({ ...INIT })
  const [errors, setErrors] = useState<string[]>([])
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error' } | null>(null)

  useEffect(() => { loadGestion() }, [])

  async function loadGestion() {
    const supabase = createClient()
    const { data } = await supabase.from('gestiones').select('*').eq('cliente_id', cliente.id).order('created_at', { ascending: false }).limit(1)
    if (data && data.length > 0) {
      const g = data[0]; setGestionExistente(g)
      setForm(prev => ({ ...prev,
        estado: g.estado ?? 'pendiente', fecha_rellamar: g.fecha_rellamar ?? '',
        motivo_rellamar: g.motivo_rellamar ?? '', observaciones: g.observaciones ?? '',
        nombre_verificado: g.nombre_verificado, nombre_corregido: g.nombre_corregido ?? '',
        email_verificado: g.email_verificado, email_corregido: g.email_corregido ?? '',
        telefono_verificado: g.telefono_verificado, telefono_corregido: g.telefono_corregido ?? '',
        direccion_verificada: g.direccion_verificada, direccion_corregida: g.direccion_corregida ?? '',
        patente_verificada: g.patente_verificada, patente_corregida: g.patente_corregida ?? '',
        marca_verificada: g.marca_verificada, marca_corregida: g.marca_corregida ?? '',
        modelo_verificado: g.modelo_verificado, modelo_corregido: g.modelo_corregido ?? '',
        score_vendedor: g.score_vendedor, vendedor_respondio_consultas: g.vendedor_respondio_consultas ?? '',
        score_administrativo: g.score_administrativo, info_vehiculo_clara: g.info_vehiculo_clara ?? '',
        explicaron_funciones: g.explicaron_funciones ?? '', info_postventa: g.info_postventa ?? '',
        volvio_contactar: g.volvio_contactar ?? '', score_contacto_posterior: g.score_contacto_posterior,
        score_recomendacion: g.score_recomendacion,
        coloco_accesorios: g.coloco_accesorios ?? '', accesorios_detalle: g.accesorios_detalle ?? '',
        satisfaccion_equipamiento: g.satisfaccion_equipamiento ?? '',
      }))
      const { data: hist } = await supabase.from('historial_cambios').select('*, operador:perfiles(nombre)').eq('gestion_id', g.id).order('created_at', { ascending: false })
      setHistorial(hist ?? [])
    }
  }

  function setField(key: string, value: any) { setForm(prev => ({ ...prev, [key]: value })) }

  function validateStep(s: number) {
    const errs: string[] = []
    if (s === 1) {
      [['nombre_verificado','Nombre'],['email_verificado','Email'],['telefono_verificado','Teléfono'],['marca_verificada','Marca'],['modelo_verificado','Modelo']].forEach(([f,l]) => { if ((form as any)[f] === null) errs.push(`Verificá: ${l}`) })
      if (form.email_verificado === false && !form.email_corregido.trim()) errs.push('Ingresá el email correcto')
      if (form.telefono_verificado === false && !form.telefono_corregido.trim()) errs.push('Ingresá el teléfono correcto')
      if (form.estado === 'rellamar' && !form.fecha_rellamar) errs.push('Ingresá la fecha y hora de rellamado')
    }
    if (s === 2 && ['encuestado','fin_gestion'].includes(form.estado)) {
      if (!form.score_vendedor) errs.push('Score vendedor requerido')
      if (!form.vendedor_respondio_consultas) errs.push('Respuesta consultas requerida')
      if (!form.score_administrativo) errs.push('Score administrativo requerido')
      if (!form.info_vehiculo_clara) errs.push('Info vehículo requerida')
      if (!form.explicaron_funciones) errs.push('Funciones auto requeridas')
      if (!form.coloco_accesorios) errs.push('Indicá si colocó accesorios')
      if (form.coloco_accesorios === 'si' && !form.accesorios_detalle.trim()) errs.push('Indicá qué accesorios colocó')
      if (!form.satisfaccion_equipamiento) errs.push('Satisfacción con el equipamiento requerida')
      if (!form.info_postventa) errs.push('Info postventa requerida')
    }
    if (s === 3 && ['encuestado','fin_gestion'].includes(form.estado)) {
      if (!form.volvio_contactar) errs.push('Contacto posterior requerido')
      if (!form.score_recomendacion) errs.push('Score recomendación requerido')
    }
    return errs
  }

  function nextStep() {
    const e = validateStep(step)
    if (e.length) { setErrors(e); return }
    setErrors([]); setStep(s => Math.min(s+1,3))
  }
  function prevStep() { setErrors([]); setStep(s => Math.max(s-1,1)) }

  async function guardar() {
    const e = validateStep(step === 1 ? 1 : 3)
    if (e.length) { setErrors(e); return }
    setSaving(true)
    const supabase = createClient()
    const payload: any = {
      cliente_id: cliente.id, operador_id: perfil.id, estado: form.estado,
      fecha_rellamar: form.fecha_rellamar || null, motivo_rellamar: form.motivo_rellamar || null,
      observaciones: form.observaciones || null,
      nombre_verificado: form.nombre_verificado, nombre_corregido: form.nombre_verificado === false ? form.nombre_corregido : null,
      email_verificado: form.email_verificado, email_corregido: form.email_verificado === false ? form.email_corregido : null,
      telefono_verificado: form.telefono_verificado, telefono_corregido: form.telefono_verificado === false ? form.telefono_corregido : null,
      marca_verificada: form.marca_verificada, marca_corregida: form.marca_verificada === false ? form.marca_corregida : null,
      modelo_verificado: form.modelo_verificado, modelo_corregido: form.modelo_verificado === false ? form.modelo_corregido : null,
      score_vendedor: form.score_vendedor, vendedor_respondio_consultas: form.vendedor_respondio_consultas || null,
      score_administrativo: form.score_administrativo, info_vehiculo_clara: form.info_vehiculo_clara || null,
      explicaron_funciones: form.explicaron_funciones || null, info_postventa: form.info_postventa || null,
      coloco_accesorios: form.coloco_accesorios || null,
      accesorios_detalle: form.coloco_accesorios === 'si' ? (form.accesorios_detalle.trim() || null) : null,
      satisfaccion_equipamiento: form.satisfaccion_equipamiento || null,
      volvio_contactar: form.volvio_contactar || null, score_contacto_posterior: form.score_contacto_posterior,
      score_recomendacion: form.score_recomendacion,
      completado: ['encuestado','fin_gestion','no_acepta_encuesta','no_es_titular','numero_equivocado','dato_erroneo'].includes(form.estado),
    }
    try {
      if (gestionExistente) {
        const { error: errUpd } = await supabase.from('gestiones').update(payload).eq('id', gestionExistente.id)
        if (errUpd) throw errUpd
        const cambios = Object.keys(payload)
          .filter(campo => !['cliente_id','operador_id'].includes(campo) && String(gestionExistente[campo] ?? '') !== String(payload[campo] ?? ''))
          .map(campo => ({
            gestion_id: gestionExistente.id, operador_id: perfil.id, campo_modificado: campo,
            valor_anterior: gestionExistente[campo] != null ? String(gestionExistente[campo]) : null,
            valor_nuevo: payload[campo] != null ? String(payload[campo]) : null,
          }))
        if (cambios.length) await supabase.from('historial_cambios').insert(cambios)
      } else {
        const { data: nueva, error: errIns } = await supabase.from('gestiones').insert(payload).select().single()
        if (errIns) throw errIns
        if (nueva) await supabase.from('historial_cambios').insert({ gestion_id: nueva.id, operador_id: perfil.id, campo_modificado: 'estado', valor_anterior: null, valor_nuevo: payload.estado })
      }
      // Registro del intento: una fila por cada vez que un asesor guarda una gestión (productividad diaria).
      // Si la tabla todavía no existe, no frena el guardado.
      await supabase.from('intentos').insert({ cliente_id: payload.cliente_id, operador_id: perfil.id, estado: payload.estado }).then(() => {}, () => {})

      setSaving(false)
      setToast({ msg: 'Gestión guardada correctamente', type: 'success' })
    } catch(err) {
      console.error(err); setSaving(false)
      setErrors(['Error al guardar. Intentá de nuevo.'])
      setToast({ msg: 'Error al guardar', type: 'error' })
    }
  }

  const esCierreRapido = ['sin_contacto','numero_equivocado','no_es_titular','no_acepta_encuesta','dato_erroneo'].includes(form.estado)
  const saltable = !['encuestado','fin_gestion'].includes(form.estado)

  return (
    <>
      <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,8,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(2px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}>
        <div className="modal-panel" style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '660px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

          {/* HEADER */}
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #DDE1E6', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{cliente.apellido}{cliente.nombre ? `, ${cliente.nombre}` : ''}</h2>
              <p style={{ fontSize: '12.5px', color: '#565D66', marginTop: '4px' }}>{cliente.marca} {cliente.modelo} · {cliente.concesionaria}{cliente.fecha_compra && ` · Compra: ${fmtFecha(cliente.fecha_compra)}`}</p>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                {cliente.telefono && (
                  <a href={`tel:${cliente.telefono}`} className="btn" style={{ height: '28px', fontSize: '12px', padding: '0 10px', textDecoration: 'none', color: '#1B4F8A', background: '#DDE9F8', borderColor: '#BAD4F5' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2H7a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012-.5c.9.3 1.9.5 2.9.7A2 2 0 0122 16.9z"/></svg>
                    {cliente.telefono}
                  </a>
                )}
                {cliente.telefono_alternativo && (
                  <a href={`tel:${cliente.telefono_alternativo}`} className="btn" style={{ height: '28px', fontSize: '12px', padding: '0 10px', textDecoration: 'none', color: '#1B4F8A', background: '#DDE9F8', borderColor: '#BAD4F5' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2H7a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012-.5c.9.3 1.9.5 2.9.7A2 2 0 0122 16.9z"/></svg>
                    {cliente.telefono_alternativo}
                  </a>
                )}
                {cliente.email && (
                  <a href={`mailto:${cliente.email}`} className="btn" style={{ height: '28px', fontSize: '12px', padding: '0 10px', textDecoration: 'none', color: '#2D6A4F', background: '#D8F3DC', borderColor: '#9FE1CB' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                    {cliente.email}
                  </a>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {historial.length > 0 && (
                <button onClick={() => setShowHistorial(!showHistorial)} className="btn"
                  style={{ height: '30px', fontSize: '12px', padding: '0 10px', background: showHistorial ? '#14171A' : '#fff', color: showHistorial ? '#fff' : '#565D66', borderColor: showHistorial ? '#14171A' : '#DDE1E6' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  {historial.length}
                </button>
              )}
              <button onClick={onClose} className="btn" style={{ height: '30px', width: '30px', padding: 0, justifyContent: 'center', fontSize: '16px', color: '#727A84' }}>×</button>
            </div>
          </div>

          {/* HISTORIAL */}
          {showHistorial && (
            <div className="fade-in" style={{ background: '#F3F5F7', borderBottom: '1px solid #DDE1E6', padding: '14px 24px', maxHeight: '160px', overflowY: 'auto' }}>
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#727A84', marginBottom: '8px' }}>Historial de cambios</div>
              {historial.map(h => (
                <div key={h.id} style={{ display: 'flex', gap: '10px', marginBottom: '5px', fontSize: '12px' }}>
                  <span style={{ color: '#727A84', fontFamily: 'inherit', flexShrink: 0 }}>{fmtFechaHora(h.created_at)}</span>
                  <span style={{ color: '#565D66', flexShrink: 0 }}>{h.operador?.nombre ?? '—'}</span>
                  <span><strong>{h.campo_modificado}</strong>: {h.valor_anterior ?? '—'} → {h.valor_nuevo ?? '—'}</span>
                </div>
              ))}
            </div>
          )}

          {cliente.prioridad && (
            <div style={{ margin: '0 24px 14px', padding: '10px 14px', borderRadius: '10px', background: '#FFF6D6', border: '1px solid #FFC61A', fontSize: '13px' }}>
              <strong>Cliente prioritario.</strong> {cliente.prioridad_motivo}
            </div>
          )}
          {/* STEPS */}
          <div style={{ display: 'flex', padding: '14px 24px', background: '#F3F5F7', borderBottom: '1px solid #DDE1E6', gap: 0 }}>
            {[{n:1,label:'Validación'},{n:2,label:'Experiencia'},{n:3,label:'Post-compra'}].map((s, i) => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                <div onClick={() => s.n < step && setStep(s.n)}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: s.n < step ? 'pointer' : 'default', color: step === s.n ? '#14171A' : step > s.n ? '#2D6A4F' : '#727A84' }}>
                  <div className={`step-dot ${step === s.n ? 'active' : step > s.n ? 'done' : 'pending'}`}>
                    {step > s.n ? '✓' : s.n}
                  </div>
                  {s.label}
                </div>
                {i < 2 && <span style={{ flex: 1, textAlign: 'center', color: '#BCC3CB', fontSize: '14px' }}>›</span>}
              </div>
            ))}
          </div>

          {/* ERRORS */}
          {errors.length > 0 && (
            <div className="fade-in" style={{ background: '#FAE0E0', border: '1px solid #F09595', margin: '14px 24px 0', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#8B2020' }}>
              {errors.map(e => <div key={e}>• {e}</div>)}
            </div>
          )}

          {/* STEP 1 */}
          {step === 1 && (
            <div className="fade-up">
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #DDE1E6' }}>
                <STitle>Verificar datos del cliente</STitle>
                {[
                  { label: 'Nombre completo', value: `${cliente.nombre ?? ''} ${cliente.apellido ?? ''}`.trim(), field: 'nombre_verificado', corrField: 'nombre_corregido', type: 'text' },
                  { label: 'Email', value: cliente.email ?? '(sin dato)', field: 'email_verificado', corrField: 'email_corregido', type: 'email' },
                  { label: 'Teléfono', value: cliente.telefono ?? '(sin dato)', field: 'telefono_verificado', corrField: 'telefono_corregido', type: 'tel' },
                ].map(item => <VerifyRow key={item.field} {...item} verified={(form as any)[item.field]} corregido={(form as any)[item.corrField]} onVerify={(v: boolean) => setField(item.field, v)} onCorrect={(v: string) => setField(item.corrField, v)} />)}
              </div>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #DDE1E6' }}>
                <STitle>Verificar datos del vehículo</STitle>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { label: 'Marca', value: cliente.marca ?? '—', field: 'marca_verificada', corrField: 'marca_corregida' },
                    { label: 'Modelo', value: cliente.modelo ?? '—', field: 'modelo_verificado', corrField: 'modelo_corregido' },
                  ].map(item => <VerifyRow key={item.field} {...item} type="text" verified={(form as any)[item.field]} corregido={(form as any)[item.corrField]} onVerify={(v: boolean) => setField(item.field, v)} onCorrect={(v: string) => setField(item.corrField, v)} />)}
                </div>
              </div>
              <div style={{ padding: '16px 24px', background: '#F3F5F7', borderBottom: '1px solid #DDE1E6' }}>
                <STitle>Estado de la gestión</STitle>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {ESTADOS.map(op => (
                    <button key={op.value} onClick={() => setField('estado', op.value)}
                      className={`radio-pill ${form.estado === op.value ? 'sel' : ''}`}>
                      {op.label}
                    </button>
                  ))}
                </div>
                {form.estado === 'rellamar' && (
                  <div className="fade-in" style={{ marginTop: '10px', display: 'flex', gap: '10px', alignItems: 'center', background: '#FFF3CD', border: '1px solid #E8C96A', borderRadius: '6px', padding: '10px 14px' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7D4F00" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                    <input type="datetime-local" value={form.fecha_rellamar} onChange={e => setField('fecha_rellamar', e.target.value)} style={{ border: '1px solid #D08700', borderRadius: '6px', padding: '5px 8px', fontSize: '13px', fontFamily: 'inherit', background: '#fff', outline: 'none', flex: 1 }} />
                    <input type="text" value={form.motivo_rellamar} onChange={e => setField('motivo_rellamar', e.target.value)} placeholder="Motivo..." style={{ flex: 2, border: '1px solid #D08700', borderRadius: '6px', padding: '5px 8px', fontSize: '13px', fontFamily: 'inherit', background: '#fff', outline: 'none' }} />
                  </div>
                )}
                {esCierreRapido && (
                  <div className="fade-in" style={{ marginTop: '8px', background: '#F0F9FF', border: '1px solid #BAE6FD', borderRadius: '6px', padding: '8px 12px', fontSize: '12.5px', color: '#0369A1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    Podés guardar directamente sin completar la encuesta.
                  </div>
                )}
              </div>
              {esCierreRapido && (
                <div className="fade-in" style={{ padding: '16px 24px', borderBottom: '1px solid #DDE1E6' }}>
                  <STitle>Observaciones</STitle>
                  <textarea value={form.observaciones} onChange={e => setField('observaciones', e.target.value)} placeholder="Detalle adicional..." style={{ width: '100%', background: '#F3F5F7', border: '1px solid #DDE1E6', borderRadius: '6px', padding: '10px 12px', fontFamily: 'inherit', fontSize: '13px', resize: 'vertical', minHeight: '70px', outline: 'none', color: '#14171A', boxSizing: 'border-box' as const }} />
                </div>
              )}
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="fade-up">
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #DDE1E6' }}>
                <STitle>Atención del vendedor</STitle>
                <RatingGroup question="¿Cómo calificaría la atención del vendedor? (1 al 5)" value={form.score_vendedor} onChange={(v: number) => setField('score_vendedor', v)} disabled={saltable} />
                <RadioGroup question="¿El vendedor respondió de manera clara todas sus consultas?" options={['si','parcialmente','no']} labels={['Sí','Parcialmente','No']} value={form.vendedor_respondio_consultas} onChange={(v: string) => setField('vendedor_respondio_consultas', v)} disabled={saltable} />
              </div>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #DDE1E6' }}>
                <STitle>Atención administrativa</STitle>
                <RatingGroup question="¿Cómo calificaría la atención del área administrativa?" value={form.score_administrativo} onChange={(v: number) => setField('score_administrativo', v)} disabled={saltable} />
              </div>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #DDE1E6' }}>
                <STitle>Información sobre el vehículo</STitle>
                <RadioGroup question="¿Recibió información clara sobre las funcionalidades del vehículo?" options={['si','parcialmente','no']} labels={['Sí','Parcialmente','No']} value={form.info_vehiculo_clara} onChange={(v: string) => setField('info_vehiculo_clara', v)} disabled={saltable} />
                <RadioGroup question="¿Le explicaron el uso de las principales funciones del auto?" options={['si','parcialmente','no']} labels={['Sí','Parcialmente','No']} value={form.explicaron_funciones} onChange={(v: string) => setField('explicaron_funciones', v)} disabled={saltable} />
              </div>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #DDE1E6' }}>
                <STitle>Entrega y alistamiento</STitle>
                <RadioGroup question="¿Realizó la colocación de accesorios en el vehículo?" options={['si','no']} labels={['Sí','No']} value={form.coloco_accesorios} onChange={(v: string) => setField('coloco_accesorios', v)} disabled={saltable} />
                {form.coloco_accesorios === 'si' && (
                  <div className="fade-in" style={{ marginBottom: '14px', opacity: saltable ? 0.45 : 1 }}>
                    <div style={{ fontSize: '13px', marginBottom: '6px' }}>¿Qué accesorios le colocaron?</div>
                    <input type="text" value={form.accesorios_detalle} onChange={e => setField('accesorios_detalle', e.target.value)} disabled={saltable}
                      placeholder="Ej: polarizado, barras de techo, cubre alfombras..."
                      style={{ width: '100%', background: '#FFFBF0', border: '1px solid #D08700', borderRadius: '6px', padding: '8px 11px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', color: '#14171A', boxSizing: 'border-box' as const }} />
                  </div>
                )}
                <RadioGroup question="¿Cómo calificaría su satisfacción con el equipamiento adicional que trae el vehículo (tuercas de seguridad, alfombras, matafuegos)?" options={['excelente','bueno','regular','deficiente']} labels={['Excelente','Bueno','Regular','Deficiente']} value={form.satisfaccion_equipamiento} onChange={(v: string) => setField('satisfaccion_equipamiento', v)} disabled={saltable} />
              </div>
              <div style={{ padding: '18px 24px' }}>
                <STitle>Postventa</STitle>
                <RadioGroup question="¿Le informaron sobre los talleres oficiales y servicios disponibles?" options={['si','parcialmente','no']} labels={['Sí','Parcialmente','No']} value={form.info_postventa} onChange={(v: string) => setField('info_postventa', v)} disabled={saltable} />
              </div>
              {saltable && <div className="fade-in" style={{ background: '#DDE9F8', border: '1px solid #85B7EB', margin: '0 24px 16px', borderRadius: '6px', padding: '10px 14px', fontSize: '12.5px', color: '#1B4F8A' }}>Las preguntas no son obligatorias para "{ESTADO_LABELS[form.estado]}".</div>}
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="fade-up">
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #DDE1E6' }}>
                <STitle>Contacto posterior</STitle>
                <RadioGroup question="Luego de la compra, ¿tuvo que volver a comunicarse con la concesionaria?" options={['si','no']} labels={['Sí','No']} value={form.volvio_contactar} onChange={(v: string) => setField('volvio_contactar', v)} disabled={saltable} />
                {form.volvio_contactar === 'si' && <RatingGroup question="¿Cómo calificaría la atención en ese contacto posterior?" value={form.score_contacto_posterior} onChange={(v: number) => setField('score_contacto_posterior', v)} disabled={saltable} />}
              </div>
              <div style={{ padding: '18px 24px', borderBottom: '1px solid #DDE1E6' }}>
                <STitle>Recomendación</STitle>
                <RatingGroup question="¿Qué tan probable es que recomiende la concesionaria? (1 al 5)" value={form.score_recomendacion} onChange={(v: number) => setField('score_recomendacion', v)} disabled={saltable} labels={['Muy improbable','Improbable','Neutral','Probable','Muy probable']} />
              </div>
              <div style={{ padding: '18px 24px' }}>
                <STitle>Observaciones libres</STitle>
                <textarea value={form.observaciones} onChange={e => setField('observaciones', e.target.value)} placeholder="Comentarios adicionales del cliente..." style={{ width: '100%', background: '#F3F5F7', border: '1px solid #DDE1E6', borderRadius: '6px', padding: '10px 12px', fontFamily: 'inherit', fontSize: '13px', resize: 'vertical', minHeight: '80px', outline: 'none', color: '#14171A', boxSizing: 'border-box' as const }} />
              </div>
              {saltable && <div style={{ background: '#DDE9F8', border: '1px solid #85B7EB', margin: '0 24px 16px', borderRadius: '6px', padding: '10px 14px', fontSize: '12.5px', color: '#1B4F8A' }}>Las preguntas no son obligatorias para "{ESTADO_LABELS[form.estado]}".</div>}
            </div>
          )}

          {/* FOOTER */}
          <div style={{ padding: '14px 24px', borderTop: '1px solid #DDE1E6', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: '#F3F5F7', borderRadius: '0 0 14px 14px' }}>
            <button onClick={onClose} className="btn">Cancelar</button>
            {step > 1 && <button onClick={prevStep} className="btn">← Anterior</button>}
            {step === 1 && esCierreRapido && (
              <button onClick={guardar} disabled={saving} className="btn btn-primary" style={{ opacity: saving ? 0.7 : 1, minWidth: '120px', justifyContent: 'center' }}>
                {saving ? <><Spinner /> Guardando…</> : '✓ Guardar'}
              </button>
            )}
            {step < 3 && !esCierreRapido && <button onClick={nextStep} className="btn btn-primary">Siguiente →</button>}
            {step === 3 && (
              <button onClick={guardar} disabled={saving} className="btn btn-primary" style={{ opacity: saving ? 0.7 : 1, minWidth: '140px', justifyContent: 'center' }}>
                {saving ? <><Spinner /> Guardando…</> : '✓ Guardar gestión'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* TOAST */}
      {toast && <Toast message={toast.msg} type={toast.type} onDone={() => { setToast(null); if (toast.type === 'success') onClose() }} />}
    </>
  )
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"/>
    </svg>
  )
}

function STitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#727A84', marginBottom: '12px' }}>{children}</div>
}

function VerifyRow({ label, value, verified, corregido, corrType, type, onVerify, onCorrect }: any) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '12px', color: '#565D66', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F3F5F7', border: '1px solid #DDE1E6', borderRadius: '6px', padding: '7px 11px', transition: 'border-color 0.14s' }}>
        <span style={{ flex: 1, fontSize: '13px', fontFamily: 'inherit', color: '#14171A' }}>{value}</span>
        <button onClick={() => onVerify(true)} className={`verify-btn ${verified === true ? 'si' : ''}`}>Sí ✓</button>
        <button onClick={() => onVerify(false)} className={`verify-btn ${verified === false ? 'no' : ''}`}>No ✗</button>
      </div>
      {verified === false && (
        <input type={type ?? 'text'} value={corregido} onChange={e => onCorrect(e.target.value)} placeholder={`${label} correcto...`}
          className="fade-in"
          style={{ width: '100%', marginTop: '6px', background: '#FFFBF0', border: '1px solid #D08700', borderRadius: '6px', padding: '7px 11px', fontFamily: 'inherit', fontSize: '13px', outline: 'none', color: '#14171A', boxSizing: 'border-box' as const }} />
      )}
    </div>
  )
}

function RatingGroup({ question, value, onChange, disabled, labels }: any) {
  const l = labels ?? ['Muy disconforme','Disconforme','Neutral','Conforme','Muy conforme']
  return (
    <div style={{ marginBottom: '16px', opacity: disabled ? 0.45 : 1, transition: 'opacity 0.2s' }}>
      <div style={{ fontSize: '13px', marginBottom: '10px', lineHeight: 1.5 }}>{question}</div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => !disabled && onChange(n)} className={`rating-btn ${value === n ? 'sel' : ''}`} disabled={disabled}>
            <span style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'inherit' }}>{n}</span>
            <span style={{ fontSize: '9px', textAlign: 'center', lineHeight: 1.2, opacity: 0.7 }}>{l[n-1]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function RadioGroup({ question, options, labels, value, onChange, disabled }: any) {
  return (
    <div style={{ marginBottom: '14px', opacity: disabled ? 0.45 : 1, transition: 'opacity 0.2s' }}>
      <div style={{ fontSize: '13px', marginBottom: '8px', lineHeight: 1.5 }}>{question}</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {options.map((op: string, i: number) => (
          <button key={op} onClick={() => !disabled && onChange(op)} className={`radio-pill ${value === op ? 'sel' : ''}`} disabled={disabled}>
            {labels[i]}
          </button>
        ))}
      </div>
    </div>
  )
}
