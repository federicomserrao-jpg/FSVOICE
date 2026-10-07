// Formatea documento: CUIT (11 dígitos) o DNI (7-8 dígitos)
export function formatDocumento(dni: string | null | undefined): { label: string; value: string } {
  if (!dni) return { label: 'DOC', value: '—' }
  const digits = dni.replace(/\D/g, '')
  if (digits.length === 11) {
    // CUIT: XX-XXXXXXXX-X
    const formatted = `${digits.slice(0,2)}-${digits.slice(2,10)}-${digits.slice(10)}`
    return { label: 'CUIT', value: formatted }
  }
  if (digits.length >= 7 && digits.length <= 8) {
    // DNI: XX.XXX.XXX
    const formatted = digits.replace(/(\d)(?=(\d{3})+$)/g, '$1.')
    return { label: 'DNI', value: formatted }
  }
  return { label: 'DOC', value: dni }
}

// Detecta duplicados: mismo apellido+nombre+patente o mismo dni+patente
export function detectarDuplicados(clientes: any[]): Set<string> {
  const visto = new Map<string, string[]>()
  clientes.forEach(c => {
    const key = [
      (c.apellido ?? '').toLowerCase().trim(),
      (c.nombre ?? '').toLowerCase().trim(),
      (c.patente ?? '').toLowerCase().trim(),
    ].filter(Boolean).join('|')
    if (key.length > 2) {
      if (!visto.has(key)) visto.set(key, [])
      visto.get(key)!.push(c.id)
    }
  })
  const duplicados = new Set<string>()
  visto.forEach(ids => {
    if (ids.length > 1) ids.forEach(id => duplicados.add(id))
  })
  return duplicados
}

// Formato fecha argentino
export function fmtFecha(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  try {
    const d = new Date(fecha)
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return '—' }
}

// Formato fecha y hora argentino
export function fmtFechaHora(fecha: string | null | undefined): string {
  if (!fecha) return '—'
  try {
    const d = new Date(fecha)
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
  } catch { return '—' }
}

// Trae todas las filas de una consulta paginando de a 1000 (límite de la API de Supabase)
export async function fetchAll<T = any>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>,
  pageSize = 1000
): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await query(from, from + pageSize - 1)
    if (error) throw error
    const rows = data ?? []
    out.push(...rows)
    if (rows.length < pageSize) break
  }
  return out
}

// Fecha guardada (UTC) → valor para un <input type="datetime-local"> en hora local
export function aInputLocal(fecha: string | null | undefined): string {
  if (!fecha) return ''
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return ''
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

// Valor de un <input type="datetime-local"> (hora local) → instante exacto para guardar
export function deInputLocal(valor: string | null | undefined): string | null {
  if (!valor) return null
  const d = new Date(valor)
  return isNaN(d.getTime()) ? null : d.toISOString()
}
