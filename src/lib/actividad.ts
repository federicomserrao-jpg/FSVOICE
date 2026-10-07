import { createClient } from '@/lib/supabase'

export type Accion = 'apertura' | 'ingreso' | 'salida' | 'gestion' | 'cliente_agregado' | 'exportacion' | 'usuario_creado'

export const ACCION_LABEL: Record<string, string> = {
  ingreso: 'Ingresó a la plataforma',
  salida: 'Cerró sesión',
  apertura: 'Abrió un caso',
  gestion: 'Guardó una gestión',
  cliente_agregado: 'Agregó un cliente',
  exportacion: 'Exportó el Excel',
  usuario_creado: 'Creó un usuario',
}

// Anota una acción del usuario logueado. Nunca frena lo que el usuario estaba haciendo.
export async function registrar(accion: Accion, detalle?: string | null, clienteId?: string | null) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('actividad').insert({ usuario_id: user.id, accion, detalle: detalle ?? null, cliente_id: clienteId ?? null })
  } catch { /* sin registro, pero la app sigue */ }
}
