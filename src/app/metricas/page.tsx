import { createServerSupabaseClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import MetricasDashboard from '@/components/ui/MetricasDashboard'

export default async function MetricasPage({
  searchParams
}: {
  searchParams: { desde?: string; hasta?: string }
}) {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const desde = searchParams.desde ?? new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]
  const hasta = searchParams.hasta ?? new Date().toISOString().split('T')[0]

  // Gestiones en el rango
  const { data: gestiones } = await supabase
    .from('gestiones')
    .select('*, operador:perfiles(nombre), cliente:clientes(concesionaria, nombre, apellido)')
    .gte('updated_at', `${desde}T00:00:00`)
    .lte('updated_at', `${hasta}T23:59:59`)

  // Total clientes
  const { count: totalClientes } = await supabase.from('clientes').select('*', { count: 'exact', head: true })

  // Gestiones por operador
  const porOperador: Record<string, { nombre: string; total: number; encuestados: number; scores: number[] }> = {}
  gestiones?.forEach(g => {
    const nom = (g.operador as any)?.nombre ?? 'Desconocido'
    if (!porOperador[g.operador_id]) porOperador[g.operador_id] = { nombre: nom, total: 0, encuestados: 0, scores: [] }
    porOperador[g.operador_id].total++
    if (g.estado === 'encuestado') {
      porOperador[g.operador_id].encuestados++
      if (g.score_recomendacion) porOperador[g.operador_id].scores.push(g.score_recomendacion)
    }
  })

  // Gestiones por estado
  const porEstado: Record<string, number> = {}
  gestiones?.forEach(g => { porEstado[g.estado] = (porEstado[g.estado] ?? 0) + 1 })

  // Gestiones por concesionaria
  const porConcesionaria: Record<string, { total: number; scores: number[] }> = {}
  gestiones?.forEach(g => {
    const c = (g.cliente as any)?.concesionaria ?? 'Sin asignar'
    if (!porConcesionaria[c]) porConcesionaria[c] = { total: 0, scores: [] }
    porConcesionaria[c].total++
    if (g.score_recomendacion) porConcesionaria[c].scores.push(g.score_recomendacion)
  })

  const encuestados = gestiones?.filter(g => g.estado === 'encuestado').length ?? 0
  const allScores = gestiones?.filter(g => g.score_recomendacion).map(g => g.score_recomendacion!) ?? []
  const avgScore = allScores.length ? (allScores.reduce((a,b) => a+b,0) / allScores.length) : null

  return (
    <MetricasDashboard
      desde={desde}
      hasta={hasta}
      totalClientes={totalClientes ?? 0}
      totalGestiones={gestiones?.length ?? 0}
      encuestados={encuestados}
      avgScore={avgScore}
      porOperador={Object.values(porOperador)}
      porEstado={porEstado}
      porConcesionaria={Object.entries(porConcesionaria).map(([nombre, d]) => ({ nombre, ...d }))}
    />
  )
}
