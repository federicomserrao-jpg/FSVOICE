'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { ESTADO_LABELS, EstadoGestion } from '@/types'
import { format } from 'date-fns'

export default function MetricasPage() {
  const searchParams = useSearchParams()
  const hoy = new Date().toISOString().split('T')[0]
  const [desde, setDesde] = useState(searchParams.get('desde') ?? new Date(Date.now()-7*86400000).toISOString().split('T')[0])
  const [hasta, setHasta] = useState(searchParams.get('hasta') ?? hoy)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  async function load(d: string, h: string) {
    setLoading(true)
    const supabase = createClient()
    const { data: gestiones } = await supabase.from('gestiones').select('*, operador:perfiles(nombre), cliente:clientes(concesionaria)').gte('updated_at', `${d}T00:00:00`).lte('updated_at', `${h}T23:59:59`)
    const { count: totalClientes } = await supabase.from('clientes').select('*', { count: 'exact', head: true })
    const lista = gestiones ?? []
    const porOperador: Record<string, any> = {}
    lista.forEach((g: any) => {
      const nom = g.operador?.nombre ?? 'Desconocido'
      if (!porOperador[g.operador_id]) porOperador[g.operador_id] = { nombre: nom, total: 0, encuestados: 0, scores: [] }
      porOperador[g.operador_id].total++
      if (g.estado === 'encuestado') { porOperador[g.operador_id].encuestados++; if (g.score_recomendacion) porOperador[g.operador_id].scores.push(g.score_recomendacion) }
    })
    const porEstado: Record<string, number> = {}
    lista.forEach((g: any) => { porEstado[g.estado] = (porEstado[g.estado] ?? 0) + 1 })
    const porConc: Record<string, any> = {}
    lista.forEach((g: any) => {
      const c = g.cliente?.concesionaria ?? 'Sin asignar'
      if (!porConc[c]) porConc[c] = { total: 0, scores: [] }
      porConc[c].total++; if (g.score_recomendacion) porConc[c].scores.push(g.score_recomendacion)
    })
    const encuestados = lista.filter((g: any) => g.estado === 'encuestado').length
    const allScores = lista.filter((g: any) => g.score_recomendacion).map((g: any) => g.score_recomendacion)
    const avgScore = allScores.length ? allScores.reduce((a: number, b: number) => a+b,0)/allScores.length : null
    setData({ totalClientes: totalClientes ?? 0, totalGestiones: lista.length, encuestados, avgScore, porOperador: Object.values(porOperador), porEstado, porConcesionaria: Object.entries(porConc).map(([nombre, d]: any) => ({ nombre, ...d })) })
    setLoading(false)
  }

  useEffect(() => { load(desde, hasta) }, [])

  const colorEstado: Record<string, string> = { encuestado: '#2D6A4F', fin_gestion: '#1B4F8A', pendiente: '#9E9C95', rellamar: '#7D4F00', no_acepta_encuesta: '#8B2020', no_es_titular: '#8B2020' }
  const pct = data?.totalClientes > 0 ? Math.round(data.encuestados/data.totalClientes*100) : 0

  return (
    <>
      <div style={{ height: '56px', borderBottom: '1px solid #E2E0D8', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px', background: '#fff', flexShrink: 0 }}>
        <h1 style={{ fontSize: '15px', fontWeight: 600 }}>Métricas</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#9E9C95' }}>Rango:</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} style={{ border: '1px solid #E2E0D8', borderRadius: '6px', padding: '5px 10px', fontSize: '13px', fontFamily: 'DM Sans', outline: 'none' }} />
          <span style={{ fontSize: '12px', color: '#9E9C95' }}>→</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} style={{ border: '1px solid #E2E0D8', borderRadius: '6px', padding: '5px 10px', fontSize: '13px', fontFamily: 'DM Sans', outline: 'none' }} />
          <button onClick={() => load(desde, hasta)} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', background: '#1A1917', color: '#fff', fontFamily: 'DM Sans' }}>Aplicar</button>
          <button onClick={() => { setDesde(hoy); setHasta(hoy); load(hoy, hoy) }} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #E2E0D8', background: '#fff', color: '#1A1917', fontFamily: 'DM Sans' }}>Hoy</button>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {loading ? <div style={{ textAlign: 'center', padding: '40px', color: '#9E9C95' }}>Cargando métricas...</div> : !data ? null : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Total clientes', value: data.totalClientes, sub: 'Base Car One', color: '#1A1917' },
                { label: 'Gestiones período', value: data.totalGestiones, sub: `${desde} → ${hasta}`, color: '#1B4F8A' },
                { label: 'Encuestados', value: data.encuestados, sub: `${pct}% del total`, color: '#2D6A4F' },
                { label: 'Score promedio', value: data.avgScore ? data.avgScore.toFixed(1) : '—', sub: 'Recomendación / 5', color: data.avgScore >= 4 ? '#2D6A4F' : '#7D4F00' },
              ].map(s => (
                <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '16px 18px' }}>
                  <div style={{ fontSize: '11.5px', color: '#9E9C95', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{s.label}</div>
                  <div style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-1px', fontFamily: 'DM Mono', color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '11.5px', color: '#6B6A64', marginTop: '4px' }}>{s.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500 }}>Avance de gestión</span>
                <span style={{ fontSize: '13px', fontFamily: 'DM Mono', color: '#2D6A4F', fontWeight: 600 }}>{pct}%</span>
              </div>
              <div style={{ background: '#F0EFE9', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#2D6A4F', borderRadius: '100px', width: `${pct}%`, transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11.5px', color: '#9E9C95' }}>
                <span>{data.encuestados} encuestados</span><span>{data.totalClientes - data.encuestados} pendientes</span>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '18px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '12px' }}>Por operador</div>
                {data.porOperador.length === 0 ? <p style={{ fontSize: '13px', color: '#9E9C95' }}>Sin datos</p> : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Operador','Gestiones','Encuestados','Score'].map(h => <th key={h} style={{ fontSize: '11px', color: '#9E9C95', textAlign: 'left', padding: '4px 0 8px', fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                    <tbody>{data.porOperador.sort((a: any,b: any) => b.encuestados-a.encuestados).map((op: any) => {
                      const avg = op.scores.length ? (op.scores.reduce((a: number,b: number) => a+b,0)/op.scores.length).toFixed(1) : '—'
                      return <tr key={op.nombre} style={{ borderTop: '1px solid #F0EFE9' }}><td style={{ padding: '8px 0', fontSize: '13px' }}>{op.nombre}</td><td style={{ padding: '8px 0', fontSize: '13px', fontFamily: 'DM Mono' }}>{op.total}</td><td style={{ padding: '8px 0', fontSize: '13px', fontFamily: 'DM Mono', color: '#2D6A4F' }}>{op.encuestados}</td><td style={{ padding: '8px 0', fontSize: '13px', fontFamily: 'DM Mono' }}>{avg}</td></tr>
                    })}</tbody>
                  </table>
                )}
              </div>
              <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '18px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '12px' }}>Distribución por estado</div>
                {Object.keys(data.porEstado).length === 0 ? <p style={{ fontSize: '13px', color: '#9E9C95' }}>Sin datos</p> : Object.entries(data.porEstado).sort((a: any,b: any) => b[1]-a[1]).map(([estado, count]: any) => {
                  const total = Object.values(data.porEstado).reduce((a: any,b: any) => a+b, 0) as number
                  const p = Math.round(count/total*100)
                  const c = colorEstado[estado] ?? '#9E9C95'
                  return <div key={estado} style={{ marginBottom: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12.5px' }}>{ESTADO_LABELS[estado as EstadoGestion] ?? estado}</span>
                      <span style={{ fontSize: '12.5px', fontFamily: 'DM Mono', color: c }}>{count} <span style={{ color: '#9E9C95' }}>({p}%)</span></span>
                    </div>
                    <div style={{ background: '#F0EFE9', borderRadius: '100px', height: '6px', overflow: 'hidden' }}><div style={{ height: '100%', background: c, borderRadius: '100px', width: `${p}%` }} /></div>
                  </div>
                })}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '18px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#9E9C95', marginBottom: '12px' }}>Por concesionaria</div>
              {data.porConcesionaria.length === 0 ? <p style={{ fontSize: '13px', color: '#9E9C95' }}>Sin datos</p> : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr>{['Concesionaria','Gestiones','Score prom.'].map(h => <th key={h} style={{ fontSize: '11px', color: '#9E9C95', textAlign: 'left', padding: '4px 0 8px', fontWeight: 500, textTransform: 'uppercase' }}>{h}</th>)}</tr></thead>
                  <tbody>{data.porConcesionaria.sort((a: any,b: any) => b.total-a.total).map((c: any) => {
                    const avg = c.scores.length ? (c.scores.reduce((a: number,b: number) => a+b,0)/c.scores.length).toFixed(1) : '—'
                    return <tr key={c.nombre} style={{ borderTop: '1px solid #F0EFE9' }}><td style={{ padding: '8px 0', fontSize: '13px' }}>{c.nombre}</td><td style={{ padding: '8px 0', fontSize: '13px', fontFamily: 'DM Mono' }}>{c.total}</td><td style={{ padding: '8px 0', fontSize: '13px', fontFamily: 'DM Mono', color: parseFloat(avg) >= 4 ? '#2D6A4F' : '#7D4F00' }}>{avg}</td></tr>
                  })}</tbody>
                </table>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}
