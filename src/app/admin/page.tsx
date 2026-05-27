'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import AdminPanel from '@/components/ui/AdminPanel'

export default function AdminPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const [{ data: perfiles }, { data: clientes, count }] = await Promise.all([
        supabase.from('perfiles').select('*').order('nombre'),
        supabase.from('clientes').select('*, perfil:perfiles!operador_asignado(nombre)', { count: 'exact' }).order('apellido').limit(50),
      ])
      setData({ perfiles: perfiles ?? [], clientes: clientes ?? [], totalClientes: count ?? 0 })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, fontSize: '14px', color: '#9E9C95' }}>
      Cargando...
    </div>
  )

  return <AdminPanel {...data} />
}
