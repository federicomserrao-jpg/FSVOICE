'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Perfil, EstadoGestion, ESTADO_LABELS, HistorialCambio } from '@/types'
import { format } from 'date-fns'

interface Props {
  cliente: any
  perfil: Perfil
  onClose: () => void
}

const ESTADOS_OPCIONES: { value: EstadoGestion; label: string }[] = [
  { value: 'encuestado', label: 'Encuestado' },
  { value: 'fin_gestion', label: 'Fin de gestión' },
  { value: 'no_acepta_encuesta', label: 'No acepta encuesta' },
  { value: 'rellamar', label: 'Rellamar' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'no_es_titular', label: 'No es titular' },
]

const INITIAL_FORM = {
  estado: 'pendiente' as EstadoGestion,
  fecha_rellamar: '', motivo_rellamar: '', observaciones: '',
  nombre_verificado: null as boolean | null, nombre_corregido: '',
  email_verificado: null as boolean | null, email_corregido: '',
  telefono_verificado: null as boolean | null, telefono_corregido: '',
  direccion_verificada: null as boolean | null, direccion_corregida: '',
  patente_verificada: null as boolean | null, patente_corregida: '',
  marca_verificada: null as boolean | null, marca_corregida: '',
  modelo_verificado: null as boolean | null, modelo_corregido: '',
  score_vendedor: null as number | null, vendedor_respondio_consultas: '',
  score_administrativo: null as number | null, info_vehiculo_clara: '',
  explicaron_funciones: '', info_postventa: '', volvio_contactar: '',
  score_contacto_posterior: null as number | null, score_recomendacion: null as number | null,
}

export default function GestionModal({ cliente, perfil, onClose }: Props) {
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [historial, setHistorial] = useState<any[]>([])
  const [showHistorial, setShowHistorial] = useState(false)
  const [gestionExistente, setGestionExistente] = useState<any>(null)
  const [form, setForm] = useState({ ...INITIAL_FORM })
  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    loadGestion()
  }, [])

  async function loadGestion() {
    const supabase = createClient()
    const { data } = await supabase
      .from('gestiones')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      const g = data[0]
      setGestionExistente(g)
      setForm(prev => ({
        ...prev,
        estado: g.estado ?? 'pendiente',
        fecha_rellamar: g.fecha_rellamar ?? '',
        motivo_rellamar: g.motivo_rellamar ?? '',
        observaciones: g.observaciones ?? '',
        nombre_verificado: g.nombre_verificado,
        nombre_corregido: g.nombre_corregido ?? '',
        email_verificado: g.email_verificado,
        email_corregido: g.email_corregido ?? '',
        telefono_verificado: g.telefono_verificado,
        telefono_corregido: g.telefono_corregido ?? '',
        direccion_verificada: g.direccion_verificada,
        direccion_corregida: g.direccion_corregida ?? '',
        patente_verificada: g.patente_verificada,
        patente_corregida: g.patente_corregida ?? '',
        marca_verificada: g.marca_verificada,
        marca_corregida: g.marca_corregida ?? '',
        modelo_verificado: g.modelo_verificado,
        modelo_corregido: g.modelo_corregido ?? '',
        score_vendedor: g.score_vendedor,
        vendedor_respondio_consultas: g.vendedor_respondio_consultas ?? '',
        score_administrativo: g.score_administrativo,
        info_vehiculo_clara: g.info_vehiculo_clara ?? '',
        explicaron_funciones: g.explicaron_funciones ?? '',
        info_postventa: g.info_postventa ?? '',
        volvio_contactar: g.volvio_contactar ?? '',
        score_contacto_posterior: g.score_contacto_posterior,
        score_recomendacion: g.score_recomendacion,
      }))

      const { data: hist } = await supabase
        .from('historial_cambios')
        .select('*, operador:perfiles(nombre)')
        .eq('gestion_id', g.id)
        .order('created_at', { ascending: false })
      setHistorial(hist ?? [])
    }
  }

  function setField(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function validateStep(s: number): string[] {
    const errs: string[] = []
    if (s === 1) {
      const bools = [
        ['nombre_verificado', 'Nombre'],
        ['email_verificado', 'Email'],
        ['telefono_verificado', 'Teléfono'],
        ['direccion_verificada', 'Dirección'],
        ['patente_verificada', 'Patente'],
        ['marca_verificada', 'Marca'],
        ['modelo_verificado', 'Modelo'],
      ]
      bools.forEach(([f, label]) => {
        if ((form as any)[f] === null) errs.push(`Verificá el campo: ${label}`)
      })
      if (form.email_verificado === false && !form.email_corregido.trim()) errs.push('Ingresá el email correcto')
      if (form.telefono_verificado === false && !form.telefono_corregido.trim()) errs.push('Ingresá el teléfono correcto')
    }
    if (s === 2 && ['encuestado', 'fin_gestion'].includes(form.estado)) {
      if (!form.score_vendedor) errs.push('Score vendedor requerido')
      if (!form.vendedor_respondio_consultas) errs.push('Respuesta sobre consultas requerida')
      if (!form.score_administrativo) errs.push('Score administrativo requerido')
      if (!form.info_vehiculo_clara) errs.push('Info vehículo requerida')
      if (!form.explicaron_funciones) errs.push('Funciones del auto requerida')
      if (!form.info_postventa) errs.push('Info postventa requerida')
    }
    if (s === 3 && ['encuestado', 'fin_gestion'].includes(form.estado)) {
      if (!form.volvio_contactar) errs.push('Contacto posterior requerido')
      if (!form.score_recomendacion) errs.push('Score de recomendación requerido')
    }
    return errs
  }

  function nextStep() {
    const errs = validateStep(step)
    if (errs.length) { setErrors(errs); return }
    setErrors([])
    setStep(s => Math.min(s + 1, 3))
  }

  function prevStep() {
    setErrors([])
    setStep(s => Math.max(s - 1, 1))
  }

  async function guardar() {
    const errs = validateStep(3)
    if (errs.length) { setErrors(errs); return }
    setSaving(true)
    const supabase = createClient()

    const payload: any = {
      cliente_id: cliente.id,
      operador_id: perfil.id,
      estado: form.estado,
      fecha_rellamar: form.fecha_rellamar || null,
      motivo_rellamar: form.motivo_rellamar || null,
      observaciones: form.observaciones || null,
      nombre_verificado: form.nombre_verificado,
      nombre_corregido: form.nombre_verificado === false ? form.nombre_corregido : null,
      email_verificado: form.email_verificado,
      email_corregido: form.email_verificado === false ? form.email_corregido : null,
      telefono_verificado: form.telefono_verificado,
      telefono_corregido: form.telefono_verificado === false ? form.telefono_corregido : null,
      direccion_verificada: form.direccion_verificada,
      direccion_corregida: form.direccion_verificada === false ? form.direccion_corregida : null,
      patente_verificada: form.patente_verificada,
      patente_corregida: form.patente_verificada === false ? form.patente_corregida : null,
      marca_verificada: form.marca_verificada,
      marca_corregida: form.marca_verificada === false ? form.marca_corregida : null,
      modelo_verificado: form.modelo_verificado,
      modelo_corregido: form.modelo_verificado === false ? form.modelo_corregido : null,
      score_vendedor: form.score_vendedor,
      vendedor_respondio_consultas: form.vendedor_respondio_consultas || null,
      score_administrativo: form.score_administrativo,
      info_vehiculo_clara: form.info_vehiculo_clara || null,
      explicaron_funciones: form.explicaron_funciones || null,
      info_postventa: form.info_postventa || null,
      volvio_contactar: form.volvio_contactar || null,
      score_contacto_posterior: form.score_contacto_posterior,
      score_recomendacion: form.score_recomendacion,
      completado: ['encuestado', 'fin_gestion', 'no_acepta_encuesta', 'no_es_titular'].includes(form.estado),
    }

    try {
      if (gestionExistente) {
        await supabase.from('gestiones').update(payload).eq('id', gestionExistente.id)
        // Registrar historial de cambios
        const campos = Object.keys(payload)
        for (const campo of campos) {
          const anterior = gestionExistente[campo]
          const nuevo = payload[campo]
          if (String(anterior ?? '') !== String(nuevo ?? '') && campo !== 'cliente_id' && campo !== 'operador_id') {
            await supabase.from('historial_cambios').insert({
              gestion_id: gestionExistente.id,
              operador_id: perfil.id,
              campo_modificado: campo,
              valor_anterior: anterior != null ? String(anterior) : null,
              valor_nuevo: nuevo != null ? String(nuevo) : null,
            })
          }
        }
      } else {
        const { data: nueva } = await supabase.from('gestiones').insert(payload).select().single()
        if (nueva) {
          await supabase.from('historial_cambios').insert({
            gestion_id: nueva.id,
            operador_id: perfil.id,
            campo_modificado: 'estado',
            valor_anterior: null,
            valor_nuevo: payload.estado,
          })
        }
      }
      setSaving(false)
      onClose()
    } catch (e) {
      console.error(e)
      setSaving(false)
      setErrors(['Error al guardar. Intentá de nuevo.'])
    }
  }

  const needsRellamar = form.estado === 'rellamar'
  const encuestaSaltable = !['encuestado', 'fin_gestion'].includes(form.estado)

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(10,10,8,0.55)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{ background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '660px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>

        {/* HEADER */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E2E0D8', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>{cliente.apellido}, {cliente.nombre}</h2>
            <p style={{ fontSize: '12.5px', color: '#6B6A64', marginTop: '4px' }}>
              {cliente.marca} {cliente.modelo} {cliente.anio} · {cliente.concesionaria}
              {cliente.fecha_compra && ` · Compra: ${format(new Date(cliente.fecha_compra), 'dd/MM/yyyy')}`}
            </p>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
              {cliente.telefono && (
                <a href={`tel:${cliente.telefono}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: '#1B4F8A', textDecoration: 'none', background: '#DDE9F8', padding: '3px 10px', borderRadius: '20px' }}>
                  📞 {cliente.telefono}
                </a>
              )}
              {cliente.telefono_alternativo && (
                <a href={`tel:${cliente.telefono_alternativo}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: '#1B4F8A', textDecoration: 'none', background: '#DDE9F8', padding: '3px 10px', borderRadius: '20px' }}>
                  📞 {cliente.telefono_alternativo}
                </a>
              )}
              {cliente.email && (
                <a href={`mailto:${cliente.email}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: '#2D6A4F', textDecoration: 'none', background: '#D8F3DC', padding: '3px 10px', borderRadius: '20px' }}>
                  ✉️ {cliente.email}
                </a>
              )}
              {cliente.email_alternativo && (
                <a href={`mailto:${cliente.email_alternativo}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: '#2D6A4F', textDecoration: 'none', background: '#D8F3DC', padding: '3px 10px', borderRadius: '20px' }}>
                  ✉️ {cliente.email_alternativo}
                </a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {historial.length > 0 && (
              <button onClick={() => setShowHistorial(!showHistorial)} style={{ background: showHistorial ? '#1A1917' : 'none', border: '1px solid #E2E0D8', borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer', color: showHistorial ? '#fff' : '#6B6A64', fontFamily: 'DM Sans, sans-serif' }}>
                📋 Historial ({historial.length})
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E9C95', fontSize: '22px', lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>
        </div>

        {/* HISTORIAL */}
        {showHistorial && (
          <div style={{ background: '#F0EFE9', borderBottom: '1px solid #E2E0D8', padding: '16px 24px', maxHeight: '180px', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '10px' }}>Historial de cambios</div>
            {historial.map(h => (
              <div key={h.id} style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '12.5px' }}>
                <span style={{ color: '#9E9C95', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>{format(new Date(h.created_at), 'dd/MM HH:mm')}</span>
                <span style={{ color: '#6B6A64', flexShrink: 0 }}>{h.operador?.nombre ?? 'Usuario'}</span>
                <span><strong>{h.campo_modificado}</strong>: {h.valor_anterior ?? '—'} → {h.valor_nuevo ?? '—'}</span>
              </div>
            ))}
          </div>
        )}

        {/* STEPS */}
        <div style={{ display: 'flex', padding: '16px 24px', background: '#F0EFE9', borderBottom: '1px solid #E2E0D8' }}>
          {[{ n: 1, label: 'Validación' }, { n: 2, label: 'Experiencia' }, { n: 3, label: 'Post-compra' }].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div onClick={() => s.n < step && setStep(s.n)} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: s.n < step ? 'pointer' : 'default', color: step === s.n ? '#1A1917' : step > s.n ? '#2D6A4F' : '#9E9C95' }}>
                <div style={{ width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontFamily: 'DM Mono', fontWeight: 600, flexShrink: 0, background: step > s.n ? '#2D6A4F' : step === s.n ? '#1A1917' : 'none', color: step >= s.n ? '#fff' : '#9E9C95', border: `1.5px solid ${step > s.n ? '#2D6A4F' : step === s.n ? '#1A1917' : '#C8C6BC'}` }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                {s.label}
              </div>
              {i < 2 && <span style={{ flex: 1, textAlign: 'center', color: '#C8C6BC' }}>›</span>}
            </div>
          ))}
        </div>

        {/* ERRORS */}
        {errors.length > 0 && (
          <div style={{ background: '#FAE0E0', border: '1px solid #F09595', margin: '16px 24px 0', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#8B2020' }}>
            {errors.map(e => <div key={e}>• {e}</div>)}
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '14px' }}>Verificar datos del cliente</div>
              {[
                { label: 'Nombre completo', value: `${cliente.nombre} ${cliente.apellido}`, field: 'nombre_verificado', corrField: 'nombre_corregido', type: 'text' },
                { label: 'Email', value: cliente.email ?? '(sin dato)', field: 'email_verificado', corrField: 'email_corregido', type: 'email' },
                { label: 'Teléfono', value: cliente.telefono ?? '(sin dato)', field: 'telefono_verificado', corrField: 'telefono_corregido', type: 'tel' },
                { label: 'Dirección', value: cliente.direccion ?? '(sin dato)', field: 'direccion_verificada', corrField: 'direccion_corregida', type: 'text' },
              ].map(item => (
                <VerifyRow key={item.field} label={item.label} value={item.value} verified={(form as any)[item.field]} corregido={(form as any)[item.corrField]} corrType={item.type} onVerify={(v: boolean) => setField(item.field, v)} onCorrect={(v: string) => setField(item.corrField, v)} />
              ))}
            </div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '14px' }}>Verificar datos del vehículo</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  { label: 'Marca', value: cliente.marca ?? '—', field: 'marca_verificada', corrField: 'marca_corregida' },
                  { label: 'Modelo', value: cliente.modelo ?? '—', field: 'modelo_verificado', corrField: 'modelo_corregido' },
                  { label: 'Patente', value: cliente.patente ?? '—', field: 'patente_verificada', corrField: 'patente_corregida' },
                ].map(item => (
                  <VerifyRow key={item.field} label={item.label} value={item.value} verified={(form as any)[item.field]} corregido={(form as any)[item.corrField]} corrType="text" onVerify={(v: boolean) => setField(item.field, v)} onCorrect={(v: string) => setField(item.corrField, v)} />
                ))}
              </div>
            </div>
            <div style={{ padding: '16px 24px', background: '#F0EFE9', borderBottom: '1px solid #E2E0D8' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '10px' }}>Estado de la gestión</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {ESTADOS_OPCIONES.map(op => (
                  <button key={op.value} onClick={() => setField('estado', op.value)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: 'pointer', border: '1px solid', borderColor: form.estado === op.value ? '#1A1917' : '#E2E0D8', background: form.estado === op.value ? '#1A1917' : '#fff', color: form.estado === op.value ? '#F5F4F0' : '#6B6A64', fontFamily: 'DM Sans, sans-serif' }}>
                    {op.label}
                  </button>
                ))}
              </div>
              {needsRellamar && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center', background: '#FFF3CD', border: '1px solid #E8C96A', borderRadius: '6px', padding: '10px 14px' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#7D4F00', flexShrink: 0 }}>📅 Rellamar:</span>
                  <input type="datetime-local" value={form.fecha_rellamar} onChange={e => setField('fecha_rellamar', e.target.value)} style={{ border: '1px solid #D08700', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', fontFamily: 'DM Sans', background: '#fff', outline: 'none' }} />
                  <input type="text" value={form.motivo_rellamar} onChange={e => setField('motivo_rellamar', e.target.value)} placeholder="Motivo..." style={{ flex: 1, border: '1px solid #D08700', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', fontFamily: 'DM Sans', background: '#fff', outline: 'none' }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '14px' }}>Atención del vendedor</div>
              <RatingGroup question="¿Cómo calificaría la atención del vendedor? (1 al 5)" value={form.score_vendedor} onChange={(v: any) => setField('score_vendedor', v)} disabled={encuestaSaltable} />
              <RadioGroup question="¿El vendedor respondió de manera clara todas sus consultas?" options={['si','parcialmente','no']} labels={['Sí','Parcialmente','No']} value={form.vendedor_respondio_consultas} onChange={(v: any) => setField('vendedor_respondio_consultas', v)} disabled={encuestaSaltable} />
            </div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '14px' }}>Atención administrativa</div>
              <RatingGroup question="¿Cómo calificaría la atención del área administrativa?" value={form.score_administrativo} onChange={(v: any) => setField('score_administrativo', v)} disabled={encuestaSaltable} />
            </div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '14px' }}>Información sobre el vehículo</div>
              <RadioGroup question="¿Recibió información clara sobre las funcionalidades del vehículo?" options={['si','parcialmente','no']} labels={['Sí','Parcialmente','No']} value={form.info_vehiculo_clara} onChange={(v: any) => setField('info_vehiculo_clara', v)} disabled={encuestaSaltable} />
              <RadioGroup question="¿Le explicaron el uso de las principales funciones del auto?" options={['si','no']} labels={['Sí','No']} value={form.explicaron_funciones} onChange={(v: any) => setField('explicaron_funciones', v)} disabled={encuestaSaltable} />
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '14px' }}>Postventa</div>
              <RadioGroup question="¿Le informaron sobre los talleres oficiales y servicios disponibles?" options={['si','no']} labels={['Sí','No']} value={form.info_postventa} onChange={(v: any) => setField('info_postventa', v)} disabled={encuestaSaltable} />
            </div>
            {encuestaSaltable && <div style={{ background: '#DDE9F8', border: '1px solid #85B7EB', margin: '0 24px 16px', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#1B4F8A' }}>Las preguntas no son obligatorias para el estado "{ESTADO_LABELS[form.estado]}".</div>}
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '14px' }}>Contacto posterior</div>
              <RadioGroup question="Luego de la compra, ¿tuvo que volver a comunicarse con la concesionaria?" options={['si','no']} labels={['Sí','No']} value={form.volvio_contactar} onChange={(v: any) => setField('volvio_contactar', v)} disabled={encuestaSaltable} />
              {form.volvio_contactar === 'si' && <RatingGroup question="¿Cómo calificaría la atención en ese contacto posterior?" value={form.score_contacto_posterior} onChange={(v: any) => setField('score_contacto_posterior', v)} disabled={encuestaSaltable} />}
            </div>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '14px' }}>Recomendación</div>
              <RatingGroup question="¿Qué tan probable es que recomiende la concesionaria? (1 al 5)" value={form.score_recomendacion} onChange={(v: any) => setField('score_recomendacion', v)} disabled={encuestaSaltable} labels={['Muy improbable','Improbable','Neutral','Probable','Muy probable']} />
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '10px' }}>Observaciones libres</div>
              <textarea value={form.observaciones} onChange={e => setField('observaciones', e.target.value)} placeholder="Comentarios adicionales del cliente..." style={{ width: '100%', background: '#F0EFE9', border: '1px solid #E2E0D8', borderRadius: '6px', padding: '10px 12px', fontFamily: 'DM Sans', fontSize: '13.5px', resize: 'vertical', minHeight: '80px', outline: 'none', color: '#1A1917', boxSizing: 'border-box' }} />
            </div>
            {encuestaSaltable && <div style={{ background: '#DDE9F8', border: '1px solid #85B7EB', margin: '0 24px 16px', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#1B4F8A' }}>Las preguntas no son obligatorias para el estado "{ESTADO_LABELS[form.estado]}".</div>}
          </div>
        )}

        {/* FOOTER */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E0D8', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#F0EFE9' }}>
          <button onClick={onClose} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #E2E0D8', background: '#fff', color: '#1A1917', fontFamily: 'DM Sans' }}>Cancelar</button>
          {step > 1 && <button onClick={prevStep} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #E2E0D8', background: '#fff', color: '#1A1917', fontFamily: 'DM Sans' }}>← Anterior</button>}
          {step < 3 && <button onClick={nextStep} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', background: '#1A1917', color: '#fff', fontFamily: 'DM Sans' }}>Siguiente →</button>}
          {step === 3 && <button onClick={guardar} disabled={saving} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer', border: 'none', background: '#1A1917', color: '#fff', fontFamily: 'DM Sans', opacity: saving ? 0.7 : 1 }}>{saving ? 'Guardando...' : '✓ Guardar gestión'}</button>}
        </div>
      </div>
    </div>
  )
}

function VerifyRow({ label, value, verified, corregido, corrType, onVerify, onCorrect }: any) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '12px', color: '#6B6A64', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F0EFE9', border: '1px solid #E2E0D8', borderRadius: '6px', padding: '7px 11px' }}>
        <span style={{ flex: 1, fontSize: '13.5px', fontFamily: 'DM Mono', color: '#1A1917' }}>{value}</span>
        <button onClick={() => onVerify(true)} style={{ padding: '4px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 500, border: '1px solid', cursor: 'pointer', fontFamily: 'DM Sans', borderColor: verified === true ? '#2D6A4F' : '#E2E0D8', background: verified === true ? '#D8F3DC' : '#fff', color: verified === true ? '#2D6A4F' : '#6B6A64' }}>Sí ✓</button>
        <button onClick={() => onVerify(false)} style={{ padding: '4px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 500, border: '1px solid', cursor: 'pointer', fontFamily: 'DM Sans', borderColor: verified === false ? '#8B2020' : '#E2E0D8', background: verified === false ? '#FAE0E0' : '#fff', color: verified === false ? '#8B2020' : '#6B6A64' }}>No ✗</button>
      </div>
      {verified === false && (
        <input type={corrType} value={corregido} onChange={e => onCorrect(e.target.value)} placeholder={`${label} correcto...`} style={{ width: '100%', marginTop: '6px', background: '#FFFBF0', border: '1px solid #D08700', borderRadius: '6px', padding: '7px 11px', fontFamily: 'DM Mono', fontSize: '13px', outline: 'none', color: '#1A1917', boxSizing: 'border-box' }} />
      )}
    </div>
  )
}

function RatingGroup({ question, value, onChange, disabled, labels }: any) {
  const l = labels ?? ['Muy disconforme','Disconforme','Neutral','Conforme','Muy conforme']
  return (
    <div style={{ marginBottom: '16px', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ fontSize: '13.5px', marginBottom: '10px', lineHeight: 1.4 }}>{question}</div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => !disabled && onChange(n)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '8px 4px', border: '1px solid', borderRadius: '6px', cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans', borderColor: value === n ? '#1A1917' : '#E2E0D8', background: value === n ? '#1A1917' : '#F0EFE9', color: value === n ? '#fff' : '#1A1917' }}>
            <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'DM Mono' }}>{n}</span>
            <span style={{ fontSize: '9px', textAlign: 'center', lineHeight: 1.2, opacity: 0.7 }}>{l[n-1]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function RadioGroup({ question, options, labels, value, onChange, disabled }: any) {
  return (
    <div style={{ marginBottom: '14px', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ fontSize: '13.5px', marginBottom: '8px', lineHeight: 1.4 }}>{question}</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {options.map((op: string, i: number) => (
          <button key={op} onClick={() => !disabled && onChange(op)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '13px', cursor: disabled ? 'not-allowed' : 'pointer', border: '1px solid', borderColor: value === op ? '#1A1917' : '#E2E0D8', background: value === op ? '#1A1917' : '#fff', color: value === op ? '#fff' : '#6B6A64', fontFamily: 'DM Sans' }}>
            {labels[i]}
          </button>
        ))}
      </div>
    </div>
  )
}
