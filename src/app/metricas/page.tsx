'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { ESTADO_LABELS, ESTADO_COLORS, EstadoGestion } from '@/types'
import { fetchAll } from '@/lib/utils'

// Estados en los que el asesor habló con alguien del otro lado
const ESTADOS_CONTACTADO = ['encuestado', 'fin_gestion', 'no_acepta_encuesta', 'rellamar', 'no_es_titular']

const iso = (d: Date) => {
  const off = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - off).toISOString().split('T')[0]
}
const fmt = (d: string) => d.split('-').reverse().join('/')
const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null

type Asesor = { id: string; nombre: string; gestiones: number; contactados: number; encuestas: number; scores: number[] }

export default function MetricasPage() {
  const hoy = iso(new Date())
  const [desde, setDesde] = useState(hoy)
  const [hasta, setHasta] = useState(hoy)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load(d: string, h: string) {
    setLoading(true); setError('')
    try {
      const supabase = createClient()
      // Convierte el día local (Argentina) a rango UTC
      const ini = new Date(`${d}T00:00:00`).toISOString()
      const fin = new Date(`${h}T23:59:59.999`).toISOString()
      const lista = await fetchAll((from, to) =>
        supabase.from('gestiones')
          .select('id, estado, operador_id, score_recomendacion, updated_at, operador:perfiles(nombre), cliente:clientes(concesionaria)')
          .gte('updated_at', ini).lte('updated_at', fin)
          .order('id', { ascending: true })
          .range(from, to))
      const { count: totalClientes } = await supabase.from('clientes').select('*', { count: 'exact', head: true })
      const { count: encuestadosTotal } = await supabase.from('gestiones').select('*', { count: 'exact', head: true }).eq('estado', 'encuestado')
      const { data: perfiles } = await supabase.from('perfiles').select('id, nombre, rol').eq('activo', true)

      // Por asesor: arrancamos con todos los operadores activos para que aparezcan aunque estén en 0
      const porAsesor: Record<string, Asesor> = {}
      ;(perfiles ?? []).filter((p: any) => p.rol === 'operador').forEach((p: any) => {
        porAsesor[p.id] = { id: p.id, nombre: p.nombre, gestiones: 0, contactados: 0, encuestas: 0, scores: [] }
      })
      lista.forEach((g: any) => {
        if (!porAsesor[g.operador_id]) porAsesor[g.operador_id] = { id: g.operador_id, nombre: g.operador?.nombre ?? 'Desconocido', gestiones: 0, contactados: 0, encuestas: 0, scores: [] }
        const a = porAsesor[g.operador_id]
        a.gestiones++
        if (ESTADOS_CONTACTADO.includes(g.estado)) a.contactados++
        if (g.estado === 'encuestado') { a.encuestas++; if (g.score_recomendacion) a.scores.push(g.score_recomendacion) }
      })

      const porEstado: Record<string, number> = {}
      lista.forEach((g: any) => { porEstado[g.estado] = (porEstado[g.estado] ?? 0) + 1 })

      const porConc: Record<string, { total: number; encuestas: number; scores: number[] }> = {}
      lista.forEach((g: any) => {
        const c = g.cliente?.concesionaria ?? 'Sin asignar'
        if (!porConc[c]) porConc[c] = { total: 0, encuestas: 0, scores: [] }
        porConc[c].total++
        if (g.estado === 'encuestado') porConc[c].encuestas++
        if (g.score_recomendacion) porConc[c].scores.push(g.score_recomendacion)
      })

      setData({
        totalClientes: totalClientes ?? 0,
        encuestadosTotal: encuestadosTotal ?? 0,
        gestiones: lista.length,
        contactados: lista.filter((g: any) => ESTADOS_CONTACTADO.includes(g.estado)).length,
        encuestas: lista.filter((g: any) => g.estado === 'encuestado').length,
        avgScore: avg(lista.filter((g: any) => g.score_recomendacion).map((g: any) => g.score_recomendacion)),
        porAsesor: Object.values(porAsesor).sort((a, b) => b.encuestas - a.encuestas || b.contactados - a.contactados),
        porEstado,
        porConcesionaria: Object.entries(porConc).map(([nombre, d]) => ({ nombre, ...d })).sort((a, b) => b.total - a.total),
      })
    } catch (e: any) {
      console.error(e); setError('No se pudieron cargar las métricas. Recargá la página.')
    }
    setLoading(false)
  }

  useEffect(() => { load(desde, hasta) }, [])

  function rango(tipo: 'hoy' | 'semana' | 'mes' | 'todo') {
    const h = new Date()
    let d = new Date()
    if (tipo === 'semana') d.setDate(h.getDate() - 6)
    if (tipo === 'mes') d = new Date(h.getFullYear(), h.getMonth(), 1)
    if (tipo === 'todo') d = new Date(2026, 0, 1)
    const dd = iso(d), hh = iso(h)
    setDesde(dd); setHasta(hh); load(dd, hh)
  }

  const avance = data?.totalClientes > 0 ? Math.round(data.encuestadosTotal / data.totalClientes * 100) : 0
  const maxGestiones = data ? Math.max(1, ...data.porAsesor.map((a: Asesor) => a.gestiones)) : 1
  const card = { background: '#fff', border: '1px solid #DDE1E6', borderRadius: '14px', padding: '18px' }
  const sectionTitle = { fontSize: '15px', fontWeight: 700, color: '#14171A', marginBottom: '12px' }
  const th = { fontSize: '12.5px', color: '#727A84', textAlign: 'left' as const, padding: '4px 8px 8px 0', fontWeight: 500 }
  const td = { padding: '10px 8px 10px 0', fontSize: '13px', fontFamily: 'inherit' }

  return (
    <>
      <div style={{ height: '68px', display: 'flex', alignItems: 'center', padding: '0 28px', gap: '12px', background: '#ECEEF1', flexShrink: 0 }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700 }}>Métricas</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {(['hoy', 'semana', 'mes', 'todo'] as const).map(t => (
            <button key={t} onClick={() => rango(t)} className="filter-pill">
              {t === 'hoy' ? 'Hoy' : t === 'semana' ? 'Últimos 7 días' : t === 'mes' ? 'Este mes' : 'Todo'}
            </button>
          ))}
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ border: '1px solid #DDE1E6', borderRadius: '6px', padding: '5px 8px', fontSize: '12.5px', fontFamily: 'inherit' }} />
          <span style={{ fontSize: '12px', color: '#727A84' }}>→</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ border: '1px solid #DDE1E6', borderRadius: '6px', padding: '5px 8px', fontSize: '12.5px', fontFamily: 'inherit' }} />
          <button onClick={() => load(desde, hasta)} className="btn btn-primary">Aplicar</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 28px 28px' }}>
        {error && <div style={{ background: '#FAE0E0', border: '1px solid #F09595', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#8B2020', marginBottom: '16px' }}>{error}</div>}
        {loading ? <div style={{ textAlign: 'center', padding: '40px', color: '#727A84' }}>Cargando métricas...</div> : !data ? null : (
          <>
            <div style={{ fontSize: '12.5px', color: '#565D66', marginBottom: '12px' }}>
              Período: <strong>{desde === hasta ? fmt(desde) : `${fmt(desde)} al ${fmt(hasta)}`}</strong>
            </div>

            {/* KPIs del período */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
              {[
                { label: 'Gestiones', value: data.gestiones, sub: 'Llamadas registradas en el período', color: '#14171A' },
                { label: 'Contactados', value: data.contactados, sub: data.gestiones ? `${Math.round(data.contactados / data.gestiones * 100)}% de las gestiones` : '—', color: '#1B4F8A' },
                { label: 'Encuestas realizadas', value: data.encuestas, sub: data.contactados ? `${Math.round(data.encuestas / data.contactados * 100)}% de los contactados` : '—', color: '#2D6A4F' },
                { label: 'Score recomendación', value: data.avgScore ? `${data.avgScore.toFixed(1)}/5` : '—', sub: 'Promedio del período', color: '#7D4F00' },
              ].map(s => (
                <div key={s.label} className="kpi-card">
                  <div style={{ fontSize: '12.5px', color: '#727A84', marginBottom: '6px' }}>{s.label}</div>
                  <div style={{ fontSize: '34px', fontWeight: 800, fontStretch: '125%', letterSpacing: '-0.5px', lineHeight: 1.15, color: '#14171A' }}>{s.value}</div>
                  <div style={{ fontSize: '11.5px', color: '#565D66', marginTop: '4px' }}>{s.sub}</div>
                </div>
              ))}
            </div>

            {/* POR ASESOR */}
            <div style={{ ...card, marginBottom: '16px' }}>
              <div style={sectionTitle}>Rendimiento por asesor</div>
              {data.porAsesor.length === 0 ? <p style={{ fontSize: '13px', color: '#727A84' }}>Sin gestiones en el período</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>
                    {['Asesor', 'Gestiones', 'Contactados', 'Encuestas', 'Efectividad', 'Score', ''].map(h => <th key={h} style={th}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {data.porAsesor.map((a: Asesor) => {
                      const efec = a.contactados ? Math.round(a.encuestas / a.contactados * 100) : 0
                      const sc = avg(a.scores)
                      return (
                        <tr key={a.id} style={{ borderTop: '1px solid #F3F5F7' }}>
                          <td style={{ ...td, fontFamily: 'inherit', fontWeight: 500 }}>{a.nombre}</td>
                          <td style={td}>{a.gestiones}</td>
                          <td style={{ ...td, color: '#1B4F8A', fontWeight: 600 }}>{a.contactados}</td>
                          <td style={{ ...td, color: '#2D6A4F', fontWeight: 600 }}>{a.encuestas}</td>
                          <td style={td}>{a.contactados ? `${efec}%` : '—'}</td>
                          <td style={td}>{sc ? sc.toFixed(1) : '—'}</td>
                          <td style={{ padding: '10px 0', width: '28%' }}>
                            <div style={{ display: 'flex', height: '8px', borderRadius: '100px', overflow: 'hidden', background: '#F3F5F7', width: `${Math.max(4, a.gestiones / maxGestiones * 100)}%` }}>
                              <div style={{ width: `${a.gestiones ? a.encuestas / a.gestiones * 100 : 0}%`, background: '#2D6A4F' }} />
                              <div style={{ width: `${a.gestiones ? (a.contactados - a.encuestas) / a.gestiones * 100 : 0}%`, background: '#85B7EB' }} />
                              <div style={{ flex: 1, background: '#C9CFD6' }} />
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '11.5px', color: '#565D66', flexWrap: 'wrap' }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#2D6A4F', marginRight: 5 }} />Encuesta realizada</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#85B7EB', marginRight: 5 }} />Contactado sin encuesta</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#C9CFD6', marginRight: 5 }} />Sin contacto / dato erróneo</span>
              </div>
              <div style={{ fontSize: '11px', color: '#727A84', marginTop: '8px' }}>
                Contactados = atendió alguien (Encuestado, Fin de gestión, No acepta encuesta, Rellamar o No es titular). Efectividad = encuestas sobre contactados.
              </div>
            </div>

            {/* AVANCE GLOBAL */}
            <div style={{ ...card, marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Avance total de la campaña (desde el inicio)</span>
                <span style={{ fontSize: '13px', fontFamily: 'inherit', color: '#2D6A4F', fontWeight: 600 }}>{avance}%</span>
              </div>
              <div style={{ background: '#F3F5F7', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#2D6A4F', borderRadius: '100px', width: `${avance}%`, transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11.5px', color: '#727A84' }}>
                <span>{data.encuestadosTotal} encuestados</span><span>{data.totalClientes} clientes en la base</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={card}>
                <div style={sectionTitle}>Distribución por estado</div>
                {Object.keys(data.porEstado).length === 0 ? <p style={{ fontSize: '13px', color: '#727A84' }}>Sin datos</p> : Object.entries(data.porEstado).sort((a: any, b: any) => b[1] - a[1]).map(([estado, count]: any) => {
                  const p = Math.round(count / data.gestiones * 100)
                  const c = ESTADO_COLORS[estado as EstadoGestion]?.color ?? '#727A84'
                  return <div key={estado} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12.5px' }}>{ESTADO_LABELS[estado as EstadoGestion] ?? estado}</span>
                      <span style={{ fontSize: '12.5px', fontFamily: 'inherit', color: c }}>{count} <span style={{ color: '#727A84' }}>({p}%)</span></span>
                    </div>
                    <div style={{ background: '#F3F5F7', borderRadius: '100px', height: '6px', overflow: 'hidden' }}><div style={{ height: '100%', background: c, borderRadius: '100px', width: `${p}%` }} /></div>
                  </div>
                })}
              </div>
              <div style={card}>
                <div style={sectionTitle}>Por concesionaria</div>
                {data.porConcesionaria.length === 0 ? <p style={{ fontSize: '13px', color: '#727A84' }}>Sin datos</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Concesionaria', 'Gestiones', 'Encuestas', 'Score'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                    <tbody>{data.porConcesionaria.map((c: any) => {
                      const sc = avg(c.scores)
                      return <tr key={c.nombre} style={{ borderTop: '1px solid #F3F5F7' }}>
                        <td style={{ ...td, fontFamily: 'inherit' }}>{c.nombre}</td>
                        <td style={td}>{c.total}</td>
                        <td style={{ ...td, color: '#2D6A4F' }}>{c.encuestas}</td>
                        <td style={{ ...td, color: sc && sc >= 4 ? '#2D6A4F' : '#7D4F00' }}>{sc ? sc.toFixed(1) : '—'}</td>
                      </tr>
                    })}</tbody>
                  </table>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
