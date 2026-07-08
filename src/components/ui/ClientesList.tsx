'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Perfil, EstadoGestion, ESTADO_LABELS, ESTADO_COLORS } from '@/types'
import GestionModal from './GestionModal'
import { format, isToday, isTomorrow, isPast, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import * as XLSX from 'xlsx'

interface Props {
  clientes: any[]; gestiones: any[]; perfil: Perfil
  stats: { total: number; contactados: number; rellamar: number; pendientes: number; avgScore: string | null }
  filtroInicial?: string; onRefresh?: () => void
}

const FILTROS = [
  { key: 'todos', label: 'Todos' },
  { key: 'pendiente', label: 'Pendiente' },
  { key: 'encuestado', label: 'Encuestado' },
  { key: 'rellamar', label: 'Rellamar' },
  { key: 'sin_contacto', label: 'Sin contacto' },
  { key: 'no_acepta_encuesta', label: 'No acepta' },
  { key: 'fin_gestion', label: 'Fin de gestión' },
  { key: 'no_es_titular', label: 'No es titular' },
  { key: 'numero_equivocado', label: 'Nro. equivocado' },
]

const CAMPOS_VER = [
  { field: 'nombre_verificado', corr: 'nombre_corregido', label: 'Nombre' },
  { field: 'email_verificado', corr: 'email_corregido', label: 'Email' },
  { field: 'telefono_verificado', corr: 'telefono_corregido', label: 'Teléfono' },
  { field: 'direccion_verificada', corr: 'direccion_corregida', label: 'Dirección' },
  { field: 'patente_verificada', corr: 'patente_corregida', label: 'Patente' },
  { field: 'marca_verificada', corr: 'marca_corregida', label: 'Marca' },
  { field: 'modelo_verificado', corr: 'modelo_corregido', label: 'Modelo' },
]

export default function ClientesList({ clientes, gestiones, perfil, stats, filtroInicial, onRefresh }: Props) {
  const router = useRouter()
  const [filtro, setFiltro] = useState(filtroInicial ?? 'todos')
  const [filtroFechaRellamar, setFiltroFechaRellamar] = useState('')
  const [search, setSearch] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null)
  const [showCorrecciones, setShowCorrecciones] = useState(false)

  const getUltimaGestion = (cliente: any) => {
    if (!cliente.gestiones?.length) return null
    return [...cliente.gestiones].sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
  }

  const getUltimoEstado = (cliente: any): EstadoGestion => {
    const g = getUltimaGestion(cliente)
    return g?.estado ?? 'pendiente'
  }

  // Rellamados de hoy
  const rellamadosHoy = useMemo(() => {
    return clientes.filter(c => {
      const g = getUltimaGestion(c)
      if (!g || g.estado !== 'rellamar' || !g.fecha_rellamar) return false
      try { return isToday(parseISO(g.fecha_rellamar)) } catch { return false }
    }).map(c => ({ ...c, _gestion: getUltimaGestion(c) }))
      .sort((a, b) => new Date(a._gestion.fecha_rellamar).getTime() - new Date(b._gestion.fecha_rellamar).getTime())
  }, [clientes])

  // Rellamados vencidos (pasados y no resueltos)
  const rellamadosVencidos = useMemo(() => {
    return clientes.filter(c => {
      const g = getUltimaGestion(c)
      if (!g || g.estado !== 'rellamar' || !g.fecha_rellamar) return false
      try { return isPast(parseISO(g.fecha_rellamar)) && !isToday(parseISO(g.fecha_rellamar)) } catch { return false }
    }).length
  }, [clientes])

  const correcciones = useMemo(() => {
    const resumen: Record<string, { total: number; corregidos: number }> = {}
    CAMPOS_VER.forEach(c => { resumen[c.label] = { total: 0, corregidos: 0 } })
    gestiones.forEach(g => {
      CAMPOS_VER.forEach(c => {
        if ((g as any)[c.field] !== null && (g as any)[c.field] !== undefined) {
          resumen[c.label].total++
          if ((g as any)[c.field] === false && (g as any)[c.corr]) resumen[c.label].corregidos++
        }
      })
    })
    return { resumen, totalVerificados: Object.values(resumen).reduce((a,b) => a+b.total,0), totalCorregidos: Object.values(resumen).reduce((a,b) => a+b.corregidos,0) }
  }, [gestiones])

  const filtrados = useMemo(() => {
    return clientes.filter(c => {
      const estado = getUltimoEstado(c)
      const g = getUltimaGestion(c)
      const matchFiltro = filtro === 'todos' || estado === filtro
      const q = search.toLowerCase()
      const matchSearch = !q || `${c.nombre} ${c.apellido}`.toLowerCase().includes(q) || (c.dni ?? '').includes(q)
      // Filtro por fecha de rellamar
      let matchFecha = true
      if (filtroFechaRellamar && estado === 'rellamar' && g?.fecha_rellamar) {
        matchFecha = g.fecha_rellamar.startsWith(filtroFechaRellamar)
      } else if (filtroFechaRellamar && estado !== 'rellamar') {
        matchFecha = false
      }
      return matchFiltro && matchSearch && matchFecha
    })
  }, [clientes, filtro, search, filtroFechaRellamar])

  function exportarExcel() {
    const rows = gestiones.map(g => ({
      'Apellido': g.cliente?.apellido ?? '', 'Nombre': g.cliente?.nombre ?? '', 'DNI': g.cliente?.dni ?? '',
      'Email original': g.cliente?.email ?? '', 'Email corregido': g.email_corregido ?? '',
      'Teléfono original': g.cliente?.telefono ?? '', 'Teléfono corregido': g.telefono_corregido ?? '',
      'Concesionaria': g.cliente?.concesionaria ?? '',
      'Marca': g.cliente?.marca ?? '', 'Modelo': g.cliente?.modelo ?? '',
      'Patente': g.cliente?.patente ?? '',
      'Estado': ESTADO_LABELS[g.estado as EstadoGestion] ?? g.estado,
      'Operador': g.operador?.nombre ?? '',
      'Fecha gestión': g.updated_at ? format(new Date(g.updated_at), 'dd/MM/yyyy HH:mm') : '',
      'Fecha rellamar': g.fecha_rellamar ? format(new Date(g.fecha_rellamar), 'dd/MM/yyyy HH:mm') : '',
      'Motivo rellamar': g.motivo_rellamar ?? '',
      'Score vendedor': g.score_vendedor ?? '', 'Score administrativo': g.score_administrativo ?? '',
      'Score recomendación': g.score_recomendacion ?? '', 'Observaciones': g.observaciones ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Gestiones')
    ws['!cols'] = Array(20).fill({ wch: 20 })
    XLSX.writeFile(wb, `FSVOICE_CarOne_${format(new Date(), 'ddMMyyyy_HHmm')}.xlsx`)
  }

  return (
    <>
      {/* TOPBAR */}
      <div style={{ height: '56px', borderBottom: '1px solid #E2E0D8', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px', background: '#fff', flexShrink: 0 }}>
        <h1 style={{ fontSize: '15px', fontWeight: 600 }}>Mis casos</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F0EFE9', border: '1px solid #E2E0D8', borderRadius: '6px', padding: '0 12px', height: '34px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9E9C95" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Buscar cliente o DNI..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', width: '200px', fontFamily: 'DM Sans, sans-serif', color: '#1A1917' }} />
          </div>
          <button onClick={() => setShowCorrecciones(!showCorrecciones)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #E2E0D8', background: showCorrecciones ? '#1A1917' : '#fff', color: showCorrecciones ? '#fff' : '#1A1917', fontFamily: 'DM Sans' }}>📊 Correcciones</button>
          <button onClick={exportarExcel} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #E2E0D8', background: '#fff', color: '#1A1917', fontFamily: 'DM Sans' }}>⬇ Exportar Excel</button>
          {perfil.rol === 'admin' && <button onClick={() => router.push('/admin')} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', background: '#1A1917', color: '#fff', fontFamily: 'DM Sans' }}>Admin</button>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {/* ALERTA RELLAMADOS HOY */}
        {rellamadosHoy.length > 0 && (
          <div style={{ background: '#FFF3CD', border: '1px solid #E8C96A', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#7D4F00' }}>
                📞 {rellamadosHoy.length} rellamado{rellamadosHoy.length > 1 ? 's' : ''} programado{rellamadosHoy.length > 1 ? 's' : ''} para hoy
                {rellamadosVencidos > 0 && <span style={{ marginLeft: '10px', fontSize: '12px', color: '#8B2020', background: '#FAE0E0', padding: '2px 8px', borderRadius: '20px' }}>⚠️ {rellamadosVencidos} vencido{rellamadosVencidos > 1 ? 's' : ''}</span>}
              </div>
              <button onClick={() => { setFiltro('rellamar'); setFiltroFechaRellamar('') }} style={{ fontSize: '12px', color: '#7D4F00', background: 'none', border: '1px solid #D08700', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'DM Sans' }}>Ver todos los rellamados</button>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {rellamadosHoy.map(c => (
                <div key={c.id} onClick={() => setClienteSeleccionado(c)}
                  style={{ background: '#fff', border: '1px solid #E8C96A', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', minWidth: '200px', flex: '1 1 200px', maxWidth: '300px' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFFBF0'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1917' }}>{c.apellido}, {c.nombre}</div>
                  <div style={{ fontSize: '12px', color: '#7D4F00', marginTop: '3px', fontFamily: 'DM Mono' }}>
                    🕐 {format(parseISO(c._gestion.fecha_rellamar), 'HH:mm')}hs
                  </div>
                  {c._gestion.motivo_rellamar && <div style={{ fontSize: '11px', color: '#9E9C95', marginTop: '3px' }}>{c._gestion.motivo_rellamar}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total clientes', value: stats.total, sub: 'Base Car One', color: '#1A1917' },
            { label: 'Encuestados', value: stats.contactados, sub: `${stats.total ? Math.round(stats.contactados/stats.total*100) : 0}% del total`, color: '#2D6A4F' },
            { label: 'Pendientes', value: stats.pendientes, sub: `${stats.total ? Math.round(stats.pendientes/stats.total*100) : 0}% del total`, color: '#7D4F00' },
            { label: 'Satisfacción prom.', value: stats.avgScore ?? '—', sub: 'Score recomendación', color: '#1B4F8A' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '16px 18px' }}>
              <div style={{ fontSize: '11.5px', color: '#9E9C95', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{s.label}</div>
              <div style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-1px', fontFamily: 'DM Mono, monospace', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11.5px', color: '#6B6A64', marginTop: '4px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* CORRECCIONES */}
        {showCorrecciones && (
          <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Datos corregidos</div>
              <div style={{ fontSize: '13px', color: '#6B6A64' }}>Total: <strong style={{ color: '#8B2020' }}>{correcciones.totalCorregidos}</strong> de <strong>{correcciones.totalVerificados}</strong> verificados</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px' }}>
              {CAMPOS_VER.map(c => {
                const data = correcciones.resumen[c.label]
                const pct = data.total > 0 ? Math.round(data.corregidos/data.total*100) : 0
                return (
                  <div key={c.label} style={{ background: '#F0EFE9', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#9E9C95', textTransform: 'uppercase', marginBottom: '6px' }}>{c.label}</div>
                    <div style={{ fontSize: '22px', fontWeight: 600, fontFamily: 'DM Mono', color: data.corregidos > 0 ? '#8B2020' : '#2D6A4F' }}>{data.corregidos}</div>
                    <div style={{ fontSize: '11px', color: '#9E9C95', marginTop: '2px' }}>de {data.total} ({pct}%)</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* FILTROS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#9E9C95' }}>Filtrar:</span>
          {FILTROS.map(f => (
            <button key={f.key} onClick={() => { setFiltro(f.key); if (f.key !== 'rellamar') setFiltroFechaRellamar('') }}
              style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12.5px', cursor: 'pointer', border: '1px solid', borderColor: filtro === f.key ? '#1A1917' : '#E2E0D8', background: filtro === f.key ? '#1A1917' : '#fff', color: filtro === f.key ? '#F5F4F0' : '#6B6A64', fontFamily: 'DM Sans' }}>
              {f.label}
            </button>
          ))}
          {/* Filtro de fecha para rellamar */}
          {filtro === 'rellamar' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
              <span style={{ fontSize: '12px', color: '#9E9C95' }}>Fecha:</span>
              <input type="date" value={filtroFechaRellamar} onChange={e => setFiltroFechaRellamar(e.target.value)}
                style={{ border: '1px solid #E2E0D8', borderRadius: '6px', padding: '4px 8px', fontSize: '12.5px', fontFamily: 'DM Sans', outline: 'none', height: '30px' }} />
              {filtroFechaRellamar && <button onClick={() => setFiltroFechaRellamar('')} style={{ fontSize: '11px', color: '#9E9C95', background: 'none', border: 'none', cursor: 'pointer' }}>✕ Limpiar</button>}
            </div>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9E9C95' }}>{filtrados.length} registros</span>
        </div>

        {/* TABLA */}
        <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F0EFE9' }}>
                {['Cliente','Concesionaria','Vehículo','F. compra','Estado', filtro === 'rellamar' ? 'Rellamar' : 'Score',''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11.5px', fontWeight: 500, color: '#9E9C95', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #E2E0D8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#9E9C95', fontSize: '14px' }}>No hay clientes que coincidan.</td></tr>
              ) : filtrados.map(c => {
                const estado = getUltimoEstado(c)
                const g = getUltimaGestion(c)
                const { bg, color } = ESTADO_COLORS[estado]
                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #E2E0D8' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FAFAF7'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}>
                    <td style={{ padding: '11px 14px' }}>
                      <strong style={{ display: 'block', fontSize: '13.5px', fontWeight: 500 }}>{c.apellido}{c.nombre ? `, ${c.nombre}` : ''}</strong>
                      <span style={{ fontSize: '12px', color: '#9E9C95', fontFamily: 'DM Mono' }}>DNI {c.dni ?? '—'}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: '#6B6A64' }}>{c.concesionaria ?? '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13px' }}>{c.marca} {c.modelo}</td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#9E9C95', fontFamily: 'DM Mono' }}>{c.fecha_compra ? format(new Date(c.fecha_compra), 'dd/MM/yyyy') : '—'}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: bg, color }}>{ESTADO_LABELS[estado]}</span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '12.5px' }}>
                      {filtro === 'rellamar' && g?.fecha_rellamar ? (
                        <div>
                          <div style={{ fontFamily: 'DM Mono', color: '#7D4F00', fontWeight: 600 }}>
                            {format(parseISO(g.fecha_rellamar), 'dd/MM HH:mm')}
                          </div>
                          {g.motivo_rellamar && <div style={{ fontSize: '11px', color: '#9E9C95', marginTop: '2px' }}>{g.motivo_rellamar}</div>}
                        </div>
                      ) : (
                        g?.score_recomendacion ? `${g.score_recomendacion}/5` : '—'
                      )}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <button onClick={() => setClienteSeleccionado(c)}
                        style={{ background: ['pendiente','rellamar','sin_contacto'].includes(estado) ? '#1A1917' : '#fff', color: ['pendiente','rellamar','sin_contacto'].includes(estado) ? '#fff' : '#1A1917', border: '1px solid #E2E0D8', borderRadius: '6px', padding: '5px 12px', fontSize: '12.5px', fontFamily: 'DM Sans', cursor: 'pointer', fontWeight: 500 }}>
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

      {clienteSeleccionado && (
        <GestionModal cliente={clienteSeleccionado} perfil={perfil} onClose={() => { setClienteSeleccionado(null); if (onRefresh) onRefresh() }} />
      )}
    </>
  )
}
