'use client'

import { useEffect, useState } from 'react'
import { obtenerProyectos, obtenerClientes, eliminarProyecto, actualizarProyecto } from '@/lib/db'
import type { Proyecto, Cliente } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { FolderKanban, Plus, Search, Filter, Trash2, CalendarDays, Building2, Pencil, Check, X, ChevronDown, ChevronUp, Download, MessageSquare, Link2 } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { formatearFecha } from '@/lib/db'
import ModalNuevoProyecto from '@/components/forms/ModalNuevoProyecto'
import ModalComentarios from '@/components/forms/ModalComentarios'
import NextLink from 'next/link'

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

function sumarMeses(fechaStr: string, meses: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const fecha = new Date(y, m - 1 + meses, d)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

export default function ProyectosPage() {
  const [ultimoId, setUltimoId] = useState<string | null>(null)
  const { isAdmin } = useAuth()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [proyectoComentarios, setProyectoComentarios] = useState<Proyecto | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Proyecto>>({})

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
    return coincideBusqueda &&
      (!filtroEmpresa || p.empresa === filtroEmpresa) &&
      (!filtroEstado || p.estado === filtroEstado) &&
      (!filtroCliente || p.clienteId === filtroCliente)
  })

  const exportarExcel = () => {
    const headers = ['Nombre', 'Cliente', 'Empresa', 'Contratista', 'N° Contrato', 'Solución', 'Plazo', 'Fecha Inicio', 'Fecha Fin', 'Estado']
    const filas = proyectosFiltrados.map(p => [
      p.nombre, p.clienteNombre, p.empresa, p.contratista,
      p.numeroContrato, p.solucion, `${p.plazo} meses`,
      formatearFecha(p.fechaInicio), formatearFecha(p.fechaFin), p.estado
    ])
    const csv = [headers, ...filas].map(f => f.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `proyectos_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Exportado correctamente')
  }

  const iniciarEdicion = (p: Proyecto) => {
    setEditando(p.id)
    setEditData({
      nombre: p.nombre,
      clienteId: p.clienteId,
      clienteNombre: p.clienteNombre,
      contratista: p.contratista,
      numeroContrato: p.numeroContrato,
      solucion: p.solucion,
      plazo: p.plazo,
      fechaInicio: p.fechaInicio,
      estado: p.estado,
    })
  }

  const guardarEdicion = async (id: string) => {
    try {
      const fechaFin = sumarMeses(editData.fechaInicio || '', editData.plazo || 12)
      const clienteSeleccionado = clientes.find(c => c.id === editData.clienteId)
      await actualizarProyecto(id, {
        ...editData,
        fechaFin,
        clienteNombre: clienteSeleccionado?.nombre || editData.clienteNombre,
        empresa: editData.contratista === 'TECH SOLUTIONS' ? 'TECH SOLUTIONS'
          : editData.contratista === 'QUANTIC' ? 'QUANTIC' : 'OKINAWATEC',
      })
      toast.success('Proyecto actualizado')
      setEditando(null)
      setUltimoId(id)
      setTimeout(() => setUltimoId(null), 2000)
      cargar()
    } catch {
      toast.error('Error al guardar')
    }
  }

  const handleEliminar = async (id: string, nombre: string) => {
    if (!confirm(`¿Eliminar el proyecto "${nombre}"?`)) return
    await eliminarProyecto(id)
    toast.success('Proyecto eliminado')
    cargar()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-6 h-6 text-blue-400" /> Proyectos
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{proyectos.length} proyectos en total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarExcel} className="btn-secondary">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          {isAdmin && (
            <button onClick={() => setModalAbierto(true)} className="btn-primary">
              <Plus className="w-4 h-4" /> Nuevo proyecto
            </button>
          )}
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Buscar proyecto, cliente, solución..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
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
          <button onClick={() => { setBusqueda(''); setFiltroEmpresa(''); setFiltroEstado(''); setFiltroCliente('') }} className="btn-secondary text-xs">
            <Filter className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : proyectosFiltrados.length === 0 ? (
        <div className="card text-center py-16">
          <FolderKanban className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No se encontraron proyectos</p>
          {isAdmin && (
            <button onClick={() => setModalAbierto(true)} className="btn-primary mx-auto mt-4">
              <Plus className="w-4 h-4" /> Crear primero
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {proyectosFiltrados.map(p => (
            <div key={p.id} className={clsx('card-hover flex flex-col gap-3', expandido === p.id && 'border-blue-500/50', ultimoId === p.id && 'highlight-new')}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandido(expandido === p.id ? null : p.id)}>
  <p className="font-semibold text-white text-sm leading-tight line-clamp-2 hover:text-blue-300 transition-colors">
    {p.solucion || p.nombre}
  </p>
  {p.solucion && (
    <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">{p.nombre}</p>
  )}
</div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className={clsx('text-xs px-2 py-0.5 rounded-full border', ESTADO_BADGE[p.estado])}>
                    {p.estado}
                  </span>
                  <button onClick={() => setExpandido(expandido === p.id ? null : p.id)} className="text-slate-500 hover:text-white transition-colors">
                    {expandido === p.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <span className={BADGE_EMPRESA[p.empresa] || 'badge-okinawatec'}>{p.empresa}</span>
              </div>

              <div className="space-y-1.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                  <span className="font-medium text-slate-300 truncate">{p.clienteNombre}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 flex-shrink-0 text-slate-500" />
                  <span>{formatearFecha(p.fechaInicio)} → {formatearFecha(p.fechaFin)}</span>
                </div>
              </div>

              {expandido === p.id && (
                <div className="border-t border-[#1e3a8a]/30 pt-3 mt-1 space-y-3 animate-fade-in">
                  {editando === p.id ? (
                    <div className="space-y-3">
                      <div>
                        <label className="label">Nombre del proyecto</label>
                        <input className="input-field" value={editData.nombre} onChange={e => setEditData(d => ({ ...d, nombre: e.target.value }))} />
                      </div>
                      <div>
                        <label className="label">Cliente</label>
                        <select className="input-field" value={editData.clienteId} onChange={e => setEditData(d => ({ ...d, clienteId: e.target.value }))}>
                          {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="label">Solución / Equipo</label>
                        <input className="input-field" value={editData.solucion} onChange={e => setEditData(d => ({ ...d, solucion: e.target.value }))} />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label">Contratista</label>
                          <select className="input-field" value={editData.contratista} onChange={e => setEditData(d => ({ ...d, contratista: e.target.value }))}>
                            <option value="GRUPO OKINAWATEC">GRUPO OKINAWATEC</option>
                            <option value="TECH SOLUTIONS">TECH SOLUTIONS</option>
                            <option value="QUANTIC">QUANTIC</option>
                          </select>
                        </div>
                        <div>
                          <label className="label">N° Contrato</label>
                          <input className="input-field" value={editData.numeroContrato} onChange={e => setEditData(d => ({ ...d, numeroContrato: e.target.value }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="label">Fecha inicio</label>
                          <input type="date" className="input-field" value={editData.fechaInicio} onChange={e => setEditData(d => ({ ...d, fechaInicio: e.target.value }))} />
                        </div>
                        <div>
                          <label className="label">Plazo</label>
                          <select className="input-field" value={editData.plazo} onChange={e => setEditData(d => ({ ...d, plazo: Number(e.target.value) }))}>
                            {[1, 3, 6, 12, 24, 36].map(m => <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="label">Estado</label>
                        <select className="input-field" value={editData.estado} onChange={e => setEditData(d => ({ ...d, estado: e.target.value as any }))}>
                          <option value="activo">Activo</option>
                          <option value="completado">Completado</option>
                          <option value="suspendido">Suspendido</option>
                        </select>
                      </div>
                      <div>
  <label className="label">Link Google Drive</label>
  <input className="input-field" placeholder="https://drive.google.com/..." 
    value={(editData as any).linkDrive || ''} 
    onChange={e => setEditData(d => ({ ...d, linkDrive: e.target.value }))} />
</div>
                      <div className="flex gap-2">
                        <button onClick={() => guardarEdicion(p.id)} className="btn-primary text-xs">
                          <Check className="w-3.5 h-3.5" /> Guardar
                        </button>
                        <button onClick={() => setEditando(null)} className="btn-secondary text-xs">
                          <X className="w-3.5 h-3.5" /> Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {p.solucion && (
                        <div>
                          <p className="text-slate-500">Solución</p>
                          <p className="text-slate-200">{p.solucion}</p>
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-slate-500">Contratista</p>
                          <p className="text-slate-200">{p.contratista || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">N° Contrato</p>
                          <p className="text-slate-200">{p.numeroContrato || '—'}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Plazo</p>
                          <p className="text-slate-200">{p.plazo} meses</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Fecha fin</p>
                          <p className="text-slate-200">{formatearFecha(p.fechaFin)}</p>
                        </div>
                        {(p as any).linkDrive && (
  <div>
    <p className="text-slate-500">Google Drive</p>
    <a href={(p as any).linkDrive} target="_blank" rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 underline text-xs flex items-center gap-1 mt-0.5">
      <Link2 className="w-3 h-3" /> Abrir carpeta del proyecto →
    </a>
  </div>
)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-[#1e3a8a]/30 mt-auto">
                <span className="text-xs text-slate-500">{p.contratista}</span>
                <div className="flex items-center gap-2">
  <NextLink href={`/cronogramas?proyecto=${p.id}`} className="text-xs text-blue-400 hover:text-blue-300 underline">
    Cronograma
  </NextLink>
  <button
    onClick={(e) => { e.stopPropagation(); setProyectoComentarios(p) }}
    className="text-slate-500 hover:text-blue-400 transition-colors"
    title="Comentarios">
    <MessageSquare className="w-3.5 h-3.5" />
  </button>
  {isAdmin && (
    <>
      <button onClick={() => { setExpandido(p.id); iniciarEdicion(p) }}
        className="text-slate-500 hover:text-blue-400 transition-colors">
        <Pencil className="w-3.5 h-3.5" />
      </button>
      <button onClick={() => handleEliminar(p.id, p.nombre)}
        className="text-slate-500 hover:text-red-400 transition-colors">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </>
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
          proyectos={proyectos}
          onClose={() => setModalAbierto(false)}
          onSuccess={() => { setModalAbierto(false); cargar() }}
        />
      )}
      {proyectoComentarios && (
  <ModalComentarios
    proyecto={proyectoComentarios}
    onClose={() => setProyectoComentarios(null)}
  />
)}
    </div>
  )
}
