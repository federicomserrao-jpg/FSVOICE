'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Cliente, Perfil, EstadoGestion, ESTADO_LABELS, ESTADO_COLORS } from '@/types'
import GestionModal from './GestionModal'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  clientes: any[]
  perfil: Perfil
  stats: { total: number; contactados: number; rellamar: number; pendientes: number; avgScore: string | null }
  filtroInicial?: string
  searchInicial?: string
}

const FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'encuestado', label: 'Encuestado' },
  { key: 'rellamar', label: 'Rellamar' },
  { key: 'no_acepta_encuesta', label: 'No acepta' },
  { key: 'fin_gestion', label: 'Fin de gestión' },
  { key: 'no_es_titular', label: 'No es titular' },
]

export default function ClientesList({ clientes, perfil, stats, filtroInicial, searchInicial }: Props) {
  const router = useRouter()
  const [filtro, setFiltro] = useState(filtroInicial ?? 'todos')
  const [search, setSearch] = useState(searchInicial ?? '')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null)

  const getUltimoEstado = (cliente: any): EstadoGestion => {
    if (!cliente.gestiones?.length) return 'pendiente'
    const sorted = [...cliente.gestiones].sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    return sorted[0].estado
  }

  const filtrados = useMemo(() => {
    return clientes.filter(c => {
      const estado = getUltimoEstado(c)
      const matchFiltro = filtro === 'todos' || estado === filtro
      const q = search.toLowerCase()
      const matchSearch = !q || `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) || c.dni?.includes(q)
      return matchFiltro && matchSearch
    })
  }, [clientes, filtro, search])

  return (
    <>
      {/* TOPBAR */}
      <div style={{
        height: '56px', borderBottom: '1px solid #E2E0D8', display: 'flex',
        alignItems: 'center', padding: '0 24px', gap: '16px', background: '#fff', flexShrink: 0
      }}>
        <h1 style={{ fontSize: '15px', fontWeight: 600 }}>Mis casos</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#F0EFE9', border: '1px solid #E2E0D8', borderRadius: '6px',
            padding: '0 12px', height: '34px'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9E9C95" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', width: '180px', fontFamily: 'DM Sans, sans-serif', color: '#1A1917' }}
            />
          </div>
          {perfil.rol === 'admin' && (
            <button className="btn btn-primary" onClick={() => router.push('/admin')}>
              + Nuevo cliente
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total clientes', value: stats.total, sub: 'Base Car One', color: '#1A1917' },
            { label: 'Encuestados', value: stats.contactados, sub: `${stats.total ? Math.round(stats.contactados / stats.total * 100) : 0}% del total`, color: '#2D6A4F' },
            { label: 'Pendientes', value: stats.pendientes, sub: `${stats.total ? Math.round(stats.pendientes / stats.total * 100) : 0}% del total`, color: '#7D4F00' },
            { label: 'Satisfacción prom.', value: stats.avgScore ?? '—', sub: 'Score recomendación', color: '#1B4F8A' },
          ].map(s => (
            <div key={s.label} className="card">
              <div style={{ fontSize: '11.5px', color: '#9E9C95', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-1px', fontFamily: 'DM Mono, monospace', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11.5px', color: '#6B6A64', marginTop: '4px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* FILTROS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#9E9C95' }}>Filtrar:</span>
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '5px',
                padding: '4px 12px', borderRadius: '20px', fontSize: '12.5px',
                cursor: 'pointer', border: '1px solid',
                borderColor: filtro === f.key ? '#1A1917' : '#E2E0D8',
                background: filtro === f.key ? '#1A1917' : '#fff',
                color: filtro === f.key ? '#F5F4F0' : '#6B6A64',
                fontFamily: 'DM Sans, sans-serif',
                transition: 'all 0.15s'
              }}
            >
              {f.label}
            </button>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9E9C95' }}>{filtrados.length} registros</span>
        </div>

        {/* TABLA */}
        <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F0EFE9' }}>
                {['Cliente', 'Concesionaria', 'Vehículo', 'F. compra', 'Estado', 'Score', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px', textAlign: 'left', fontSize: '11.5px',
                    fontWeight: 500, color: '#9E9C95', textTransform: 'uppercase',
                    letterSpacing: '0.5px', borderBottom: '1px solid #E2E0D8'
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9E9C95', fontSize: '14px' }}>
                    No hay clientes que coincidan con los filtros aplicados.
                  </td>
                </tr>
              ) : filtrados.map(c => {
                const estado = getUltimoEstado(c)
                const colorClass = ESTADO_COLORS[estado] ?? ''
                const ultimaGestion = c.gestiones?.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
                const scoreAvg = ultimaGestion?.score_recomendacion

                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #E2E0D8' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFAF7'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
                  >
                    <td style={{ padding: '11px 14px' }}>
                      <strong style={{ display: 'block', fontSize: '13.5px', fontWeight: 500 }}>
                        {c.apellido}, {c.nombre}
                      </strong>
                      <span style={{ fontSize: '12px', color: '#9E9C95', fontFamily: 'DM Mono, monospace' }}>
                        DNI {c.dni ?? '—'}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '13.5px' }}>{c.concesionaria ?? '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13.5px' }}>{c.marca} {c.modelo} {c.anio}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: '#6B6A64', fontFamily: 'DM Mono, monospace' }}>
                      {c.fecha_compra ? format(new Date(c.fecha_compra), 'dd/MM/yyyy') : '—'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <EstadoPill estado={estado} />
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '13.5px' }}>
                      {scoreAvg ? `${scoreAvg}/5` : '—'}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <button
                        className="btn btn-sm"
                        style={estado === 'pendiente' || estado === 'rellamar' ? { background: '#1A1917', color: '#fff', border: 'none' } : {}}
                        onClick={() => setClienteSeleccionado(c)}
                      >
                        {estado === 'encuestado' ? 'Ver detalle' : 'Gestionar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL */}
      {clienteSeleccionado && (
        <GestionModal
          cliente={clienteSeleccionado}
          perfil={perfil}
          onClose={() => { setClienteSeleccionado(null); router.refresh() }}
        />
      )}
    </>
  )
}

function EstadoPill({ estado }: { estado: EstadoGestion }) {
  const colors: Record<EstadoGestion, { bg: string; color: string }> = {
    pendiente: { bg: '#F0EFE9', color: '#6B6A64' },
    encuestado: { bg: '#D8F3DC', color: '#2D6A4F' },
    fin_gestion: { bg: '#DDE9F8', color: '#1B4F8A' },
    no_acepta_encuesta: { bg: '#FAE0E0', color: '#8B2020' },
    rellamar: { bg: '#FFF3CD', color: '#7D4F00' },
    no_es_titular: { bg: '#FAE0E0', color: '#8B2020' },
  }
  const { bg, color } = colors[estado] ?? colors.pendiente
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: bg, color }}>
      {ESTADO_LABELS[estado]}
    </span>
  )
}
