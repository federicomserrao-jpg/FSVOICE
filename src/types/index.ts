export type Rol = 'operador' | 'admin'

export type EstadoGestion =
  | 'pendiente'
  | 'encuestado'
  | 'fin_gestion'
  | 'no_acepta_encuesta'
  | 'rellamar'
  | 'no_es_titular'

export interface Perfil {
  id: string
  nombre: string
  email: string
  rol: Rol
  activo: boolean
  created_at: string
}

export interface Cliente {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  email: string | null
  email_alternativo: string | null
  telefono: string | null
  telefono_alternativo: string | null
  direccion: string | null
  ciudad: string | null
  provincia: string | null
  concesionaria: string | null
  marca: string | null
  modelo: string | null
  version: string | null
  anio: number | null
  patente: string | null
  fecha_compra: string | null
  operador_asignado: string | null
  created_at: string
  updated_at: string
  // join
  perfil?: Perfil
  ultima_gestion?: Gestion
}

export interface Gestion {
  id: string
  cliente_id: string
  operador_id: string
  estado: EstadoGestion
  fecha_rellamar: string | null
  motivo_rellamar: string | null
  observaciones: string | null
  // validación datos
  nombre_verificado: boolean | null
  nombre_corregido: string | null
  email_verificado: boolean | null
  email_corregido: string | null
  telefono_verificado: boolean | null
  telefono_corregido: string | null
  direccion_verificada: boolean | null
  direccion_corregida: string | null
  patente_verificada: boolean | null
  patente_corregida: string | null
  marca_verificada: boolean | null
  marca_corregida: string | null
  modelo_verificado: boolean | null
  modelo_corregido: string | null
  // encuesta experiencia
  score_vendedor: number | null
  vendedor_respondio_consultas: string | null
  score_administrativo: number | null
  info_vehiculo_clara: string | null
  explicaron_funciones: string | null
  info_postventa: string | null
  // encuesta post-compra
  volvio_contactar: string | null
  score_contacto_posterior: number | null
  score_recomendacion: number | null
  completado: boolean
  created_at: string
  updated_at: string
  // joins
  cliente?: Cliente
  operador?: Perfil
}

export interface HistorialCambio {
  id: string
  gestion_id: string
  operador_id: string
  campo_modificado: string
  valor_anterior: string | null
  valor_nuevo: string | null
  created_at: string
  operador?: Perfil
}

export const ESTADO_LABELS: Record<EstadoGestion, string> = {
  pendiente: 'Pendiente',
  encuestado: 'Encuestado',
  fin_gestion: 'Fin de gestión',
  no_acepta_encuesta: 'No acepta encuesta',
  rellamar: 'Rellamar',
  no_es_titular: 'No es titular',
}

export const ESTADO_COLORS: Record<EstadoGestion, string> = {
  pendiente: 'bg-surface2 text-ink2',
  encuestado: 'bg-green-bg text-green',
  fin_gestion: 'bg-blue-bg text-blue',
  no_acepta_encuesta: 'bg-red-bg text-red',
  rellamar: 'bg-amber-bg text-amber',
  no_es_titular: 'bg-red-bg text-red',
}
