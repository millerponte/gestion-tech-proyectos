'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { obtenerEntregables, obtenerClientes, obtenerProyectos, actualizarEntregable, eliminarEntregable } from '@/lib/db'
import type { Entregable, Cliente, Proyecto } from '@/types'
import { FileText, Plus, Search, Filter, Download, ChevronDown, ChevronUp, Pencil, Trash2, Check, X } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { formatearFecha, hoy } from '@/lib/db'
import ModalNuevoEntregable from '@/components/forms/ModalNuevoEntregable'
import ModalExpediente from '@/components/forms/ModalExpediente'
import { useAuth } from '@/hooks/useAuth'

const BADGE_EMPRESA: Record<string, string> = {
  'OKINAWATEC': 'badge-okinawatec',
  'TECH SOLUTIONS': 'badge-tech',
  'QUANTIC': 'badge-quantic',
}

export default function EntregablesPage() {
  const { isAdmin } = useAuth()
  const [entregables, setEntregables] = useState<Entregable[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [entregableExpediente, setEntregableExpediente] = useState<Entregable | null>(null)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Entregable>>({})

  const cargar = async () => {
    setLoading(true)
    const [e, c, p] = await Promise.all([obtenerEntregables(), obtenerClientes(), obtenerProyectos()])
    setEntregables(e)
    setClientes(c)
    setProyectos(p)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = entregables.filter(e => {
    const q = busqueda.toLowerCase()
    const coincideBusqueda = !q ||
      e.asunto.toLowerCase().includes(q) ||
      e.clienteNombre.toLowerCase().includes(q) ||
      e.numeroDocumento.toLowerCase().includes(q) ||
      e.responsableNombre.toLowerCase().includes(q)
    return coincideBusqueda &&
      (!filtroEmpresa || e.empresa === filtroEmpresa) &&
      (!filtroTipo || e.tipo === filtroTipo) &&
      (!filtroEstado || e.estado === filtroEstado)
  })

  const exportarExcel = () => {
    const headers = ['N° Documento', 'N° Cargo', 'Empresa', 'Tipo', 'Cliente', 'Proyecto', 'Fecha', 'Asunto', 'Responsable', 'Estado', 'Expediente']
    const filas = filtrados.map(e => [
      e.numeroDocumento, e.numeroCargo, e.empresa, e.tipo,
      e.clienteNombre, e.proyectoNombre, formatearFecha(e.fecha),
      e.asunto, e.responsableNombre, e.estado, e.expediente || ''
    ])
    const csv = [headers, ...filas].map(f => f.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `entregables_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Exportado correctamente')
  }

const iniciarEdicion = (e: Entregable) => {
  setEditando(e.id)
  setEditData({
    asunto: e.asunto,
    fecha: e.fecha,
    responsableNombre: e.responsableNombre,
    tipo: e.tipo,
    descripcion: e.descripcion || '',
    numeroDocumento: e.numeroDocumento,
    numeroCargo: e.numeroCargo,
    expediente: e.expediente || '',
    estado: e.estado,
  })
}

  const guardarEdicion = async (id: string) => {
    try {
      await actualizarEntregable(id, editData)
      toast.success('Entregable actualizado')
      setEditando(null)
      cargar()
    } catch {
      toast.error('Error al guardar')
    }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este entregable?')) return
    await eliminarEntregable(id)
    toast.success('Eliminado')
    cargar()
  }

  const TIPOS = ['Reservar', 'Plan de Trabajo', 'Informe Técnico', 'Informe Mensual', 'Informe de Incidencia', 'Entregable', 'Otro']

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" /> Entregables
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{entregables.length} registros en total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarExcel} className="btn-secondary">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          <button onClick={() => setModalNuevo(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo entregable
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Buscar por asunto, cliente, N° documento..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <select className="input-field w-auto min-w-36" value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
          <option value="">Todas las empresas</option>
          <option value="OKINAWATEC">Okinawatec</option>
          <option value="TECH SOLUTIONS">Tech Solutions</option>
          <option value="QUANTIC">Quantic</option>
        </select>
        <select className="input-field w-auto min-w-40" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input-field w-auto min-w-32" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos</option>
          <option value="reservado">Reservado</option>
          <option value="completo">Completo</option>
        </select>
        {(busqueda || filtroEmpresa || filtroTipo || filtroEstado) && (
          <button onClick={() => { setBusqueda(''); setFiltroEmpresa(''); setFiltroTipo(''); setFiltroEstado('') }} className="btn-secondary text-xs">
            <Filter className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No se encontraron entregables</p>
          <button onClick={() => setModalNuevo(true)} className="btn-primary mx-auto mt-4">
            <Plus className="w-4 h-4" /> Registrar primero
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0d1526] border-b border-[#1e3a8a]/50">
                <tr>
                  <th className="tabla-header w-6"></th>
                  <th className="tabla-header">N° Documento</th>
                  <th className="tabla-header">Empresa</th>
                  <th className="tabla-header">Tipo</th>
                  <th className="tabla-header">Cliente</th>
                  <th className="tabla-header">Asunto</th>
                  <th className="tabla-header">Fecha</th>
                  <th className="tabla-header">Estado</th>
                  <th className="tabla-header"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(e => (
                  <>
                    {/* Fila principal */}
                    <tr key={e.id}
                      className={clsx('tabla-row', expandido === e.id && 'bg-[#1e3a8a]/10')}
                      onClick={() => setExpandido(expandido === e.id ? null : e.id)}>
                      <td className="tabla-cell text-slate-500 w-6">
                        {expandido === e.id
                          ? <ChevronUp className="w-3.5 h-3.5" />
                          : <ChevronDown className="w-3.5 h-3.5" />}
                      </td>
                      <td className="tabla-cell">
                        <p className="font-mono text-cyan-400 text-xs">{e.numeroDocumento}</p>
                        <p className="font-mono text-slate-500 text-xs">{e.numeroCargo}</p>
                      </td>
                      <td className="tabla-cell">
                        <span className={BADGE_EMPRESA[e.empresa] || 'badge-okinawatec'}>
                          {e.empresa === 'TECH SOLUTIONS' ? 'TECH' : e.empresa === 'OKINAWATEC' ? 'OKINA' : 'QUANTIC'}
                        </span>
                      </td>
                      <td className="tabla-cell">
                        <span className="text-xs text-slate-300 bg-slate-800/50 px-2 py-0.5 rounded-full">{e.tipo}</span>
                      </td>
                      <td className="tabla-cell">
                        <p className="text-sm text-slate-200 max-w-32 truncate">{e.clienteNombre}</p>
                        <p className="text-xs text-slate-500 max-w-32 truncate">{e.proyectoNombre}</p>
                      </td>
                      <td className="tabla-cell">
                        <p className="text-sm text-slate-200 max-w-48 truncate">{e.asunto}</p>
                      </td>
                      <td className="tabla-cell whitespace-nowrap text-slate-400 text-xs">{formatearFecha(e.fecha)}</td>
                      <td className="tabla-cell">
                        <span className={clsx('text-xs px-2 py-0.5 rounded-full border',
                          e.estado === 'reservado'
                            ? 'bg-amber-900/30 text-amber-300 border-amber-700/40'
                            : 'bg-green-900/30 text-green-300 border-green-700/40')}>
                          {e.estado}
                        </span>
                      </td>
                      <td className="tabla-cell" onClick={ev => ev.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          {e.estado === 'reservado' && (
                            <button onClick={() => setEntregableExpediente(e)}
                              className="text-xs text-blue-400 hover:text-blue-300 underline whitespace-nowrap">
                              + Exp.
                            </button>
                          )}
                          {isAdmin && (
                            <>
                              <button onClick={() => { setExpandido(e.id); iniciarEdicion(e) }}
                                className="text-slate-500 hover:text-blue-400 transition-colors">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => handleEliminar(e.id)}
                                className="text-slate-500 hover:text-red-400 transition-colors">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Fila expandida */}
                    {expandido === e.id && (
                      <tr key={`${e.id}-expand`} className="bg-[#0d1526]/80">
                        <td colSpan={9} className="px-6 py-4">
                          {editando === e.id ? (
                            // Modo edición
                            <div className="space-y-3">
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="label">N° Documento</label>
      <input className="input-field font-mono" value={editData.numeroDocumento} onChange={ev => setEditData(d => ({ ...d, numeroDocumento: ev.target.value }))} />
    </div>
    <div>
      <label className="label">N° Cargo</label>
      <input className="input-field font-mono" value={editData.numeroCargo} onChange={ev => setEditData(d => ({ ...d, numeroCargo: ev.target.value }))} />
    </div>
  </div>
  <div className="grid grid-cols-2 gap-3">
    <div>
      <label className="label">Tipo</label>
      <select className="input-field" value={editData.tipo} onChange={ev => setEditData(d => ({ ...d, tipo: ev.target.value as any }))}>
        {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
      </select>
    </div>
    <div>
      <label className="label">Fecha</label>
      <input type="date" className="input-field" value={editData.fecha} onChange={ev => setEditData(d => ({ ...d, fecha: ev.target.value }))} />
    </div>
  </div>
  <div>
    <label className="label">Asunto</label>
    <input className="input-field" value={editData.asunto} onChange={ev => setEditData(d => ({ ...d, asunto: ev.target.value }))} />
  </div>
  <div>
    <label className="label">Responsable</label>
    <input className="input-field" value={editData.responsableNombre} onChange={ev => setEditData(d => ({ ...d, responsableNombre: ev.target.value }))} />
  </div>
  <div>
    <label className="label">Expediente</label>
    <input className="input-field" placeholder="Ej: EXP-2026-001234" value={editData.expediente || ''} onChange={ev => setEditData(d => ({ ...d, expediente: ev.target.value }))} />
  </div>
  <div>
    <label className="label">Estado</label>
    <select className="input-field" value={editData.estado || 'reservado'} onChange={ev => setEditData(d => ({ ...d, estado: ev.target.value as any }))}>
      <option value="reservado">Reservado</option>
      <option value="completo">Completo</option>
    </select>
  </div>
  <div>
    <label className="label">Descripción</label>
    <textarea className="input-field resize-none" rows={2} value={editData.descripcion} onChange={ev => setEditData(d => ({ ...d, descripcion: ev.target.value }))} />
  </div>
  <div className="flex gap-2">
    <button onClick={() => guardarEdicion(e.id)} className="btn-primary text-xs">
      <Check className="w-3.5 h-3.5" /> Guardar cambios
    </button>
    <button onClick={() => setEditando(null)} className="btn-secondary text-xs">
      <X className="w-3.5 h-3.5" /> Cancelar
    </button>
  </div>
</div>
                          ) : (
                            // Modo detalle
                           ) : (
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
    <div>
      <p className="text-slate-500 mb-0.5">N° Documento</p>
      <p className="font-mono text-cyan-400">{e.numeroDocumento}</p>
    </div>
    <div>
      <p className="text-slate-500 mb-0.5">N° Cargo</p>
      <p className="font-mono text-cyan-400">{e.numeroCargo}</p>
    </div>
    <div>
      <p className="text-slate-500 mb-0.5">Responsable</p>
      <p className="text-slate-200">{e.responsableNombre}</p>
    </div>
    <div>
      <p className="text-slate-500 mb-0.5">Proyecto</p>
      <p className="text-slate-200">{e.proyectoNombre}</p>
    </div>
    <div>
      <p className="text-slate-500 mb-0.5">Asunto completo</p>
      <p className="text-slate-200">{e.asunto}</p>
    </div>
    {e.descripcion && (
      <div>
        <p className="text-slate-500 mb-0.5">Descripción</p>
        <p className="text-slate-200">{e.descripcion}</p>
      </div>
    )}
    {e.expediente && (
      <div>
        <p className="text-slate-500 mb-0.5">Expediente</p>
        <p className="text-green-400">{e.expediente}</p>
      </div>
    )}
    {e.hitoId && (
      <div>
        <p className="text-slate-500 mb-0.5">Hito vinculado</p>
        <Link
          href={`/cronogramas?proyecto=${e.proyectoId}`}
          className="text-blue-400 hover:text-blue-300 underline text-xs"
          onClick={ev => ev.stopPropagation()}>
          Ver hito en cronograma →
        </Link>
      </div>
    )}
  </div>
)}
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalNuevo && (
        <ModalNuevoEntregable
          clientes={clientes} proyectos={proyectos}
          onClose={() => setModalNuevo(false)}
          onSuccess={() => { setModalNuevo(false); cargar() }}
        />
      )}
      {entregableExpediente && (
        <ModalExpediente
          entregable={entregableExpediente}
          onClose={() => setEntregableExpediente(null)}
          onSuccess={() => { setEntregableExpediente(null); cargar() }}
        />
      )}
    </div>
  )
}
