'use client'

import { useEffect, useState } from 'react'
import { obtenerProyectos, obtenerClientes, obtenerHitosPorProyecto, crearHito, actualizarHito, eliminarHito, obtenerEntregables } from '@/lib/db'
import type { Proyecto, Cliente, Hito, Entregable } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { CalendarDays, Plus, Search, ChevronDown, ChevronUp, Pencil, Trash2, Check, X, Download, FileSpreadsheet } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { formatearFecha, hoy, esFechaVencida } from '@/lib/db'
import { useSearchParams } from 'next/navigation'
import ModalImportarHitos from '@/components/forms/ModalImportarHitos'

const ESTADO_HITO: Record<string, string> = {
  pendiente: 'bg-amber-900/30 text-amber-300 border-amber-700/40',
  realizado: 'bg-green-900/30 text-green-300 border-green-700/40',
  vencido: 'bg-red-900/30 text-red-300 border-red-700/40',
}

export default function CronogramasPage() {
  const { isAdmin, tienePermiso, usuario } = useAuth()
  const searchParams = useSearchParams()

  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [hitos, setHitos] = useState<Hito[]>([])
  const [entregables, setEntregables] = useState<Entregable[]>([])
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState<Proyecto | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingHitos, setLoadingHitos] = useState(false)
  const [expandido, setExpandido] = useState<string | null>(null)
  const [expandirPendiente, setExpandirPendiente] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Hito>>({})
  const [ultimoId, setUltimoId] = useState<string | null>(null)
  const [modalNuevoHito, setModalNuevoHito] = useState(false)
  const [modalImportar, setModalImportar] = useState(false)
  const [filtroResponsable, setFiltroResponsable] = useState('')
  const [filtroEstadoHito, setFiltroEstadoHito] = useState('')
  const [nuevoHito, setNuevoHito] = useState<Partial<Hito>>({
    numero: 0, nombre: '', descripcion: '', responsable: '',
    plazoContractual: '', fechaInicio: hoy(),
    fechaLimite: hoy(), pago: '', origen: '',
    estado: 'pendiente', esCritico: false,
  })

  useEffect(() => {
    const cargar = async () => {
      const [p, c, e] = await Promise.all([obtenerProyectos(), obtenerClientes(), obtenerEntregables()])
      setProyectos(p)
      setClientes(c)
      setEntregables(e)
      setLoading(false)
      const idParam = searchParams.get('proyecto')
      const expandirParam = searchParams.get('expandir')
      if (expandirParam) setExpandirPendiente(expandirParam)
      if (idParam) {
        const encontrado = p.find(x => x.id === idParam)
        if (encontrado) seleccionarProyecto(encontrado)
      }
    }
    cargar()
  }, [])

  const seleccionarProyecto = async (p: Proyecto) => {
    setProyectoSeleccionado(p)
    setLoadingHitos(true)
    const h = await obtenerHitosPorProyecto(p.id)
    const ordenados = [...h].sort((a, b) => (a.numero || 0) - (b.numero || 0))
    setHitos(ordenados)
    setLoadingHitos(false)
    if (expandirPendiente) {
      setTimeout(() => {
        setExpandido(expandirPendiente)
        const el = document.getElementById(`hito-${expandirPendiente}`)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setExpandirPendiente(null)
      }, 150)
    }
  }

  const proyectosFiltrados = proyectos.filter(p => {
    const q = busqueda.toLowerCase()
    return !q || p.nombre.toLowerCase().includes(q) || p.clienteNombre.toLowerCase().includes(q)
  })

  const exportarExcel = () => {
    if (!proyectoSeleccionado) return
    const headers = ['N°', 'Hito / Entregable', 'Descripción', 'Responsable', 'Plazo Contractual', 'Fecha Inicio', 'Fecha Límite', 'Fecha Real Envío', 'Estado']
    const filas = hitos.map(h => [
      h.numero || '—', h.nombre, h.descripcion, h.responsable, h.plazoContractual,
      h.fechaInicio === 'por definir' ? 'por definir' : formatearFecha(h.fechaInicio),
      h.fechaLimite === 'por definir' ? 'por definir' : formatearFecha(h.fechaLimite),
      h.fechaRealEnvio ? formatearFecha(h.fechaRealEnvio) : '',
      h.estado,
    ])
    const csv = [headers, ...filas].map(f => f.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `cronograma_${proyectoSeleccionado.clienteNombre}_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Exportado correctamente')
  }

  const iniciarEdicion = (h: Hito) => {
    setEditando(h.id)
    setEditData({ ...h })
  }

  const guardarEdicion = async (id: string) => {
    try {
      await actualizarHito(id, editData)
      toast.success('Hito actualizado')
      setEditando(null)
      if (proyectoSeleccionado) seleccionarProyecto(proyectoSeleccionado)
      setTimeout(() => {
        setUltimoId(null)
        requestAnimationFrame(() => {
          setUltimoId(id)
          setTimeout(() => setUltimoId(null), 5500)
        })
      }, 300)
    } catch {
      toast.error('Error al guardar')
    }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este hito?')) return
    await eliminarHito(id)
    toast.success('Hito eliminado')
    if (proyectoSeleccionado) seleccionarProyecto(proyectoSeleccionado)
  }

  const handleCrearHito = async () => {
    if (!nuevoHito.nombre?.trim() || !proyectoSeleccionado) {
      toast.error('Ingresa el nombre del hito')
      return
    }
    try {
      await crearHito({
        proyectoId: proyectoSeleccionado.id,
        numero: nuevoHito.numero || 0,
        nombre: nuevoHito.nombre!.trim(),
        descripcion: nuevoHito.descripcion || '',
        responsable: nuevoHito.responsable || proyectoSeleccionado.contratista,
        plazoContractual: nuevoHito.plazoContractual || '',
        fechaInicio: nuevoHito.fechaInicio || hoy(),
        fechaLimite: nuevoHito.fechaLimite || hoy(),
        pago: nuevoHito.pago || '',
        origen: nuevoHito.origen || '',
        estado: 'pendiente',
        esCritico: nuevoHito.esCritico || false,
      })
      toast.success('Hito creado')
      setModalNuevoHito(false)
      setNuevoHito({ numero: 0, nombre: '', descripcion: '', responsable: '', plazoContractual: '', fechaInicio: hoy(), fechaLimite: hoy(), pago: '', origen: '', estado: 'pendiente', esCritico: false })
      await seleccionarProyecto(proyectoSeleccionado)
      setTimeout(() => {
        setUltimoId(null)
        requestAnimationFrame(() => {
          setUltimoId('__nuevo__')
          setTimeout(() => setUltimoId(null), 5500)
        })
      }, 300)
    } catch {
      toast.error('Error al crear hito')
    }
  }

  const estadoHito = (h: Hito): string => {
    if (h.estado === 'realizado') return 'realizado'
    if (h.fechaLimite !== 'por definir' && esFechaVencida(h.fechaLimite)) return 'vencido'
    return 'pendiente'
  }

  const hitosFiltrados = hitos.filter(h => {
    const estado = estadoHito(h)
    return (!filtroResponsable || h.responsable === filtroResponsable) &&
           (!filtroEstadoHito || estado === filtroEstadoHito)
  })

  const responsablesUnicos = [...new Set(hitos.map(h => h.responsable).filter(Boolean))]

  if (loading) return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">

      {/* CABECERA */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-400" /> Cronogramas
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {proyectoSeleccionado ? proyectoSeleccionado.nombre : 'Selecciona un proyecto'}
          </p>
        </div>
        {proyectoSeleccionado && (
          <div className="flex gap-2">
            <button onClick={exportarExcel} className="btn-secondary">
              <Download className="w-4 h-4" /> Exportar Excel
            </button>
            {tienePermiso('cronogramas_agregar') && (
              <>
                <button onClick={() => setModalImportar(true)} className="btn-secondary">
                  <FileSpreadsheet className="w-4 h-4" /> Importar Excel
                </button>
                <button onClick={() => setModalNuevoHito(true)} className="btn-primary">
                  <Plus className="w-4 h-4" /> Nuevo hito
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* CONTENIDO PRINCIPAL */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

        {/* PANEL IZQUIERDO */}
        {/* PANEL IZQUIERDO */}
        <div className="xl:col-span-1 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input-field pl-9" placeholder="Buscar proyecto..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
          </div>
          <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
            {proyectosFiltrados.map(p => (
              <div key={p.id} className="rounded-lg border overflow-hidden transition-all
                bg-[#111d35] border-[#1e3a8a]/40">
                {/* Botón seleccionar */}
                <button
                  onClick={() => seleccionarProyecto(p)}
                  className={clsx('w-full text-left px-3 py-2.5 text-xs transition-all',
                    proyectoSeleccionado?.id === p.id
                      ? 'bg-blue-600/20 text-blue-300'
                      : 'text-slate-300 hover:bg-[#1e3a8a]/20 hover:text-white')}>
                  <p className="font-medium line-clamp-2 text-cyan-300">{p.solucion || p.nombre}</p>
                  <p className="text-slate-400 mt-0.5 line-clamp-1 text-xs">{p.nombre}</p>
                  <p className="text-slate-500 mt-0.5">{p.clienteNombre}</p>
                </button>
                {/* Info expandida — solo visible cuando está seleccionado */}
                {proyectoSeleccionado?.id === p.id && (
                  <div className="border-t border-[#1e3a8a]/40 px-3 py-2.5 space-y-1.5 text-xs bg-[#0d1526]/60 animate-fade-in">
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                      <div>
                        <p className="text-slate-500">Estado</p>
                        <p className={clsx('font-medium',
                          p.estado === 'activo' ? 'text-green-400' :
                          p.estado === 'suspendido' ? 'text-red-400' : 'text-slate-400')}>
                          {p.estado}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Empresa</p>
                        <p className="text-slate-300">{p.empresa}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Contratista</p>
                        <p className="text-slate-300">{p.contratista || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">N° Contrato</p>
                        <p className="text-slate-300 break-all">{p.numeroContrato || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Inicio</p>
                        <p className="text-slate-300">{formatearFecha(p.fechaInicio)}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Fin</p>
                        <p className="text-slate-300">{formatearFecha(p.fechaFin)}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-500">Plazo</p>
                        <p className="text-slate-300">{p.plazo} meses</p>
                      </div>
                      {p.solucion && (
                        <div className="col-span-2">
                          <p className="text-slate-500">Solución</p>
                          <p className="text-slate-300">{p.solucion}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        {/* PANEL DERECHO */}
        <div className="xl:col-span-3">
          {!proyectoSeleccionado ? (
            <div className="card text-center py-16">
              <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">Selecciona un proyecto para ver su cronograma</p>
            </div>
          ) : loadingHitos ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : hitos.length === 0 ? (
            <div className="card text-center py-16">
              <CalendarDays className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400">No hay hitos en este proyecto</p>
              {tienePermiso('cronogramas_agregar') && (
                <button onClick={() => setModalNuevoHito(true)} className="btn-primary mx-auto mt-4">
                  <Plus className="w-4 h-4" /> Agregar primer hito
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
            {/* Filtros de hitos */}
            <div className="flex flex-wrap gap-2">
              <select
                className="input-field w-auto min-w-36 text-xs"
                value={filtroResponsable}
                onChange={e => setFiltroResponsable(e.target.value)}
              >
                <option value="">Todos los responsables</option>
                {responsablesUnicos.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <select
                className="input-field w-auto min-w-32 text-xs"
                value={filtroEstadoHito}
                onChange={e => setFiltroEstadoHito(e.target.value)}
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="realizado">Realizado</option>
                <option value="vencido">Vencido</option>
              </select>
              {(filtroResponsable || filtroEstadoHito) && (
                <button
                  onClick={() => { setFiltroResponsable(''); setFiltroEstadoHito('') }}
                  className="btn-secondary text-xs py-1"
                >
                  Limpiar
                </button>
              )}
              <span className="text-xs text-slate-500 self-center ml-auto">
                {hitosFiltrados.length} de {hitos.length} hitos
              </span>
            </div>
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0d1526] border-b border-[#1e3a8a]/50">
                    <tr>
                      <th className="tabla-header w-6"></th>
                      <th className="tabla-header w-10">N°</th>
                      <th className="tabla-header">Hito / Entregable</th>
                      <th className="tabla-header">Responsable</th>
                      <th className="tabla-header">Fecha Inicio</th>
                      <th className="tabla-header">Fecha Límite</th>
                      <th className="tabla-header">Estado</th>
                      <th className="tabla-header">Fecha Real</th>
                      <th className="tabla-header"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {hitosFiltrados.map(h => {
                      const estado = estadoHito(h)
                      // Entregables vinculados a este hito
                      const entregablesVinculados = entregables.filter(e =>
                        e.hitoId === h.id || (e as any).hitoIds?.includes(h.id)
                      )
                      return (
                        <>
                          <tr key={h.id}
                            id={`hito-${h.id}`}
                            className={clsx('tabla-row', expandido === h.id && 'bg-[#1e3a8a]/10', ultimoId === h.id && 'highlight-new')}
                            onClick={() => setExpandido(expandido === h.id ? null : h.id)}>
                            <td className="tabla-cell text-slate-500">
                              {expandido === h.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </td>
                            <td className="tabla-cell text-slate-400 text-xs font-mono">{h.numero || '—'}</td>
                            <td className="tabla-cell">
                              <div className="flex items-center gap-2">
                                {h.esCritico && <span className="text-red-400 text-xs">★</span>}
                                <p className="text-sm text-slate-200 max-w-xs line-clamp-1">{h.nombre}</p>
                                {entregablesVinculados.length > 0 && (
                                  <span className="text-xs bg-green-900/30 text-green-400 border border-green-700/30 px-1.5 py-0.5 rounded-full flex-shrink-0">
                                    {entregablesVinculados.length} entregable{entregablesVinculados.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="tabla-cell text-xs text-slate-400">{h.responsable}</td>
                            <td className="tabla-cell text-xs text-slate-400 whitespace-nowrap">
                              {h.fechaInicio === 'por definir'
                                ? <span className="text-amber-400">por definir</span>
                                : formatearFecha(h.fechaInicio)}
                            </td>
                            <td className="tabla-cell text-xs whitespace-nowrap">
                              {h.fechaLimite === 'por definir'
                                ? <span className="text-amber-400">por definir</span>
                                : <span className={estado === 'vencido' ? 'text-red-400' : 'text-slate-400'}>
                                    {formatearFecha(h.fechaLimite)}
                                  </span>}
                            </td>
                            <td className="tabla-cell">
                              <span className={clsx('text-xs px-2 py-0.5 rounded-full border', ESTADO_HITO[estado])}>
                                {estado}
                              </span>
                            </td>
                            <td className="tabla-cell text-xs text-green-400 whitespace-nowrap">
                              {h.fechaRealEnvio ? formatearFecha(h.fechaRealEnvio) : '—'}
                            </td>
                            <td className="tabla-cell" onClick={e => e.stopPropagation()}>
                              <div className="flex gap-2">
                                {tienePermiso('cronogramas_editar') && (
                                  <button onClick={() => { setExpandido(h.id); iniciarEdicion(h) }}
                                    className="text-slate-500 hover:text-blue-400 transition-colors">
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {isAdmin && (
                                  <button onClick={() => handleEliminar(h.id)}
                                    className="text-slate-500 hover:text-red-400 transition-colors">
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                          {/* FILA EXPANDIDA */}
                          {expandido === h.id && (
                            <tr key={`${h.id}-exp`} className="bg-[#0d1526]/80">
                              <td colSpan={9} className="px-6 py-4">
                                {editando === h.id ? (
                                  // MODO EDICIÓN
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="label">N° de hito</label>
                                        <input type="number" className="input-field" value={editData.numero || ''} onChange={e => setEditData(d => ({ ...d, numero: Number(e.target.value) }))} />
                                      </div>
                                      <div>
                                        <label className="label">Nombre del hito</label>
                                        <input className="input-field" value={editData.nombre} onChange={e => setEditData(d => ({ ...d, nombre: e.target.value }))} />
                                      </div>
                                      <div>
                                        <label className="label">Responsable</label>
                                        <input className="input-field" value={editData.responsable} onChange={e => setEditData(d => ({ ...d, responsable: e.target.value }))} />
                                      </div>
                                    </div>
                                    <div>
                                      <label className="label">Descripción</label>
                                      <textarea className="input-field resize-none" rows={2} value={editData.descripcion} onChange={e => setEditData(d => ({ ...d, descripcion: e.target.value }))} />
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="label">Fecha inicio</label>
                                        <input type="date" className="input-field"
                                          value={editData.fechaInicio === 'por definir' ? '' : editData.fechaInicio}
                                          onChange={e => setEditData(d => ({ ...d, fechaInicio: e.target.value || 'por definir' }))} />
                                      </div>
                                      <div>
                                        <label className="label">Fecha límite</label>
                                        <input type="date" className="input-field"
                                          value={editData.fechaLimite === 'por definir' ? '' : editData.fechaLimite}
                                          onChange={e => setEditData(d => ({ ...d, fechaLimite: e.target.value || 'por definir' }))} />
                                      </div>
                                      <div>
                                        <label className="label">Fecha real envío</label>
                                        <input type="date" className="input-field"
                                          value={editData.fechaRealEnvio || ''}
                                          onChange={e => setEditData(d => ({ ...d, fechaRealEnvio: e.target.value }))} />
                                      </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3">
                                      <div>
                                        <label className="label">Plazo contractual</label>
                                        <input className="input-field" value={editData.plazoContractual} onChange={e => setEditData(d => ({ ...d, plazoContractual: e.target.value }))} />
                                      </div>
                                      <div>
                                        <label className="label">Estado</label>
                                        <select className="input-field" value={editData.estado} onChange={e => setEditData(d => ({ ...d, estado: e.target.value as any }))}>
                                          <option value="pendiente">Pendiente</option>
                                          <option value="realizado">Realizado</option>
                                          <option value="vencido">Vencido</option>
                                        </select>
                                      </div>
                                      <div className="flex items-center gap-2 pt-5">
                                        <input type="checkbox" id={`critico-${h.id}`} checked={editData.esCritico}
                                          onChange={e => setEditData(d => ({ ...d, esCritico: e.target.checked }))} />
                                        <label htmlFor={`critico-${h.id}`} className="text-sm text-slate-300">Hito crítico ★</label>
                                      </div>
                                    </div>
                                    <div className="flex gap-2">
                                      <button onClick={() => guardarEdicion(h.id)} className="btn-primary text-xs">
                                        <Check className="w-3.5 h-3.5" /> Guardar
                                      </button>
                                      <button onClick={() => setEditando(null)} className="btn-secondary text-xs">
                                        <X className="w-3.5 h-3.5" /> Cancelar
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  // MODO DETALLE
                                  <div className="space-y-3">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                      <div className="col-span-2">
                                        <p className="text-slate-500 mb-0.5">Descripción</p>
                                        <p className="text-slate-200">{h.descripcion || '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-slate-500 mb-0.5">Plazo contractual</p>
                                        <p className="text-slate-200">{h.plazoContractual || '—'}</p>
                                      </div>
                                      <div>
                                        <p className="text-slate-500 mb-0.5">Hito crítico</p>
                                        <p className="text-slate-200">{h.esCritico ? '★ Sí' : 'No'}</p>
                                      </div>
                                    </div>

                                    {/* Entregables vinculados */}
                                    {entregablesVinculados.length > 0 && (
                                      <div className="border-t border-[#1e3a8a]/30 pt-3">
                                        <p className="text-slate-500 text-xs mb-2">Entregable(s) vinculado(s)</p>
                                        <div className="flex flex-wrap gap-2">
                                          {entregablesVinculados.map(e => (
                                            <a key={e.id} href={`/entregables?expandir=${e.id}`}
                                              className="text-xs bg-green-900/20 border border-green-700/30 text-green-400 px-2.5 py-1.5 rounded-lg hover:border-green-500 hover:bg-green-900/30 transition-colors flex items-center gap-1.5">
                                              <span className="font-mono">{e.numeroDocumento}</span>
                                              <span className="text-green-600">—</span>
                                              <span className="truncate max-w-32">{e.asunto}</span>
                                              <span>→</span>
                                            </a>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      </div>
            </div>

      {/* MODAL: Nuevo hito */}
      {modalNuevoHito && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalNuevoHito(false)}>
          <div className="modal-box">
            <div className="flex items-center justify-between p-6 border-b border-[#1e3a8a]/50">
              <h2 className="font-display font-semibold text-white flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-blue-400" /> Nuevo Hito
              </h2>
              <button onClick={() => setModalNuevoHito(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">N° de hito</label>
                  <input type="number" className="input-field" placeholder="Ej: 1" value={nuevoHito.numero || ''} onChange={e => setNuevoHito(d => ({ ...d, numero: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="label">Responsable</label>
                  <input className="input-field" value={nuevoHito.responsable} onChange={e => setNuevoHito(d => ({ ...d, responsable: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Nombre del hito *</label>
                  <input className="input-field" placeholder="Ej: Informe Técnico Mensual" value={nuevoHito.nombre} onChange={e => setNuevoHito(d => ({ ...d, nombre: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="label">Descripción</label>
                  <textarea className="input-field resize-none" rows={2} value={nuevoHito.descripcion} onChange={e => setNuevoHito(d => ({ ...d, descripcion: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Plazo contractual</label>
                  <input className="input-field" placeholder="Ej: 15 días cal." value={nuevoHito.plazoContractual} onChange={e => setNuevoHito(d => ({ ...d, plazoContractual: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Fecha inicio</label>
                  <input type="date" className="input-field" value={nuevoHito.fechaInicio} onChange={e => setNuevoHito(d => ({ ...d, fechaInicio: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Fecha límite</label>
                  <input type="date" className="input-field" value={nuevoHito.fechaLimite} onChange={e => setNuevoHito(d => ({ ...d, fechaLimite: e.target.value }))} />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input type="checkbox" id="critico-nuevo" checked={nuevoHito.esCritico} onChange={e => setNuevoHito(d => ({ ...d, esCritico: e.target.checked }))} />
                  <label htmlFor="critico-nuevo" className="text-sm text-slate-300">Hito crítico ★</label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 pb-6">
              <button onClick={() => setModalNuevoHito(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleCrearHito} className="btn-primary">
                <Plus className="w-4 h-4" /> Crear hito
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Importar */}
      {modalImportar && proyectoSeleccionado && (
        <ModalImportarHitos
          proyecto={proyectoSeleccionado}
          onClose={() => setModalImportar(false)}
          onSuccess={() => { setModalImportar(false); seleccionarProyecto(proyectoSeleccionado) }}
        />
      )}

    </div>
  )
}
