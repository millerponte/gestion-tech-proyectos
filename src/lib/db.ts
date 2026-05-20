import {
  collection, doc, getDocs, getDoc, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, runTransaction,
  setDoc
} from 'firebase/firestore'
import { db } from './firebase'
import type { Empresa, Entregable, Hito, Proyecto, Cliente, Usuario } from '@/types'

// ─── CONTADOR GLOBAL (compartido entre todas las empresas) ───────────────────

export function formatearNumeroDoc(empresa: Empresa, numero: number): { documento: string; cargo: string } {
  const n = String(numero).padStart(5, '0')
  switch (empresa) {
    case 'TECH SOLUTIONS':
      return { documento: `RPTS-${n}`, cargo: `Cargo ${n}-TECH` }
    case 'QUANTIC':
      return { documento: `QT-${n}`, cargo: `Cargo ${n}-QTO` }
    case 'OKINAWATEC':
    default:
      return { documento: `ITOK-${n}`, cargo: `Cargo ${n}-OK-TEC` }
  }
}

export async function obtenerSiguienteNumero(): Promise<number> {
  const ref = doc(db, 'contadores', 'GLOBAL')
  let siguiente = 1
  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref)
    if (!snap.exists()) {
      transaction.set(ref, { ultimoNumero: 26001 })
      siguiente = 26001
    } else {
      const actual = snap.data().ultimoNumero as number
      siguiente = actual + 1
      transaction.update(ref, { ultimoNumero: siguiente })
    }
  })
  return siguiente
}

export async function obtenerNumeroPreview(): Promise<number> {
  const ref = doc(db, 'contadores', 'GLOBAL')
  const snap = await getDoc(ref)
  if (!snap.exists()) return 26001
  return (snap.data().ultimoNumero as number) + 1
}

// ─── USUARIOS ────────────────────────────────────────────────────────────────

export async function crearUsuarioDB(uid: string, data: Omit<Usuario, 'uid'>) {
  await setDoc(doc(db, 'usuarios', uid), { uid, ...data })
}

export async function obtenerUsuario(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, 'usuarios', uid))
  return snap.exists() ? (snap.data() as Usuario) : null
}

export async function obtenerTodosUsuarios(): Promise<Usuario[]> {
  const snap = await getDocs(collection(db, 'usuarios'))
  return snap.docs.map(d => d.data() as Usuario)
}

export async function actualizarRolUsuario(uid: string, rol: string) {
  await updateDoc(doc(db, 'usuarios', uid), { rol })
}

export async function actualizarPermisosUsuario(uid: string, permisos: Partial<import('@/types').PermisoUsuario>) {
  await updateDoc(doc(db, 'usuarios', uid), { permisos })
}

// ─── CLIENTES ────────────────────────────────────────────────────────────────

export async function obtenerClientes(): Promise<Cliente[]> {
  const snap = await getDocs(query(collection(db, 'clientes'), orderBy('nombre')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Cliente))
}

export async function crearCliente(data: Omit<Cliente, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'clientes'), data)
  return ref.id
}

export async function actualizarCliente(id: string, data: Partial<Cliente>) {
  await updateDoc(doc(db, 'clientes', id), data)
}

export async function eliminarCliente(id: string) {
  await deleteDoc(doc(db, 'clientes', id))
}

// ─── PROYECTOS ───────────────────────────────────────────────────────────────

export async function obtenerProyectos(): Promise<Proyecto[]> {
  const snap = await getDocs(query(collection(db, 'proyectos'), orderBy('fechaInicio', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Proyecto))
}

export async function obtenerProyecto(id: string): Promise<Proyecto | null> {
  const snap = await getDoc(doc(db, 'proyectos', id))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Proyecto) : null
}

export async function crearProyecto(data: Omit<Proyecto, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'proyectos'), data)
  return ref.id
}

export async function actualizarProyecto(id: string, data: Partial<Proyecto>) {
  await updateDoc(doc(db, 'proyectos', id), data)
}

export async function eliminarProyecto(id: string) {
  await deleteDoc(doc(db, 'proyectos', id))
}

// ─── HITOS ───────────────────────────────────────────────────────────────────

export async function obtenerHitosPorProyecto(proyectoId: string): Promise<Hito[]> {
  const snap = await getDocs(
    query(collection(db, 'hitos'), where('proyectoId', '==', proyectoId), orderBy('fechaInicio'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Hito))
}

export async function obtenerTodosHitos(): Promise<Hito[]> {
  const snap = await getDocs(query(collection(db, 'hitos'), orderBy('fechaLimite')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Hito))
}

export async function crearHito(data: Omit<Hito, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'hitos'), data)
  return ref.id
}

export async function actualizarHito(id: string, data: Partial<Hito>) {
  await updateDoc(doc(db, 'hitos', id), data)
}

export async function eliminarHito(id: string) {
  await deleteDoc(doc(db, 'hitos', id))
}

export async function marcarHitoRealizado(id: string, fecha: string) {
  await updateDoc(doc(db, 'hitos', id), {
    estado: 'realizado',
    fechaRealEnvio: fecha,
  })
}

// ─── ENTREGABLES ─────────────────────────────────────────────────────────────

export async function obtenerEntregables(): Promise<Entregable[]> {
  const snap = await getDocs(query(collection(db, 'entregables'), orderBy('fecha', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Entregable))
}

export async function crearEntregable(data: Omit<Entregable, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'entregables'), data)
  return ref.id
}

export async function actualizarEntregable(id: string, data: Partial<Entregable>) {
  await updateDoc(doc(db, 'entregables', id), data)
}

export async function eliminarEntregable(id: string) {
  await deleteDoc(doc(db, 'entregables', id))
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

export function hoy(): string {
  return new Date().toISOString().split('T')[0]
}

export function formatearFecha(fecha: string): string {
  if (!fecha) return ''
  const [y, m, d] = fecha.split('-')
  return `${d}/${m}/${y}`
}

export function esFechaVencida(fecha: string): boolean {
  return new Date(fecha) < new Date()
}


// ─── COMENTARIOS ─────────────────────────────────────────────────────────────

export interface Comentario {
  id: string
  proyectoId: string
  usuarioNombre: string
  usuarioUid: string
  texto: string
  createdAt: string
}

export async function obtenerComentarios(proyectoId: string): Promise<Comentario[]> {
  const snap = await getDocs(
    query(collection(db, 'comentarios'), where('proyectoId', '==', proyectoId), orderBy('createdAt', 'desc'))
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Comentario))
}

export async function crearComentario(data: Omit<Comentario, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'comentarios'), data)
  return ref.id
}

export async function eliminarComentario(id: string) {
  await deleteDoc(doc(db, 'comentarios', id))
}

import type { ClienteVentas, CitaVentas, FirmaVentas, LicitacionVentas } from '@/types'

export async function obtenerClientesVentas(): Promise<ClienteVentas[]> { const snap = await getDocs(query(collection(db, 'ventas_clientes'), orderBy('createdAt', 'desc'))); return snap.docs.map(d => ({ id: d.id, ...d.data() } as ClienteVentas)) }
export async function crearClienteVentas(data: Omit<ClienteVentas, 'id'>): Promise<string> { const ref = await addDoc(collection(db, 'ventas_clientes'), data); return ref.id }
export async function actualizarClienteVentas(id: string, data: Partial<ClienteVentas>) { await updateDoc(doc(db, 'ventas_clientes', id), data) }
export async function eliminarClienteVentas(id: string) { await deleteDoc(doc(db, 'ventas_clientes', id)) }

export async function obtenerCitasVentas(): Promise<CitaVentas[]> { const snap = await getDocs(query(collection(db, 'ventas_citas'), orderBy('createdAt', 'desc'))); return snap.docs.map(d => ({ id: d.id, ...d.data() } as CitaVentas)) }
export async function crearCitaVentas(data: Omit<CitaVentas, 'id'>): Promise<string> { const ref = await addDoc(collection(db, 'ventas_citas'), data); return ref.id }
export async function actualizarCitaVentas(id: string, data: Partial<CitaVentas>) { await updateDoc(doc(db, 'ventas_citas', id), data) }
export async function eliminarCitaVentas(id: string) { await deleteDoc(doc(db, 'ventas_citas', id)) }

export async function obtenerFirmasVentas(): Promise<FirmaVentas[]> { const snap = await getDocs(query(collection(db, 'ventas_firmas'), orderBy('fecha', 'desc'))); return snap.docs.map(d => ({ id: d.id, ...d.data() } as FirmaVentas)) }
export async function crearFirmaVentas(data: Omit<FirmaVentas, 'id'>): Promise<string> { const ref = await addDoc(collection(db, 'ventas_firmas'), data); return ref.id }
export async function actualizarFirmaVentas(id: string, data: Partial<FirmaVentas>) { await updateDoc(doc(db, 'ventas_firmas', id), data) }
export async function eliminarFirmaVentas(id: string) { await deleteDoc(doc(db, 'ventas_firmas', id)) }

export async function obtenerLicitacionesVentas(): Promise<LicitacionVentas[]> { const snap = await getDocs(query(collection(db, 'ventas_licitaciones'), orderBy('createdAt', 'desc'))); return snap.docs.map(d => ({ id: d.id, ...d.data() } as LicitacionVentas)) }
export async function crearLicitacionVentas(data: Omit<LicitacionVentas, 'id'>): Promise<string> { const ref = await addDoc(collection(db, 'ventas_licitaciones'), data); return ref.id }
export async function actualizarLicitacionVentas(id: string, data: Partial<LicitacionVentas>) { await updateDoc(doc(db, 'ventas_licitaciones', id), data) }
export async function eliminarLicitacionVentas(id: string) { await deleteDoc(doc(db, 'ventas_licitaciones', id)) }
export async function obtenerPendientesVentas(): Promise<import('@/types').PendienteVenta[]> { const snap = await getDocs(query(collection(db, 'ventas_pendientes'), orderBy('createdAt', 'desc'))); return snap.docs.map(d => ({ id: d.id, ...d.data() } as import('@/types').PendienteVenta)) }
export async function crearPendienteVenta(data: Omit<import('@/types').PendienteVenta, 'id'>): Promise<string> { const ref = await addDoc(collection(db, 'ventas_pendientes'), data); return ref.id }
export async function actualizarPendienteVenta(id: string, data: Partial<import('@/types').PendienteVenta>) { await updateDoc(doc(db, 'ventas_pendientes', id), data) }
export async function eliminarPendienteVenta(id: string) { await deleteDoc(doc(db, 'ventas_pendientes', id)) }
// ─── SISTEMA DE AUDITORÍA Y CONSOLA ──────────────────────────────────────────

export async function registrarLog(usuarioUid: string, usuarioNombre: string, modulo: string, accion: string) {
  // Validar si el registro está deshabilitado globalmente
  const configRef = doc(db, 'configuracion', 'auditoria')
  const configSnap = await getDoc(configRef)
  if (configSnap.exists() && configSnap.data().deshabilitado === true) {
    return // No registrar si está deshabilitado
  }

  await addDoc(collection(db, 'audit_logs'), {
    usuarioUid,
    usuarioNombre,
    modulo,
    accion,
    fechaHora: new Date().toISOString()
  })
}

export async function obtenerLogs(): Promise<any[]> {
  const snap = await getDocs(query(collection(db, 'audit_logs'), orderBy('fechaHora', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

export async function cambiarEstadoAuditoria(deshabilitado: boolean) {
  await setDoc(doc(db, 'configuracion', 'auditoria'), { deshabilitado }, { merge: true })
}

export async function obtenerEstadoAuditoria(): Promise<boolean> {
  const snap = await getDoc(doc(db, 'configuracion', 'auditoria'))
  return snap.exists() ? !!snap.data().deshabilitado : false
}
