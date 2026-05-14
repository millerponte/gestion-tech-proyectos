'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import {
  obtenerTodosUsuarios, actualizarRolUsuario, obtenerLogs, 
  cambiarEstadoAuditoria, obtenerEstadoAuditoria, actualizarPermisosUsuario
} from '@/lib/db'
import type { Usuario, AuditLog, PermisoUsuario } from '@/types'
import { Settings, Users, Terminal, Check, X, ChevronDown, ChevronUp, ShieldAlert, Pencil } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type Tab = 'usuarios' | 'consola'

const PERMISOS_LABELS: Record<keyof PermisoUsuario, string> = {
  proyectos_ver: 'Proyectos — Ver',
  proyectos_agregar: 'Proyectos — Agregar',
  proyectos_editar: 'Proyectos — Editar',
  cronogramas_ver: 'Cronogramas — Ver',
  cronogramas_agregar: 'Cronogramas — Agregar',
  cronogramas_editar: 'Cronogramas — Editar',
  entregables_ver: 'Entregables — Ver',
  entregables_agregar: 'Entregables — Agregar',
  entregables_editar: 'Entregables — Editar',
  comentarios: 'Comentarios en proyectos',
  ventas_ver: 'Ventas — Ver',
}

const PERMISOS_POR_ROL: Record<string, PermisoUsuario> = {
  soc:            { proyectos_ver: true,  proyectos_agregar: false, proyectos_editar: false, cronogramas_ver: true,  cronogramas_agregar: true,  cronogramas_editar: true,  entregables_ver: true,  entregables_agregar: true,  entregables_editar: true,  comentarios: true, ventas_ver: false },
  administracion: { proyectos_ver: true,  proyectos_agregar: true,  proyectos_editar: true,  cronogramas_ver: true,  cronogramas_agregar: true,  cronogramas_editar: true,  entregables_ver: true,  entregables_agregar: false, entregables_editar: false, comentarios: true, ventas_ver: true },
  legal:          { proyectos_ver: true,  proyectos_agregar: false, proyectos_editar: false, cronogramas_ver: true,  cronogramas_agregar: false, cronogramas_editar: false, entregables_ver: true,  entregables_agregar: false, entregables_editar: false, comentarios: true, ventas_ver: false },
  gerente:        { proyectos_ver: true,  proyectos_agregar: false, proyectos_editar: false, cronogramas_ver: true,  cronogramas_agregar: false, cronogramas_editar: false, entregables_ver: true,  entregables_agregar: false, entregables_editar: false, comentarios: true, ventas_ver: true },
  preventa:       { proyectos_ver: true,  proyectos_agregar: false, proyectos_editar: false, cronogramas_ver: true,  cronogramas_agregar: false, cronogramas_editar: false, entregables_ver: true,  entregables_agregar: false, entregables_editar: false, comentarios: true, ventas_ver: true },
  usuario:        { proyectos_ver: true,  proyectos_agregar: false, proyectos_editar: false, cronogramas_ver: true,  cronogramas_agregar: false, cronogramas_editar: false, entregables_ver: true,  entregables_agregar: false, entregables_editar: false, comentarios: true, ventas_ver: false },
}

export default function AdminPage() {
  const { isAdmin, loading: authLoading, usuario: usuarioActual, recargarUsuario } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('usuarios')
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [auditoriaDeshabilitada, setAuditoriaDeshabilitada] = useState(false)
  const [mostrarBotonSecreto, setMostrarBotonSecreto] = useState(false)

  const [expandidoUsuario, setExpandidoUsuario] = useState<string | null>(null)
  const [editandoPermisos, setEditandoPermisos] = useState<string | null>(null)
  const [permisosTemp, setPermisosTemp] = useState<PermisoUsuario | null>(null)

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/dashboard')
  }, [isAdmin, authLoading, router])

  useEffect(() => {
    if (isAdmin) {
      cargarDatos()
    }
  }, [isAdmin, tab])

  const cargarDatos = async () => {
    const u = await obtenerTodosUsuarios()
    setUsuarios(u)
    if (tab === 'consola') {
      const l = await obtenerLogs()
      setLogs(l)
      const estado = await obtenerEstadoAuditoria()
      setAuditoriaDeshabilitada(estado)
    }
  }

  const toggleAuditoriaGlobal = async () => {
    const nuevoEstado = !auditoriaDeshabilitada
    await cambiarEstadoAuditoria(nuevoEstado)
    setAuditoriaDeshabilitada(nuevoEstado)
    toast.success(nuevoEstado ? 'Registro de acciones pausado' : 'Registro de acciones activo')
  }

  if (authLoading) return <div className="text-center p-10 text-white">Cargando Módulo...</div>

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-400" /> Panel de Administración
          </h1>
          <p className="text-slate-400 text-sm">Control de accesos, roles y auditoría del sistema</p>
        </div>
        {/* Trigger secreto al dejar presionado o dar clic en el icono superior */}
        <button onClick={() => setMostrarBotonSecreto(!mostrarBotonSecreto)} className="opacity-10 hover:opacity-100 text-slate-500 text-xs">
          [Mantenimiento System]
        </button>
      </div>

      {mostrarBotonSecreto && (
        <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg flex items-center justify-between text-xs text-red-300">
          <span className="flex items-center gap-2"><ShieldAlert className="w-4 h-4" /> Configuración de Auditoría Crítica:</span>
          <button onClick={toggleAuditoriaGlobal} className={clsx("px-3 py-1 rounded font-medium", auditoriaDeshabilitada ? "bg-green-600 text-white" : "bg-red-600 text-white")}>
            {auditoriaDeshabilitada ? "Habilitar Logs" : "Deshabilitar Logs Globales"}
          </button>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex gap-1 bg-[#0d1526] border border-[#1e3a8a]/50 rounded-xl p-1 w-fit">
        <button onClick={() => setTab('usuarios')} className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === 'usuarios' ? 'bg-blue-600 text-white' : 'text-slate-400')}>
          <Users className="w-4 h-4" /> Control de Usuarios
        </button>
        <button onClick={() => setTab('consola')} className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === 'consola' ? 'bg-blue-600 text-white' : 'text-slate-400')}>
          <Terminal className="w-4 h-4" /> Consola de Auditoría
        </button>
      </div>

      {/* TAB USUARIOS */}
      {tab === 'usuarios' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e3a8a]/50 text-sm font-semibold text-white">
            Usuarios en Plataforma ({usuarios.length})
          </div>
          <div className="divide-y divide-[#1e3a8a]/20">
            {usuarios.map(u => (
              <div key={u.uid}>
                <div className="flex items-center justify-between px-4 py-3 hover:bg-white/5">
                  <div>
                    <p className="text-sm font-medium text-white">{u.nombre}</p>
                    <p className="text-xs text-slate-500">{u.correo}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Selector de Roles Actualizado */}
                    <select
                      className="input-field w-auto text-xs py-1"
                      value={u.rol}
                      onChange={async e => {
                        await actualizarRolUsuario(u.uid, e.target.value)
                        toast.success('Rol modificado')
                        cargarDatos()
                      }}
                    >
                      <option value="admin">Admin</option>
                      <option value="soc">SOC</option>
                      <option value="administracion">Administración</option>
                      <option value="legal">Legal</option>
                      <option value="gerente">Gerente</option>
                      <option value="preventa">Pre venta</option>
                      <option value="usuario">Usuario</option>
                    </select>
                    <button onClick={() => {
                      setExpandidoUsuario(expandidoUsuario === u.uid ? null : u.uid)
                      setEditandoPermisos(null)
                    }} className="text-slate-400 hover:text-white">
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {expandidoUsuario === u.uid && (
                  <div className="p-4 bg-[#0d1526]/40 border-t border-[#1e3a8a]/20 space-y-2 text-xs">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-slate-400 font-medium">Permisos de este usuario:</span>
                      <button onClick={() => {
                        const base = PERMISOS_POR_ROL[u.rol] || PERMISOS_POR_ROL['usuario']
                        setPermisosTemp({ ...base, ...(u.permisos || {}) })
                        setEditandoPermisos(u.uid)
                      }} className="text-blue-400 hover:underline flex items-center gap-1"><Pencil className="w-3 h-3"/> Modificar</button>
                    </div>

                    {editandoPermisos === u.uid && permisosTemp ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {(Object.keys(PERMISOS_LABELS) as (keyof PermisoUsuario)[]).map(k => (
                            <label key={k} className="flex items-center gap-2 bg-dark-800 p-2 rounded border border-slate-700 cursor-pointer">
                              <input type="checkbox" checked={!!permisosTemp[k]} onChange={e => setPermisosTemp({ ...permisosTemp, [k]: e.target.checked })} />
                              <span className="text-slate-300">{PERMISOS_LABELS[k]}</span>
                            </label>
                          ))}
                        </div>
                        <button onClick={async () => {
                          await actualizarPermisosUsuario(u.uid, permisosTemp)
                          toast.success('Permisos guardados')
                          setEditandoPermisos(null)
                          cargarDatos()
                        }} className="btn-primary py-1 px-3 text-xs">Guardar Permisos</button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-1 text-slate-400">
                        {Object.entries(PERMISOS_LABELS).map(([k, label]) => {
                          const base = PERMISOS_POR_ROL[u.rol] || PERMISOS_POR_ROL['usuario']
                          const activo = u.permisos ? !!u.permisos[k as keyof PermisoUsuario] : !!base[k as keyof PermisoUsuario]
                          return (
                            <div key={k} className={clsx(activo ? "text-green-400" : "text-slate-600")}>
                              {activo ? "✓" : "✗"} {label}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONSOLA DE AUDITORÍA (REEMPLAZA A PROYECTOS) */}
      {tab === 'consola' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e3a8a]/50 flex justify-between items-center bg-[#0d1526]">
            <span className="text-sm font-semibold text-white">Historial Global de Acciones del Sistema</span>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded">Real-time DB Active</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-dark-800 border-b border-slate-700 text-slate-400">
                  <th className="p-3">Fecha / Hora</th>
                  <th className="p-3">Usuario</th>
                  <th className="p-3">Módulo</th>
                  <th className="p-3">Acción realizada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {logs.length === 0 ? (
                  <tr><td colSpan={4} className="p-4 text-center text-slate-500">No hay acciones registradas aún.</td></tr>
                ) : (
                  logs.map(l => (
                    <tr key={l.id} className="hover:bg-white/5">
                      <td className="p-3 font-mono text-slate-500 whitespace-nowrap">{new Date(l.fechaHora).toLocaleString('es-PE')}</td>
                      <td className="p-3 font-medium text-white">{l.usuarioNombre}</td>
                      <td className="p-3 font-mono"><span className="bg-blue-900/40 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800">{l.modulo}</span></td>
                      <td className="p-3 text-slate-200">{l.accion}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
