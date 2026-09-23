'use client'
import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Perfil, EstadoGestion, ESTADO_LABELS, ESTADO_COLORS } from '@/types'
import GestionModal from './GestionModal'
import { formatDocumento, detectarDuplicados, fmtFecha, fmtFechaHora } from '@/lib/utils'
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
  { key: 'dato_erroneo', label: 'Dato erróneo' },
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

const PAGE_SIZE = 50

export default function ClientesList({ clientes, gestiones, perfil, stats, filtroInicial, onRefresh }: Props) {
  const router = useRouter()
  const [filtro, setFiltro] = useState(filtroInicial ?? 'todos')
  const [filtroFechaRellamar, setFiltroFechaRellamar] = useState('')
  const [search, setSearch] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState<any | null>(null)
  const [showCorrecciones, setShowCorrecciones] = useState(false)
  const [pagina, setPagina] = useState(1)

  const duplicados = useMemo(() => detectarDuplicados(clientes), [clientes])

  const getUltimaGestion = (cliente: any) => {
    if (!cliente.gestiones?.length) return null
    return [...cliente.gestiones].sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
  }

  const getUltimoEstado = (cliente: any): EstadoGestion => {
    return getUltimaGestion(cliente)?.estado ?? 'pendiente'
  }

  // Rellamados hoy y vencidos
  const hoy = new Date().toDateString()
  const rellamadosHoy = useMemo(() => {
    return clientes.filter(c => {
      const g = getUltimaGestion(c)
      if (!g || g.estado !== 'rellamar' || !g.fecha_rellamar) return false
      return new Date(g.fecha_rellamar).toDateString() === hoy
    }).map(c => ({ ...c, _gestion: getUltimaGestion(c) }))
      .sort((a, b) => new Date(a._gestion.fecha_rellamar).getTime() - new Date(b._gestion.fecha_rellamar).getTime())
  }, [clientes])

  const rellamadosVencidos = useMemo(() => {
    return clientes.filter(c => {
      const g = getUltimaGestion(c)
      if (!g || g.estado !== 'rellamar' || !g.fecha_rellamar) return false
      const fecha = new Date(g.fecha_rellamar)
      return fecha < new Date() && fecha.toDateString() !== hoy
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
    return {
      resumen,
      totalVerificados: Object.values(resumen).reduce((a, b) => a + b.total, 0),
      totalCorregidos: Object.values(resumen).reduce((a, b) => a + b.corregidos, 0)
    }
  }, [gestiones])

  // Conteo por estado para los filtros
  const conteoPorEstado = useMemo(() => {
    const c: Record<string, number> = {}
    clientes.forEach(cl => {
      const e = getUltimoEstado(cl)
      c[e] = (c[e] ?? 0) + 1
    })
    return c
  }, [clientes])

  const filtrados = useMemo(() => {
    const res = clientes.filter(c => {
      const estado = getUltimoEstado(c)
      const matchFiltro = filtro === 'todos' || estado === filtro
      const q = search.toLowerCase().trim()
      const matchSearch = !q ||
        `${c.nombre ?? ''} ${c.apellido ?? ''}`.toLowerCase().includes(q) ||
        (c.dni ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (c.telefono ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, '')) ||
        (c.telefono_alternativo ?? '').replace(/\D/g, '').includes(q.replace(/\D/g, ''))
      let matchFecha = true
      if (filtroFechaRellamar && estado === 'rellamar') {
        const g = getUltimaGestion(c)
        matchFecha = g?.fecha_rellamar?.startsWith(filtroFechaRellamar) ?? false
      } else if (filtroFechaRellamar && estado !== 'rellamar') {
        matchFecha = false
      }
      return matchFiltro && matchSearch && matchFecha
    })
    return res
  }, [clientes, filtro, search, filtroFechaRellamar])

  // Reset página al cambiar filtros
  const setFiltroConReset = (f: string) => { setFiltro(f); setPagina(1); if (f !== 'rellamar') setFiltroFechaRellamar('') }
  const setSearchConReset = (s: string) => { setSearch(s); setPagina(1) }

  const totalPaginas = Math.ceil(filtrados.length / PAGE_SIZE)
  const paginados = filtrados.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE)

  function exportarExcel() {
    const rows = gestiones.map(g => ({
      'Apellido': g.cliente?.apellido ?? '', 'Nombre': g.cliente?.nombre ?? '',
      'Tipo Doc': formatDocumento(g.cliente?.dni).label,
      'Documento': formatDocumento(g.cliente?.dni).value,
      'Email original': g.cliente?.email ?? '', 'Email corregido': g.email_corregido ?? '',
      'Teléfono original': g.cliente?.telefono ?? '', 'Teléfono corregido': g.telefono_corregido ?? '',
      'Concesionaria': g.cliente?.concesionaria ?? '',
      'Marca': g.cliente?.marca ?? '', 'Modelo': g.cliente?.modelo ?? '',
      'Patente': g.cliente?.patente ?? '',
      'Estado': ESTADO_LABELS[g.estado as EstadoGestion] ?? g.estado,
      'Operador': g.operador?.nombre ?? '',
      'Fecha gestión': fmtFechaHora(g.updated_at),
      'Fecha rellamar': fmtFechaHora(g.fecha_rellamar),
      'Motivo rellamar': g.motivo_rellamar ?? '',
      'Score vendedor': g.score_vendedor ?? '',
      'Score administrativo': g.score_administrativo ?? '',
      'Score recomendación': g.score_recomendacion ?? '',
      'Observaciones': g.observaciones ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Gestiones')
    ws['!cols'] = Array(21).fill({ wch: 20 })
    const fecha = new Date().toLocaleDateString('es-AR').replace(/\//g, '-')
    XLSX.writeFile(wb, `FSVOICE_CarOne_${fecha}.xlsx`)
  }

  return (
    <>
      {/* TOPBAR */}
      <div style={{ height: '56px', borderBottom: '1px solid #E2E0D8', display: 'flex', alignItems: 'center', padding: '0 24px', gap: '16px', background: '#fff', flexShrink: 0 }}>
        <h1 style={{ fontSize: '15px', fontWeight: 600 }}>Mis casos</h1>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F0EFE9', border: '1px solid #E2E0D8', borderRadius: '6px', padding: '0 12px', height: '34px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9E9C95" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input type="text" placeholder="Nombre, DNI, CUIT o teléfono..." value={search} onChange={e => setSearchConReset(e.target.value)}
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: '13px', width: '220px', fontFamily: 'DM Sans, sans-serif', color: '#1A1917' }} />
          </div>
          <button onClick={() => setShowCorrecciones(!showCorrecciones)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #E2E0D8', background: showCorrecciones ? '#1A1917' : '#fff', color: showCorrecciones ? '#fff' : '#1A1917', fontFamily: 'DM Sans' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            Correcciones
          </button>
          <button onClick={exportarExcel}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #E2E0D8', background: '#fff', color: '#1A1917', fontFamily: 'DM Sans' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Exportar Excel
          </button>
          {perfil.rol === 'admin' && (
            <button onClick={() => router.push('/admin')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '0 14px', height: '34px', borderRadius: '6px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', background: '#1A1917', color: '#fff', fontFamily: 'DM Sans' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
              Admin
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

        {/* ALERTA RELLAMADOS HOY */}
        {rellamadosHoy.length > 0 && (
          <div style={{ background: '#FFF3CD', border: '1px solid #E8C96A', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ fontWeight: 600, fontSize: '14px', color: '#7D4F00', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2H7a2 2 0 012 1.7c.1 1 .4 2 .7 2.9a2 2 0 01-.5 2L8 9.9a16 16 0 006 6l1.3-1.3a2 2 0 012-.5c.9.3 1.9.5 2.9.7A2 2 0 0122 16.9z"/></svg>
                {rellamadosHoy.length} rellamado{rellamadosHoy.length > 1 ? 's' : ''} para hoy
                {rellamadosVencidos > 0 && (
                  <span style={{ fontSize: '12px', color: '#8B2020', background: '#FAE0E0', padding: '2px 8px', borderRadius: '20px', fontWeight: 600 }}>
                    ⚠ {rellamadosVencidos} vencido{rellamadosVencidos > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <button onClick={() => setFiltroConReset('rellamar')} style={{ fontSize: '12px', color: '#7D4F00', background: 'none', border: '1px solid #D08700', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontFamily: 'DM Sans' }}>
                Ver todos los rellamados
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {rellamadosHoy.map(c => (
                <div key={c.id} onClick={() => setClienteSeleccionado(c)}
                  style={{ background: '#fff', border: '1px solid #E8C96A', borderRadius: '8px', padding: '10px 14px', cursor: 'pointer', minWidth: '180px', flex: '1 1 180px', maxWidth: '280px' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#FFFBF0'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#fff'}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1917' }}>{c.apellido}{c.nombre ? `, ${c.nombre}` : ''}</div>
                  <div style={{ fontSize: '12px', color: '#7D4F00', marginTop: '3px', fontFamily: 'DM Mono' }}>
                    {new Date(c._gestion.fecha_rellamar).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}hs
                  </div>
                  {c._gestion.motivo_rellamar && <div style={{ fontSize: '11px', color: '#9E9C95', marginTop: '3px' }}>{c._gestion.motivo_rellamar}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* RELLAMADOS VENCIDOS BANNER */}
        {rellamadosVencidos > 0 && filtro === 'rellamar' && (
          <div style={{ background: '#FAE0E0', border: '1px solid #F09595', borderRadius: '8px', padding: '10px 16px', marginBottom: '12px', fontSize: '13px', color: '#8B2020', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <strong>{rellamadosVencidos} rellamados vencidos</strong> — tenían fecha programada anterior a hoy y aún no fueron gestionados.
          </div>
        )}

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
          {[
            { label: 'Total clientes', value: stats.total, sub: 'Base Car One', color: '#1A1917', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg> },
            { label: 'Encuestados', value: stats.contactados, sub: `${stats.total ? Math.round(stats.contactados/stats.total*100) : 0}% del total`, color: '#2D6A4F', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> },
            { label: 'Pendientes', value: stats.pendientes, sub: `${stats.total ? Math.round(stats.pendientes/stats.total*100) : 0}% del total`, color: '#7D4F00', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
            { label: 'Satisfacción', value: stats.avgScore ? `${stats.avgScore}/5` : '—', sub: 'Score recomendación', color: '#1B4F8A', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '16px 18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <div style={{ fontSize: '11.5px', color: '#9E9C95', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</div>
                <div style={{ color: s.color, opacity: 0.6 }}>{s.icon}</div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: 600, letterSpacing: '-1px', fontFamily: 'DM Mono, monospace', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11.5px', color: '#6B6A64', marginTop: '4px' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* CORRECCIONES */}
        {showCorrecciones && (
          <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Datos corregidos en gestiones</div>
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

        {/* FILTROS CON CONTADOR */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '14px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', color: '#9E9C95', marginRight: '2px' }}>Filtrar:</span>
          {FILTROS.map(f => {
            const count = f.key === 'todos' ? clientes.length : (conteoPorEstado[f.key] ?? 0)
            const active = filtro === f.key
            return (
              <button key={f.key} onClick={() => setFiltroConReset(f.key)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', border: '1px solid', borderColor: active ? '#1A1917' : '#E2E0D8', background: active ? '#1A1917' : '#fff', color: active ? '#F5F4F0' : '#6B6A64', fontFamily: 'DM Sans', whiteSpace: 'nowrap' }}>
                {f.label}
                <span style={{ fontSize: '11px', opacity: 0.7, fontFamily: 'DM Mono' }}>{count}</span>
              </button>
            )
          })}
          {filtro === 'rellamar' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '4px' }}>
              <span style={{ fontSize: '12px', color: '#9E9C95' }}>Fecha:</span>
              <input type="date" value={filtroFechaRellamar} onChange={e => { setFiltroFechaRellamar(e.target.value); setPagina(1) }}
                style={{ border: '1px solid #E2E0D8', borderRadius: '6px', padding: '4px 8px', fontSize: '12px', fontFamily: 'DM Sans', outline: 'none', height: '28px' }} />
              {filtroFechaRellamar && <button onClick={() => setFiltroFechaRellamar('')} style={{ fontSize: '11px', color: '#9E9C95', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>}
            </div>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#9E9C95' }}>{filtrados.length} registros</span>
        </div>

        {/* TABLA */}
        <div style={{ background: '#fff', border: '1px solid #E2E0D8', borderRadius: '10px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F0EFE9' }}>
                {['Cliente', 'Concesionaria', 'Vehículo', 'F. compra', 'Estado', filtro === 'rellamar' ? 'Rellamar' : 'Score', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '11.5px', fontWeight: 500, color: '#9E9C95', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '1px solid #E2E0D8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginados.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '48px', textAlign: 'center', color: '#9E9C95', fontSize: '14px' }}>
                  <div style={{ marginBottom: '8px', fontSize: '24px' }}>🔍</div>
                  No hay clientes que coincidan con los filtros aplicados.
                </td></tr>
              ) : paginados.map(c => {
                const estado = getUltimoEstado(c)
                const g = getUltimaGestion(c)
                const { bg, color } = ESTADO_COLORS[estado]
                const doc = formatDocumento(c.dni)
                const esDuplicado = duplicados.has(c.id)

                // Rellamado vencido
                const esRellamadoVencido = estado === 'rellamar' && g?.fecha_rellamar &&
                  new Date(g.fecha_rellamar) < new Date() &&
                  new Date(g.fecha_rellamar).toDateString() !== hoy

                return (
                  <tr key={c.id} style={{ borderBottom: '1px solid #E2E0D8', background: esDuplicado ? '#FFFBF0' : '' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = esDuplicado ? '#FFF3CD' : '#FAFAF7'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = esDuplicado ? '#FFFBF0' : ''}>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                        <div>
                          <strong style={{ display: 'block', fontSize: '13.5px', fontWeight: 500 }}>
                            {c.apellido}{c.nombre ? `, ${c.nombre}` : ''}
                          </strong>
                          <span style={{ fontSize: '11.5px', color: '#9E9C95', fontFamily: 'DM Mono' }}>
                            {doc.label} {doc.value}
                          </span>
                        </div>
                        {esDuplicado && (
                          <span title="Posible duplicado" style={{ flexShrink: 0, marginTop: '2px', fontSize: '10px', background: '#FFF3CD', color: '#7D4F00', border: '1px solid #E8C96A', borderRadius: '4px', padding: '1px 5px', fontWeight: 600 }}>
                            DUP
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '13px', color: '#6B6A64' }}>{c.concesionaria ?? '—'}</td>
                    <td style={{ padding: '11px 14px', fontSize: '13px' }}>{c.marca} {c.modelo}</td>
                    <td style={{ padding: '11px 14px', fontSize: '12px', color: '#9E9C95', fontFamily: 'DM Mono' }}>{fmtFecha(c.fecha_compra)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 9px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, background: bg, color }}>
                        {ESTADO_LABELS[estado]}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', fontSize: '12.5px' }}>
                      {filtro === 'rellamar' && g?.fecha_rellamar ? (
                        <div>
                          <div style={{ fontFamily: 'DM Mono', color: esRellamadoVencido ? '#8B2020' : '#7D4F00', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {esRellamadoVencido && <span title="Vencido" style={{ fontSize: '10px', background: '#FAE0E0', color: '#8B2020', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>VENC</span>}
                            {fmtFechaHora(g.fecha_rellamar)}
                          </div>
                          {g.motivo_rellamar && <div style={{ fontSize: '11px', color: '#9E9C95', marginTop: '2px' }}>{g.motivo_rellamar}</div>}
                        </div>
                      ) : (
                        g?.score_recomendacion ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ fontFamily: 'DM Mono', fontWeight: 600, color: g.score_recomendacion >= 4 ? '#2D6A4F' : g.score_recomendacion >= 3 ? '#7D4F00' : '#8B2020' }}>{g.score_recomendacion}</span>
                            <span style={{ color: '#9E9C95', fontSize: '11px' }}>/5</span>
                          </div>
                        ) : '—'
                      )}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <button onClick={() => setClienteSeleccionado(c)}
                        style={{
                          background: ['pendiente','rellamar','sin_contacto'].includes(estado) ? '#1A1917' : '#F0EFE9',
                          color: ['pendiente','rellamar','sin_contacto'].includes(estado) ? '#fff' : '#1A1917',
                          border: 'none', borderRadius: '6px', padding: '5px 12px', fontSize: '12.5px',
                          fontFamily: 'DM Sans', cursor: 'pointer', fontWeight: 500
                        }}>
                        {estado === 'encuestado' ? 'Ver detalle' : 'Gestionar'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        {totalPaginas > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            <button onClick={() => setPagina(p => Math.max(1, p-1))} disabled={pagina === 1}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #E2E0D8', background: '#fff', cursor: pagina === 1 ? 'not-allowed' : 'pointer', opacity: pagina === 1 ? 0.4 : 1, fontFamily: 'DM Sans', fontSize: '13px' }}>
              ← Anterior
            </button>
            <span style={{ fontSize: '13px', color: '#6B6A64', fontFamily: 'DM Mono' }}>
              {pagina} / {totalPaginas} — mostrando {((pagina-1)*PAGE_SIZE)+1}–{Math.min(pagina*PAGE_SIZE, filtrados.length)} de {filtrados.length}
            </span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p+1))} disabled={pagina === totalPaginas}
              style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid #E2E0D8', background: '#fff', cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer', opacity: pagina === totalPaginas ? 0.4 : 1, fontFamily: 'DM Sans', fontSize: '13px' }}>
              Siguiente →
            </button>
          </div>
        )}
      </div>

      {clienteSeleccionado && (
        <GestionModal cliente={clienteSeleccionado} perfil={perfil}
          onClose={() => { setClienteSeleccionado(null); if (onRefresh) onRefresh() }} />
      )}
    </>
  )
}
