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
    return d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}
