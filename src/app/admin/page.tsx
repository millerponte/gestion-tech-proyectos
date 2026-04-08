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
  Plus, Trash2, Pencil, Check, X, Save
} from 'lucide-react'
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
                  <div key={c.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
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
                <div key={u.uid} className="flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors">
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
                    <span className={clsx('text-xs px-2 py-0.5 rounded-full border',
                      u.rol === 'admin'
                        ? 'bg-amber-900/30 text-amber-300 border-amber-700/40'
                        : 'bg-slate-800/50 text-slate-300 border-slate-600/40')}>
                      {u.rol}
                    </span>
                    <button onClick={() => handleCambiarRol(u.uid, u.rol)}
                      className="text-xs text-blue-400 hover:text-blue-300 underline">
                      {u.rol === 'admin' ? 'Quitar admin' : 'Hacer admin'}
                    </button>
                  </div>
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
