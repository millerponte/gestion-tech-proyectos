'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { obtenerClientes, crearCliente, eliminarCliente, actualizarCliente, registrarLog } from '@/lib/db'
import type { Cliente } from '@/types'
import { Building2, Plus, Trash2, Pencil, Check, X, Save, Search, AlertTriangle } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

const COLORES = ['#2563eb', '#16a34a', '#9333ea', '#dc2626', '#ea580c', '#0891b2', '#65a30d', '#db2777']

export default function ClientesPage() {
  const { usuario, tienePermiso, isAdmin } = useAuth()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoColor, setNuevoColor] = useState(COLORES[0])
  const [loading, setLoading] = useState(false)
  const [sugerencias, setSugerencias] = useState<Cliente[]>([])

  const [editandoCliente, setEditandoCliente] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState('')
  const [editColor, setEditColor] = useState(COLORES[0])

  useEffect(() => {
    cargarClientes()
  }, [])

  // Búsqueda interactiva y sugerencias en el formulario de creación
  useEffect(() => {
    if (!nuevoNombre.trim()) {
      setSugerencias([])
      return
    }
    const filtrados = clientes.filter(c => 
      c.nombre.toLowerCase().includes(nuevoNombre.toLowerCase().trim())
    )
    setSugerencias(filtrados)
  }, [nuevoNombre, clientes])

  const cargarClientes = async () => {
    const data = await obtenerClientes()
    setClientes(data)
  }

  const handleCrearCliente = async () => {
    if (!nuevoNombre.trim()) return
    const duplicado = clientes.find(c => c.nombre.toLowerCase().trim() === nuevoNombre.toLowerCase().trim())
    if (duplicado) {
      toast.error('Este cliente ya se encuentra registrado exactamente.')
      return
    }

    setLoading(true)
    try {
      const iniciales = nuevoNombre.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
      await crearCliente({
        nombre: nuevoNombre.trim(),
        iniciales,
        color: nuevoColor,
        createdAt: new Date().toISOString()
      })
      if (usuario) await registrarLog(usuario.uid, usuario.nombre, 'Clientes', `Creó el cliente: ${nuevoNombre}`)
      toast.success('Cliente registrado exitosamente')
      setNuevoNombre('')
      cargarClientes()
    } catch {
      toast.error('Error al registrar cliente')
    } finally {
      setLoading(false)
    }
  }

  const handleGuardarEdicion = async (id: string) => {
    if (!editNombre.trim()) return
    try {
      const iniciales = editNombre.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 3)
      await actualizarCliente(id, { nombre: editNombre.trim(), color: editColor, iniciales })
      if (usuario) await registrarLog(usuario.uid, usuario.nombre, 'Clientes', `Editó el cliente ID: ${id}`)
      toast.success('Cliente actualizado')
      setEditandoCliente(null)
      cargarClientes()
    } catch {
      toast.error('Error al actualizar')
    }
  }

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar cliente "${nombre}"?`)) return
    await eliminarCliente(id)
    if (usuario) await registrarLog(usuario.uid, usuario.nombre, 'Clientes', `Eliminó el cliente: ${nombre}`)
    toast.success('Cliente eliminado')
    cargarClientes()
  }

  const clientesFiltrados = clientes.filter(c => 
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-blue-400" /> Directorio de Clientes
        </h1>
        <p className="text-slate-400 text-sm">Base unificada de clientes para toda la plataforma</p>
      </div>

      {tienePermiso('proyectos_agregar') && (
        <div className="card p-5">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-400" /> Registrar Nuevo Cliente
          </h3>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-48 relative">
              <label className="label">Nombre del cliente o entidad</label>
              <input
                className="input-field"
                placeholder="Ej: SUNARP, ONPE, MINEDU..."
                value={nuevoNombre}
                onChange={e => setNuevoNombre(e.target.value)}
              />
              {/* Sugerencias Dinámicas */}
              {sugerencias.length > 0 && (
                <div className="absolute left-0 right-0 mt-1 bg-[#111d35] border border-amber-500/50 rounded-lg p-2 z-50 text-xs text-slate-300 max-h-32 overflow-y-auto shadow-xl">
                  <p className="text-amber-400 font-medium flex items-center gap-1 mb-1">
                    <AlertTriangle className="w-3 h-3" /> Entidades similares encontradas:
                  </p>
                  {sugerencias.map(s => (
                    <div key={s.id} className="py-0.5 border-b border-slate-800 last:border-0">
                      • {s.nombre}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="label">Color identificador</label>
              <div className="flex gap-1.5">
                {COLORES.map(c => (
                  <button key={c} onClick={() => setNuevoColor(c)}
                    className={clsx('w-7 h-7 rounded-full border-2 transition-all', nuevoColor === c ? 'border-white scale-110' : 'border-transparent')}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <button onClick={handleCrearCliente} disabled={loading} className="btn-primary">
              <Save className="w-4 h-4" /> Registrar
            </button>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-[#1e3a8a]/50 flex items-center gap-3">
          <Search className="w-4 h-4 text-slate-400" />
          <input 
            className="input-field max-w-md" 
            placeholder="Buscar en tiempo real..." 
            value={busqueda} 
            onChange={e => setBusqueda(e.target.value)} 
          />
        </div>

        <div className="divide-y divide-[#1e3a8a]/20">
          {clientesFiltrados.map(c => (
            <div key={c.id} className="px-4 py-3 hover:bg-white/5 transition-colors">
              {editandoCliente === c.id ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3 items-center">
                    <input className="input-field flex-1" value={editNombre} onChange={e => setEditNombre(e.target.value)} />
                    <div className="flex gap-1">
                      {COLORES.map(col => (
                        <button key={col} onClick={() => setEditColor(col)} className={clsx('w-6 h-6 rounded-full border', editColor === col ? 'border-white' : 'border-transparent')} style={{ backgroundColor: col }} />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleGuardarEdicion(c.id)} className="btn-primary text-xs"><Check className="w-3.5 h-3.5" /> Guardar</button>
                    <button onClick={() => setEditandoCliente(null)} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /> Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: c.color }}>
                      {c.iniciales}
                    </div>
                    <span className="text-sm font-medium text-white">{c.nombre}</span>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button onClick={() => { setEditandoCliente(c.id); setEditNombre(c.nombre); setEditColor(c.color) }} className="text-slate-500 hover:text-blue-400"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => handleEliminar(c.id, c.nombre)} className="text-slate-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
