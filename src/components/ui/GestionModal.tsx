'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import { Perfil, EstadoGestion, ESTADO_LABELS, HistorialCambio } from '@/types'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  cliente: any
  perfil: Perfil
  onClose: () => void
}

type Step = 1 | 2 | 3 | 4

const ESTADOS_OPCIONES: { value: EstadoGestion; label: string }[] = [
  { value: 'encuestado', label: 'Encuestado' },
  { value: 'fin_gestion', label: 'Fin de gestión' },
  { value: 'no_acepta_encuesta', label: 'No acepta encuesta' },
  { value: 'rellamar', label: 'Rellamar' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'no_es_titular', label: 'No es titular' },
]

const FIELDS_REQUIRED_STEP1 = ['nombre_verificado', 'email_verificado', 'telefono_verificado', 'direccion_verificada', 'patente_verificada', 'marca_verificada', 'modelo_verificado']
const FIELDS_REQUIRED_STEP2 = ['score_vendedor', 'vendedor_respondio_consultas', 'score_administrativo', 'info_vehiculo_clara', 'explicaron_funciones', 'info_postventa']
const FIELDS_REQUIRED_STEP3 = ['volvio_contactar', 'score_recomendacion']

export default function GestionModal({ cliente, perfil, onClose }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [saving, setSaving] = useState(false)
  const [historial, setHistorial] = useState<HistorialCambio[]>([])
  const [showHistorial, setShowHistorial] = useState(false)
  const [gestionExistente, setGestionExistente] = useState<any>(null)

  const [form, setForm] = useState({
    estado: 'pendiente' as EstadoGestion,
    fecha_rellamar: '',
    motivo_rellamar: '',
    observaciones: '',
    // validación
    nombre_verificado: null as boolean | null,
    nombre_corregido: '',
    email_verificado: null as boolean | null,
    email_corregido: '',
    telefono_verificado: null as boolean | null,
    telefono_corregido: '',
    direccion_verificada: null as boolean | null,
    direccion_corregida: '',
    patente_verificada: null as boolean | null,
    patente_corregida: '',
    marca_verificada: null as boolean | null,
    marca_corregida: '',
    modelo_verificado: null as boolean | null,
    modelo_corregido: '',
    // encuesta
    score_vendedor: null as number | null,
    vendedor_respondio_consultas: '' as string,
    score_administrativo: null as number | null,
    info_vehiculo_clara: '' as string,
    explicaron_funciones: '' as string,
    info_postventa: '' as string,
    volvio_contactar: '' as string,
    score_contacto_posterior: null as number | null,
    score_recomendacion: null as number | null,
  })

  const [errors, setErrors] = useState<string[]>([])

  useEffect(() => {
    loadGestionExistente()
  }, [cliente.id])

  async function loadGestionExistente() {
    const supabase = createClient()
    const { data } = await supabase
      .from('gestiones')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (data) {
      setGestionExistente(data)
      setForm(prev => ({
        ...prev,
        ...data,
        nombre_corregido: data.nombre_corregido ?? '',
        email_corregido: data.email_corregido ?? '',
        telefono_corregido: data.telefono_corregido ?? '',
        direccion_corregida: data.direccion_corregida ?? '',
        patente_corregida: data.patente_corregida ?? '',
        marca_corregida: data.marca_corregida ?? '',
        modelo_corregido: data.modelo_corregido ?? '',
        fecha_rellamar: data.fecha_rellamar ?? '',
        motivo_rellamar: data.motivo_rellamar ?? '',
        observaciones: data.observaciones ?? '',
        vendedor_respondio_consultas: data.vendedor_respondio_consultas ?? '',
        info_vehiculo_clara: data.info_vehiculo_clara ?? '',
        explicaron_funciones: data.explicaron_funciones ?? '',
        info_postventa: data.info_postventa ?? '',
        volvio_contactar: data.volvio_contactar ?? '',
      }))

      // Cargar historial
      const { data: hist } = await supabase
        .from('historial_cambios')
        .select('*, operador:perfiles(nombre)')
        .eq('gestion_id', data.id)
        .order('created_at', { ascending: false })
      setHistorial(hist ?? [])
    }
  }

  function validateStep(s: Step): string[] {
    const errs: string[] = []
    if (s === 1) {
      const bools = ['nombre_verificado', 'email_verificado', 'telefono_verificado', 'direccion_verificada', 'patente_verificada', 'marca_verificada', 'modelo_verificado']
      bools.forEach(f => {
        if ((form as any)[f] === null) errs.push(`Falta verificar: ${f.replace('_verificado', '').replace('_verificada', '')}`)
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
    setStep(prev => Math.min(prev + 1, 4) as Step)
  }

  function prevStep() {
    setErrors([])
    setStep(prev => Math.max(prev - 1, 1) as Step)
  }

  function setField(key: string, value: any) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function guardar() {
    const errs = validateStep(3)
    if (errs.length) { setErrors(errs); return }
    setSaving(true)
    const supabase = createClient()

    const payload = {
      cliente_id: cliente.id,
      operador_id: perfil.id,
      completado: ['encuestado', 'fin_gestion', 'no_acepta_encuesta', 'no_es_titular'].includes(form.estado),
      ...form,
      fecha_rellamar: form.fecha_rellamar || null,
      motivo_rellamar: form.motivo_rellamar || null,
      observaciones: form.observaciones || null,
      email_corregido: form.email_verificado === false ? form.email_corregido : null,
      telefono_corregido: form.telefono_verificado === false ? form.telefono_corregido : null,
      nombre_corregido: form.nombre_verificado === false ? form.nombre_corregido : null,
      direccion_corregida: form.direccion_verificada === false ? form.direccion_corregida : null,
      patente_corregida: form.patente_verificada === false ? form.patente_corregida : null,
      marca_corregida: form.marca_verificada === false ? form.marca_corregida : null,
      modelo_corregido: form.modelo_verificado === false ? form.modelo_corregido : null,
    }

    let gestionId = gestionExistente?.id

    if (gestionExistente) {
      // Registrar cambios en historial
      const cambiosFields = Object.keys(payload) as string[]
      for (const campo of cambiosFields) {
        const anterior = gestionExistente[campo]
        const nuevo = (payload as any)[campo]
        if (String(anterior) !== String(nuevo) && nuevo !== undefined) {
          await supabase.from('historial_cambios').insert({
            gestion_id: gestionId,
            operador_id: perfil.id,
            campo_modificado: campo,
            valor_anterior: anterior != null ? String(anterior) : null,
            valor_nuevo: nuevo != null ? String(nuevo) : null,
          })
        }
      }
      await supabase.from('gestiones').update(payload).eq('id', gestionId)
    } else {
      const { data } = await supabase.from('gestiones').insert(payload).select().single()
      gestionId = data?.id
    }

    setSaving(false)
    onClose()
  }

  const needsRellamar = form.estado === 'rellamar'
  const encuestaSaltable = !['encuestado', 'fin_gestion'].includes(form.estado)

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(10,10,8,0.55)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: '14px', width: '100%', maxWidth: '660px',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
      }}>

        {/* HEADER */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #E2E0D8', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>{cliente.apellido}, {cliente.nombre}</h2>
            <p style={{ fontSize: '12.5px', color: '#6B6A64', marginTop: '2px' }}>
              {cliente.marca} {cliente.modelo} {cliente.anio} · {cliente.concesionaria}
              {cliente.fecha_compra && ` · Compra: ${format(new Date(cliente.fecha_compra), 'dd/MM/yyyy')}`}
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              {cliente.telefono && (
                <a href={`tel:${cliente.telefono}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '12.5px', color: '#1B4F8A', textDecoration: 'none',
                  background: '#DDE9F8', padding: '3px 10px', borderRadius: '20px'
                }}>
                  📞 {cliente.telefono}
                </a>
              )}
              {cliente.telefono_alternativo && (
                <a href={`tel:${cliente.telefono_alternativo}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '12.5px', color: '#1B4F8A', textDecoration: 'none',
                  background: '#DDE9F8', padding: '3px 10px', borderRadius: '20px'
                }}>
                  📞 Alt: {cliente.telefono_alternativo}
                </a>
              )}
              {cliente.email && (
                <a href={`mailto:${cliente.email}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '12.5px', color: '#2D6A4F', textDecoration: 'none',
                  background: '#D8F3DC', padding: '3px 10px', borderRadius: '20px'
                }}>
                  ✉️ {cliente.email}
                </a>
              )}
              {cliente.email_alternativo && (
                <a href={`mailto:${cliente.email_alternativo}`} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  fontSize: '12.5px', color: '#2D6A4F', textDecoration: 'none',
                  background: '#D8F3DC', padding: '3px 10px', borderRadius: '20px'
                }}>
                  ✉️ Alt: {cliente.email_alternativo}
                </a>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {historial.length > 0 && (
              <button
                onClick={() => setShowHistorial(!showHistorial)}
                style={{
                  background: showHistorial ? '#1A1917' : 'none', border: '1px solid #E2E0D8',
                  borderRadius: '6px', padding: '5px 12px', fontSize: '12px', cursor: 'pointer',
                  color: showHistorial ? '#fff' : '#6B6A64', fontFamily: 'DM Sans, sans-serif'
                }}
              >
                📋 Historial ({historial.length})
              </button>
            )}
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9E9C95', fontSize: '20px', lineHeight: 1 }}>×</button>
          </div>
        </div>

        {/* HISTORIAL */}
        {showHistorial && (
          <div style={{ background: '#F0EFE9', borderBottom: '1px solid #E2E0D8', padding: '16px 24px', maxHeight: '200px', overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '10px' }}>Historial de cambios</div>
            {historial.map(h => (
              <div key={h.id} style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '12.5px', alignItems: 'flex-start' }}>
                <span style={{ color: '#9E9C95', fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>
                  {format(new Date(h.created_at), 'dd/MM HH:mm')}
                </span>
                <span style={{ color: '#6B6A64', flexShrink: 0 }}>{(h as any).operador?.nombre ?? 'Usuario'}</span>
                <span style={{ color: '#1A1917' }}>
                  <strong>{h.campo_modificado}</strong>: {h.valor_anterior ?? '—'} → {h.valor_nuevo ?? '—'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* STEPS BAR */}
        <div style={{ display: 'flex', padding: '16px 24px', background: '#F0EFE9', borderBottom: '1px solid #E2E0D8', gap: 0 }}>
          {[
            { n: 1, label: 'Validación' },
            { n: 2, label: 'Experiencia' },
            { n: 3, label: 'Post-compra' },
          ].map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
              <div
                style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', cursor: 'pointer',
                  color: step === s.n ? '#1A1917' : step > s.n ? '#2D6A4F' : '#9E9C95' }}
                onClick={() => { if (s.n < step) setStep(s.n as Step) }}
              >
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '11px', fontFamily: 'DM Mono, monospace', fontWeight: 600, flexShrink: 0,
                  background: step > s.n ? '#2D6A4F' : step === s.n ? '#1A1917' : 'none',
                  color: step >= s.n ? '#fff' : '#9E9C95',
                  border: `1.5px solid ${step > s.n ? '#2D6A4F' : step === s.n ? '#1A1917' : '#C8C6BC'}`
                }}>
                  {step > s.n ? '✓' : s.n}
                </div>
                {s.label}
              </div>
              {i < 2 && <span style={{ flex: 1, textAlign: 'center', color: '#C8C6BC', fontSize: '14px' }}>›</span>}
            </div>
          ))}
        </div>

        {/* ERRORS */}
        {errors.length > 0 && (
          <div style={{ background: '#FAE0E0', border: '1px solid #F09595', margin: '16px 24px 0', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#8B2020' }}>
            {errors.map(e => <div key={e}>• {e}</div>)}
          </div>
        )}

        {/* BODY */}
        <div>

          {/* STEP 1: VALIDACIÓN */}
          {step === 1 && (
            <div>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
                <div className="section-title">Verificar datos del cliente</div>
                {[
                  { label: 'Nombre completo', value: `${cliente.nombre} ${cliente.apellido}`, field: 'nombre_verificado', corrField: 'nombre_corregido', type: 'text' },
                  { label: 'Email', value: cliente.email ?? '(sin dato)', field: 'email_verificado', corrField: 'email_corregido', type: 'email' },
                  { label: 'Teléfono', value: cliente.telefono ?? '(sin dato)', field: 'telefono_verificado', corrField: 'telefono_corregido', type: 'tel' },
                  { label: 'Dirección', value: cliente.direccion ?? '(sin dato)', field: 'direccion_verificada', corrField: 'direccion_corregida', type: 'text' },
                ].map(item => (
                  <VerifyRow
                    key={item.field}
                    label={item.label}
                    value={item.value}
                    verified={(form as any)[item.field]}
                    corregido={(form as any)[item.corrField]}
                    corrType={item.type}
                    onVerify={v => setField(item.field, v)}
                    onCorrect={v => setField(item.corrField, v)}
                  />
                ))}
              </div>

              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
                <div className="section-title">Verificar datos del vehículo</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { label: 'Marca', value: cliente.marca ?? '—', field: 'marca_verificada', corrField: 'marca_corregida' },
                    { label: 'Modelo', value: cliente.modelo ?? '—', field: 'modelo_verificado', corrField: 'modelo_corregido' },
                    { label: 'Patente', value: cliente.patente ?? '—', field: 'patente_verificada', corrField: 'patente_corregida' },
                  ].map(item => (
                    <VerifyRow
                      key={item.field}
                      label={item.label}
                      value={item.value}
                      verified={(form as any)[item.field]}
                      corregido={(form as any)[item.corrField]}
                      corrType="text"
                      onVerify={v => setField(item.field, v)}
                      onCorrect={v => setField(item.corrField, v)}
                    />
                  ))}
                </div>
              </div>

              {/* Estado de gestión */}
              <div style={{ padding: '16px 24px', background: '#F0EFE9', borderBottom: '1px solid #E2E0D8' }}>
                <div className="section-title">Estado de la gestión</div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {ESTADOS_OPCIONES.map(op => (
                    <button
                      key={op.value}
                      onClick={() => setField('estado', op.value)}
                      style={{
                        padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
                        cursor: 'pointer', border: '1px solid',
                        borderColor: form.estado === op.value ? '#1A1917' : '#E2E0D8',
                        background: form.estado === op.value ? '#1A1917' : '#fff',
                        color: form.estado === op.value ? '#F5F4F0' : '#6B6A64',
                        fontFamily: 'DM Sans, sans-serif', transition: 'all 0.12s'
                      }}
                    >{op.label}</button>
                  ))}
                </div>
                {needsRellamar && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '10px', alignItems: 'center', background: '#FFF3CD', border: '1px solid #E8C96A', borderRadius: '6px', padding: '10px 14px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#7D4F00', flexShrink: 0 }}>📅 Rellamar:</span>
                    <input
                      type="datetime-local"
                      value={form.fecha_rellamar}
                      onChange={e => setField('fecha_rellamar', e.target.value)}
                      style={{ border: '1px solid #D08700', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', background: '#fff', outline: 'none' }}
                    />
                    <input
                      type="text"
                      value={form.motivo_rellamar}
                      onChange={e => setField('motivo_rellamar', e.target.value)}
                      placeholder="Motivo..."
                      style={{ flex: 1, border: '1px solid #D08700', borderRadius: '6px', padding: '6px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', background: '#fff', outline: 'none' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: EXPERIENCIA */}
          {step === 2 && (
            <div>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
                <div className="section-title">Atención del vendedor</div>
                <RatingGroup
                  question="¿Cómo calificaría la atención brindada por el vendedor? (1 al 5)"
                  value={form.score_vendedor}
                  onChange={v => setField('score_vendedor', v)}
                  disabled={encuestaSaltable}
                />
                <RadioGroup
                  question="¿El vendedor respondió de manera clara y completa todas sus consultas?"
                  options={['si', 'parcialmente', 'no']}
                  labels={['Sí', 'Parcialmente', 'No']}
                  value={form.vendedor_respondio_consultas}
                  onChange={v => setField('vendedor_respondio_consultas', v)}
                  disabled={encuestaSaltable}
                />
              </div>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
                <div className="section-title">Atención administrativa</div>
                <RatingGroup
                  question="¿Cómo calificaría la atención del área administrativa?"
                  value={form.score_administrativo}
                  onChange={v => setField('score_administrativo', v)}
                  disabled={encuestaSaltable}
                />
              </div>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
                <div className="section-title">Información sobre el vehículo</div>
                <RadioGroup question="¿Recibió información clara sobre las funcionalidades del vehículo?" options={['si','parcialmente','no']} labels={['Sí','Parcialmente','No']} value={form.info_vehiculo_clara} onChange={v => setField('info_vehiculo_clara', v)} disabled={encuestaSaltable} />
                <RadioGroup question="¿Le explicaron el uso de las principales funciones del auto?" options={['si','no']} labels={['Sí','No']} value={form.explicaron_funciones} onChange={v => setField('explicaron_funciones', v)} disabled={encuestaSaltable} />
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div className="section-title">Postventa</div>
                <RadioGroup question="¿Le informaron sobre los talleres oficiales y servicios disponibles?" options={['si','no']} labels={['Sí','No']} value={form.info_postventa} onChange={v => setField('info_postventa', v)} disabled={encuestaSaltable} />
              </div>
              {encuestaSaltable && (
                <div style={{ background: '#DDE9F8', border: '1px solid #85B7EB', margin: '0 24px 16px', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#1B4F8A' }}>
                  Las preguntas de encuesta no son obligatorias para el estado "{ESTADO_LABELS[form.estado]}". Podés continuar sin completarlas.
                </div>
              )}
            </div>
          )}

          {/* STEP 3: POST-COMPRA */}
          {step === 3 && (
            <div>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
                <div className="section-title">Contacto posterior</div>
                <RadioGroup question="Luego de la compra, ¿tuvo que volver a comunicarse con la concesionaria?" options={['si','no']} labels={['Sí','No']} value={form.volvio_contactar} onChange={v => setField('volvio_contactar', v)} disabled={encuestaSaltable} />
                {form.volvio_contactar === 'si' && (
                  <RatingGroup question="¿Cómo calificaría la atención recibida en ese contacto posterior?" value={form.score_contacto_posterior} onChange={v => setField('score_contacto_posterior', v)} disabled={encuestaSaltable} />
                )}
              </div>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #E2E0D8' }}>
                <div className="section-title">Recomendación</div>
                <RatingGroup
                  question="¿Qué tan probable es que recomiende la concesionaria a un amigo o familiar? (1 al 5)"
                  value={form.score_recomendacion}
                  onChange={v => setField('score_recomendacion', v)}
                  disabled={encuestaSaltable}
                  labels={['Muy improbable', 'Improbable', 'Neutral', 'Probable', 'Muy probable']}
                />
              </div>
              <div style={{ padding: '20px 24px' }}>
                <div className="section-title">Observaciones libres</div>
                <textarea
                  value={form.observaciones}
                  onChange={e => setField('observaciones', e.target.value)}
                  placeholder="Comentarios adicionales del cliente..."
                  style={{
                    width: '100%', background: '#F0EFE9', border: '1px solid #E2E0D8', borderRadius: '6px',
                    padding: '10px 12px', fontFamily: 'DM Sans, sans-serif', fontSize: '13.5px',
                    resize: 'vertical', minHeight: '80px', outline: 'none', color: '#1A1917'
                  }}
                />
              </div>
              {encuestaSaltable && (
                <div style={{ background: '#DDE9F8', border: '1px solid #85B7EB', margin: '0 24px 16px', borderRadius: '6px', padding: '10px 14px', fontSize: '13px', color: '#1B4F8A' }}>
                  Las preguntas de encuesta no son obligatorias para el estado "{ESTADO_LABELS[form.estado]}".
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E0D8', display: 'flex', justifyContent: 'flex-end', gap: '10px', background: '#F0EFE9' }}>
          <button className="btn" onClick={onClose}>Cancelar</button>
          {step > 1 && <button className="btn" onClick={prevStep}>← Anterior</button>}
          {step < 3 && <button className="btn btn-primary" onClick={nextStep}>Siguiente →</button>}
          {step === 3 && (
            <button className="btn btn-primary" onClick={guardar} disabled={saving}>
              {saving ? 'Guardando...' : '✓ Guardar gestión'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Subcomponentes ──────────────────────────────────

function VerifyRow({ label, value, verified, corregido, corrType, onVerify, onCorrect }: {
  label: string; value: string; verified: boolean | null; corregido: string
  corrType: string; onVerify: (v: boolean) => void; onCorrect: (v: string) => void
}) {
  return (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '12px', color: '#6B6A64', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: '#F0EFE9', border: '1px solid #E2E0D8', borderRadius: '6px', padding: '7px 11px'
      }}>
        <span style={{ flex: 1, fontSize: '13.5px', fontFamily: 'DM Mono, monospace', color: '#1A1917' }}>{value}</span>
        <button
          onClick={() => onVerify(true)}
          style={{
            padding: '4px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 500,
            border: '1px solid', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.12s',
            borderColor: verified === true ? '#2D6A4F' : '#E2E0D8',
            background: verified === true ? '#D8F3DC' : '#fff',
            color: verified === true ? '#2D6A4F' : '#6B6A64',
          }}
        >Sí ✓</button>
        <button
          onClick={() => onVerify(false)}
          style={{
            padding: '4px 10px', borderRadius: '5px', fontSize: '12px', fontWeight: 500,
            border: '1px solid', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.12s',
            borderColor: verified === false ? '#8B2020' : '#E2E0D8',
            background: verified === false ? '#FAE0E0' : '#fff',
            color: verified === false ? '#8B2020' : '#6B6A64',
          }}
        >No ✗</button>
      </div>
      {verified === false && (
        <input
          type={corrType}
          value={corregido}
          onChange={e => onCorrect(e.target.value)}
          placeholder={`${label} correcto...`}
          style={{
            width: '100%', marginTop: '6px', background: '#FFFBF0', border: '1px solid #D08700',
            borderRadius: '6px', padding: '7px 11px', fontFamily: 'DM Mono, monospace',
            fontSize: '13px', outline: 'none', color: '#1A1917'
          }}
        />
      )}
    </div>
  )
}

function RatingGroup({ question, value, onChange, disabled, labels }: {
  question: string; value: number | null; onChange: (v: number) => void
  disabled?: boolean; labels?: string[]
}) {
  const defaultLabels = ['Muy disconforme', 'Disconforme', 'Neutral', 'Conforme', 'Muy conforme']
  const l = labels ?? defaultLabels
  return (
    <div style={{ marginBottom: '16px', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ fontSize: '13.5px', marginBottom: '10px', lineHeight: 1.4 }}>{question}</div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {[1,2,3,4,5].map(n => (
          <button
            key={n}
            onClick={() => !disabled && onChange(n)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
              padding: '8px 4px', border: '1px solid', borderRadius: '6px',
              cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'all 0.12s',
              borderColor: value === n ? '#1A1917' : '#E2E0D8',
              background: value === n ? '#1A1917' : '#F0EFE9',
              color: value === n ? '#F5F4F0' : '#1A1917',
            }}
          >
            <span style={{ fontSize: '16px', fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{n}</span>
            <span style={{ fontSize: '9px', textAlign: 'center', lineHeight: 1.2, opacity: 0.7 }}>{l[n-1]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function RadioGroup({ question, options, labels, value, onChange, disabled }: {
  question: string; options: string[]; labels: string[]
  value: string; onChange: (v: string) => void; disabled?: boolean
}) {
  return (
    <div style={{ marginBottom: '14px', opacity: disabled ? 0.5 : 1 }}>
      <div style={{ fontSize: '13.5px', marginBottom: '8px', lineHeight: 1.4 }}>{question}</div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {options.map((op, i) => (
          <button
            key={op}
            onClick={() => !disabled && onChange(op)}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
              cursor: disabled ? 'not-allowed' : 'pointer', border: '1px solid',
              borderColor: value === op ? '#1A1917' : '#E2E0D8',
              background: value === op ? '#1A1917' : '#fff',
              color: value === op ? '#F5F4F0' : '#6B6A64',
              fontFamily: 'DM Sans, sans-serif', transition: 'all 0.12s'
            }}
          >{labels[i]}</button>
        ))}
      </div>
    </div>
  )
}
