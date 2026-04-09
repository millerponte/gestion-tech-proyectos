export type Empresa = 'OKINAWATEC' | 'TECH SOLUTIONS' | 'QUANTIC'

export type TipoEntregable =
  | 'Reservar'
  | 'Plan de Trabajo'
  | 'Informe Técnico'
  | 'Informe Mensual'
  | 'Informe de Incidencia'
  | 'Entregable'
  | 'Otro'

export type RolUsuario = 'admin' | 'ingeniero' | 'administracion' | 'legal' | 'gerente' | 'usuario'

export interface Usuario {
  uid: string
  nombre: string
  correo: string
  rol: RolUsuario
  empresa?: Empresa
  createdAt: string
  permisos?: PermisoUsuario
}

export interface PermisoUsuario {
  proyectos_ver: boolean
  proyectos_agregar: boolean
  proyectos_editar: boolean
  cronogramas_ver: boolean
  cronogramas_agregar: boolean
  cronogramas_editar: boolean
  entregables_ver: boolean
  entregables_agregar: boolean
  entregables_editar: boolean
  comentarios: boolean
}

export interface Cliente {
  id: string
  nombre: string
  iniciales: string
  color: string
  logo?: string
  createdAt: string
}

export interface Proyecto {
  id: string
  nombre: string
  clienteId: string
  clienteNombre: string
  empresa: Empresa
  contratista: string
  numeroContrato: string
  plazo: number
  fechaInicio: string
  fechaFin: string
  solucion: string
  marca: string
  estado: 'activo' | 'completado' | 'suspendido'
  createdAt: string
  linkDrive?: string
}

export interface Hito {
  id: string
  proyectoId: string
  numero: number          // <-- NUEVO: número de orden del hito
  nombre: string
  descripcion: string
  responsable: string
  plazoContractual: string
  fechaInicio: string
  fechaLimite: string
  fechaRealEnvio?: string
  pago: string
  origen: string
  estado: 'pendiente' | 'realizado' | 'vencido'
  esCritico: boolean
}

export interface Entregable {
  id: string
  empresa: Empresa
  tipo: TipoEntregable
  clienteId: string
  clienteNombre: string
  proyectoId: string
  proyectoNombre: string
  hitoId?: string        // legacy — un solo hito
  hitoIds?: string[]     // nuevo — múltiples hitos
  fecha: string
  asunto: string
  responsableUid: string
  responsableNombre: string
  numeroDocumento: string
  numeroCargo: string
  estado: 'reservado' | 'completo'
  expediente?: string
  descripcion?: string
  createdAt: string
}

export interface ContadorDocumento {
  empresa: Empresa
  ultimoNumero: number
}
