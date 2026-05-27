import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import ClientesList from '@/components/ui/ClientesList'
import { Cliente, Perfil } from '@/types'

export default async function DashboardPage({
  searchParams
}: {
  searchParams: { filtro?: string; q?: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles').select('*').eq('id', user.id).single()

  // Construir query
  let query = supabase
    .from('clientes')
    .select(`
      *,
      perfil:perfiles!operador_asignado(nombre, email, rol),
      gestiones(id, estado, created_at, updated_at, score_recomendacion)
    `)
    .order('created_at', { ascending: false })

  // Operadores solo ven sus clientes asignados
  if (perfil?.rol === 'operador') {
    query = query.eq('operador_asignado', user.id)
  }

  if (searchParams.q) {
    query = query.or(`nombre.ilike.%${searchParams.q}%,apellido.ilike.%${searchParams.q}%,dni.ilike.%${searchParams.q}%`)
  }

  const { data: clientes } = await query

  // Stats
  const total = clientes?.length ?? 0
  const contactados = clientes?.filter(c => c.gestiones?.some((g: any) => g.estado === 'encuestado')).length ?? 0
  const rellamar = clientes?.filter(c => c.gestiones?.some((g: any) => g.estado === 'rellamar')).length ?? 0
  const pendientes = clientes?.filter(c => !c.gestiones?.length || c.gestiones?.every((g: any) => g.estado === 'pendiente')).length ?? 0

  const scores = clientes
    ?.flatMap(c => c.gestiones ?? [])
    .filter((g: any) => g.score_recomendacion != null)
    .map((g: any) => g.score_recomendacion) ?? []
  const avgScore = scores.length ? (scores.reduce((a: number, b: number) => a + b, 0) / scores.length).toFixed(1) : null

  return (
    <ClientesList
      clientes={clientes as any[] ?? []}
      perfil={perfil as Perfil}
      stats={{ total, contactados, rellamar, pendientes, avgScore }}
      filtroInicial={searchParams.filtro}
      searchInicial={searchParams.q}
    />
  )
}
