'use client'
import { useState } from 'react'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase'
import { fetchAll, fmtFechaHora, formatDocumento } from '@/lib/utils'
import { ESTADO_LABELS, EstadoGestion } from '@/types'
import { ACCION_LABEL, registrar } from '@/lib/actividad'

type Fila = Record<string, string | number>
const CONTACTADO = ['encuestado', 'fin_gestion', 'no_acepta_encuesta', 'rellamar', 'no_es_titular']
const TOPE_CASO_MIN = 30 // un caso abierto más de 30 min sin guardar no cuenta como tiempo en gestión

const isoLocal = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
const dia = (iso: string) => isoLocal(new Date(iso))
const fmtDia = (d: string) => d.split('-').reverse().join('/')
const hora = (iso: string) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
const estado = (e: string) => ESTADO_LABELS[e as EstadoGestion] ?? e
const prom = (a: number[]) => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length * 10) / 10 : ''
const hhmm = (min: number) => `${Math.floor(min / 60)}:${String(Math.round(min % 60)).padStart(2, '0')}`

async function traer(tabla: string, cols: string, campo: string, d: string, h: string) {
  const supabase = createClient()
  return fetchAll((from, to) => supabase.from(tabla).select(cols)
    .gte(campo, new Date(`${d}T00:00:00`).toISOString()).lte(campo, new Date(`${h}T23:59:59.999`).toISOString())
    .order(campo, { ascending: true }).order('id', { ascending: true }).range(from, to))
}
async function nombres() {
  const { data } = await createClient().from('perfiles').select('id, nombre')
  const m: Record<string, string> = {}; (data ?? []).forEach((p: any) => { m[p.id] = p.nombre })
  return (id: string) => m[id] ?? 'Usuario eliminado'
}

const REPORTES: { id: string; titulo: string; desc: string; generar: (d: string, h: string) => Promise<Fila[]> }[] = [
  {
    id: 'tiempos', titulo: 'Tiempos por asesor',
    desc: 'Por día y asesor: jornada, tiempo en gestión, tiempo sin gestionar y la pausa más larga.',
    generar: async (d, h) => {
      const ev: any[] = await traer('actividad', 'id, usuario_id, accion, cliente_id, created_at', 'created_at', d, h)
      const nom = await nombres()
      const grupos: Record<string, any[]> = {}
      ev.forEach(e => { (grupos[`${dia(e.created_at)}|${e.usuario_id}`] ??= []).push(e) })
      return Object.entries(grupos).map(([k, lista]) => {
        const [fecha, uid] = k.split('|')
        const t = (e: any) => new Date(e.created_at).getTime()
        const jornada = (t(lista[lista.length - 1]) - t(lista[0])) / 60000
        let enGestion = 0, casos = 0, pausaMax = 0, pausas5 = 0, ultimoCierre: number | null = null
        const abiertos: Record<string, number> = {}
        lista.forEach(e => {
          if (e.accion === 'apertura' && e.cliente_id) {
            abiertos[e.cliente_id] = t(e)
            if (ultimoCierre !== null) { const p = (t(e) - ultimoCierre) / 60000; if (p > pausaMax) pausaMax = p; if (p >= 5) pausas5++; ultimoCierre = null }
          }
          if (e.accion === 'gestion' && e.cliente_id) {
            const ini = abiertos[e.cliente_id]
            if (ini) { enGestion += Math.min((t(e) - ini) / 60000, TOPE_CASO_MIN); delete abiertos[e.cliente_id] }
            casos++; ultimoCierre = t(e)
          }
        })
        const sin = Math.max(0, jornada - enGestion)
        return {
          'Día': fmtDia(fecha), 'Asesor': nom(uid), 'Primera acción': hora(lista[0].created_at), 'Última acción': hora(lista[lista.length - 1].created_at),
          'Jornada (h:mm)': hhmm(jornada), 'En gestión (h:mm)': hhmm(enGestion), 'Sin gestionar (h:mm)': hhmm(sin),
          '% sin gestionar': jornada > 0 ? Math.round(sin / jornada * 100) : 0, 'Gestiones guardadas': casos,
          'Min. promedio por gestión': casos ? Math.round(enGestion / casos * 10) / 10 : '', 'Pausas de 5 min o más': pausas5, 'Pausa más larga (min)': Math.round(pausaMax),
        }
      }).sort((a, b) => String(a['Día']).split('/').reverse().join('').localeCompare(String(b['Día']).split('/').reverse().join('')) || String(a['Asesor']).localeCompare(String(b['Asesor'])))
    },
  },
  {
    id: 'productividad', titulo: 'Productividad por asesor y día',
    desc: 'Clientes gestionados, contactados y encuestas de cada asesor, día por día.',
    generar: async (d, h) => {
      const it: any[] = await traer('intentos', 'id, cliente_id, operador_id, estado, created_at', 'created_at', d, h)
      const nom = await nombres()
      const g: Record<string, { n: number; m: Map<string, string> }> = {}
      it.forEach(i => { const x = (g[`${dia(i.created_at)}|${i.operador_id}`] ??= { n: 0, m: new Map() }); x.n++; x.m.set(i.cliente_id, i.estado) })
      return Object.entries(g).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => {
        const [fecha, uid] = k.split('|'); const est = Array.from(x.m.values())
        const c = est.filter(e => CONTACTADO.includes(e)).length, e = est.filter(s => s === 'encuestado').length
        return { 'Día': fmtDia(fecha), 'Asesor': nom(uid), 'Clientes gestionados': est.length, 'Intentos (guardados)': x.n, 'Contactados': c, 'Encuestas': e,
          '% contacto': est.length ? Math.round(c / est.length * 100) : 0, '% encuesta sobre contactados': c ? Math.round(e / c * 100) : 0 }
      })
    },
  },
  {
    id: 'encuestas', titulo: 'Gestiones y respuestas de encuesta',
    desc: 'Una fila por cliente gestionado en el período, con todas las respuestas y correcciones.',
    generar: async (d, h) => {
      const gs: any[] = await traer('gestiones', '*, cliente:clientes(*), operador:perfiles(nombre)', 'updated_at', d, h)
      return gs.map(g => ({
        'Apellido': g.cliente?.apellido ?? '', 'Nombre': g.cliente?.nombre ?? '', 'Tipo doc': formatDocumento(g.cliente?.dni).label, 'Documento': formatDocumento(g.cliente?.dni).value,
        'Teléfono': g.cliente?.telefono ?? '', 'Teléfono corregido': g.telefono_corregido ?? '', 'Email': g.cliente?.email ?? '', 'Email corregido': g.email_corregido ?? '',
        'Concesionaria': g.cliente?.concesionaria ?? '', 'Marca': g.cliente?.marca ?? '', 'Modelo': g.cliente?.modelo ?? '', 'Prioritario': g.cliente?.prioridad ? 'Sí' : '',
        'Estado': estado(g.estado), 'Asesor': g.operador?.nombre ?? '', 'Fecha gestión': fmtFechaHora(g.updated_at), 'Fecha rellamar': g.fecha_rellamar ? fmtFechaHora(g.fecha_rellamar) : '', 'Motivo rellamar': g.motivo_rellamar ?? '',
        'Atención vendedor (1-5)': g.score_vendedor ?? '', 'Vendedor respondió consultas': g.vendedor_respondio_consultas ?? '', 'Atención administrativa (1-5)': g.score_administrativo ?? '',
        'Info funcionalidades': g.info_vehiculo_clara ?? '', 'Explicaron funciones': g.explicaron_funciones ?? '', 'Colocó accesorios': g.coloco_accesorios ?? '', 'Accesorios colocados': g.accesorios_detalle ?? '',
        'Satisfacción equipamiento': g.satisfaccion_equipamiento ?? '', 'Info talleres y postventa': g.info_postventa ?? '', 'Volvió a contactar': g.volvio_contactar ?? '',
        'Contacto posterior (1-5)': g.score_contacto_posterior ?? '', 'Recomendación (1-5)': g.score_recomendacion ?? '', 'Observaciones': g.observaciones ?? '',
      }))
    },
  },
  {
    id: 'concesionarias', titulo: 'Resultados por concesionaria',
    desc: 'Encuestas y promedios de cada concesionaria, con cantidad de detractores (recomendación 1 o 2).',
    generar: async (d, h) => {
      const gs: any[] = await traer('gestiones', 'id, estado, score_vendedor, score_administrativo, score_recomendacion, updated_at, cliente:clientes(concesionaria)', 'updated_at', d, h)
      const m: Record<string, any[]> = {}
      gs.forEach(g => { (m[g.cliente?.concesionaria ?? 'Sin asignar'] ??= []).push(g) })
      const n = (l: any[], k: string) => l.map(g => g[k]).filter((v: any) => typeof v === 'number')
      return Object.entries(m).map(([c, l]) => {
        const enc = l.filter(g => g.estado === 'encuestado'); const rec = n(enc, 'score_recomendacion')
        return { 'Concesionaria': c, 'Clientes gestionados': l.length, 'Encuestas': enc.length, 'Atención vendedor': prom(n(enc, 'score_vendedor')), 'Atención administrativa': prom(n(enc, 'score_administrativo')),
          'Recomendación': prom(rec), 'Detractores (1-2)': rec.filter(v => v <= 2).length, 'Promotores (5)': rec.filter(v => v === 5).length }
      }).sort((a, b) => Number(b['Encuestas']) - Number(a['Encuestas']))
    },
  },
  {
    id: 'bitacora', titulo: 'Bitácora de llamadas',
    desc: 'Cada intento de llamada: cuándo, quién, a qué cliente y con qué resultado.',
    generar: async (d, h) => {
      const it: any[] = await traer('intentos', 'id, estado, nota, created_at, operador_id, cliente:clientes(apellido, nombre, telefono, concesionaria)', 'created_at', d, h)
      const nom = await nombres()
      return it.map(i => ({ 'Fecha y hora': fmtFechaHora(i.created_at), 'Asesor': nom(i.operador_id), 'Cliente': [i.cliente?.apellido, i.cliente?.nombre].filter(Boolean).join(', '),
        'Teléfono': i.cliente?.telefono ?? '', 'Concesionaria': i.cliente?.concesionaria ?? '', 'Resultado': estado(i.estado), 'Nota': i.nota ?? '' }))
    },
  },
  {
    id: 'actividad', titulo: 'Actividad de usuarios',
    desc: 'Ingresos, salidas, casos abiertos, gestiones, altas y exportaciones de cada usuario.',
    generar: async (d, h) => {
      const ev: any[] = await traer('actividad', 'id, usuario_id, accion, detalle, created_at', 'created_at', d, h)
      const nom = await nombres()
      return ev.map(e => ({ 'Fecha y hora': fmtFechaHora(e.created_at), 'Usuario': nom(e.usuario_id), 'Qué hizo': ACCION_LABEL[e.accion] ?? e.accion, 'Detalle': e.detalle ?? '' }))
    },
  },
]

export default function ReportesPage() {
  const hoy = isoLocal(new Date())
  const [sel, setSel] = useState(REPORTES[0].id)
  const [desde, setDesde] = useState(hoy)
  const [hasta, setHasta] = useState(hoy)
  const [filas, setFilas] = useState<Fila[] | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const rep = REPORTES.find(r => r.id === sel)!

  function elegir(id: string) { setSel(id); setFilas(null); setError('') }
  function rango(dias: number) { const d = new Date(); d.setDate(d.getDate() - dias); setDesde(isoLocal(d)); setHasta(hoy); setFilas(null) }

  async function generar() {
    setCargando(true); setError(''); setFilas(null)
    try { setFilas(await rep.generar(desde, hasta)) }
    catch (e) { console.error(e); setError('No se pudo generar el reporte. Si es la primera vez, revisá que esté ejecutado PASO_cola_tiempos_reportes.sql en Supabase.') }
    setCargando(false)
  }

  function descargar() {
    if (!filas?.length) return
    const ws = XLSX.utils.json_to_sheet(filas)
    ws['!cols'] = Object.keys(filas[0]).map(k => ({ wch: Math.min(40, Math.max(k.length + 2, ...filas.slice(0, 200).map(f => String(f[k] ?? '').length + 2))) }))
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, rep.titulo.slice(0, 31))
    XLSX.writeFile(wb, `GrupoAntelo_${rep.id}_${desde}_a_${hasta}.xlsx`)
    registrar('exportacion', `Reporte: ${rep.titulo} (${fmtDia(desde)} a ${fmtDia(hasta)})`)
  }

  const cols = filas?.length ? Object.keys(filas[0]) : []
  const ctl = { height: '36px', border: '1px solid #DDE1E6', borderRadius: '8px', padding: '0 10px', fontSize: '13px', background: '#fff', color: '#14171A' } as const

  return (
    <>
      <div style={{ height: '68px', display: 'flex', alignItems: 'center', padding: '0 28px', background: '#ECEEF1', flexShrink: 0 }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Reportes</h1>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 28px 28px', display: 'grid', gridTemplateColumns: 'minmax(240px, 300px) minmax(0, 1fr)', gap: '20px', alignItems: 'start' }}>
        <div role="radiogroup" aria-label="Tipo de reporte" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {REPORTES.map(r => (
            <button key={r.id} role="radio" aria-checked={sel === r.id} onClick={() => elegir(r.id)}
              style={{ textAlign: 'left', padding: '13px 15px', borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit', border: '1px solid', borderColor: sel === r.id ? '#000' : '#DDE1E6', background: sel === r.id ? '#000' : '#fff', color: sel === r.id ? '#fff' : '#14171A' }}>
              <div style={{ fontSize: '14px', fontWeight: 700 }}>{r.titulo}</div>
              <div style={{ fontSize: '12.5px', marginTop: '3px', color: sel === r.id ? 'rgba(255,255,255,0.7)' : '#565D66' }}>{r.desc}</div>
            </button>
          ))}
        </div>

        <div style={{ background: '#fff', border: '1px solid #DDE1E6', borderRadius: '14px', padding: '20px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <input type="date" value={desde} max={hasta} onChange={e => { setDesde(e.target.value); setFilas(null) }} aria-label="Desde" style={ctl} />
            <span style={{ fontSize: '13px', color: '#727A84' }}>a</span>
            <input type="date" value={hasta} min={desde} onChange={e => { setHasta(e.target.value); setFilas(null) }} aria-label="Hasta" style={ctl} />
            <button className="filter-pill" onClick={() => rango(0)}>Hoy</button>
            <button className="filter-pill" onClick={() => rango(6)}>Últimos 7 días</button>
            <button className="filter-pill" onClick={() => rango(29)}>Últimos 30 días</button>
            <span style={{ flex: 1 }} />
            <button className="btn btn-primary" onClick={generar} disabled={cargando}>{cargando ? 'Generando…' : 'Generar reporte'}</button>
            <button className="btn" onClick={descargar} disabled={!filas?.length} style={{ opacity: filas?.length ? 1 : 0.45 }}>Descargar Excel</button>
          </div>

          {error && <div role="alert" style={{ marginTop: '16px', background: '#FAE0E0', border: '1px solid #F09595', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#8B2020' }}>{error}</div>}
          {!filas && !error && !cargando && <p style={{ marginTop: '22px', fontSize: '13.5px', color: '#565D66' }}>Elegí las fechas y apretá "Generar reporte" para ver {rep.titulo.toLowerCase()}.</p>}
          {filas && filas.length === 0 && <p style={{ marginTop: '22px', fontSize: '13.5px', color: '#565D66' }}>No hay datos para esas fechas. Probá con un rango más amplio.</p>}

          {rep.id === 'tiempos' && (
            <p style={{ marginTop: '14px', fontSize: '12.5px', color: '#727A84', maxWidth: '78ch' }}>
              Jornada = desde la primera hasta la última acción del día. En gestión = tiempo con un caso abierto hasta guardarlo (máximo {TOPE_CASO_MIN} min por caso). Sin gestionar = el resto, e incluye almuerzo y descansos: conviene leerlo junto con las pausas.
            </p>
          )}

          {filas && filas.length > 0 && (
            <>
              <div style={{ marginTop: '16px', overflow: 'auto', maxHeight: '58vh', border: '1px solid #F3F5F7', borderRadius: '10px' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%' }}>
                  <thead><tr>{cols.map(c => <th key={c} style={{ position: 'sticky', top: 0, background: '#F6F8FA', textAlign: 'left', fontSize: '12.5px', fontWeight: 600, color: '#565D66', padding: '10px 12px', whiteSpace: 'nowrap' }}>{c}</th>)}</tr></thead>
                  <tbody>{filas.slice(0, 200).map((f, i) => (
                    <tr key={i} style={{ borderTop: '1px solid #F3F5F7' }}>{cols.map(c => <td key={c} style={{ padding: '8px 12px', fontSize: '13px', whiteSpace: 'nowrap', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f[c]}</td>)}</tr>
                  ))}</tbody>
                </table>
              </div>
              <p style={{ fontSize: '12px', color: '#727A84', marginTop: '10px' }}>{filas.length > 200 ? `Vista previa de las primeras 200 filas de ${filas.length}. El Excel las trae todas.` : `${filas.length} filas.`}</p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
