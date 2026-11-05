'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ClientesList from '@/components/ui/ClientesList'
import { Perfil } from '@/types'

const SELECT_CLIENTES = '*, gestiones(id, estado, created_at, updated_at, score_recomendacion, fecha_rellamar, motivo_rellamar)'
const PAGINA = 1000

// Trae una tabla completa en paralelo (de a 1000 filas), en vez de una página detrás de otra
async function traerTodo(tabla: string, select: string, orden: string[]) {
  const supabase = createClient()
  const { count, error } = await supabase.from(tabla).select('id', { count: 'exact', head: true })
  if (error) throw error
  const paginas = Math.max(1, Math.ceil((count ?? 0) / PAGINA))
  const partes = await Promise.all(Array.from({ length: paginas }, (_, i) => {
    let q = supabase.from(tabla).select(select)
    orden.forEach(c => { q = q.order(c, { ascending: true }) })
    return q.range(i * PAGINA, i * PAGINA + PAGINA - 1)
  }))
  const out: any[] = []
  for (const p of partes) { if (p.error) throw p.error; out.push(...(p.data ?? [])) }
  return out
}

function calcularStats(lista: any[]) {
  const activos = lista.filter((x: any) => !x.en_revision) // los retirados de la base activa no cuentan
  const scores = activos.flatMap((x: any) => x.gestiones ?? []).filter((g: any) => g.score_recomendacion).map((g: any) => g.score_recomendacion)
  return {
    total: activos.length,
    contactados: activos.filter((x: any) => x.gestiones?.some((g: any) => g.estado === 'encuestado')).length,
    rellamar: activos.filter((x: any) => x.gestiones?.some((g: any) => g.estado === 'rellamar')).length,
    pendientes: activos.filter((x: any) => !x.gestiones?.length || x.gestiones?.every((g: any) => g.estado === 'pendiente')).length,
    avgScore: scores.length ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : null,
  }
}

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const filtroInicial = searchParams.get('filtro') ?? 'todos'
  const [clientes, setClientes] = useState<any[]>([])
  const [gestiones, setGestiones] = useState<any[]>([])
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [stats, setStats] = useState({ total: 0, contactados: 0, rellamar: 0, pendientes: 0, avgScore: null as string | null })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const nombres = useRef<Record<string, string>>({})

  // Las gestiones se arman con el cliente que ya está en memoria: no se vuelve a descargar la base
  const armarGestiones = (gs: any[], lista: any[]) => {
    const porId: Record<string, any> = {}
    lista.forEach(c => { porId[c.id] = c })
    return gs.map(g => ({ ...g, cliente: porId[g.cliente_id] ?? null, operador: { nombre: nombres.current[g.operador_id] ?? '' } }))
  }

  const load = useCallback(async () => {
    setError('')
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: perfiles } = await supabase.from('perfiles').select('id, nombre, rol, email, activo')
      ;(perfiles ?? []).forEach((p: any) => { nombres.current[p.id] = p.nombre })
      const p = (perfiles ?? []).find((x: any) => x.id === user.id)
      if (!p) { setError('No encontramos tu perfil de usuario. Avisale a un administrador.'); return }
      setPerfil(p as Perfil)

      const lista = await traerTodo('clientes', SELECT_CLIENTES, ['apellido', 'id'])
      setClientes(lista)
      setStats(calcularStats(lista))
      setReady(true)

      // Las gestiones completas (para el Excel y el panel de correcciones) se cargan después, sin frenar la pantalla
      const gs = await traerTodo('gestiones', '*', ['id'])
      setGestiones(armarGestiones(gs, lista))
    } catch (e) {
      console.error(e)
      setError('No se pudieron cargar los clientes. Revisá tu conexión y volvé a intentar.')
    }
  }, [])

  // Después de gestionar un caso, se actualiza solo ese cliente (antes se volvía a bajar toda la base)
  const refrescarCliente = useCallback(async (id: string) => {
    try {
      const supabase = createClient()
      const [{ data: c }, { data: gs }] = await Promise.all([
        supabase.from('clientes').select(SELECT_CLIENTES).eq('id', id).single(),
        supabase.from('gestiones').select('*').eq('cliente_id', id),
      ])
      if (!c) return
      setClientes(prev => {
        const lista = prev.some(x => x.id === id) ? prev.map(x => x.id === id ? c : x) : [...prev, c]
        setStats(calcularStats(lista))
        setGestiones(prevG => [...prevG.filter(g => g.cliente_id !== id), ...armarGestiones(gs ?? [], [c])])
        return lista
      })
    } catch (e) { console.error(e) }
  }, [])

  useEffect(() => { load() }, [load])

  if (!ready) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: '14px', color: '#727A84' }}>
      {error ? (
        <>
          <span style={{ color: '#8B2020' }}>{error}</span>
          <button className="btn btn-primary" onClick={load}>Reintentar</button>
        </>
      ) : 'Cargando clientes...'}
    </div>
  )

  return <ClientesList clientes={clientes} gestiones={gestiones} perfil={perfil!} stats={stats} filtroInicial={filtroInicial} onRefresh={load} onRefreshCliente={refrescarCliente} />
}
