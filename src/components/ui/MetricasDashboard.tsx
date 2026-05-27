'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ESTADO_LABELS, EstadoGestion } from '@/types'

interface Props {
  desde: string
  hasta: string
  totalClientes: number
  totalGestiones: number
  encuestados: number
  avgScore: number | null
  porOperador: { nombre: string; total: number; encuestados: number; scores: number[] }[]
  porEstado: Record<string, number>
  porConcesionaria: { nombre: string; total: number; scores: number[] }[]
}

export default function MetricasDashboard(props: Props) {
  const router = useRouter()
  const [desde, setDesde] = useState(props.desde)
  const [hasta, setHasta] = useState(props.hasta)

  function aplicarFiltro() {
    router.push(`/metricas?desde=${desde}&hasta=${hasta}`)
  }

  const pct = props.totalClientes > 0 ? Math.round(props.encuestados / props.totalClientes * 100) : 0

  const colorEstado: Record<string, string> = {
    encuestado: '#2D6A4F', fin_gestion: '#1B4F8A', pendiente: '#9E9C95',
    rellamar: '#7D4F00', no_acepta_encuesta: '#8B2020', no_es_titular: '#8B2020'
  }

  return (
    <>
      {/* TOPBAR */}
      <div style={{ height: '56px', borderBottom: '1px solid #E2E0D8', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px', background: '#fff', flexShrink: 0 }}>
        <h1 style={{ fontSize: '15px', fontWeight: 600 }}>Métricas</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '12px', color: '#9E9C95' }}>Rango:</span>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)}
            style={{ border: '1px solid #E2E0D8', borderRadius: '6px', padding: '5px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
          <span style={{ fontSize: '12px', color: '#9E9C95' }}>→</span>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)}
            style={{ border: '1px solid #E2E0D8', borderRadius: '6px', padding: '5px 10px', fontSize: '13px', fontFamily: 'DM Sans, sans-serif', outline: 'none' }} />
          <button className="btn btn-primary" onClick={aplicarFiltro}>Aplicar</button>
          <button className="btn" onClick={() => { const h = new Date().toISOString().split('T')[0]; setDesde(h); setHasta(h); router.push(`/metricas?desde=${h}&hasta=${h}`) }}>Hoy</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
          {[
            { label: 'Total clientes', value: props.totalClientes, sub: 'Base Car One', color: '#1A1917' },
            { label: 'Gestiones período', value: props.totalGestiones, sub: `${desde} → ${hasta}`, color: '#1B4F8A' },
            { label: 'Encuestados', value: props.encuestados, sub: `${pct}% del total`, color: '#2D6A4F' },
            { label: 'Score promedio', value: props.avgScore ? props.avgScore.toFixed(1) : '—', sub: 'Recomendación / 5', color: props.avgScore && props.avgScore >= 4 ? '#2D6A4F' : '#7D4F00' },
          ].map(s => (
            <div key={s.label} className="card">
              <div style={{ fontSize: '11.5px', color: '#9E9C95', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-1px', fontFamily: 'DM Mono, monospace', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11.5px', color: '#6B6A64', marginTop: '4px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Barra de progreso */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500 }}>Avance de gestión</span>
            <span style={{ fontSize: '13px', fontFamily: 'DM Mono, monospace', color: '#2D6A4F', fontWeight: 600 }}>{pct}%</span>
          </div>
          <div style={{ background: '#F0EFE9', borderRadius: '100px', height: '10px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#2D6A4F', borderRadius: '100px', width: `${pct}%`, transition: 'width 0.5s' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11.5px', color: '#9E9C95' }}>
            <span>{props.encuestados} encuestados</span>
            <span>{props.totalClientes - props.encuestados} pendientes</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>

          {/* Por operador */}
          <div className="card">
            <div className="section-title">Por operador</div>
            {props.porOperador.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9E9C95' }}>Sin datos para el período</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Operador', 'Gestiones', 'Encuestados', 'Score prom.'].map(h => (
                      <th key={h} style={{ fontSize: '11px', color: '#9E9C95', textAlign: 'left', padding: '4px 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {props.porOperador.sort((a,b) => b.encuestados - a.encuestados).map(op => {
                    const avg = op.scores.length ? (op.scores.reduce((a,b) => a+b,0) / op.scores.length).toFixed(1) : '—'
                    return (
                      <tr key={op.nombre} style={{ borderTop: '1px solid #F0EFE9' }}>
                        <td style={{ padding: '8px 0', fontSize: '13px' }}>{op.nombre}</td>
                        <td style={{ padding: '8px 0', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>{op.total}</td>
                        <td style={{ padding: '8px 0', fontSize: '13px', fontFamily: 'DM Mono, monospace', color: '#2D6A4F' }}>{op.encuestados}</td>
                        <td style={{ padding: '8px 0', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>{avg}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Por estado */}
          <div className="card">
            <div className="section-title">Distribución por estado</div>
            {Object.keys(props.porEstado).length === 0 ? (
              <p style={{ fontSize: '13px', color: '#9E9C95' }}>Sin datos para el período</p>
            ) : (
              <div>
                {Object.entries(props.porEstado).sort((a,b) => b[1]-a[1]).map(([estado, count]) => {
                  const total = Object.values(props.porEstado).reduce((a,b) => a+b, 0)
                  const pct = Math.round(count / total * 100)
                  const color = colorEstado[estado] ?? '#9E9C95'
                  return (
                    <div key={estado} style={{ marginBottom: '10px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12.5px' }}>{ESTADO_LABELS[estado as EstadoGestion] ?? estado}</span>
                        <span style={{ fontSize: '12.5px', fontFamily: 'DM Mono, monospace', color }}>{count} <span style={{ color: '#9E9C95' }}>({pct}%)</span></span>
                      </div>
                      <div style={{ background: '#F0EFE9', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: color, borderRadius: '100px', width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Por concesionaria */}
        <div className="card">
          <div className="section-title">Por concesionaria</div>
          {props.porConcesionaria.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#9E9C95' }}>Sin datos para el período</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Concesionaria', 'Gestiones', 'Score promedio'].map(h => (
                    <th key={h} style={{ fontSize: '11px', color: '#9E9C95', textAlign: 'left', padding: '4px 0 8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {props.porConcesionaria.sort((a,b) => b.total - a.total).map(c => {
                  const avg = c.scores.length ? (c.scores.reduce((a,b) => a+b,0) / c.scores.length).toFixed(1) : '—'
                  return (
                    <tr key={c.nombre} style={{ borderTop: '1px solid #F0EFE9' }}>
                      <td style={{ padding: '8px 0', fontSize: '13px' }}>{c.nombre}</td>
                      <td style={{ padding: '8px 0', fontSize: '13px', fontFamily: 'DM Mono, monospace' }}>{c.total}</td>
                      <td style={{ padding: '8px 0', fontSize: '13px', fontFamily: 'DM Mono, monospace', color: parseFloat(avg) >= 4 ? '#2D6A4F' : '#7D4F00' }}>{avg}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  )
}
