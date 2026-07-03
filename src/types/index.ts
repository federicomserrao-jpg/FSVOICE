export type Rol = 'operador' | 'admin'
export type EstadoGestion = 'pendiente' | 'encuestado' | 'fin_gestion' | 'no_acepta_encuesta' | 'rellamar' | 'no_es_titular'

export interface Perfil {
  id: string; nombre: string; email: string; rol: Rol; activo: boolean; created_at: string
}

export const ESTADO_LABELS: Record<EstadoGestion, string> = {
  pendiente: 'Pendiente', encuestado: 'Encuestado', fin_gestion: 'Fin de gestión',
  no_acepta_encuesta: 'No acepta encuesta', rellamar: 'Rellamar', no_es_titular: 'No es titular',
}

export const ESTADO_COLORS: Record<EstadoGestion, { bg: string; color: string }> = {
  pendiente: { bg: '#F0EFE9', color: '#6B6A64' },
  encuestado: { bg: '#D8F3DC', color: '#2D6A4F' },
  fin_gestion: { bg: '#DDE9F8', color: '#1B4F8A' },
  no_acepta_encuesta: { bg: '#FAE0E0', color: '#8B2020' },
  rellamar: { bg: '#FFF3CD', color: '#7D4F00' },
  no_es_titular: { bg: '#FAE0E0', color: '#8B2020' },
}
