'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import ClientesList from '@/components/ui/ClientesList'
import { fetchAll } from '@/lib/utils'
import { Perfil } from '@/types'

export default function DashboardPage() {
  const searchParams = useSearchParams()
  const filtroInicial = searchParams.get('filtro') ?? 'todos'
  const [clientes, setClientes] = useState<any[]>([])
  const [gestiones, setGestiones] = useState<any[]>([])
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [stats, setStats] = useState({ total: 0, contactados: 0, rellamar: 0, pendientes: 0, avgScore: null as string | null })
  const [ready, setReady] = useState(false)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
    if (!p) return
    setPerfil(p as Perfil)

    const lista = await fetchAll((from, to) =>
      supabase.from('clientes')
        .select('*, gestiones(id, estado, created_at, updated_at, score_recomendacion, fecha_rellamar, motivo_rellamar)')
        .order('apellido', { ascending: true }).order('id', { ascending: true })
        .range(from, to))
    setClientes(lista)

    const g = await fetchAll((from, to) =>
      supabase.from('gestiones')
        .select('*, cliente:clientes(*), operador:perfiles(nombre)')
        .order('id', { ascending: true })
        .range(from, to))
    setGestiones(g)

    const total = lista.length
    const contactados = lista.filter((x: any) => x.gestiones?.some((g: any) => g.estado === 'encuestado')).length
    const rellamar = lista.filter((x: any) => x.gestiones?.some((g: any) => g.estado === 'rellamar')).length
    const pendientes = lista.filter((x: any) => !x.gestiones?.length || x.gestiones?.every((g: any) => g.estado === 'pendiente')).length
    const scores = lista.flatMap((x: any) => x.gestiones ?? []).filter((g: any) => g.score_recomendacion).map((g: any) => g.score_recomendacion)
    const avgScore = scores.length ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : null

    setStats({ total, contactados, rellamar, pendientes, avgScore })
    setReady(true)
  }, [])

  useEffect(() => { load() }, [load])

  if (!ready) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: '14px', color: '#727A84', fontFamily: 'inherit' }}>Cargando clientes...</div>

  return <ClientesList clientes={clientes} gestiones={gestiones} perfil={perfil!} stats={stats} filtroInicial={filtroInicial} onRefresh={load} />
}
