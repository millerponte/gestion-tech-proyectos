'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { formatearFecha } from '@/lib/db'
import {
  TrendingUp, Users, Calendar, FileSignature, Trophy,
  Plus, Search, Filter, Download, Pencil, Trash2, Check, X,
  ChevronDown, ChevronUp, Building2, Mail, Phone
} from 'lucide-react'
import {
  obtenerClientesVentas, crearClienteVentas, actualizarClienteVentas, eliminarClienteVentas,
  obtenerCitasVentas, crearCitaVentas, actualizarCitaVentas, eliminarCitaVentas,
  obtenerFirmasVentas, crearFirmaVentas, actualizarFirmaVentas, eliminarFirmaVentas,
  obtenerLicitacionesVentas, crearLicitacionVentas, actualizarLicitacionVentas, eliminarLicitacionVentas,
} from '@/lib/db'
import type {
  ClienteVentas, CitaVentas, FirmaVentas, LicitacionVentas,
  StatusPipeline, SectorCita, TipoFirma, ResultadoLicitacion
} from '@/types'

type Tab = 'pipeline' | 'citas' | 'firmas' | 'licitaciones'

const STATUS_COLORS: Record<StatusPipeline, string> = {
  nuevo:      'bg-blue-900/40 text-blue-300 border-blue-700/40',
  procesando: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  perdido:    'bg-red-900/40 text-red-300 border-red-700/40',
  realizado:  'bg-green-900/40 text-green-300 border-green-700/40',
}

const RESULTADO_COLORS: Record<ResultadoLicitacion, string> = {
  ganamos:    'bg-green-900/40 text-green-300 border-green-700/40',
  perdimos:   'bg-red-900/40 text-red-300 border-red-700/40',
  en_proceso: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  suspendido: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
}

const SEMAFORO = [
  { v: 1, label: 'Muy bajo', color: 'bg-slate-500' },
  { v: 2, label: 'Bajo',     color: 'bg-blue-500' },
  { v: 3, label: 'Medio',    color: 'bg-amber-500' },
  { v: 4, label: 'Alto',     color: 'bg-orange-500' },
  { v: 5, label: 'Urgente',  color: 'bg-red-500' },
]

function exportCSV(headers: string[], filas: any[][], nombre: string) {
  const csv = [headers, ...filas].map(f => f.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${nombre}_${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('Exportado correctamente')
}

export default function VentasPage() {
  const { isAdmin } = useAuth()
  const [tab, setTab] = useState<Tab>('pipeline')

  // ── Pipeline ────────────────────────────────────────────────────────────
  const [clientes, setClientes] = useState<ClienteVentas[]>([])
  const [loadingC, setLoadingC] = useState(true)
  const [busquedaC, setBusquedaC] = useState('')
  const [filtroStatusC, setFiltroStatusC] = useState('')
  const [filtroAñoC, setFiltroAñoC] = useState('')
  const [expandidoC, setExpandidoC] = useState<string | null>(null)
  const [editandoC, setEditandoC] = useState<string | null>(null)
  const [editDataC, setEditDataC] = useState<Partial<ClienteVentas>>({})
  const [modalNuevoC, setModalNuevoC] = useState(false)
  const [nuevoC, setNuevoC] = useState<Partial<ClienteVentas>>({ status: 'nuevo', semaforo: 3, año: '2026' })

  // ── Citas ───────────────────────────────────────────────────────────────
  const [citas, setCitas] = useState<CitaVentas[]>([])
  const [loadingCi, setLoadingCi] = useState(true)
  const [busquedaCi, setBusquedaCi] = useState('')
  const [filtroSectorCi, setFiltroSectorCi] = useState('')
  const [expandidoCi, setExpandidoCi] = useState<string | null>(null)
  const [editandoCi, setEditandoCi] = useState<string | null>(null)
  const [editDataCi, setEditDataCi] = useState<Partial<CitaVentas>>({})
  const [modalNuevoCi, setModalNuevoCi] = useState(false)
  const [nuevoCi, setNuevoCi] = useState<Partial<CitaVentas>>({ sector: 'gobierno' })

  // ── Firmas ──────────────────────────────────────────────────────────────
  const [firmas, setFirmas] = useState<FirmaVentas[]>([])
  const [loadingF, setLoadingF] = useState(true)
  const [busquedaF, setBusquedaF] = useState('')
  const [filtroEmpresaF, setFiltroEmpresaF] = useState('')
  const [expandidoF, setExpandidoF] = useState<string | null>(null)
  const [editandoF, setEditandoF] = useState<string | null>(null)
  const [editDataF, setEditDataF] = useState<Partial<FirmaVentas>>({})
  const [modalNuevoF, setModalNuevoF] = useState(false)
  const [nuevoF, setNuevoF] = useState<Partial<FirmaVentas>>({ tipoFirma: 'FM', empresa: 'OKINAWATEC' })

  // ── Licitaciones ────────────────────────────────────────────────────────
  const [licitaciones, setLicitaciones] = useState<LicitacionVentas[]>([])
  const [loadingL, setLoadingL] = useState(true)
  const [busquedaL, setBusquedaL] = useState('')
  const [filtroResultadoL, setFiltroResultadoL] = useState('')
  const [expandidoL, setExpandidoL] = useState<string | null>(null)
  const [editandoL, setEditandoL] = useState<string | null>(null)
  const [editDataL, setEditDataL] = useState<Partial<LicitacionVentas>>({})
  const [modalNuevoL, setModalNuevoL] = useState(false)
  const [nuevoL, setNuevoL] = useState<Partial<LicitacionVentas>>({ resultado: 'en_proceso', año: '2026', empresa: 'OKINAWATEC' })

  useEffect(() => { cargarTodo() }, [])

  const cargarTodo = async () => {
    setLoadingC(true); setLoadingCi(true); setLoadingF(true); setLoadingL(true)
    const [c, ci, f, l] = await Promise.all([
      obtenerClientesVentas(), obtenerCitasVentas(),
      obtenerFirmasVentas(), obtenerLicitacionesVentas()
    ])
    setClientes(c); setCitas(ci); setFirmas(f); setLicitaciones(l)
    setLoadingC(false); setLoadingCi(false); setLoadingF(false); setLoadingL(false)
  }

  // ── Exportar Pipeline ────────────────────────────────────────────────────
  const exportarPipeline = () => {
    exportCSV(
      ['Cliente', 'Contacto', 'Correo', 'Proyecto', 'Solución', 'Mayorista', 'Fecha Cotización', 'Semáforo', 'Status', 'Año', 'Detalle', 'Plan de Acción'],
      clientesFiltrados.map(c => [c.nombre, c.contacto, c.correo, c.proyecto, c.solucion, c.mayorista, c.fechaCotizacion, c.semaforo, c.status, c.año, c.detalle, c.planAccion]),
      'pipeline_ventas'
    )
  }

  const exportarCitas = () => {
    exportCSV(
      ['Cliente', 'Contacto', 'Correo', 'Cargo', 'Sector', 'Fecha Reunión', 'Horario', 'Solución', 'Status', 'Observaciones'],
      citasFiltradas.map(c => [c.cliente, c.contacto, c.correo, c.cargo, c.sector, c.fechaReunion, c.horario, c.solucion, c.statusProyecto, c.observaciones]),
      'citas_ventas'
    )
  }

  const exportarFirmas = () => {
    exportCSV(
      ['Cliente', 'Autorizado Por', 'Documento', 'Empresa', 'Fecha', 'Firmado Por', 'Tipo Firma', 'Proyecto', 'Enviado Por', 'Código', 'Observaciones'],
      firmasFiltradas.map(f => [f.cliente, f.autorizadoPor, f.documento, f.empresa, f.fecha, f.firmadoPor, f.tipoFirma, f.nombreProyecto, f.enviadoPor, f.codigo, f.observaciones]),
      'firmas_ventas'
    )
  }

  const exportarLicitaciones = () => {
    exportCSV(
      ['Entidad', 'Bases Integradas', 'Proceso', 'F. Presentación', 'F. Evaluación', 'Buena Pro', 'Consentimiento', 'F. Firma Contrato', 'Empresa', 'Resultado', 'Año', 'Observaciones'],
      licitacionesFiltradas.map(l => [l.entidad, l.basesIntegradas, l.proceso, l.fechaPresentacion, l.fechaFinEvaluacion, l.buenaPro, l.consentimiento, l.fechaFirmaContrato, l.empresa, l.resultado, l.año, l.observaciones]),
      'licitaciones_ventas'
    )
  }

  // ── Filtros ──────────────────────────────────────────────────────────────
  const clientesFiltrados = clientes.filter(c => {
    const q = busquedaC.toLowerCase()
    return (!q || c.nombre.toLowerCase().includes(q) || c.proyecto.toLowerCase().includes(q) || c.contacto.toLowerCase().includes(q)) &&
      (!filtroStatusC || c.status === filtroStatusC) &&
      (!filtroAñoC || c.año === filtroAñoC)
  })

  const citasFiltradas = citas.filter(c => {
    const q = busquedaCi.toLowerCase()
    return (!q || c.cliente.toLowerCase().includes(q) || c.contacto.toLowerCase().includes(q)) &&
      (!filtroSectorCi || c.sector === filtroSectorCi)
  })

  const firmasFiltradas = firmas.filter(f => {
    const q = busquedaF.toLowerCase()
    return (!q || f.cliente.toLowerCase().includes(q) || f.nombreProyecto.toLowerCase().includes(q) || f.codigo.toLowerCase().includes(q)) &&
      (!filtroEmpresaF || f.empresa === filtroEmpresaF)
  })

  const licitacionesFiltradas = licitaciones.filter(l => {
    const q = busquedaL.toLowerCase()
    return (!q || l.entidad.toLowerCase().includes(q) || l.proceso.toLowerCase().includes(q)) &&
      (!filtroResultadoL || l.resultado === filtroResultadoL)
  })

  const tabs = [
    { id: 'pipeline' as Tab, label: 'Pipeline', icon: <TrendingUp className="w-4 h-4" />, count: clientes.length },
    { id: 'citas' as Tab, label: 'Citas', icon: <Calendar className="w-4 h-4" />, count: citas.length },
    { id: 'firmas' as Tab, label: 'Firmas', icon: <FileSignature className="w-4 h-4" />, count: firmas.length },
    { id: 'licitaciones' as Tab, label: 'Licitaciones', icon: <Trophy className="w-4 h-4" />, count: licitaciones.length },
  ]

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-green-400" /> Ventas
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Pipeline, citas, firmas y licitaciones</p>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-blue-400" />
          <div>
            <p className="text-xl font-bold text-white">{clientes.filter(c => c.status === 'procesando').length}</p>
            <p className="text-xs text-slate-400">En proceso</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Check className="w-5 h-5 text-green-400" />
          <div>
            <p className="text-xl font-bold text-white">{clientes.filter(c => c.status === 'realizado').length}</p>
            <p className="text-xs text-slate-400">Realizados</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Trophy className="w-5 h-5 text-amber-400" />
          <div>
            <p className="text-xl font-bold text-white">{licitaciones.filter(l => l.resultado === 'ganamos').length}</p>
            <p className="text-xs text-slate-400">Licitaciones ganadas</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <Calendar className="w-5 h-5 text-cyan-400" />
          <div>
            <p className="text-xl font-bold text-white">{citas.length}</p>
            <p className="text-xs text-slate-400">Citas registradas</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0d1526] border border-[#1e3a8a]/50 rounded-xl p-1 w-fit flex-wrap">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={clsx('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white')}>
            {t.icon}{t.label}
            <span className={clsx('text-xs rounded-full px-1.5 py-0.5',
              tab === t.id ? 'bg-blue-500/50' : 'bg-slate-700/50 text-slate-500')}>
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* ── PIPELINE ─────────────────────────────────────────────────────── */}
      {tab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input-field pl-9" placeholder="Buscar cliente, proyecto..." value={busquedaC} onChange={e => setBusquedaC(e.target.value)} />
            </div>
            <select className="input-field w-auto min-w-32" value={filtroStatusC} onChange={e => setFiltroStatusC(e.target.value)}>
              <option value="">Todos los status</option>
              <option value="nuevo">Nuevo</option>
              <option value="procesando">Procesando</option>
              <option value="realizado">Realizado</option>
              <option value="perdido">Perdido</option>
            </select>
            <select className="input-field w-auto min-w-28" value={filtroAñoC} onChange={e => setFiltroAñoC(e.target.value)}>
              <option value="">Todos los años</option>
              <option value="2023-24">2023-24</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
            {(busquedaC || filtroStatusC || filtroAñoC) && (
              <button onClick={() => { setBusquedaC(''); setFiltroStatusC(''); setFiltroAñoC('') }} className="btn-secondary text-xs">
                <Filter className="w-3 h-3" /> Limpiar
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button onClick={exportarPipeline} className="btn-secondary text-xs">
                <Download className="w-4 h-4" /> Exportar Excel
              </button>
              {isAdmin && (
                <button onClick={() => setModalNuevoC(true)} className="btn-primary text-xs">
                  <Plus className="w-4 h-4" /> Nuevo cliente
                </button>
              )}
            </div>
          </div>

          {loadingC ? <Spinner /> : clientesFiltrados.length === 0 ? (
            <EmptyState icon={<Users className="w-12 h-12" />} text="No hay clientes en el pipeline" onAdd={isAdmin ? () => setModalNuevoC(true) : undefined} />
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0d1526] border-b border-[#1e3a8a]/50">
                    <tr>
                      <th className="tabla-header w-6"></th>
                      <th className="tabla-header">Cliente</th>
                      <th className="tabla-header">Proyecto / Solución</th>
                      <th className="tabla-header">Mayorista</th>
                      <th className="tabla-header">F. Cotización</th>
                      <th className="tabla-header">Sem.</th>
                      <th className="tabla-header">Año</th>
                      <th className="tabla-header">Status</th>
                      <th className="tabla-header"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientesFiltrados.map(c => (
                      <>
                        <tr key={c.id}
                          className={clsx('tabla-row', expandidoC === c.id && 'bg-[#1e3a8a]/10')}
                          onClick={() => setExpandidoC(expandidoC === c.id ? null : c.id)}>
                          <td className="tabla-cell text-slate-500">
                            {expandidoC === c.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </td>
                          <td className="tabla-cell">
                            <p className="text-sm text-slate-200 font-medium">{c.nombre}</p>
                            <p className="text-xs text-slate-500 truncate max-w-32">{c.contacto}</p>
                          </td>
                          <td className="tabla-cell">
                            <p className="text-xs text-slate-200 max-w-48 truncate">{c.proyecto}</p>
                            <p className="text-xs text-slate-500 truncate max-w-48">{c.solucion}</p>
                          </td>
                          <td className="tabla-cell text-xs text-slate-400">{c.mayorista || '—'}</td>
                          <td className="tabla-cell text-xs text-slate-400 whitespace-nowrap">{c.fechaCotizacion || '—'}</td>
                          <td className="tabla-cell">
                            <div className="flex gap-0.5">
                              {[1,2,3,4,5].map(i => (
                                <div key={i} className={clsx('w-2.5 h-2.5 rounded-sm', i <= c.semaforo ? SEMAFORO[c.semaforo-1]?.color : 'bg-slate-700')} />
                              ))}
                            </div>
                          </td>
                          <td className="tabla-cell text-xs text-slate-400">{c.año}</td>
                          <td className="tabla-cell">
                            <span className={clsx('text-xs px-2 py-0.5 rounded-full border', STATUS_COLORS[c.status])}>
                              {c.status}
                            </span>
                          </td>
                          <td className="tabla-cell" onClick={e => e.stopPropagation()}>
                            {isAdmin && (
                              <div className="flex gap-2">
                                <button onClick={() => { setExpandidoC(c.id); setEditandoC(c.id); setEditDataC({ ...c }) }}
                                  className="text-slate-500 hover:text-blue-400 transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={async () => {
                                  if (!confirm(`¿Eliminar "${c.nombre}"?`)) return
                                  await eliminarClienteVentas(c.id)
                                  toast.success('Eliminado')
                                  cargarTodo()
                                }} className="text-slate-500 hover:text-red-400 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {expandidoC === c.id && (
                          <tr key={`${c.id}-exp`} className="bg-[#0d1526]/80">
                            <td colSpan={9} className="px-6 py-4">
                              {editandoC === c.id ? (
                                <FormClienteVentas
                                  data={editDataC}
                                  onChange={setEditDataC}
                                  onSave={async () => {
                                    await actualizarClienteVentas(c.id, editDataC)
                                    toast.success('Actualizado')
                                    setEditandoC(null)
                                    cargarTodo()
                                  }}
                                  onCancel={() => setEditandoC(null)}
                                />
                              ) : (
                                <DetalleClienteVentas cliente={c} />
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
        </div>
      )}

      {/* ── CITAS ────────────────────────────────────────────────────────── */}
      {tab === 'citas' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input-field pl-9" placeholder="Buscar cliente, contacto..." value={busquedaCi} onChange={e => setBusquedaCi(e.target.value)} />
            </div>
            <select className="input-field w-auto min-w-36" value={filtroSectorCi} onChange={e => setFiltroSectorCi(e.target.value)}>
              <option value="">Todos los sectores</option>
              <option value="gobierno">Gobierno</option>
              <option value="privado">Privado</option>
              <option value="financiero">Financiero</option>
              <option value="educacion">Educación</option>
              <option value="otro">Otro</option>
            </select>
            {(busquedaCi || filtroSectorCi) && (
              <button onClick={() => { setBusquedaCi(''); setFiltroSectorCi('') }} className="btn-secondary text-xs">
                <Filter className="w-3 h-3" /> Limpiar
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button onClick={exportarCitas} className="btn-secondary text-xs">
                <Download className="w-4 h-4" /> Exportar Excel
              </button>
              {isAdmin && (
                <button onClick={() => setModalNuevoCi(true)} className="btn-primary text-xs">
                  <Plus className="w-4 h-4" /> Nueva cita
                </button>
              )}
            </div>
          </div>

          {loadingCi ? <Spinner /> : citasFiltradas.length === 0 ? (
            <EmptyState icon={<Calendar className="w-12 h-12" />} text="No hay citas registradas" onAdd={isAdmin ? () => setModalNuevoCi(true) : undefined} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {citasFiltradas.map(c => (
                <div key={c.id} className="card-hover flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{c.cliente}</p>
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full border mt-1 inline-block',
                        c.sector === 'gobierno' ? 'bg-blue-900/40 text-blue-300 border-blue-700/40' :
                        c.sector === 'privado' ? 'bg-green-900/40 text-green-300 border-green-700/40' :
                        c.sector === 'financiero' ? 'bg-amber-900/40 text-amber-300 border-amber-700/40' :
                        c.sector === 'educacion' ? 'bg-purple-900/40 text-purple-300 border-purple-700/40' :
                        'bg-slate-700/40 text-slate-300 border-slate-600/40'
                      )}>
                        {c.sector}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-1.5">
                        <button onClick={() => { setExpandidoCi(c.id); setEditandoCi(c.id); setEditDataCi({ ...c }) }}
                          className="text-slate-500 hover:text-blue-400 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={async () => {
                          if (!confirm(`¿Eliminar cita de "${c.cliente}"?`)) return
                          await eliminarCitaVentas(c.id)
                          toast.success('Eliminado'); cargarTodo()
                        }} className="text-slate-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 text-xs text-slate-400">
                    {c.contacto && <div className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-500" /><span className="truncate">{c.contacto}</span></div>}
                    {c.correo && <div className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-500" /><span className="truncate">{c.correo}</span></div>}
                    {c.cargo && <div className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-slate-500" /><span className="truncate">{c.cargo}</span></div>}
                  </div>
                  {(c.fechaReunion || c.horario) && (
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg px-3 py-2 text-xs">
                      <span className="text-blue-400">📅 {c.fechaReunion}</span>
                      {c.horario && <span className="text-slate-400 ml-2">— {c.horario}</span>}
                    </div>
                  )}
                  {c.solucion && <p className="text-xs text-cyan-400 truncate">💡 {c.solucion}</p>}
                  {c.observaciones && (
                    <p className="text-xs text-slate-500 line-clamp-2">{c.observaciones}</p>
                  )}
                  {editandoCi === c.id && (
                    <div className="border-t border-[#1e3a8a]/30 pt-3 mt-1">
                      <FormCitaVentas
                        data={editDataCi}
                        onChange={setEditDataCi}
                        onSave={async () => {
                          await actualizarCitaVentas(c.id, editDataCi)
                          toast.success('Actualizado')
                          setEditandoCi(null)
                          cargarTodo()
                        }}
                        onCancel={() => setEditandoCi(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FIRMAS ───────────────────────────────────────────────────────── */}
      {tab === 'firmas' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input-field pl-9" placeholder="Buscar cliente, proyecto, código..." value={busquedaF} onChange={e => setBusquedaF(e.target.value)} />
            </div>
            <select className="input-field w-auto min-w-36" value={filtroEmpresaF} onChange={e => setFiltroEmpresaF(e.target.value)}>
              <option value="">Todas las empresas</option>
              <option value="OKINAWATEC">Okinawatec</option>
              <option value="TECHSI">Tech Solutions</option>
              <option value="QUANTIC">Quantic</option>
            </select>
            {(busquedaF || filtroEmpresaF) && (
              <button onClick={() => { setBusquedaF(''); setFiltroEmpresaF('') }} className="btn-secondary text-xs">
                <Filter className="w-3 h-3" /> Limpiar
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button onClick={exportarFirmas} className="btn-secondary text-xs">
                <Download className="w-4 h-4" /> Exportar Excel
              </button>
              {isAdmin && (
                <button onClick={() => setModalNuevoF(true)} className="btn-primary text-xs">
                  <Plus className="w-4 h-4" /> Nueva firma
                </button>
              )}
            </div>
          </div>

          {loadingF ? <Spinner /> : firmasFiltradas.length === 0 ? (
            <EmptyState icon={<FileSignature className="w-12 h-12" />} text="No hay firmas registradas" onAdd={isAdmin ? () => setModalNuevoF(true) : undefined} />
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0d1526] border-b border-[#1e3a8a]/50">
                    <tr>
                      <th className="tabla-header w-6"></th>
                      <th className="tabla-header">Código</th>
                      <th className="tabla-header">Cliente</th>
                      <th className="tabla-header">Empresa</th>
                      <th className="tabla-header">Fecha</th>
                      <th className="tabla-header">Tipo</th>
                      <th className="tabla-header">Firmado por</th>
                      <th className="tabla-header">Enviado por</th>
                      <th className="tabla-header"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {firmasFiltradas.map(f => (
                      <>
                        <tr key={f.id}
                          className={clsx('tabla-row', expandidoF === f.id && 'bg-[#1e3a8a]/10')}
                          onClick={() => setExpandidoF(expandidoF === f.id ? null : f.id)}>
                          <td className="tabla-cell text-slate-500">
                            {expandidoF === f.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </td>
                          <td className="tabla-cell"><span className="font-mono text-cyan-400 text-xs">{f.codigo || '—'}</span></td>
                          <td className="tabla-cell text-sm text-slate-200">{f.cliente}</td>
                          <td className="tabla-cell">
                            <span className={clsx('text-xs px-2 py-0.5 rounded-full border',
                              f.empresa === 'OKINAWATEC' ? 'badge-okinawatec' :
                              f.empresa === 'TECHSI' ? 'badge-tech' : 'badge-quantic')}>
                              {f.empresa}
                            </span>
                          </td>
                          <td className="tabla-cell text-xs text-slate-400 whitespace-nowrap">{f.fecha}</td>
                          <td className="tabla-cell">
                            <span className={clsx('text-xs px-2 py-0.5 rounded-full border',
                              f.tipoFirma === 'FM' ? 'bg-blue-900/40 text-blue-300 border-blue-700/40' : 'bg-green-900/40 text-green-300 border-green-700/40')}>
                              {f.tipoFirma === 'FM' ? 'Manual' : 'Digital'}
                            </span>
                          </td>
                          <td className="tabla-cell text-xs text-slate-400">{f.firmadoPor || '—'}</td>
                          <td className="tabla-cell text-xs text-slate-400">{f.enviadoPor || '—'}</td>
                          <td className="tabla-cell" onClick={e => e.stopPropagation()}>
                            {isAdmin && (
                              <div className="flex gap-2">
                                <button onClick={() => { setExpandidoF(f.id); setEditandoF(f.id); setEditDataF({ ...f }) }}
                                  className="text-slate-500 hover:text-blue-400 transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={async () => {
                                  if (!confirm(`¿Eliminar firma "${f.codigo}"?`)) return
                                  await eliminarFirmaVentas(f.id)
                                  toast.success('Eliminado'); cargarTodo()
                                }} className="text-slate-500 hover:text-red-400 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {expandidoF === f.id && (
                          <tr key={`${f.id}-exp`} className="bg-[#0d1526]/80">
                            <td colSpan={9} className="px-6 py-4">
                              {editandoF === f.id ? (
                                <FormFirmaVentas
                                  data={editDataF}
                                  onChange={setEditDataF}
                                  onSave={async () => {
                                    await actualizarFirmaVentas(f.id, editDataF)
                                    toast.success('Actualizado')
                                    setEditandoF(null)
                                    cargarTodo()
                                  }}
                                  onCancel={() => setEditandoF(null)}
                                />
                              ) : (
                                <DetalleFirmaVentas firma={f} />
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
        </div>
      )}

      {/* ── LICITACIONES ─────────────────────────────────────────────────── */}
      {tab === 'licitaciones' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input-field pl-9" placeholder="Buscar entidad, proceso..." value={busquedaL} onChange={e => setBusquedaL(e.target.value)} />
            </div>
            <select className="input-field w-auto min-w-36" value={filtroResultadoL} onChange={e => setFiltroResultadoL(e.target.value)}>
              <option value="">Todos los resultados</option>
              <option value="ganamos">Ganamos</option>
              <option value="perdimos">Perdimos</option>
              <option value="en_proceso">En proceso</option>
              <option value="suspendido">Suspendido</option>
            </select>
            {(busquedaL || filtroResultadoL) && (
              <button onClick={() => { setBusquedaL(''); setFiltroResultadoL('') }} className="btn-secondary text-xs">
                <Filter className="w-3 h-3" /> Limpiar
              </button>
            )}
            <div className="flex gap-2 ml-auto">
              <button onClick={exportarLicitaciones} className="btn-secondary text-xs">
                <Download className="w-4 h-4" /> Exportar Excel
              </button>
              {isAdmin && (
                <button onClick={() => setModalNuevoL(true)} className="btn-primary text-xs">
                  <Plus className="w-4 h-4" /> Nueva licitación
                </button>
              )}
            </div>
          </div>

          {/* Resumen rápido */}
          <div className="grid grid-cols-4 gap-2">
            {(['ganamos', 'perdimos', 'en_proceso', 'suspendido'] as ResultadoLicitacion[]).map(r => (
              <div key={r} className={clsx('border rounded-lg p-3 text-center', RESULTADO_COLORS[r])}>
                <p className="text-xl font-bold text-white">{licitaciones.filter(l => l.resultado === r).length}</p>
                <p className="text-xs capitalize">{r.replace('_', ' ')}</p>
              </div>
            ))}
          </div>

          {loadingL ? <Spinner /> : licitacionesFiltradas.length === 0 ? (
            <EmptyState icon={<Trophy className="w-12 h-12" />} text="No hay licitaciones registradas" onAdd={isAdmin ? () => setModalNuevoL(true) : undefined} />
          ) : (
            <div className="card p-0 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0d1526] border-b border-[#1e3a8a]/50">
                    <tr>
                      <th className="tabla-header w-6"></th>
                      <th className="tabla-header">Entidad</th>
                      <th className="tabla-header">Proceso</th>
                      <th className="tabla-header">Empresa</th>
                      <th className="tabla-header">Buena Pro</th>
                      <th className="tabla-header">F. Firma</th>
                      <th className="tabla-header">Año</th>
                      <th className="tabla-header">Resultado</th>
                      <th className="tabla-header"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {licitacionesFiltradas.map(l => (
                      <>
                        <tr key={l.id}
                          className={clsx('tabla-row', expandidoL === l.id && 'bg-[#1e3a8a]/10')}
                          onClick={() => setExpandidoL(expandidoL === l.id ? null : l.id)}>
                          <td className="tabla-cell text-slate-500">
                            {expandidoL === l.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </td>
                          <td className="tabla-cell text-sm text-slate-200 font-medium">{l.entidad}</td>
                          <td className="tabla-cell text-xs text-slate-400 max-w-48">
                            <p className="truncate">{l.proceso}</p>
                          </td>
                          <td className="tabla-cell">
                            <span className={clsx('text-xs px-2 py-0.5 rounded-full border',
                              l.empresa?.includes('OKI') ? 'badge-okinawatec' :
                              l.empresa?.includes('TECH') ? 'badge-tech' : 'badge-quantic')}>
                              {l.empresa}
                            </span>
                          </td>
                          <td className="tabla-cell text-xs text-slate-400 whitespace-nowrap">{l.buenaPro || '—'}</td>
                          <td className="tabla-cell text-xs text-slate-400 whitespace-nowrap">{l.fechaFirmaContrato || '—'}</td>
                          <td className="tabla-cell text-xs text-slate-400">{l.año}</td>
                          <td className="tabla-cell">
                            <span className={clsx('text-xs px-2 py-0.5 rounded-full border', RESULTADO_COLORS[l.resultado])}>
                              {l.resultado.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="tabla-cell" onClick={e => e.stopPropagation()}>
                            {isAdmin && (
                              <div className="flex gap-2">
                                <button onClick={() => { setExpandidoL(l.id); setEditandoL(l.id); setEditDataL({ ...l }) }}
                                  className="text-slate-500 hover:text-blue-400 transition-colors">
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={async () => {
                                  if (!confirm(`¿Eliminar "${l.entidad}"?`)) return
                                  await eliminarLicitacionVentas(l.id)
                                  toast.success('Eliminado'); cargarTodo()
                                }} className="text-slate-500 hover:text-red-400 transition-colors">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                        {expandidoL === l.id && (
                          <tr key={`${l.id}-exp`} className="bg-[#0d1526]/80">
                            <td colSpan={9} className="px-6 py-4">
                              {editandoL === l.id ? (
                                <FormLicitacionVentas
                                  data={editDataL}
                                  onChange={setEditDataL}
                                  onSave={async () => {
                                    await actualizarLicitacionVentas(l.id, editDataL)
                                    toast.success('Actualizado')
                                    setEditandoL(null)
                                    cargarTodo()
                                  }}
                                  onCancel={() => setEditandoL(null)}
                                />
                              ) : (
                                <DetalleLicitacionVentas licitacion={l} />
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
        </div>
      )}

      {/* ── MODALES NUEVO ────────────────────────────────────────────────── */}
      {modalNuevoC && (
        <Modal title="Nuevo Cliente en Pipeline" onClose={() => setModalNuevoC(false)}>
          <FormClienteVentas
            data={nuevoC}
            onChange={setNuevoC}
            onSave={async () => {
              if (!nuevoC.nombre?.trim()) { toast.error('Ingresa el nombre del cliente'); return }
              await crearClienteVentas({ ...nuevoC as any, createdAt: new Date().toISOString() })
              toast.success('Cliente agregado')
              setModalNuevoC(false)
              setNuevoC({ status: 'nuevo', semaforo: 3, año: '2026' })
              cargarTodo()
            }}
            onCancel={() => setModalNuevoC(false)}
          />
        </Modal>
      )}

      {modalNuevoCi && (
        <Modal title="Nueva Cita" onClose={() => setModalNuevoCi(false)}>
          <FormCitaVentas
            data={nuevoCi}
            onChange={setNuevoCi}
            onSave={async () => {
              if (!nuevoCi.cliente?.trim()) { toast.error('Ingresa el nombre del cliente'); return }
              await crearCitaVentas({ ...nuevoCi as any, createdAt: new Date().toISOString() })
              toast.success('Cita agregada')
              setModalNuevoCi(false)
              setNuevoCi({ sector: 'gobierno' })
              cargarTodo()
            }}
            onCancel={() => setModalNuevoCi(false)}
          />
        </Modal>
      )}

      {modalNuevoF && (
        <Modal title="Nueva Firma" onClose={() => setModalNuevoF(false)}>
          <FormFirmaVentas
            data={nuevoF}
            onChange={setNuevoF}
            onSave={async () => {
              if (!nuevoF.cliente?.trim()) { toast.error('Ingresa el cliente'); return }
              await crearFirmaVentas({ ...nuevoF as any, createdAt: new Date().toISOString() })
              toast.success('Firma registrada')
              setModalNuevoF(false)
              setNuevoF({ tipoFirma: 'FM', empresa: 'OKINAWATEC' })
              cargarTodo()
            }}
            onCancel={() => setModalNuevoF(false)}
          />
        </Modal>
      )}

      {modalNuevoL && (
        <Modal title="Nueva Licitación" onClose={() => setModalNuevoL(false)}>
          <FormLicitacionVentas
            data={nuevoL}
            onChange={setNuevoL}
            onSave={async () => {
              if (!nuevoL.entidad?.trim()) { toast.error('Ingresa la entidad'); return }
              await crearLicitacionVentas({ ...nuevoL as any, createdAt: new Date().toISOString() })
              toast.success('Licitación registrada')
              setModalNuevoL(false)
              setNuevoL({ resultado: 'en_proceso', año: '2026', empresa: 'OKINAWATEC' })
              cargarTodo()
            }}
            onCancel={() => setModalNuevoL(false)}
          />
        </Modal>
      )}
    </div>
  )
}

// ── Componentes auxiliares ────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function EmptyState({ icon, text, onAdd }: { icon: React.ReactNode; text: string; onAdd?: () => void }) {
  return (
    <div className="card text-center py-16">
      <div className="w-12 h-12 text-slate-600 mx-auto mb-3">{icon}</div>
      <p className="text-slate-400">{text}</p>
      {onAdd && (
        <button onClick={onAdd} className="btn-primary mx-auto mt-4">
          <Plus className="w-4 h-4" /> Agregar primero
        </button>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a8a]/50">
          <h2 className="font-display font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Formularios ───────────────────────────────────────────────────────────────

function FormClienteVentas({ data, onChange, onSave, onCancel }: {
  data: Partial<ClienteVentas>
  onChange: (d: Partial<ClienteVentas>) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="label">Cliente *</label><input className="input-field" value={data.nombre || ''} onChange={e => onChange({ ...data, nombre: e.target.value })} /></div>
        <div><label className="label">Contacto</label><input className="input-field" value={data.contacto || ''} onChange={e => onChange({ ...data, contacto: e.target.value })} /></div>
        <div><label className="label">Correo</label><input className="input-field" value={data.correo || ''} onChange={e => onChange({ ...data, correo: e.target.value })} /></div>
        <div className="col-span-2"><label className="label">Nombre del Proyecto</label><input className="input-field" value={data.proyecto || ''} onChange={e => onChange({ ...data, proyecto: e.target.value })} /></div>
        <div><label className="label">Solución Propuesta</label><input className="input-field" value={data.solucion || ''} onChange={e => onChange({ ...data, solucion: e.target.value })} /></div>
        <div><label className="label">Mayorista</label><input className="input-field" value={data.mayorista || ''} onChange={e => onChange({ ...data, mayorista: e.target.value })} /></div>
        <div><label className="label">Fecha Cotización</label><input className="input-field" placeholder="dd/mm/yyyy" value={data.fechaCotizacion || ''} onChange={e => onChange({ ...data, fechaCotizacion: e.target.value })} /></div>
        <div>
          <label className="label">Semáforo (prioridad)</label>
          <select className="input-field" value={data.semaforo || 3} onChange={e => onChange({ ...data, semaforo: Number(e.target.value) })}>
            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n} — {SEMAFORO[n-1].label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Status</label>
          <select className="input-field" value={data.status || 'nuevo'} onChange={e => onChange({ ...data, status: e.target.value as StatusPipeline })}>
            <option value="nuevo">Nuevo</option>
            <option value="procesando">Procesando</option>
            <option value="realizado">Realizado</option>
            <option value="perdido">Perdido</option>
          </select>
        </div>
        <div>
          <label className="label">Año</label>
          <select className="input-field" value={data.año || '2026'} onChange={e => onChange({ ...data, año: e.target.value })}>
            <option value="2023-24">2023-24</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>
        <div className="col-span-2"><label className="label">Detalle</label><textarea className="input-field resize-none" rows={2} value={data.detalle || ''} onChange={e => onChange({ ...data, detalle: e.target.value })} /></div>
        <div className="col-span-2"><label className="label">Plan de Acción</label><textarea className="input-field resize-none" rows={2} value={data.planAccion || ''} onChange={e => onChange({ ...data, planAccion: e.target.value })} /></div>
      </div>
      <div className="flex gap-2"><button onClick={onSave} className="btn-primary text-xs"><Check className="w-3.5 h-3.5" /> Guardar</button><button onClick={onCancel} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /> Cancelar</button></div>
    </div>
  )
}

function DetalleClienteVentas({ cliente: c }: { cliente: ClienteVentas }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
      {c.contacto && <div><p className="text-slate-500">Contacto</p><p className="text-slate-200">{c.contacto}</p></div>}
      {c.correo && <div><p className="text-slate-500">Correo</p><p className="text-slate-200">{c.correo}</p></div>}
      {c.mayorista && <div><p className="text-slate-500">Mayorista</p><p className="text-slate-200">{c.mayorista}</p></div>}
      {c.fechaCotizacion && <div><p className="text-slate-500">Fecha Cotización</p><p className="text-slate-200">{c.fechaCotizacion}</p></div>}
      {c.proyecto && <div className="col-span-2"><p className="text-slate-500">Proyecto</p><p className="text-slate-200">{c.proyecto}</p></div>}
      {c.solucion && <div className="col-span-2"><p className="text-slate-500">Solución</p><p className="text-slate-200">{c.solucion}</p></div>}
      {c.detalle && <div className="col-span-3"><p className="text-slate-500">Detalle</p><p className="text-slate-200">{c.detalle}</p></div>}
      {c.planAccion && <div className="col-span-3"><p className="text-slate-500">Plan de Acción</p><p className="text-slate-200">{c.planAccion}</p></div>}
    </div>
  )
}

function FormCitaVentas({ data, onChange, onSave, onCancel }: {
  data: Partial<CitaVentas>
  onChange: (d: Partial<CitaVentas>) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="label">Cliente *</label><input className="input-field" value={data.cliente || ''} onChange={e => onChange({ ...data, cliente: e.target.value })} /></div>
        <div><label className="label">Contacto</label><input className="input-field" value={data.contacto || ''} onChange={e => onChange({ ...data, contacto: e.target.value })} /></div>
        <div><label className="label">Correo</label><input className="input-field" value={data.correo || ''} onChange={e => onChange({ ...data, correo: e.target.value })} /></div>
        <div className="col-span-2"><label className="label">Cargo</label><input className="input-field" value={data.cargo || ''} onChange={e => onChange({ ...data, cargo: e.target.value })} /></div>
        <div>
          <label className="label">Sector</label>
          <select className="input-field" value={data.sector || 'gobierno'} onChange={e => onChange({ ...data, sector: e.target.value as SectorCita })}>
            <option value="gobierno">Gobierno</option>
            <option value="privado">Privado</option>
            <option value="financiero">Financiero</option>
            <option value="educacion">Educación</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div><label className="label">Fecha Reunión</label><input className="input-field" placeholder="dd/mm/yyyy" value={data.fechaReunion || ''} onChange={e => onChange({ ...data, fechaReunion: e.target.value })} /></div>
        <div><label className="label">Horario</label><input className="input-field" placeholder="Ej: 3:00 pm" value={data.horario || ''} onChange={e => onChange({ ...data, horario: e.target.value })} /></div>
        <div><label className="label">Solución Propuesta</label><input className="input-field" value={data.solucion || ''} onChange={e => onChange({ ...data, solucion: e.target.value })} /></div>
        <div><label className="label">Status del Proyecto</label><input className="input-field" value={data.statusProyecto || ''} onChange={e => onChange({ ...data, statusProyecto: e.target.value })} /></div>
        <div className="col-span-2"><label className="label">Observaciones</label><textarea className="input-field resize-none" rows={2} value={data.observaciones || ''} onChange={e => onChange({ ...data, observaciones: e.target.value })} /></div>
      </div>
      <div className="flex gap-2"><button onClick={onSave} className="btn-primary text-xs"><Check className="w-3.5 h-3.5" /> Guardar</button><button onClick={onCancel} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /> Cancelar</button></div>
    </div>
  )
}

function FormFirmaVentas({ data, onChange, onSave, onCancel }: {
  data: Partial<FirmaVentas>
  onChange: (d: Partial<FirmaVentas>) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Cliente *</label><input className="input-field" value={data.cliente || ''} onChange={e => onChange({ ...data, cliente: e.target.value })} /></div>
        <div><label className="label">Autorizado Por</label><input className="input-field" value={data.autorizadoPor || ''} onChange={e => onChange({ ...data, autorizadoPor: e.target.value })} /></div>
        <div><label className="label">Tipo Documento</label><input className="input-field" placeholder="Ej: Anexos y file, Adenda..." value={data.documento || ''} onChange={e => onChange({ ...data, documento: e.target.value })} /></div>
        <div>
          <label className="label">Empresa</label>
          <select className="input-field" value={data.empresa || 'OKINAWATEC'} onChange={e => onChange({ ...data, empresa: e.target.value })}>
            <option value="OKINAWATEC">OKINAWATEC</option>
            <option value="TECHSI">TECHSI</option>
            <option value="QUANTIC">QUANTIC</option>
          </select>
        </div>
        <div><label className="label">Fecha</label><input className="input-field" placeholder="dd/mm/yyyy" value={data.fecha || ''} onChange={e => onChange({ ...data, fecha: e.target.value })} /></div>
        <div><label className="label">Firmado Por</label><input className="input-field" value={data.firmadoPor || ''} onChange={e => onChange({ ...data, firmadoPor: e.target.value })} /></div>
        <div>
          <label className="label">Tipo Firma</label>
          <select className="input-field" value={data.tipoFirma || 'FM'} onChange={e => onChange({ ...data, tipoFirma: e.target.value as TipoFirma })}>
            <option value="FM">FM — Manual</option>
            <option value="FD">FD — Digital</option>
          </select>
        </div>
        <div><label className="label">Código</label><input className="input-field" placeholder="Ej: ANEX-001, FMT-001..." value={data.codigo || ''} onChange={e => onChange({ ...data, codigo: e.target.value })} /></div>
        <div className="col-span-2"><label className="label">Nombre del Proyecto</label><input className="input-field" value={data.nombreProyecto || ''} onChange={e => onChange({ ...data, nombreProyecto: e.target.value })} /></div>
        <div><label className="label">Enviado Por</label><input className="input-field" value={data.enviadoPor || ''} onChange={e => onChange({ ...data, enviadoPor: e.target.value })} /></div>
        <div className="col-span-2"><label className="label">Observaciones</label><textarea className="input-field resize-none" rows={2} value={data.observaciones || ''} onChange={e => onChange({ ...data, observaciones: e.target.value })} /></div>
      </div>
      <div className="flex gap-2"><button onClick={onSave} className="btn-primary text-xs"><Check className="w-3.5 h-3.5" /> Guardar</button><button onClick={onCancel} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /> Cancelar</button></div>
    </div>
  )
}

function DetalleFirmaVentas({ firma: f }: { firma: FirmaVentas }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
      {f.autorizadoPor && <div><p className="text-slate-500">Autorizado Por</p><p className="text-slate-200">{f.autorizadoPor}</p></div>}
      {f.documento && <div><p className="text-slate-500">Documento</p><p className="text-slate-200">{f.documento}</p></div>}
      {f.firmadoPor && <div><p className="text-slate-500">Firmado Por</p><p className="text-slate-200">{f.firmadoPor}</p></div>}
      {f.enviadoPor && <div><p className="text-slate-500">Enviado Por</p><p className="text-slate-200">{f.enviadoPor}</p></div>}
      {f.nombreProyecto && <div className="col-span-3"><p className="text-slate-500">Nombre del Proyecto</p><p className="text-slate-200">{f.nombreProyecto}</p></div>}
      {f.observaciones && <div className="col-span-3"><p className="text-slate-500">Observaciones</p><p className="text-slate-200">{f.observaciones}</p></div>}
    </div>
  )
}

function FormLicitacionVentas({ data, onChange, onSave, onCancel }: {
  data: Partial<LicitacionVentas>
  onChange: (d: Partial<LicitacionVentas>) => void
  onSave: () => void
  onCancel: () => void
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Entidad *</label><input className="input-field" value={data.entidad || ''} onChange={e => onChange({ ...data, entidad: e.target.value })} /></div>
        <div>
          <label className="label">Empresa</label>
          <select className="input-field" value={data.empresa || 'OKINAWATEC'} onChange={e => onChange({ ...data, empresa: e.target.value })}>
            <option value="OKINAWATEC">OKINAWATEC</option>
            <option value="TECHSI">TECHSI</option>
            <option value="QUANTIC">QUANTIC</option>
          </select>
        </div>
        <div className="col-span-2"><label className="label">Proceso / Nombre</label><input className="input-field" value={data.proceso || ''} onChange={e => onChange({ ...data, proceso: e.target.value })} /></div>
        <div><label className="label">Bases Integradas</label><input className="input-field" placeholder="dd/mm/yyyy" value={data.basesIntegradas || ''} onChange={e => onChange({ ...data, basesIntegradas: e.target.value })} /></div>
        <div><label className="label">F. Presentación Oferta</label><input className="input-field" placeholder="dd/mm/yyyy" value={data.fechaPresentacion || ''} onChange={e => onChange({ ...data, fechaPresentacion: e.target.value })} /></div>
        <div><label className="label">F. Fin Evaluación</label><input className="input-field" placeholder="dd/mm/yyyy" value={data.fechaFinEvaluacion || ''} onChange={e => onChange({ ...data, fechaFinEvaluacion: e.target.value })} /></div>
        <div><label className="label">Buena Pro</label><input className="input-field" placeholder="dd/mm/yyyy" value={data.buenaPro || ''} onChange={e => onChange({ ...data, buenaPro: e.target.value })} /></div>
        <div><label className="label">Consentimiento</label><input className="input-field" placeholder="dd/mm/yyyy" value={data.consentimiento || ''} onChange={e => onChange({ ...data, consentimiento: e.target.value })} /></div>
        <div><label className="label">F. Firma Contrato</label><input className="input-field" placeholder="dd/mm/yyyy" value={data.fechaFirmaContrato || ''} onChange={e => onChange({ ...data, fechaFirmaContrato: e.target.value })} /></div>
        <div>
          <label className="label">Resultado</label>
          <select className="input-field" value={data.resultado || 'en_proceso'} onChange={e => onChange({ ...data, resultado: e.target.value as ResultadoLicitacion })}>
            <option value="en_proceso">En proceso</option>
            <option value="ganamos">Ganamos</option>
            <option value="perdimos">Perdimos</option>
            <option value="suspendido">Suspendido</option>
          </select>
        </div>
        <div>
          <label className="label">Año</label>
          <select className="input-field" value={data.año || '2026'} onChange={e => onChange({ ...data, año: e.target.value })}>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </div>
        <div className="col-span-2"><label className="label">Observaciones</label><textarea className="input-field resize-none" rows={2} value={data.observaciones || ''} onChange={e => onChange({ ...data, observaciones: e.target.value })} /></div>
      </div>
      <div className="flex gap-2"><button onClick={onSave} className="btn-primary text-xs"><Check className="w-3.5 h-3.5" /> Guardar</button><button onClick={onCancel} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /> Cancelar</button></div>
    </div>
  )
}

function DetalleLicitacionVentas({ licitacion: l }: { licitacion: LicitacionVentas }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
      {l.basesIntegradas && <div><p className="text-slate-500">Bases Integradas</p><p className="text-slate-200">{l.basesIntegradas}</p></div>}
      {l.fechaPresentacion && <div><p className="text-slate-500">F. Presentación</p><p className="text-slate-200">{l.fechaPresentacion}</p></div>}
      {l.fechaFinEvaluacion && <div><p className="text-slate-500">F. Evaluación</p><p className="text-slate-200">{l.fechaFinEvaluacion}</p></div>}
      {l.buenaPro && <div><p className="text-slate-500">Buena Pro</p><p className="text-slate-200">{l.buenaPro}</p></div>}
      {l.consentimiento && <div><p className="text-slate-500">Consentimiento</p><p className="text-slate-200">{l.consentimiento}</p></div>}
      {l.fechaFirmaContrato && <div><p className="text-slate-500">F. Firma Contrato</p><p className="text-slate-200">{l.fechaFirmaContrato}</p></div>}
      {l.proceso && <div className="col-span-4"><p className="text-slate-500">Proceso</p><p className="text-slate-200">{l.proceso}</p></div>}
      {l.observaciones && <div className="col-span-4"><p className="text-slate-500">Observaciones</p><p className="text-slate-200">{l.observaciones}</p></div>}
    </div>
  )
}
