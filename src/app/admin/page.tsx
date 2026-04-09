'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import {
  obtenerClientes, crearCliente, eliminarCliente, actualizarCliente,
  obtenerTodosUsuarios, actualizarRolUsuario,
  obtenerProyectos
} from '@/lib/db'
import type { Cliente, Usuario, Proyecto } from '@/types'
import {
  Settings, Users, Building2, FolderKanban,
  Plus, Trash2, Pencil, Check, X, Save, ChevronDown, ChevronUp
} from 'lucide-react'
import { actualizarPermisosUsuario } from '@/lib/db'
import type { PermisoUsuario } from '@/types'
import toast from 'react-hot-toast'
import clsx from 'clsx'

type Tab = 'clientes' | 'usuarios' | 'resumen'

const COLORES = ['#2563eb', '#16a34a', '#9333ea', '#dc2626', '#ea580c', '#0891b2', '#65a30d', '#db2777']

export default function AdminPage() {
  const { isAdmin, loading: authLoading } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('clientes')

  const [clientes, setClientes] = useState<Cliente[]>([])
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoColor, setNuevoColor] = useState(COLORES[0])
  const [loadingCliente, setLoadingCliente] = useState(false)

const [editandoCliente, setEditandoCliente] = useState<string | null>(null)
  const [expandidoUsuario, setExpandidoUsuario] = useState<string | null>(null)
  const [editandoPermisos, setEditandoPermisos] = useState<string | null>(null)
  const [permisosTemp, setPermisosTemp] = useState<PermisoUsuario | null>(null)
  const [ultimoId, setUltimoId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editColor, setEditColor] = useState(COLORES[0])

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])

  useEffect(() => {
    if (!authLoading && !isAdmin) router.replace('/dashboard')
  }, [isAdmin, authLoading, router])

  useEffect(() => {
    if (!isAdmin) return
    cargarTodo()
  }, [isAdmin])

  const cargarTodo = async () => {
    const [c, u, p] = await Promise.all([
      obtenerClientes(),
      obtenerTodosUsuarios(),
      obtenerProyectos()
    ])
    setClientes(c)
    setUsuarios(u)
    setProyectos(p)
  }

  const handleCrearCliente = async () => {
  if (!nuevoNombre.trim()) { toast.error('Ingresa el nombre del cliente'); return }
  
  // Verificar duplicado
  const duplicado = clientes.find(c => 
    c.nombre.toLowerCase().trim() === nuevoNombre.toLowerCase().trim()
  )
  if (duplicado) {
    toast.error(`Ya existe un cliente con el nombre "${duplicado.nombre}"`)
    return
  }

  setLoadingCliente(true)
  try {
    const iniciales = nuevoNombre.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3)
    await crearCliente({
      nombre: nuevoNombre.trim(),
      iniciales,
      color: nuevoColor,
      createdAt: new Date().toISOString()
    })
    toast.success('Cliente creado')
    setNuevoNombre('')
    cargarTodo()
    setTimeout(() => {
      setUltimoId(null)
      requestAnimationFrame(() => {
        setUltimoId('__nuevo__')
        setTimeout(() => setUltimoId(null), 5500)
      })
    }, 400)
  } catch {
    toast.error('Error al crear cliente')
  } finally {
    setLoadingCliente(false)
  }
}

  const iniciarEdicionCliente = (c: Cliente) => {
    setEditandoCliente(c.id)
    setEditNombre(c.nombre)
    setEditColor(c.color)
  }

  const guardarEdicionCliente = async (id: string) => {
    if (!editNombre.trim()) { toast.error('El nombre no puede estar vacío'); return }
    try {
      const iniciales = editNombre.trim().split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 3)
      await actualizarCliente(id, {
        nombre: editNombre.trim(),
        iniciales,
        color: editColor,
      })
      toast.success('Cliente actualizado')
    setEditandoCliente(null)
    cargarTodo()
    setTimeout(() => {
      setUltimoId(null)
      requestAnimationFrame(() => {
        setUltimoId(id)
        setTimeout(() => setUltimoId(null), 5500)
      })
    }, 300)
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const handleEliminarCliente = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar cliente "${nombre}"?`)) return
    await eliminarCliente(id)
    toast.success('Cliente eliminado')
    cargarTodo()
  }

  const handleCambiarRol = async (uid: string, rolActual: string) => {
    const nuevoRol = rolActual === 'admin' ? 'usuario' : 'admin'
    if (!confirm(`¿Cambiar rol a "${nuevoRol}"?`)) return
    await actualizarRolUsuario(uid, nuevoRol)
    toast.success('Rol actualizado')
    cargarTodo()
  }

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
  }

  const PERMISOS_POR_ROL: Record<string, PermisoUsuario> = {
    ingeniero:     { proyectos_ver: true,  proyectos_agregar: false, proyectos_editar: false, cronogramas_ver: true,  cronogramas_agregar: true,  cronogramas_editar: true,  entregables_ver: true,  entregables_agregar: true,  entregables_editar: true,  comentarios: true },
    administracion:{ proyectos_ver: true,  proyectos_agregar: true,  proyectos_editar: true,  cronogramas_ver: true,  cronogramas_agregar: true,  cronogramas_editar: true,  entregables_ver: true,  entregables_agregar: false, entregables_editar: false, comentarios: true },
    legal:         { proyectos_ver: true,  proyectos_agregar: false, proyectos_editar: false, cronogramas_ver: true,  cronogramas_agregar: false, cronogramas_editar: false, entregables_ver: true,  entregables_agregar: false, entregables_editar: false, comentarios: true },
    gerente:       { proyectos_ver: true,  proyectos_agregar: false, proyectos_editar: false, cronogramas_ver: true,  cronogramas_agregar: false, cronogramas_editar: false, entregables_ver: true,  entregables_agregar: false, entregables_editar: false, comentarios: true },
    usuario:       { proyectos_ver: true,  proyectos_agregar: false, proyectos_editar: false, cronogramas_ver: true,  cronogramas_agregar: false, cronogramas_editar: false, entregables_ver: true,  entregables_agregar: false, entregables_editar: false, comentarios: true },
  }

  const iniciarEdicionPermisos = (u: Usuario) => {
    const base = PERMISOS_POR_ROL[u.rol] || PERMISOS_POR_ROL['usuario']
    setPermisosTemp({ ...base, ...(u.permisos || {}) })
    setEditandoPermisos(u.uid)
  }

  const guardarPermisos = async (uid: string) => {
    if (!permisosTemp) return
    try {
      await actualizarPermisosUsuario(uid, permisosTemp)
      toast.success('Permisos actualizados')
      setEditandoPermisos(null)
      cargarTodo()
    } catch {
      toast.error('Error al guardar permisos')
    }
  }

  if (authLoading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <Settings className="w-6 h-6 text-amber-400" /> Panel Admin
        </h1>
        <p className="text-slate-400 text-sm mt-0.5">Gestión de clientes, usuarios y resumen general</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Clientes', value: clientes.length, icon: <Building2 className="w-4 h-4" />, color: 'text-blue-400' },
          { label: 'Proyectos', value: proyectos.length, icon: <FolderKanban className="w-4 h-4" />, color: 'text-cyan-400' },
          { label: 'Usuarios', value: usuarios.length, icon: <Users className="w-4 h-4" />, color: 'text-amber-400' },
        ].map(s => (
          <div key={s.label} className="card flex items-center gap-3">
            <span className={s.color}>{s.icon}</span>
            <div>
              <p className="text-xl font-bold text-white">{s.value}</p>
              <p className="text-xs text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0d1526] border border-[#1e3a8a]/50 rounded-xl p-1 w-fit">
        {([['clientes', 'Clientes', Building2], ['usuarios', 'Usuarios', Users], ['resumen', 'Proyectos', FolderKanban]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white')}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {/* Tab: Clientes */}
      {tab === 'clientes' && (
        <div className="space-y-4">
          {/* Formulario nuevo cliente */}
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" /> Nuevo cliente
            </h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-48">
                <label className="label">Nombre del cliente</label>
                <input
                  className="input-field"
                  placeholder="Ej: SUNARP, ONPE, MINEDU..."
                  value={nuevoNombre}
                  onChange={e => setNuevoNombre(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCrearCliente()}
                />
              </div>
              <div>
                <label className="label">Color identificador</label>
                <div className="flex gap-1.5">
                  {COLORES.map(c => (
                    <button key={c} onClick={() => setNuevoColor(c)}
                      className={clsx('w-7 h-7 rounded-full border-2 transition-all',
                        nuevoColor === c ? 'border-white scale-110' : 'border-transparent')}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
              <button onClick={handleCrearCliente} disabled={loadingCliente} className="btn-primary">
                {loadingCliente
                  ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><Save className="w-4 h-4" /> Crear cliente</>}
              </button>
            </div>
          </div>

          {/* Lista de clientes */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1e3a8a]/50">
              <h3 className="font-semibold text-white text-sm">Clientes registrados ({clientes.length})</h3>
            </div>
            {clientes.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No hay clientes aún</p>
            ) : (
              <div className="divide-y divide-[#1e3a8a]/20">
                {clientes.map(c => (
                  <div key={c.id} className={clsx('px-4 py-3 hover:bg-white/5 transition-colors', ultimoId === c.id && 'highlight-new')}>
                    {editandoCliente === c.id ? (
                      // Modo edición
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-3 items-center">
                          <div className="flex-1 min-w-48">
                            <label className="label">Nombre</label>
                            <input
                              className="input-field"
                              value={editNombre}
                              onChange={e => setEditNombre(e.target.value)}
                              autoFocus
                            />
                          </div>
                          <div>
                            <label className="label">Color</label>
                            <div className="flex gap-1.5">
                              {COLORES.map(col => (
                                <button key={col} onClick={() => setEditColor(col)}
                                  className={clsx('w-7 h-7 rounded-full border-2 transition-all',
                                    editColor === col ? 'border-white scale-110' : 'border-transparent')}
                                  style={{ backgroundColor: col }} />
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => guardarEdicionCliente(c.id)} className="btn-primary text-xs">
                            <Check className="w-3.5 h-3.5" /> Guardar
                          </button>
                          <button onClick={() => setEditandoCliente(null)} className="btn-secondary text-xs">
                            <X className="w-3.5 h-3.5" /> Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      // Modo lectura
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ backgroundColor: c.color }}>
                            {c.iniciales}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white">{c.nombre}</p>
                            <p className="text-xs text-slate-500">Iniciales: {c.iniciales}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button onClick={() => iniciarEdicionCliente(c)}
                            className="text-slate-500 hover:text-blue-400 transition-colors">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleEliminarCliente(c.id, c.nombre)}
                            className="text-slate-500 hover:text-red-400 transition-colors">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab: Usuarios */}
{tab === 'usuarios' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e3a8a]/50">
            <h3 className="font-semibold text-white text-sm">Usuarios registrados ({usuarios.length})</h3>
          </div>
          {usuarios.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No hay usuarios</p>
          ) : (
            <div className="divide-y divide-[#1e3a8a]/20">
              {usuarios.map(u => (
                <div key={u.uid} className="transition-colors">
                  {/* Fila principal */}
                  <div className="flex items-center justify-between px-4 py-3 hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-300 text-xs font-bold">
                        {u.nombre?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{u.nombre}</p>
                        <p className="text-xs text-slate-500">{u.correo}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Selector de rol */}
                      <select
                        className="input-field w-auto text-xs py-1"
                        value={u.rol}
                        onChange={async e => {
                          await actualizarRolUsuario(u.uid, e.target.value)
                          toast.success('Rol actualizado')
                          cargarTodo()
                        }}
                      >
                        <option value="admin">Admin</option>
                        <option value="ingeniero">Ingeniero</option>
                        <option value="administracion">Administración</option>
                        <option value="legal">Legal</option>
                        <option value="gerente">Gerente</option>
                        <option value="usuario">Usuario</option>
                      </select>
                      <button
                        onClick={() => setExpandidoUsuario(expandidoUsuario === u.uid ? null : u.uid)}
                        className="text-slate-400 hover:text-white transition-colors"
                        title="Ver/editar permisos"
                      >
                        {expandidoUsuario === u.uid ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Panel de permisos expandido */}
                  {expandidoUsuario === u.uid && (
                    <div className="px-4 pb-4 bg-[#0d1526]/60 border-t border-[#1e3a8a]/30">
                      <div className="pt-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-medium text-slate-400">Permisos personalizados</p>
                          {editandoPermisos !== u.uid && (
                            <button onClick={() => iniciarEdicionPermisos(u)} className="btn-secondary text-xs py-1">
                              <Pencil className="w-3 h-3" /> Editar permisos
                            </button>
                          )}
                        </div>

                        {editandoPermisos === u.uid && permisosTemp ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              {(Object.keys(PERMISOS_LABELS) as (keyof PermisoUsuario)[]).map(key => (
                                <button
                                  key={key}
                                  onClick={() => setPermisosTemp(p => p ? { ...p, [key]: !p[key] } : p)}
                                  className={clsx(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-all text-left',
                                    permisosTemp[key]
                                      ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                                      : 'bg-[#111d35] border-[#1e3a8a]/30 text-slate-500'
                                  )}
                                >
                                  <div className={clsx(
                                    'w-3.5 h-3.5 rounded border flex-shrink-0 flex items-center justify-center',
                                    permisosTemp[key] ? 'bg-blue-600 border-blue-500' : 'border-slate-600'
                                  )}>
                                    {permisosTemp[key] && <Check className="w-2.5 h-2.5 text-white" />}
                                  </div>
                                  {PERMISOS_LABELS[key]}
                                </button>
                              ))}
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => guardarPermisos(u.uid)} className="btn-primary text-xs">
                                <Check className="w-3 h-3" /> Guardar permisos
                              </button>
                              <button onClick={() => setEditandoPermisos(null)} className="btn-secondary text-xs">
                                <X className="w-3 h-3" /> Cancelar
                              </button>
                              <button
                                onClick={() => setPermisosTemp({ ...PERMISOS_POR_ROL[u.rol] || PERMISOS_POR_ROL['usuario'] })}
                                className="text-xs text-slate-400 hover:text-white underline ml-auto"
                              >
                                Restaurar defaults del rol
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-1.5">
                            {(Object.keys(PERMISOS_LABELS) as (keyof PermisoUsuario)[]).map(key => {
                              const base = PERMISOS_POR_ROL[u.rol] || PERMISOS_POR_ROL['usuario']
                              const activo = u.permisos ? !!u.permisos[key] : !!base[key]
                              return (
                                <div key={key} className={clsx(
                                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs',
                                  activo ? 'text-green-400' : 'text-slate-600'
                                )}>
                                  <span>{activo ? '✓' : '✗'}</span>
                                  {PERMISOS_LABELS[key]}
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Proyectos resumen */}
      {tab === 'resumen' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1e3a8a]/50">
            <h3 className="font-semibold text-white text-sm">Todos los proyectos ({proyectos.length})</h3>
          </div>
          {proyectos.length === 0 ? (
            <p className="text-slate-500 text-sm text-center py-8">No hay proyectos. Créalos desde la sección Proyectos.</p>
          ) : (
            <div className="divide-y divide-[#1e3a8a]/20">
              {proyectos.map(p => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-white">{p.solucion || p.nombre}</p>
                    {p.solucion && <p className="text-xs text-slate-500">{p.nombre}</p>}
                    <p className="text-xs text-slate-500">{p.clienteNombre} · {p.empresa}</p>
                  </div>
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full border',
                    p.estado === 'activo' ? 'bg-green-900/30 text-green-300 border-green-700/40' :
                    p.estado === 'completado' ? 'bg-slate-700/40 text-slate-300 border-slate-600/40' :
                    'bg-red-900/30 text-red-300 border-red-700/40')}>
                    {p.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
