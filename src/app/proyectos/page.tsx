'use client'

import { useEffect, useState } from 'react'
import { obtenerProyectos, obtenerClientes, eliminarProyecto } from '@/lib/db'
import type { Proyecto, Cliente } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { FolderKanban, Plus, Search, Filter, Trash2, CalendarDays, Clock, Building2 } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { formatearFecha } from '@/lib/db'
import ModalNuevoProyecto from '@/components/forms/ModalNuevoProyecto'
import Link from 'next/link'

const BADGE_EMPRESA: Record<string, string> = {
  'OKINAWATEC': 'badge-okinawatec',
  'TECH SOLUTIONS': 'badge-tech',
  'QUANTIC': 'badge-quantic',
}
const ESTADO_BADGE: Record<string, string> = {
  activo: 'bg-green-900/40 text-green-300 border-green-700/40',
  completado: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
  suspendido: 'bg-red-900/40 text-red-300 border-red-700/40',
}

export default function ProyectosPage() {
  const { isAdmin } = useAuth()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)

  const cargar = async () => {
    setLoading(true)
    const [p, c] = await Promise.all([obtenerProyectos(), obtenerClientes()])
    setProyectos(p)
    setClientes(c)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const proyectosFiltrados = proyectos.filter(p => {
    const q = busqueda.toLowerCase()
    const coincideBusqueda = !q || p.nombre.toLowerCase().includes(q) || p.clienteNombre.toLowerCase().includes(q) || p.solucion.toLowerCase().includes(q)
    const coincideEmpresa = !filtroEmpresa || p.empresa === filtroEmpresa
    const coincideEstado = !filtroEstado || p.estado === filtroEstado
    const coincideCliente = !filtroCliente || p.clienteId === filtroCliente
    return coincideBusqueda && coincideEmpresa && coincideEstado && coincideCliente
  })

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el proyecto "${nombre}"?`)) return
    await eliminarProyecto(id)
    toast.success('Proyecto eliminado')
    cargar()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-blue-400" /> Proyectos
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{proyectos.length} proyectos en total</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModalAbierto(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo proyecto
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input-field pl-9"
            placeholder="Buscar proyecto, cliente, solución..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>
        <select className="input-field w-auto min-w-36" value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
          <option value="">Todas las empresas</option>
          <option value="OKINAWATEC">Okinawatec</option>
          <option value="TECH SOLUTIONS">Tech Solutions</option>
          <option value="QUANTIC">Quantic</option>
        </select>
        <select className="input-field w-auto min-w-36" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)}>
          <option value="">Todos los clientes</option>
          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <select className="input-field w-auto min-w-32" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="completado">Completado</option>
          <option value="suspendido">Suspendido</option>
        </select>
        {(busqueda || filtroEmpresa || filtroEstado || filtroCliente) && (
          <button onClick={() => { setBusqueda(''); setFiltroEmpresa(''); setFiltroEstado(''); setFiltroCliente('') }}
            className="btn-secondary text-xs">
            <Filter className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : proyectosFiltrados.length === 0 ? (
        <div className="card text-center py-16">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No se encontraron proyectos</p>
          {isAdmin && <button onClick={() => setModalAbierto(true)} className="btn-primary mx-auto mt-4"><Plus className="w-4 h-4" /> Crear primero</button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {proyectosFiltrados.map(p => (
            <div key={p.id} className="card-hover group relative flex flex-col gap-3">
              {/* Top row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <Link href={`/cronogramas?proyecto=${p.id}`}>
                    <h3 className="font-semibold text-white text-sm leading-tight group-hover:text-blue-300 transition-colors line-clamp-2 cursor-pointer">
                      {p.nombre}
                    </h3>
                  </Link>
                </div>
                <span className={clsx('text-xs px-2 py-0.5 rounded-full border flex-shrink-0', ESTADO_BADGE[p.estado])}>
                  {p.estado}
                </span>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap gap-1.5">
                <span className={BADGE_EMPRESA[p.empresa] || 'badge-okinawatec'}>{p.empresa}</span>
                {p.marca && <span className="text-xs bg-slate-800/60 text-slate-300 border border-slate-600/40 px-2 py-0.5 rounded-full">{p.marca}</span>}
              </div>

              {/* Info */}
              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                  <span className="truncate font-medium text-slate-300">{p.clienteNombre}</span>
                </div>
                {p.solucion && (
                  <div className="flex items-start gap-2">
                    <span className="w-3.5 h-3.5 flex-shrink-0 mt-0.5">📦</span>
                    <span className="line-clamp-1">{p.solucion}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                  <span>{formatearFecha(p.fechaInicio)} → {formatearFecha(p.fechaFin)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                  <span>{p.plazo} {p.plazo === 1 ? 'mes' : 'meses'}</span>
                  {p.numeroContrato && <span className="text-slate-500 ml-1">· {p.numeroContrato}</span>}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-[#1e3a8a]/30 mt-auto">
                <span className="text-xs text-slate-500">{p.contratista}</span>
                <div className="flex items-center gap-2">
                  <Link href={`/cronogramas?proyecto=${p.id}`} className="text-xs text-blue-400 hover:text-blue-300 underline">
                    Ver cronograma
                  </Link>
                  {isAdmin && (
                    <button onClick={() => handleEliminar(p.id, p.nombre)} className="text-slate-600 hover:text-red-400 transition-colors ml-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAbierto && (
        <ModalNuevoProyecto
          clientes={clientes}
          onClose={() => setModalAbierto(false)}
          onSuccess={() => { setModalAbierto(false); cargar() }}
        />
      )}
    </div>
  )
}
