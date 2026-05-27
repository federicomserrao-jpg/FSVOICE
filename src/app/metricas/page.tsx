'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import MetricasDashboard from '@/components/ui/MetricasDashboard'

export default function MetricasPage() {
  const searchParams = useSearchParams()
  const hoy = new Date().toISOString().split('T')[0]
  const desde = searchParams.get('desde') ?? new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const hasta = searchParams.get('hasta') ?? hoy

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: gestiones } = await supabase
        .from('gestiones')
        .select('*, operador:perfiles(nombre), cliente:clientes(concesionaria)')
        .gte('updated_at', `${desde}T00:00:00`)
        .lte('updated_at', `${hasta}T23:59:59`)

      const { count: totalClientes } = await supabase.from('clientes').select('*', { count: 'exact', head: true })

      const lista = gestiones ?? []
      const porOperador: Record<string, any> = {}
      lista.forEach((g: any) => {
        const nom = g.operador?.nombre ?? 'Desconocido'
        if (!porOperador[g.operador_id]) porOperador[g.operador_id] = { nombre: nom, total: 0, encuestados: 0, scores: [] }
        porOperador[g.operador_id].total++
        if (g.estado === 'encuestado') {
          porOperador[g.operador_id].encuestados++
          if (g.score_recomendacion) porOperador[g.operador_id].scores.push(g.score_recomendacion)
        }
      })

      const porEstado: Record<string, number> = {}
      lista.forEach((g: any) => { porEstado[g.estado] = (porEstado[g.estado] ?? 0) + 1 })

      const porConcesionaria: Record<string, any> = {}
      lista.forEach((g: any) => {
        const c = g.cliente?.concesionaria ?? 'Sin asignar'
        if (!porConcesionaria[c]) porConcesionaria[c] = { total: 0, scores: [] }
        porConcesionaria[c].total++
        if (g.score_recomendacion) porConcesionaria[c].scores.push(g.score_recomendacion)
      })

      const encuestados = lista.filter((g: any) => g.estado === 'encuestado').length
      const allScores = lista.filter((g: any) => g.score_recomendacion).map((g: any) => g.score_recomendacion)
      const avgScore = allScores.length ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length : null

      setData({
        desde, hasta,
        totalClientes: totalClientes ?? 0,
        totalGestiones: lista.length,
        encuestados,
        avgScore,
        porOperador: Object.values(porOperador),
        porEstado,
        porConcesionaria: Object.entries(porConcesionaria).map(([nombre, d]: any) => ({ nombre, ...d }))
      })
      setLoading(false)
    }
    load()
  }, [desde, hasta])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: '14px', color: '#9E9C95' }}>
      Cargando métricas...
    </div>
  )

  return <MetricasDashboard {...data} />
}
