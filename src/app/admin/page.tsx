import { createServerSupabaseClient } from '@/lib/supabase-server'
import AdminPanel from '@/components/ui/AdminPanel'

export default async function AdminPage() {
  const supabase = createServerSupabaseClient()

  const [{ data: perfiles }, { data: clientes, count }] = await Promise.all([
    supabase.from('perfiles').select('*').order('nombre'),
    supabase.from('clientes').select('*, perfil:perfiles!operador_asignado(nombre)', { count: 'exact' }).order('apellido').limit(50),
  ])

  return <AdminPanel perfiles={perfiles ?? []} clientes={clientes ?? []} totalClientes={count ?? 0} />
}
