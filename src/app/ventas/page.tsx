'use client'

import { useEffect, useState, Fragment } from 'react'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import {
  obtenerClientes, obtenerClientesVentas, crearClienteVentas, actualizarClienteVentas, eliminarClienteVentas,
  obtenerCitasVentas, crearCitaVentas, actualizarCitaVentas, eliminarCitaVentas,
  obtenerFirmasVentas, crearFirmaVentas, actualizarFirmaVentas, eliminarFirmaVentas,
  obtenerLicitacionesVentas, crearLicitacionVentas, actualizarLicitacionVentas, eliminarLicitacionVentas,
  obtenerPendientesVentas, crearPendienteVenta, actualizarPendienteVenta, eliminarPendienteVenta,
  registrarLog, hoy, formatearFecha
} from '@/lib/db'
import type { Cliente, ClienteVentas, CitaVentas, FirmaVentas, LicitacionVentas, PendienteVenta, StatusPipeline, HistorialNota } from '@/types'
import {
  TrendingUp, Calendar, FileSignature, Trophy, Plus, Search, Download,
  Pencil, Trash2, Check, X, ChevronDown, ChevronUp, Clock, AlertCircle, ArrowRight, MessageSquare
} from 'lucide-react'
import { isToday, isThisWeek, isThisMonth, isThisYear, parseISO } from 'date-fns'

type Tab = 'pipeline' | 'citas' | 'firmas' | 'licitaciones'
type RangoFiltro = 'hoy' | 'semana' | 'mes' | 'año' | 'todo'

const STATUS_COLORS: Record<string, string> = {
  nuevo: 'bg-blue-900/40 text-blue-300 border-blue-700/40',
  procesando: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  perdido: 'bg-red-900/40 text-red-300 border-red-700/40',
  realizado: 'bg-green-900/40 text-green-300 border-green-700/40',
}

const RESULTADO_COLORS: Record<string, string> = {
  ganamos: 'bg-green-900/40 text-green-300 border-green-700/40',
  perdimos: 'bg-red-900/40 text-red-300 border-red-700/40',
  en_proceso: 'bg-amber-900/40 text-amber-300 border-amber-700/40',
  suspendido: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
}

const OPCIONES_ANIOS = (() => {
  const anios = ['2023', '2023-24']
  const currentYear = new Date().getFullYear()
  for (let y = 2025; y <= currentYear + 1; y++) anios.push(y.toString())
  return anios
})()

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

const formatSafe = (fecha?: string) => {
  if (!fecha) return '—'
  return fecha.includes('-') ? formatearFecha(fecha) : fecha
}

const checkYear = (fecha: string | undefined, filtro: string) => {
  if (!filtro || filtro === 'todos') return true
  if (!fecha) return false
  const year = fecha.split('-')[0]
  if (filtro === '2023-24') return year === '2023' || year === '2024'
  return year === filtro
}

const getFechaHora = (fecha?: string, hora?: string) => {
  if (!fecha) return '9999-12-31T23:59:59'
  const h = hora ? hora : '23:59'
  return `${fecha}T${h}:00`
}

const isVencido = (fecha?: string, horario?: string) => {
  if (!fecha) return false
  return new Date(getFechaHora(fecha, horario)) < new Date()
}

export default function VentasPage() {
  const { usuario, isAdmin } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pipeline')
  const [globalClientes, setGlobalClientes] = useState<Cliente[]>([])
  const [rangoDashboard, setRangoDashboard] = useState<RangoFiltro>('mes')

  const currentYearStr = new Date().getFullYear().toString()

  // ── ESTADOS DE COLECCIONES ──────────────────────────────────────────────
  const [pendientesManuales, setPendientesManuales] = useState<PendienteVenta[]>([])
  const [clientes, setClientes] = useState<ClienteVentas[]>([])
  const [citas, setCitas] = useState<CitaVentas[]>([])
  const [firmas, setFirmas] = useState<FirmaVentas[]>([])
  const [licitaciones, setLicitaciones] = useState<LicitacionVentas[]>([])

  // ── ESTADOS DE BUSQUEDA Y FILTROS ───────────────────────────────────────
  const [busquedaC, setBusquedaC] = useState(''); const [filtroStatusC, setFiltroStatusC] = useState(''); const [filtroAñoC, setFiltroAñoC] = useState(currentYearStr)
  const [expandidoC, setExpandidoC] = useState<string | null>(null); const [editandoC, setEditandoC] = useState<string | null>(null); const [editDataC, setEditDataC] = useState<Partial<ClienteVentas>>({})
  const [modalNuevoC, setModalNuevoC] = useState(false); const [nuevoC, setNuevoC] = useState<Partial<ClienteVentas>>({ status: 'nuevo', año: currentYearStr, fechaCotizacion: hoy() })

  const [busquedaCi, setBusquedaCi] = useState(''); const [filtroSectorCi, setFiltroSectorCi] = useState(''); const [filtroAñoCi, setFiltroAñoCi] = useState(currentYearStr)
  const [expandidoCi, setExpandidoCi] = useState<string | null>(null); const [editandoCi, setEditandoCi] = useState<string | null>(null); const [editDataCi, setEditDataCi] = useState<Partial<CitaVentas>>({})
  const [modalNuevoCi, setModalNuevoCi] = useState(false); const [nuevoCi, setNuevoCi] = useState<Partial<CitaVentas>>({ sector: 'gobierno', status: 'pendiente', fechaReunion: hoy(), empresa: 'OKINAWATEC' })

  const [busquedaF, setBusquedaF] = useState(''); const [filtroAñoF, setFiltroAñoF] = useState(currentYearStr)
  const [expandidoF, setExpandidoF] = useState<string | null>(null); const [editandoF, setEditandoF] = useState<string | null>(null); const [editDataF, setEditDataF] = useState<Partial<FirmaVentas>>({})
  const [modalNuevoF, setModalNuevoF] = useState(false); const [nuevoF, setNuevoF] = useState<Partial<FirmaVentas>>({ empresa: 'OKINAWATEC', autorizadoPor: 'Luis Matienzo', fecha: hoy(), tipoFirma: 'FM (Firma Manual)', medioEntrega: 'Presencial', estado: 'pendiente' })

  const [busquedaL, setBusquedaL] = useState(''); const [filtroAñoL, setFiltroAñoL] = useState(currentYearStr)
  const [expandidoL, setExpandidoL] = useState<string | null>(null); const [editandoL, setEditandoL] = useState<string | null>(null); const [editDataL, setEditDataL] = useState<Partial<LicitacionVentas>>({})
  const [modalNuevoL, setModalNuevoL] = useState(false); const [nuevoL, setNuevoL] = useState<Partial<LicitacionVentas>>({ resultado: 'en_proceso', empresa: 'OKINAWATEC', basesIntegradas: hoy(), fechaPresentacion: hoy() })

  // Modales de Pendientes Globales
  const [modalNuevoPendiente, setModalNuevoPendiente] = useState(false)
  const [nuevoPendiente, setNuevoPendiente] = useState<Partial<PendienteVenta>>({ fechaInicio: hoy(), seccionVinculada: 'ninguna' })
  const [modalEditarPendiente, setModalEditarPendiente] = useState(false)
  const [editPendiente, setEditPendiente] = useState<Partial<PendienteVenta>>({})
  const [citaResolver, setCitaResolver] = useState<CitaVentas | null>(null)

  useEffect(() => { initMódulo() }, [])

  const initMódulo = async () => {
    const gc = await obtenerClientes(); setGlobalClientes(gc)
    const p = await obtenerClientesVentas(); setClientes(p)
    const c = await obtenerCitasVentas(); setCitas(c)
    const f = await obtenerFirmasVentas(); setFirmas(f)
    const l = await obtenerLicitacionesVentas(); setLicitaciones(l)
    const pend = await obtenerPendientesVentas(); setPendientesManuales(pend)
  }

  const agregarHistorialGlobal = async (id: string, campo: 'historialStatus' | 'historialPlan', arr: HistorialNota[], val: string, esFirma: boolean = false) => {
    if (!val.trim()) return
    const nuevoHistorial = [...(arr || []), { fecha: hoy(), nota: val.trim() }]
    if (esFirma) await actualizarFirmaVentas(id, { historialStatus: nuevoHistorial })
    else await actualizarClienteVentas(id, { [campo]: nuevoHistorial })
    toast.success('Nota agregada')
    initMódulo()
  }

  const getStatusCita = (c: CitaVentas) => {
    if (c.status === 'pendiente' && isVencido(c.fechaReunion, c.horario)) return 'vencido'
    return c.status
  }

  const evaluarFecha = (fechaStr: string, rango: RangoFiltro): boolean => {
    if (!fechaStr || rango === 'todo') return true
    try {
      const date = parseISO(fechaStr)
      if (rango === 'hoy') return isToday(date); if (rango === 'semana') return isThisWeek(date, { weekStartsOn: 1 })
      if (rango === 'mes') return isThisMonth(date); if (rango === 'año') return isThisYear(date)
    } catch { return false }
    return false
  }

  // ── Unificación para el Dashboard de Pendientes ─────────────────────────
  const unificarPendientes = () => {
    const arr: any[] = []
    
    // Citas que son pendientes
    citas.forEach(c => {
      const st = getStatusCita(c)
      if (st === 'pendiente' || st === 'vencido') {
        arr.push({ id: c.id, tipoDoc: 'cita', titulo: c.cliente, subtitulo: `Cita Programada: ${c.solucion || 'Reunión'}`, fechaOrden: c.fechaReunion, horario: c.horario, esVencido: st === 'vencido', original: c, isCitaMain: true })
      }
    })

    // Pendientes manuales activos
    pendientesManuales.forEach(p => {
      if (p.estado === 'pendiente') {
        const vencido = isVencido(p.fechaLimite)
        arr.push({ 
          id: p.id, tipoDoc: 'pendiente_manual', titulo: p.nombre, 
          subtitulo: p.seccionVinculada !== 'ninguna' ? `${p.seccionVinculada.toUpperCase()} - ${p.registroVinculadoNombre}` : 'Pendiente General', 
          fechaOrden: p.fechaLimite, esVencido: vencido, original: p, 
          vinculo: p.seccionVinculada !== 'ninguna' ? { tab: p.seccionVinculada, recordId: p.registroVinculadoId } : null 
        })
      }
    })
    
    return arr.filter(x => evaluarFecha(x.fechaOrden, rangoDashboard)).sort((a, b) => getFechaHora(a.fechaOrden, a.horario).localeCompare(getFechaHora(b.fechaOrden, b.horario)))
  }

  const unificarRealizados = () => {
    const arr: any[] = []
    citas.forEach(c => { if (c.status === 'realizado') arr.push({ id: c.id, tipoDoc: 'cita', titulo: c.cliente, subtitulo: 'Cita completada', fechaOrden: c.fechaReunion, original: c }) })
    pendientesManuales.forEach(p => { if (p.estado === 'realizado') arr.push({ id: p.id, tipoDoc: 'pendiente_manual', titulo: p.nombre, subtitulo: 'Pendiente resuelto', fechaOrden: p.fechaLimite, original: p }) })
    return arr.filter(x => evaluarFecha(x.fechaOrden, rangoDashboard)).sort((a, b) => getFechaHora(b.fechaOrden, b.horario).localeCompare(getFechaHora(a.fechaOrden, a.horario)))
  }

  const listaPendientes = unificarPendientes()
  const listaRealizadas = unificarRealizados()

  const handleResolverPendienteManual = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await actualizarPendienteVenta(id, { estado: 'realizado' })
    toast.success('Pendiente completado')
    initMódulo()
  }

  const handleClickPendienteRow = (p: any) => {
    if (p.tipoDoc === 'cita') {
      setCitaResolver(p.original)
    } else {
      if (p.vinculo) {
        setTab(p.vinculo.tab)
        if (p.vinculo.tab === 'pipeline') { setExpandidoC(p.vinculo.recordId); setEditandoC(p.vinculo.recordId); setEditDataC(clientes.find(x => x.id === p.vinculo.recordId) || {}) }
        else if (p.vinculo.tab === 'citas') { setExpandidoCi(p.vinculo.recordId); setEditandoCi(p.vinculo.recordId); setEditDataCi(citas.find(x => x.id === p.vinculo.recordId) || {}) }
        else if (p.vinculo.tab === 'firmas') { setExpandidoF(p.vinculo.recordId); setEditandoF(p.vinculo.recordId); setEditDataF(firmas.find(x => x.id === p.vinculo.recordId) || {}) }
        else if (p.vinculo.tab === 'licitaciones') { setExpandidoL(p.vinculo.recordId); setEditandoL(p.vinculo.recordId); setEditDataL(licitaciones.find(x => x.id === p.vinculo.recordId) || {}) }
      } else {
        setEditPendiente(p.original)
        setModalEditarPendiente(true)
      }
    }
  }

  const exportarPipeline = () => exportCSV(['Cliente', 'Contacto', 'Teléfono', 'Correo', 'Proyecto', 'Solución', 'Mayorista', 'Fecha Cotización', 'Estado', 'Historial Status', 'Historial Plan', 'Año'], clientesFiltrados.map(c => [c.nombre, c.contacto, c.telefono, c.correo, c.proyecto, c.solucion, c.mayorista, formatSafe(c.fechaCotizacion), c.status, c.historialStatus?.map(h => `[${formatSafe(h.fecha)}] ${h.nota}`).join(' | '), c.historialPlan?.map(h => `[${formatSafe(h.fecha)}] ${h.nota}`).join(' | '), c.año]), 'pipeline_ventas')
  const exportarCitas = () => exportCSV(['Cliente', 'Empresa', 'Contacto', 'Correo', 'Cargo', 'Sector', 'Fecha Reunión', 'Horario', 'Solución', 'Status Proyecto', 'Estado Cita', 'Observaciones'], citasFiltradas.map(c => [c.cliente, c.empresa, c.contacto, c.correo, c.cargo, c.sector, formatSafe(c.fechaReunion), c.horario, c.solucion, c.statusProyecto, getStatusCita(c), c.observaciones]), 'citas_ventas')
  const exportarFirmas = () => exportCSV(['Código', 'Cliente', 'Empresa', 'Fecha', 'Tipo de Firma', 'Medio de Entrega', 'Autorizado Por', 'Firmado Por', 'Enviado Por', 'Documento(s)', 'Proyecto', 'Historial', 'Observaciones'], firmasFiltradas.map(f => [f.codigo, f.cliente, f.empresa, formatSafe(f.fecha), f.tipoFirma, f.medioEntrega, f.autorizadoPor, f.firmadoPor, f.enviadoPor, f.documento, f.nombreProyecto, f.historialStatus?.map(h => `[${formatSafe(h.fecha)}] ${h.nota}`).join(' | '), f.observaciones]), 'firmas_ventas')
  const exportarLicitaciones = () => exportCSV(['Entidad', 'Empresa', 'Proyecto', 'Bases Integradas', 'F. Presentación', 'F. Evaluación', 'Buena Pro', 'Consentimiento', 'F. Firma Contrato', 'Resultado', 'Observaciones/Detalle'], licitacionesFiltradas.map(l => [l.entidad, l.empresa, l.proceso, formatSafe(l.basesIntegradas), formatSafe(l.fechaPresentacion), formatSafe(l.fechaFinEvaluacion), formatSafe(l.buenaPro), formatSafe(l.consentimiento), formatSafe(l.fechaFirmaContrato), l.resultado, l.observaciones]), 'licitaciones_ventas')

  const clientesFiltrados = clientes.filter(c => (!busquedaC || c.nombre.toLowerCase().includes(busquedaC.toLowerCase())) && (!filtroStatusC || c.status === filtroStatusC) && checkYear(c.fechaCotizacion, filtroAñoC))
  const citasFiltradas = citas.filter(c => (!busquedaCi || c.cliente.toLowerCase().includes(busquedaCi.toLowerCase())) && (!filtroSectorCi || c.sector === filtroSectorCi) && checkYear(c.fechaReunion, filtroAñoCi))
  const firmasFiltradas = firmas.filter(f => (!busquedaF || f.cliente.toLowerCase().includes(busquedaF.toLowerCase()) || f.codigo.toLowerCase().includes(busquedaF.toLowerCase())) && checkYear(f.fecha, filtroAñoF))
  const licitacionesFiltradas = licitaciones.filter(l => (!busquedaL || l.entidad.toLowerCase().includes(busquedaL.toLowerCase()) || l.proceso.toLowerCase().includes(busquedaL.toLowerCase())) && checkYear(l.fechaPresentacion, filtroAñoL))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2"><TrendingUp className="w-6 h-6 text-emerald-400" /> Inteligencia Comercial & Ventas</h1>
          <p className="text-slate-400 text-sm mt-1">Pipeline unificado y flujo de prospección estructurado</p>
        </div>
        <div className="flex bg-dark-800 border border-slate-700 rounded-lg p-0.5 text-xs">
          {(['hoy', 'semana', 'mes', 'año', 'todo'] as RangoFiltro[]).map(r => (
            <button key={r} onClick={() => setRangoDashboard(r)} className={clsx("px-3 py-1.5 rounded capitalize", rangoDashboard === r ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white")}>{r}</button>
          ))}
        </div>
      </div>

      {/* DASHBOARD SUPERIOR */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* PENDIENTES */}
        <div className="card border-amber-500/30 bg-amber-950/10 p-4 flex flex-col h-64">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-amber-400 font-semibold text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> Pendientes Generales ({listaPendientes.length})</h3>
            <button onClick={() => setModalNuevoPendiente(true)} className="bg-amber-600 hover:bg-amber-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-all shadow-lg shadow-amber-900/20">
              <Plus className="w-3.5 h-3.5" /> Agregar Pendiente
            </button>
          </div>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {listaPendientes.map(p => (
              <div key={p.id + p.tipoDoc} className="bg-dark-800 p-2.5 rounded border border-slate-700 flex justify-between items-center text-xs hover:border-amber-500/50 cursor-pointer" onClick={() => handleClickPendienteRow(p)}>
                <div className="flex-1 min-w-0 pr-2">
                  <p className={clsx("font-bold truncate", p.esVencido ? "text-red-400" : "text-white")}>{p.titulo}</p>
                  <p className="text-slate-400 truncate">{p.subtitulo}</p>
                  <p className="text-amber-500/80 font-mono mt-0.5">Límite: {formatSafe(p.fechaOrden)} {p.horario ? `(${p.horario})` : ''}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={clsx("px-2 py-0.5 rounded-full scale-90 border whitespace-nowrap", p.esVencido ? "bg-red-900/40 text-red-300 border-red-800" : "bg-amber-900/40 text-amber-300 border-amber-800")}>{p.esVencido ? 'Vencido' : 'Pendiente'}</span>
                  {p.tipoDoc === 'pendiente_manual' && (
                    <button onClick={(e) => handleResolverPendienteManual(p.id, e)} className="p-1.5 bg-green-900/30 hover:bg-green-600/50 text-green-400 rounded-lg transition-colors" title="Marcar como resuelto">
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {listaPendientes.length === 0 && <p className="text-slate-500 text-xs">No hay pendientes.</p>}
          </div>
        </div>

        {/* REALIZADOS */}
        <div className="card border-green-500/30 bg-green-950/10 p-4 flex flex-col h-64">
          <h3 className="text-green-400 font-semibold text-sm flex items-center gap-2 mb-3"><Check className="w-4 h-4" /> Gestiones Realizadas ({listaRealizadas.length})</h3>
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {listaRealizadas.map(p => (
              <div key={p.id + p.tipoDoc} className="bg-dark-800 p-2.5 rounded border border-slate-700 flex justify-between items-center text-xs hover:border-green-500/50 cursor-pointer" onClick={() => handleClickPendienteRow(p)}>
                <div><p className="font-bold text-white">{p.titulo}</p><p className="text-slate-400">{p.subtitulo} el {formatSafe(p.fechaOrden)}</p></div>
                <span className="bg-green-900/40 text-green-300 border border-green-800 px-2 py-0.5 rounded-full scale-90">Realizado</span>
              </div>
            ))}
            {listaRealizadas.length === 0 && <p className="text-slate-500 text-xs">No hay realizados.</p>}
          </div>
        </div>
      </div>

      <div className="flex gap-1 bg-[#0d1526] border border-[#1e3a8a]/50 rounded-xl p-1 w-fit">
        {([['pipeline', 'Pipeline'], ['citas', 'Citas'], ['firmas', 'Firmas'], ['licitaciones', 'Licitaciones']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === id ? 'bg-blue-600 text-white' : 'text-slate-400')}>{label}</button>
        ))}
      </div>

      {/* ── PIPELINE ─────────────────────────────────────────────────────── */}
      {tab === 'pipeline' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input-field pl-9" placeholder="Buscar cliente..." value={busquedaC} onChange={e => setBusquedaC(e.target.value)} /></div>
            <select className="input-field w-auto min-w-32" value={filtroStatusC} onChange={e => setFiltroStatusC(e.target.value)}><option value="">Todos los estados</option><option value="nuevo">Nuevo</option><option value="procesando">Procesando</option><option value="realizado">Realizado</option><option value="perdido">Perdido</option></select>
            <select className="input-field w-auto min-w-32" value={filtroAñoC} onChange={e => setFiltroAñoC(e.target.value)}>
              <option value="todos">Todos los años</option>
              {OPCIONES_ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex gap-2 ml-auto"><button onClick={exportarPipeline} className="btn-secondary text-xs"><Download className="w-4 h-4" /> Exportar</button>{isAdmin && <button onClick={() => setModalNuevoC(true)} className="btn-primary text-xs"><Plus className="w-4 h-4" /> Nuevo cliente</button>}</div>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0d1526] border-b border-[#1e3a8a]/50">
                <tr><th className="tabla-header w-6"></th><th className="tabla-header">Cliente</th><th className="tabla-header">Proyecto / Solución</th><th className="tabla-header">F. Cotización</th><th className="tabla-header">Estado</th><th className="tabla-header"></th></tr>
              </thead>
              <tbody>
                {clientesFiltrados.map(c => (
                  <Fragment key={c.id}>
                    <tr className="tabla-row" onClick={() => setExpandidoC(expandidoC === c.id ? null : c.id)}>
                      <td className="tabla-cell text-slate-500">{expandidoC === c.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</td>
                      <td className="tabla-cell"><p className="text-sm font-medium">{c.nombre}</p><p className="text-xs text-slate-500">{c.contacto}</p></td>
                      <td className="tabla-cell"><p className="text-xs">{c.proyecto}</p><p className="text-xs text-slate-500">{c.solucion}</p></td>
                      <td className="tabla-cell text-xs">{formatSafe(c.fechaCotizacion)}</td>
                      <td className="tabla-cell"><span className={clsx('text-xs px-2 py-0.5 rounded-full border', STATUS_COLORS[c.status])}>{c.status}</span></td>
                      <td className="tabla-cell" onClick={e => e.stopPropagation()}>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button onClick={() => { setExpandidoC(c.id); setEditandoC(c.id); setEditDataC({ ...c }) }} className="text-slate-500 hover:text-blue-400"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={async () => { if (confirm('¿Eliminar?')) { await eliminarClienteVentas(c.id); initMódulo() } }} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandidoC === c.id && (
                      <tr className="bg-[#0d1526]/80">
                        <td colSpan={6} className="p-4">
                          {editandoC === c.id ? (
                            <FormClienteVentas data={editDataC} globalClientes={globalClientes} onChange={setEditDataC} onSave={async (val: boolean) => { await actualizarClienteVentas(c.id, editDataC); toast.success('Actualizado'); setEditandoC(null); initMódulo() }} onCancel={() => setEditandoC(null)} router={router} />
                          ) : (
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div><p className="text-slate-500">Contacto</p><p>{c.contacto || '—'}</p></div>
                              <div><p className="text-slate-500">Teléfono / Celular</p><p className="font-mono text-cyan-400">{c.telefono || '—'}</p></div>
                              <div><p className="text-slate-500">Correo</p><p>{c.correo || '—'}</p></div>
                              <div><p className="text-slate-500">Mayorista</p><p>{c.mayorista || '—'}</p></div>
                              <div><p className="text-slate-500">Año</p><p>{c.año}</p></div>
                              <div>
                                <p className="text-slate-500 mb-1">Estado General</p>
                                <select className="input-field py-1 text-xs max-w-[150px]" value={c.status} onChange={async (e) => { await actualizarClienteVentas(c.id, { status: e.target.value as StatusPipeline }); toast.success('Estado actualizado'); initMódulo() }}>
                                  <option value="nuevo">Nuevo</option><option value="procesando">Procesando</option><option value="realizado">Realizado</option><option value="perdido">Perdido</option>
                                </select>
                              </div>

                              <div className="col-span-3 pt-3 border-t border-slate-700">
                                <p className="text-slate-500 mb-2 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5"/> Historial de Status del Proyecto</p>
                                <div className="space-y-2 mb-3 max-h-32 overflow-y-auto pr-2">
                                  {c.historialStatus?.map((h, i) => <div key={i} className="bg-dark-800 p-2 rounded border border-slate-700"><span className="text-cyan-400 font-mono mr-2">[{formatSafe(h.fecha)}]</span><span className="text-slate-300">{h.nota}</span></div>)}
                                </div>
                                <div className="flex gap-2">
                                  <input id={`st-pipe-${c.id}`} className="input-field flex-1" placeholder="Nuevo status..." onKeyDown={(e) => { if (e.key === 'Enter') { agregarHistorialGlobal(c.id, 'historialStatus', c.historialStatus || [], e.currentTarget.value); e.currentTarget.value = '' } }} />
                                  <button onClick={() => { const inp = document.getElementById(`st-pipe-${c.id}`) as HTMLInputElement; agregarHistorialGlobal(c.id, 'historialStatus', c.historialStatus || [], inp.value); inp.value = '' }} className="btn-secondary text-xs">Agregar</button>
                                </div>
                              </div>

                              <div className="col-span-3 pt-3 border-t border-slate-700">
                                <p className="text-slate-500 mb-2 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5"/> Historial de Plan de Acción</p>
                                <div className="space-y-2 mb-3 max-h-32 overflow-y-auto pr-2">
                                  {c.historialPlan?.map((h, i) => <div key={i} className="bg-dark-800 p-2 rounded border border-slate-700"><span className="text-green-400 font-mono mr-2">[{formatSafe(h.fecha)}]</span><span className="text-slate-300">{h.nota}</span></div>)}
                                </div>
                                <div className="flex gap-2">
                                  <input id={`pl-pipe-${c.id}`} className="input-field flex-1" placeholder="Nuevo plan de acción..." onKeyDown={(e) => { if (e.key === 'Enter') { agregarHistorialGlobal(c.id, 'historialPlan', c.historialPlan || [], e.currentTarget.value); e.currentTarget.value = '' } }} />
                                  <button onClick={() => { const inp = document.getElementById(`pl-pipe-${c.id}`) as HTMLInputElement; agregarHistorialGlobal(c.id, 'historialPlan', c.historialPlan || [], inp.value); inp.value = '' }} className="btn-secondary text-xs">Agregar</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── CITAS ────────────────────────────────────────────────────────── */}
      {tab === 'citas' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input-field pl-9" placeholder="Buscar cita..." value={busquedaCi} onChange={e => setBusquedaCi(e.target.value)} /></div>
            <select className="input-field w-auto min-w-36" value={filtroSectorCi} onChange={e => setFiltroSectorCi(e.target.value)}><option value="">Todos los sectores</option><option value="gobierno">Gobierno</option><option value="privado">Privado</option><option value="financiero">Financiero</option><option value="educacion">Educación</option><option value="otro">Otro</option></select>
            <select className="input-field w-auto min-w-32" value={filtroAñoCi} onChange={e => setFiltroAñoCi(e.target.value)}>
              <option value="todos">Todos los años</option>
              {OPCIONES_ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex gap-2 ml-auto"><button onClick={exportarCitas} className="btn-secondary text-xs"><Download className="w-4 h-4" /> Exportar</button>{isAdmin && <button onClick={() => setModalNuevoCi(true)} className="btn-primary text-xs"><Plus className="w-4 h-4" /> Nueva cita</button>}</div>
          </div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0d1526] border-b border-[#1e3a8a]/50">
                <tr><th className="tabla-header w-6"></th><th className="tabla-header">Cliente</th><th className="tabla-header">Contacto</th><th className="tabla-header">Fecha / Horario</th><th className="tabla-header">Estado Cita</th><th className="tabla-header"></th></tr>
              </thead>
              <tbody>
                {citasFiltradas.map(c => {
                  const cStatus = getStatusCita(c)
                  return (
                    <Fragment key={c.id}>
                      <tr className="tabla-row" onClick={() => setExpandidoCi(expandidoCi === c.id ? null : c.id)}>
                        <td className="tabla-cell text-slate-500">{expandidoCi === c.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</td>
                        <td className="tabla-cell font-medium">{c.cliente} <span className="text-xs text-slate-500 block">{c.empresa}</span></td>
                        <td className="tabla-cell text-xs">{c.contacto} <span className="text-slate-500">({c.correo})</span></td>
                        <td className="tabla-cell text-xs font-mono text-cyan-400">{formatSafe(c.fechaReunion)} — {c.horario}</td>
                        <td className="tabla-cell"><span className={clsx("px-2 py-0.5 rounded border text-xs", cStatus === 'realizado' ? "bg-green-900/40 text-green-300 border-green-800" : cStatus === 'cancelado' || cStatus === 'vencido' ? "bg-red-900/40 text-red-300 border-red-800" : "bg-amber-900/40 text-amber-300 border-amber-800")}>{cStatus}</span></td>
                        <td className="tabla-cell" onClick={e => e.stopPropagation()}>
                          {isAdmin && (
                            <div className="flex gap-2">
                              <button onClick={() => { setExpandidoCi(c.id); setEditandoCi(c.id); setEditDataCi({ ...c }) }} className="text-slate-500 hover:text-blue-400"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={async () => { if (confirm('¿Eliminar?')) { await eliminarCitaVentas(c.id); initMódulo() } }} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandidoCi === c.id && (
                        <tr className="bg-[#0d1526]/80">
                          <td colSpan={6} className="p-4">
                            {editandoCi === c.id ? (
                              <FormCitaVentas data={editDataCi} globalClientes={globalClientes} onChange={setEditDataCi} isCreating={false} onSave={async (val: boolean) => { await actualizarCitaVentas(c.id, editDataCi); toast.success('Actualizado'); setEditandoCi(null); initMódulo() }} onCancel={() => setEditandoCi(null)} router={router} />
                            ) : (
                              <div className="grid grid-cols-3 gap-4 text-xs">
                                <div><p className="text-slate-500">Sector</p><p className="uppercase">{c.sector}</p></div>
                                <div><p className="text-slate-500">Cargo</p><p>{c.cargo || '—'}</p></div>
                                <div><p className="text-slate-500">Solución Propuesta</p><p>{c.solucion || '—'}</p></div>
                                <div><p className="text-slate-500">Status Proyecto</p><p>{c.statusProyecto || '—'}</p></div>
                                <div className="col-span-2"><p className="text-slate-500">Observaciones</p><p>{c.observaciones || '—'}</p></div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── FIRMAS ───────────────────────────────────────────────────────── */}
      {tab === 'firmas' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input-field pl-9" placeholder="Buscar firma..." value={busquedaF} onChange={e => setBusquedaF(e.target.value)} /></div>
            <select className="input-field w-auto min-w-32" value={filtroAñoF} onChange={e => setFiltroAñoF(e.target.value)}>
              <option value="todos">Todos los años</option>
              {OPCIONES_ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex gap-2 ml-auto"><button onClick={exportarFirmas} className="btn-secondary text-xs"><Download className="w-4 h-4" /> Exportar</button>{isAdmin && <button onClick={() => setModalNuevoF(true)} className="btn-primary text-xs"><Plus className="w-4 h-4" /> Nueva firma</button>}</div>
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0d1526] border-b border-[#1e3a8a]/50">
                <tr><th className="tabla-header w-6"></th><th className="tabla-header">Código</th><th className="tabla-header">Cliente</th><th className="tabla-header">Empresa</th><th className="tabla-header">Fecha</th><th className="tabla-header">Documento(s)</th><th className="tabla-header"></th></tr>
              </thead>
              <tbody>
                {firmasFiltradas.map(f => (
                  <Fragment key={f.id}>
                    <tr className="tabla-row" onClick={() => setExpandidoF(expandidoF === f.id ? null : f.id)}>
                      <td className="tabla-cell text-slate-500">{expandidoF === f.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</td>
                      <td className="tabla-cell text-xs font-mono text-cyan-400">{f.codigo}</td>
                      <td className="tabla-cell font-medium">{f.cliente}</td>
                      <td className="tabla-cell"><span className={clsx('text-xs px-2 py-0.5 rounded-full border', f.empresa === 'OKINAWATEC' ? 'badge-okinawatec' : f.empresa === 'TECHSI' ? 'badge-tech' : 'badge-quantic')}>{f.empresa}</span></td>
                      <td className="tabla-cell text-xs">{formatSafe(f.fecha)}</td>
                      <td className="tabla-cell text-xs text-slate-400 truncate max-w-[150px]">{f.documento}</td>
                      <td className="tabla-cell" onClick={e => e.stopPropagation()}>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button onClick={() => { setExpandidoF(f.id); setEditandoF(f.id); setEditDataF({ ...f, tiposSeleccionados: f.documento?.split(' + ') || [] } as any) }} className="text-slate-500 hover:text-blue-400"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={async () => { if (confirm('¿Eliminar?')) { await eliminarFirmaVentas(f.id); initMódulo() } }} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandidoF === f.id && (
                      <tr className="bg-[#0d1526]/80">
                        <td colSpan={7} className="p-4">
                          {editandoF === f.id ? (
                            <FormFirmaVentas data={editDataF} globalClientes={globalClientes} onChange={setEditDataF} firmasExistentes={firmas} onSave={async (val: boolean) => { await actualizarFirmaVentas(f.id, processFirma(editDataF, firmas)); toast.success('Actualizado'); setEditandoF(null); initMódulo() }} onCancel={() => setEditandoF(null)} router={router} />
                          ) : (
                            <div className="grid grid-cols-3 gap-4 text-xs">
                              <div><p className="text-slate-500">Tipo de Firma</p><p>{f.tipoFirma || '—'}</p></div>
                              <div><p className="text-slate-500">Medio de Entrega</p><p>{f.medioEntrega || '—'}</p></div>
                              <div><p className="text-slate-500">Autorizado Por</p><p>{f.autorizadoPor || '—'}</p></div>
                              <div><p className="text-slate-500">Firmado Por</p><p>{f.firmadoPor || '—'}</p></div>
                              <div><p className="text-slate-500">Enviado Por</p><p>{f.enviadoPor || '—'}</p></div>
                              <div className="col-span-3"><p className="text-slate-500">Proyecto</p><p>{f.nombreProyecto || '—'}</p></div>
                              <div className="col-span-3"><p className="text-slate-500">Observaciones</p><p>{f.observaciones || '—'}</p></div>

                              <div className="col-span-3 pt-3 border-t border-slate-700">
                                <p className="text-slate-500 mb-2 flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5"/> Historial de Status</p>
                                <div className="space-y-2 mb-3 max-h-32 overflow-y-auto pr-2">
                                  {f.historialStatus?.map((h, i) => <div key={i} className="bg-dark-800 p-2 rounded border border-slate-700"><span className="text-cyan-400 font-mono mr-2">[{formatSafe(h.fecha)}]</span><span className="text-slate-300">{h.nota}</span></div>)}
                                </div>
                                <div className="flex gap-2">
                                  <input id={`st-firma-${f.id}`} className="input-field flex-1" placeholder="Nuevo status de firma..." onKeyDown={(e) => { if (e.key === 'Enter') { agregarHistorialGlobal(f.id, 'historialStatus', f.historialStatus || [], e.currentTarget.value, true); e.currentTarget.value = '' } }} />
                                  <button onClick={() => { const inp = document.getElementById(`st-firma-${f.id}`) as HTMLInputElement; agregarHistorialGlobal(f.id, 'historialStatus', f.historialStatus || [], inp.value, true); inp.value = '' }} className="btn-secondary text-xs">Agregar</button>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── LICITACIONES ─────────────────────────────────────────────────── */}
      {tab === 'licitaciones' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input className="input-field pl-9" placeholder="Buscar entidad o proceso..." value={busquedaL} onChange={e => setBusquedaL(e.target.value)} /></div>
            <select className="input-field w-auto min-w-32" value={filtroAñoL} onChange={e => setFiltroAñoL(e.target.value)}>
              <option value="todos">Todos los años</option>
              {OPCIONES_ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <div className="flex gap-2 ml-auto"><button onClick={exportarLicitaciones} className="btn-secondary text-xs"><Download className="w-4 h-4" /> Exportar</button>{isAdmin && <button onClick={() => setModalNuevoL(true)} className="btn-primary text-xs"><Plus className="w-4 h-4" /> Nueva licitación</button>}</div>
          </div>

          <div className="card p-0 overflow-hidden">
            <table className="w-full">
              <thead className="bg-[#0d1526] border-b border-[#1e3a8a]/50">
                <tr><th className="tabla-header w-6"></th><th className="tabla-header">Entidad</th><th className="tabla-header">Empresa</th><th className="tabla-header">Proyecto</th><th className="tabla-header">F. Presentación</th><th className="tabla-header">Resultado</th><th className="tabla-header"></th></tr>
              </thead>
              <tbody>
                {licitacionesFiltradas.map(l => (
                  <Fragment key={l.id}>
                    <tr className="tabla-row" onClick={() => setExpandidoL(expandidoL === l.id ? null : l.id)}>
                      <td className="tabla-cell text-slate-500">{expandidoL === l.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}</td>
                      <td className="tabla-cell font-medium">{l.entidad}</td>
                      <td className="tabla-cell"><span className={clsx('text-xs px-2 py-0.5 rounded-full border', l.empresa?.includes('OKI') ? 'badge-okinawatec' : l.empresa?.includes('TECH') ? 'badge-tech' : 'badge-quantic')}>{l.empresa}</span></td>
                      <td className="tabla-cell"><p className="text-xs text-slate-200 whitespace-normal break-words max-w-64">{l.proceso}</p></td>
                      <td className="tabla-cell text-xs">{formatSafe(l.fechaPresentacion)}</td>
                      <td className="tabla-cell"><span className={clsx('text-xs px-2 py-0.5 rounded-full border', RESULTADO_COLORS[l.resultado])}>{l.resultado.replace('_', ' ')}</span></td>
                      <td className="tabla-cell" onClick={e => e.stopPropagation()}>
                        {isAdmin && (
                          <div className="flex gap-2">
                            <button onClick={() => { setExpandidoL(l.id); setEditandoL(l.id); setEditDataL({ ...l }) }} className="text-slate-500 hover:text-blue-400"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={async () => { if (confirm('¿Eliminar?')) { await eliminarLicitacionVentas(l.id); initMódulo() } }} className="text-slate-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {expandidoL === l.id && (
                      <tr className="bg-[#0d1526]/80">
                        <td colSpan={7} className="p-4">
                          {editandoL === l.id ? (
                            <FormLicitacionVentas data={editDataL} globalClientes={globalClientes} onChange={setEditDataL} onSave={async (val: boolean) => { await actualizarLicitacionVentas(l.id, editDataL); toast.success('Actualizado'); setEditandoL(null); initMódulo() }} onCancel={() => setEditandoL(null)} router={router} />
                          ) : (
                            <div className="grid grid-cols-4 gap-4 text-xs">
                              <div><p className="text-slate-500">Bases Integradas</p><p>{formatSafe(l.basesIntegradas)}</p></div>
                              <div><p className="text-slate-500">F. Evaluación</p><p>{formatSafe(l.fechaFinEvaluacion)}</p></div>
                              <div><p className="text-slate-500">Buena Pro</p><p>{formatSafe(l.buenaPro)}</p></div>
                              <div><p className="text-slate-500">Consentimiento</p><p>{formatSafe(l.consentimiento)}</p></div>
                              <div><p className="text-slate-500">Firma Contrato</p><p>{formatSafe(l.fechaFirmaContrato)}</p></div>
                              <div className="col-span-4"><p className="text-slate-500">Observaciones / Detalle Fechas</p><p>{l.observaciones || '—'}</p></div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODALES NUEVO ────────────────────────────────────────────────── */}
      {modalNuevoC && (
        <ModalVentas title="Registrar Cliente en Pipeline" onClose={() => setModalNuevoC(false)}>
          <FormClienteVentas data={nuevoC} globalClientes={globalClientes} onChange={setNuevoC} router={router}
            onSave={async (clienteValidado: boolean) => {
              if (!clienteValidado) { toast.error('Selecciona un cliente válido del directorio'); return }
              await crearClienteVentas({ ...nuevoC as any, nombre: nuevoC.nombre, createdAt: new Date().toISOString() })
              if (usuario) await registrarLog(usuario.uid, usuario.nombre, 'Ventas', `Agregó a pipeline: ${nuevoC.nombre}`)
              toast.success('Cliente agregado')
              setModalNuevoC(false); setNuevoC({ status: 'nuevo', año: new Date().getFullYear().toString(), fechaCotizacion: hoy() }); initMódulo()
            }} onCancel={() => setModalNuevoC(false)} />
        </ModalVentas>
      )}

      {modalNuevoCi && (
        <ModalVentas title="Agendar Nueva Cita" onClose={() => setModalNuevoCi(false)}>
          <FormCitaVentas data={nuevoCi} globalClientes={globalClientes} onChange={setNuevoCi} router={router} isCreating={true}
            onSave={async (clienteValidado: boolean) => {
              if (!clienteValidado) { toast.error('Selecciona un cliente válido'); return }
              await crearCitaVentas({ ...nuevoCi as any, cliente: nuevoCi.cliente, status: 'pendiente', createdAt: new Date().toISOString() })
              if (usuario) await registrarLog(usuario.uid, usuario.nombre, 'Ventas', `Registró cita con: ${nuevoCi.cliente}`)
              toast.success('Cita agendada')
              setModalNuevoCi(false); setNuevoCi({ sector: 'gobierno', status: 'pendiente', fechaReunion: hoy(), empresa: 'OKINAWATEC' }); initMódulo()
            }} onCancel={() => setModalNuevoCi(false)} />
        </ModalVentas>
      )}

      {modalNuevoF && (
        <ModalVentas title="Registrar Firma" onClose={() => setModalNuevoF(false)}>
          <FormFirmaVentas data={nuevoF} globalClientes={globalClientes} onChange={setNuevoF} router={router} firmasExistentes={firmas}
            onSave={async (clienteValidado: boolean) => {
              if (!clienteValidado) { toast.error('Selecciona un cliente válido'); return }
              const firmaProcesada = processFirma(nuevoF, firmas)
              if (!firmaProcesada.documento) { toast.error('Elige al menos un tipo de documento'); return }
              await crearFirmaVentas({ ...firmaProcesada, cliente: nuevoF.cliente, createdAt: new Date().toISOString() } as any)
              if (usuario) await registrarLog(usuario.uid, usuario.nombre, 'Ventas', `Registró firma para: ${nuevoF.cliente}`)
              toast.success('Firma registrada')
              setModalNuevoF(false); setNuevoF({ empresa: 'OKINAWATEC', autorizadoPor: 'Luis Matienzo', fecha: hoy(), tipoFirma: 'FM (Firma Manual)', medioEntrega: 'Presencial' }); initMódulo()
            }} onCancel={() => setModalNuevoF(false)} />
        </ModalVentas>
      )}

      {modalNuevoL && (
        <ModalVentas title="Nueva Licitación" onClose={() => setModalNuevoL(false)}>
          <FormLicitacionVentas data={nuevoL} globalClientes={globalClientes} onChange={setNuevoL} router={router}
            onSave={async (clienteValidado: boolean) => {
              if (!clienteValidado) { toast.error('Selecciona una entidad válida'); return }
              await crearLicitacionVentas({ ...nuevoL as any, entidad: nuevoL.entidad, createdAt: new Date().toISOString() })
              if (usuario) await registrarLog(usuario.uid, usuario.nombre, 'Ventas', `Registró licitación: ${nuevoL.entidad}`)
              toast.success('Licitación registrada')
              setModalNuevoL(false); setNuevoL({ resultado: 'en_proceso', empresa: 'OKINAWATEC', basesIntegradas: hoy(), fechaPresentacion: hoy() }); initMódulo()
            }} onCancel={() => setModalNuevoL(false)} />
        </ModalVentas>
      )}

      {/* ── MODAL NUEVO PENDIENTE MANUAL ── */}
      {modalNuevoPendiente && (
        <ModalVentas title="Agregar Nuevo Pendiente" onClose={() => setModalNuevoPendiente(false)}>
          <FormPendienteVenta 
            data={nuevoPendiente} 
            onChange={setNuevoPendiente} 
            clientes={clientes} firmas={firmas} licitaciones={licitaciones}
            onSave={async () => {
              if (!nuevoPendiente.nombre?.trim()) { toast.error("Ingresa el nombre"); return }
              await crearPendienteVenta({ ...nuevoPendiente as any, estado: 'pendiente', createdAt: new Date().toISOString() })
              toast.success("Pendiente creado")
              setModalNuevoPendiente(false)
              setNuevoPendiente({ fechaInicio: hoy(), seccionVinculada: 'ninguna' })
              initMódulo()
            }} 
            onCancel={() => setModalNuevoPendiente(false)} 
          />
        </ModalVentas>
      )}

      {/* ── MODAL EDITAR PENDIENTE MANUAL ── */}
      {modalEditarPendiente && (
        <ModalVentas title="Editar Pendiente" onClose={() => setModalEditarPendiente(false)}>
          <FormPendienteVenta 
            data={editPendiente} 
            onChange={setEditPendiente} 
            clientes={clientes} firmas={firmas} licitaciones={licitaciones}
            onSave={async () => {
              await actualizarPendienteVenta(editPendiente.id!, editPendiente)
              toast.success("Pendiente actualizado")
              setModalEditarPendiente(false)
              initMódulo()
            }} 
            onCancel={() => setModalEditarPendiente(false)} 
          />
          <div className="mt-4 pt-4 border-t border-slate-700">
             <button onClick={async () => {
                if(confirm("¿Eliminar este pendiente?")) {
                   await eliminarPendienteVenta(editPendiente.id!)
                   setModalEditarPendiente(false)
                   initMódulo()
                }
             }} className="btn-secondary text-red-400 border-red-900/50 w-full justify-center">Eliminar Pendiente</button>
          </div>
        </ModalVentas>
      )}

      {/* MODAL RESOLVER CITA */}
      {citaResolver && (
        <ModalVentas title="Resolución de Cita" onClose={() => setCitaResolver(null)}>
          <div className="space-y-4 text-sm">
            <p className="text-slate-300 text-center mb-2">¿Cómo finalizó la cita con <strong>{citaResolver.cliente}</strong>?</p>
            <div className="flex flex-col gap-2">
              <button onClick={async () => { await actualizarCitaVentas(citaResolver.id, { status: 'realizado' }); toast.success('Cita realizada'); initMódulo(); setCitaResolver(null) }} className="w-full bg-green-600/20 border border-green-500/50 text-green-400 py-2.5 rounded-lg hover:bg-green-600/40 transition-colors">
                Sí (Asistió / Realizada)
              </button>
              <button onClick={async () => { await actualizarCitaVentas(citaResolver.id, { status: 'cancelado' }); toast.success('Cita cancelada'); initMódulo(); setCitaResolver(null) }} className="w-full bg-red-600/20 border border-red-500/50 text-red-400 py-2.5 rounded-lg hover:bg-red-600/40 transition-colors">
                No (Cancelada)
              </button>
              <button onClick={() => { const id = citaResolver.id; setCitaResolver(null); setTab('citas'); setExpandidoCi(id); setEditandoCi(id); setEditDataCi(citaResolver) }} className="w-full bg-blue-600/20 border border-blue-500/50 text-blue-400 py-2.5 rounded-lg hover:bg-blue-600/40 transition-colors">
                Reprogramar / Editar
              </button>
            </div>
          </div>
        </ModalVentas>
      )}
    </div>
  )
}

// ── Helpers para procesar firmas antes de guardar ─────────────────────────
const PREFIJOS_DOCUMENTO: Record<string, string> = { 'ANEXOS': 'ANEX', 'FILE': 'FILE', 'ADENDA': 'ADD', 'CARTA': 'CAR', 'APELACIÓN': 'APE', 'CARTAFIANZA': 'CARFZ', 'FORMATO': 'FMT' }

function processFirma(data: Partial<FirmaVentas> | any, firmasExistentes: FirmaVentas[]): Partial<FirmaVentas> {
  const tipos: string[] = data.tiposSeleccionados || []
  const documento = tipos.join(' + ')
  let codigo = data.codigo || ''
  
  if (!codigo && tipos.length > 0) {
    let prefijo = PREFIJOS_DOCUMENTO[tipos[0]] || 'DOC'
    for (let i = 1; i < tipos.length; i++) {
      prefijo += tipos[i].charAt(0).toUpperCase()
    }
    
    let maxNum = 0
    firmasExistentes.forEach(f => {
      if (f.codigo && f.codigo.includes(prefijo + '-')) {
        const parts = f.codigo.split('-')
        if (parts.length > 1) {
          const num = parseInt(parts[1].trim(), 10)
          if (!isNaN(num) && num > maxNum) maxNum = num
        }
      }
    })
    codigo = `${prefijo}-${String(maxNum + 1).padStart(3, '0')}`
  }
  
  return { ...data, documento, codigo }
}

// ── Modales / Formularios Internos ────────────────────────────────────────

function ModalVentas({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="modal-overlay z-50" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg shadow-2xl border border-slate-600">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-[#0d1526]">
          <h2 className="font-semibold text-white text-sm">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4 bg-[#111d35]">{children}</div>
      </div>
    </div>
  )
}

function EditableSelect({ label, value, options, onChange, placeholder }: any) {
  const [isCustom, setIsCustom] = useState(value && !options.includes(value) ? true : false)
  return (
    <div>
      <label className="label">{label}</label>
      {!isCustom ? (
        <select className="input-field" value={value || ''} onChange={e => {
          if (e.target.value === 'Otro') { setIsCustom(true); onChange(''); }
          else onChange(e.target.value)
        }}>
          <option value="">Seleccionar...</option>
          {options.map((o: string) => <option key={o} value={o}>{o}</option>)}
          <option value="Otro">Otro (Especificar...)</option>
        </select>
      ) : (
        <div className="flex gap-2">
          <input autoFocus className="input-field flex-1" value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
          <button type="button" onClick={() => { setIsCustom(false); onChange(''); }} className="btn-secondary px-2 py-1 text-xs">✕</button>
        </div>
      )}
    </div>
  )
}

function AutocompleteCliente({ value, globalClientes, onChange, router, label = 'Cliente *' }: { value: string, globalClientes: Cliente[], onChange: (val: string, isValid: boolean) => void, router: any, label?: string }) {
  const [query, setQuery] = useState(value || '')
  const [sugs, setSugs] = useState<Cliente[]>([])
  const valid = globalClientes.some(c => c.nombre.toLowerCase() === query.trim().toLowerCase())

  useEffect(() => { setQuery(value || '') }, [value])

  const handleInput = (val: string) => {
    setQuery(val)
    const isV = globalClientes.some(c => c.nombre.toLowerCase() === val.trim().toLowerCase())
    onChange(val, isV)
    if (!val.trim() || isV) { setSugs([]); return }
    setSugs(globalClientes.filter(c => c.nombre.toLowerCase().includes(val.toLowerCase())))
  }

  return (
    <div className="relative col-span-2">
      <label className="label">{label}</label>
      <input className={clsx("input-field", valid ? "border-green-500/50 focus:border-green-500" : query.trim() ? "border-amber-500/50 focus:border-amber-500" : "")} value={query} onChange={e => handleInput(e.target.value)} placeholder="Ej: SUNARP" />
      {sugs.length > 0 && (
        <div className="absolute left-0 right-0 bg-dark-800 border border-slate-700 rounded-md p-1 mt-1 max-h-32 overflow-y-auto z-50 shadow-xl">
          {sugs.map(s => <button key={s.id} type="button" onClick={() => handleInput(s.nombre)} className="w-full text-left p-1.5 hover:bg-blue-600 rounded text-white text-xs">{s.nombre}</button>)}
        </div>
      )}
      {!valid && query.trim() && (
        <div className="p-2 bg-amber-900/20 border border-amber-500/40 rounded mt-1 text-amber-400 text-xs flex flex-col gap-1">
          <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/> Cliente no encontrado en el directorio.</span>
          <button type="button" onClick={() => router.push('/clientes')} className="text-blue-400 underline font-semibold flex items-center gap-1 self-start">Ir a registrar cliente <ArrowRight className="w-3 h-3"/></button>
        </div>
      )}
    </div>
  )
}

function FormPendienteVenta({ data, onChange, onSave, onCancel, clientes, firmas, licitaciones }: any) {
  const [anioFiltro, setAnioFiltro] = useState(new Date().getFullYear().toString())
  const [query, setQuery] = useState(data.registroVinculadoNombre || '')
  const [sugs, setSugs] = useState<any[]>([])

  const checkY = (fecha?: string) => {
    if (!fecha) return false
    let y = fecha.split('-')[0]
    if (fecha.includes('/')) {
      const parts = fecha.split('/')
      y = parts[2]
    }
    if (anioFiltro === 'todos') return true
    if (anioFiltro === '2023-24') return y === '2023' || y === '2024'
    return y === anioFiltro
  }

  const optsVinculo = () => {
    if (data.seccionVinculada === 'pipeline') return clientes.filter((x: any) => checkY(x.fechaCotizacion)).map((x: any) => ({ id: x.id, name: `${x.nombre} — ${x.proyecto || 'Sin proyecto'}` }))
    if (data.seccionVinculada === 'firmas') return firmas.filter((x: any) => checkY(x.fecha)).map((x: any) => ({ id: x.id, name: `${x.codigo} — ${x.cliente}` }))
    if (data.seccionVinculada === 'licitaciones') return licitaciones.filter((x: any) => checkY(x.fechaPresentacion)).map((x: any) => ({ id: x.id, name: `${x.entidad} — ${x.proceso}` }))
    return []
  }

  const handleInput = (val: string) => {
    setQuery(val)
    onChange({ ...data, registroVinculadoId: '', registroVinculadoNombre: val })
    if (!val.trim()) { setSugs([]); return }
    const opciones = optsVinculo()
    setSugs(opciones.filter((o: any) => o.name.toLowerCase().includes(val.toLowerCase())))
  }

  const selectOpcion = (id: string, name: string) => {
    setQuery(name)
    setSugs([])
    onChange({ ...data, registroVinculadoId: id, registroVinculadoNombre: name })
  }

  return (
    <div className="space-y-3 text-xs">
      <div><label className="label">Nombre del pendiente *</label><input className="input-field" value={data.nombre || ''} onChange={e => onChange({ ...data, nombre: e.target.value })} placeholder="Ej: Solicitar documentos faltantes" /></div>
      <div><label className="label">Especificaciones / Detalles</label><textarea className="input-field resize-none" rows={3} value={data.especificaciones || ''} onChange={e => onChange({ ...data, especificaciones: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label">Plazo (Días, meses...)</label><input className="input-field" value={data.plazo || ''} onChange={e => onChange({ ...data, plazo: e.target.value })} /></div>
        <div><label className="label">Vincular a Sección</label>
          <select className="input-field" value={data.seccionVinculada || 'ninguna'} onChange={e => { onChange({ ...data, seccionVinculada: e.target.value, registroVinculadoId: '', registroVinculadoNombre: '' }); setQuery(''); setSugs([]) }}>
            <option value="ninguna">No vincular (Independiente)</option>
            <option value="pipeline">Pipeline</option>
            <option value="firmas">Firmas</option>
            <option value="licitaciones">Licitaciones</option>
          </select>
        </div>
        <div><label className="label">Fecha Inicio</label><input type="date" className="input-field" value={data.fechaInicio || ''} onChange={e => onChange({ ...data, fechaInicio: e.target.value })} /></div>
        <div><label className="label">Fecha Límite *</label><input type="date" className="input-field border-amber-500/50 focus:border-amber-400" value={data.fechaLimite || ''} onChange={e => onChange({ ...data, fechaLimite: e.target.value })} /></div>
      </div>
      {data.seccionVinculada !== 'ninguna' && (
        <div className="pt-2 grid grid-cols-3 gap-3">
          <div className="col-span-1">
            <label className="label text-cyan-400">Año del registro</label>
            <select className="input-field border-cyan-500/50" value={anioFiltro} onChange={e => { setAnioFiltro(e.target.value); onChange({ ...data, registroVinculadoId: '', registroVinculadoNombre: '' }); setQuery(''); setSugs([]) }}>
              <option value="todos">Todos</option>
              {OPCIONES_ANIOS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="col-span-2 relative">
            <label className="label text-cyan-400">Buscar y seleccionar registro *</label>
            <input className={clsx("input-field border-cyan-500/50", data.registroVinculadoId ? "border-green-500/50" : "")} value={query} onChange={e => handleInput(e.target.value)} placeholder="Escribe para buscar..." />
            {sugs.length > 0 && (
              <div className="absolute left-0 right-0 bg-dark-800 border border-slate-700 rounded-md p-1 mt-1 max-h-32 overflow-y-auto z-50 shadow-xl">
                {sugs.map((s: any) => <button key={s.id} type="button" onClick={() => selectOpcion(s.id, s.name)} className="w-full text-left p-1.5 hover:bg-blue-600 rounded text-white text-xs">{s.name}</button>)}
              </div>
            )}
            {!data.registroVinculadoId && query.trim() && sugs.length === 0 && (
              <p className="text-amber-400 text-[10px] mt-1">No se encontraron registros vinculables con ese nombre en el año {anioFiltro}.</p>
            )}
          </div>
        </div>
      )}
      <div className="flex gap-2 pt-3"><button onClick={onSave} className="btn-primary text-xs w-full justify-center"><Check className="w-3.5 h-3.5" /> Guardar Pendiente</button>{onCancel && <button onClick={onCancel} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /></button>}</div>
    </div>
  )
}

function FormClienteVentas({ data, globalClientes, onChange, onSave, onCancel, router }: any) {
  const [isValid, setIsValid] = useState(globalClientes.some((c: any) => c.nombre === data.nombre))
  const handleHist = (arrName: 'historialStatus' | 'historialPlan', i: number, prop: 'fecha' | 'nota', v: string) => {
    const arr = [...(data[arrName] || [])]; arr[i] = { ...arr[i], [prop]: v }; onChange({ ...data, [arrName]: arr })
  }
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <AutocompleteCliente value={data.nombre} globalClientes={globalClientes} onChange={(val, valid) => { onChange({ ...data, nombre: val }); setIsValid(valid) }} router={router} />
        <div><label className="label">Contacto</label><input className="input-field" value={data.contacto || ''} onChange={e => onChange({ ...data, contacto: e.target.value })} /></div>
        <div><label className="label">Teléfono / Celular</label><input className="input-field" value={data.telefono || ''} onChange={e => onChange({ ...data, telefono: e.target.value })} /></div>
        <div><label className="label">Correo</label><input className="input-field" value={data.correo || ''} onChange={e => onChange({ ...data, correo: e.target.value })} /></div>
        <div className="col-span-2"><label className="label">Proyecto</label><input className="input-field" value={data.proyecto || ''} onChange={e => onChange({ ...data, proyecto: e.target.value })} /></div>
        <div><label className="label">Solución Propuesta</label><input className="input-field" value={data.solucion || ''} onChange={e => onChange({ ...data, solucion: e.target.value })} /></div>
        <div><label className="label">Mayorista</label><input className="input-field" value={data.mayorista || ''} onChange={e => onChange({ ...data, mayorista: e.target.value })} /></div>
        <div><label className="label">Fecha Cotización</label><input type="date" className="input-field" value={data.fechaCotizacion || ''} onChange={e => onChange({ ...data, fechaCotizacion: e.target.value })} /></div>
        <div><label className="label">Estado</label><select className="input-field" value={data.status || 'nuevo'} onChange={e => onChange({ ...data, status: e.target.value })}><option value="nuevo">Nuevo</option><option value="procesando">Procesando</option><option value="realizado">Realizado</option><option value="perdido">Perdido</option></select></div>
        
        <div className="col-span-2 pt-2 border-t border-slate-700">
          <label className="label text-cyan-400">Editar Historial de Status del Proyecto</label>
          {data.historialStatus?.map((h: any, i: number) => (
            <div key={i} className="flex gap-2 mb-1.5">
              <input type="date" className="input-field w-32" value={h.fecha} onChange={e => handleHist('historialStatus', i, 'fecha', e.target.value)} />
              <input className="input-field flex-1" value={h.nota} onChange={e => handleHist('historialStatus', i, 'nota', e.target.value)} />
            </div>
          ))}
          <button type="button" onClick={() => onChange({...data, historialStatus: [...(data.historialStatus||[]), {fecha: hoy(), nota: ''}]})} className="text-blue-400 text-xs">+ Agregar Status desde Modal</button>
        </div>

        <div className="col-span-2 pt-2 border-t border-slate-700">
          <label className="label text-green-400">Editar Historial de Plan de Acción</label>
          {data.historialPlan?.map((h: any, i: number) => (
            <div key={i} className="flex gap-2 mb-1.5">
              <input type="date" className="input-field w-32" value={h.fecha} onChange={e => handleHist('historialPlan', i, 'fecha', e.target.value)} />
              <input className="input-field flex-1" value={h.nota} onChange={e => handleHist('historialPlan', i, 'nota', e.target.value)} />
            </div>
          ))}
          <button type="button" onClick={() => onChange({...data, historialPlan: [...(data.historialPlan||[]), {fecha: hoy(), nota: ''}]})} className="text-blue-400 text-xs">+ Agregar Plan de Acción desde Modal</button>
        </div>
      </div>
      <div className="flex gap-2 pt-3"><button onClick={() => onSave(isValid)} className="btn-primary text-xs w-full justify-center"><Check className="w-3.5 h-3.5" /> Guardar Todos Los Cambios</button>{onCancel && <button onClick={onCancel} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /></button>}</div>
    </div>
  )
}

function FormCitaVentas({ data, globalClientes, onChange, onSave, onCancel, router, isCreating }: any) {
  const [isValid, setIsValid] = useState(globalClientes.some((c: any) => c.nombre === data.cliente))
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <AutocompleteCliente value={data.cliente} globalClientes={globalClientes} onChange={(val, valid) => { onChange({ ...data, cliente: val }); setIsValid(valid) }} router={router} />
        <div><label className="label">Empresa</label><select className="input-field" value={data.empresa || 'OKINAWATEC'} onChange={e => onChange({ ...data, empresa: e.target.value })}><option value="OKINAWATEC">OKINAWATEC</option><option value="TECH SOLUTIONS">TECH SOLUTIONS</option><option value="QUANTIC">QUANTIC</option></select></div>
        <div><label className="label">Fecha Reunión *</label><input type="date" className="input-field" value={data.fechaReunion || ''} onChange={e => onChange({ ...data, fechaReunion: e.target.value })} /></div>
        <div><label className="label">Horario (Hora) *</label><input type="time" className="input-field" value={data.horario || ''} onChange={e => onChange({ ...data, horario: e.target.value })} /></div>
        <div><label className="label">Contacto</label><input className="input-field" value={data.contacto || ''} onChange={e => onChange({ ...data, contacto: e.target.value })} /></div>
        <div><label className="label">Correo</label><input className="input-field" value={data.correo || ''} onChange={e => onChange({ ...data, correo: e.target.value })} /></div>
        <div><label className="label">Cargo</label><input className="input-field" value={data.cargo || ''} onChange={e => onChange({ ...data, cargo: e.target.value })} /></div>
        <div><label className="label">Sector</label><select className="input-field" value={data.sector || 'gobierno'} onChange={e => onChange({ ...data, sector: e.target.value })}><option value="gobierno">Gobierno</option><option value="privado">Privado</option><option value="financiero">Financiero</option><option value="educacion">Educación</option><option value="otro">Otro</option></select></div>
        <div className="col-span-2"><label className="label">Solución Propuesta</label><input className="input-field" value={data.solucion || ''} onChange={e => onChange({ ...data, solucion: e.target.value })} /></div>
        <div><label className="label">Status del Proyecto</label><input className="input-field" value={data.statusProyecto || ''} onChange={e => onChange({ ...data, statusProyecto: e.target.value })} /></div>
        
        {!isCreating && (
          <div><label className="label">Estado de Cita</label><select className="input-field" value={data.status || 'pendiente'} onChange={e => onChange({ ...data, status: e.target.value })}><option value="pendiente">Pendiente</option><option value="realizado">Realizado</option><option value="cancelado">Se canceló</option></select></div>
        )}
        
        <div className="col-span-2"><label className="label">Observaciones</label><textarea className="input-field resize-none" rows={2} value={data.observaciones || ''} onChange={e => onChange({ ...data, observaciones: e.target.value })} /></div>
      </div>
      <div className="flex gap-2"><button onClick={() => onSave(isValid)} className="btn-primary text-xs w-full justify-center"><Check className="w-3.5 h-3.5" /> Guardar</button>{onCancel && <button onClick={onCancel} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /></button>}</div>
    </div>
  )
}

function FormFirmaVentas({ data, globalClientes, onChange, onSave, onCancel, router, firmasExistentes }: any) {
  const [isValid, setIsValid] = useState(globalClientes.some((c: any) => c.nombre === data.cliente))
  const optsFirmantes = ['Treyci Benavides', 'Yuriko garcia', 'Jose Luis', 'Jean Gutiérrez', 'Christian Gutiérrez', 'Miller ponte', 'Erick Espinoza']
  const handleHist = (i: number, prop: 'fecha' | 'nota', v: string) => {
    const arr = [...(data.historialStatus || [])]; arr[i] = { ...arr[i], [prop]: v }; onChange({ ...data, historialStatus: arr })
  }

  // Previsualizar código al vuelo
  useEffect(() => {
    if (data.tiposSeleccionados && data.tiposSeleccionados.length > 0) {
      const propuesto = processFirma(data, firmasExistentes).codigo;
      // Solo actualizamos si el usuario no ha forzado un código manual antes (o si está vacío)
      if (!data.codigo || data.codigo.includes('-')) {
        onChange({ ...data, codigo: propuesto });
      }
    } else {
      if (data.codigo && data.codigo.includes('-')) {
        onChange({ ...data, codigo: '' });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.tiposSeleccionados])

  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <AutocompleteCliente value={data.cliente} globalClientes={globalClientes} onChange={(val, valid) => { onChange({ ...data, cliente: val }); setIsValid(valid) }} router={router} />
        
        <EditableSelect label="Tipo de Firma" value={data.tipoFirma} options={['FM (Firma Manual)', 'FD (Firma Digital)']} onChange={(v: string) => onChange({ ...data, tipoFirma: v })} placeholder="Ej: Mixta..." />
        <EditableSelect label="Medio de Entrega" value={data.medioEntrega} options={['Presencial', 'Correo']} onChange={(v: string) => onChange({ ...data, medioEntrega: v })} placeholder="Ej: Courier..." />
        
        <div><label className="label">Autorizado Por</label><select className="input-field" value={data.autorizadoPor || 'Luis Matienzo'} onChange={e => onChange({ ...data, autorizadoPor: e.target.value })}><option value="Luis Matienzo">Luis Matienzo</option><option value="Karen Hiraoka">Karen Hiraoka</option></select></div>
        <div><label className="label">Firmado Por</label><select className="input-field" value={data.firmadoPor || ''} onChange={e => onChange({ ...data, firmadoPor: e.target.value })}><option value="">Seleccionar...</option>{optsFirmantes.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        <div><label className="label">Enviado Por</label><select className="input-field" value={data.enviadoPor || ''} onChange={e => onChange({ ...data, enviadoPor: e.target.value })}><option value="">Seleccionar...</option>{optsFirmantes.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
        <div><label className="label">Empresa</label><select className="input-field" value={data.empresa || 'OKINAWATEC'} onChange={e => onChange({ ...data, empresa: e.target.value })}><option value="OKINAWATEC">OKINAWATEC</option><option value="TECHSI">TECHSI</option><option value="QUANTIC">QUANTIC</option></select></div>
        <div><label className="label">Fecha</label><input type="date" className="input-field" value={data.fecha || ''} onChange={e => onChange({ ...data, fecha: e.target.value })} /></div>
        
        <div className="col-span-2">
          <label className="label">Tipo de Documento</label>
          <div className="grid grid-cols-3 gap-2 p-2 bg-dark-800 border border-slate-700 rounded-lg">
            {['ANEXOS', 'FILE', 'ADENDA', 'CARTA', 'APELACIÓN', 'CARTAFIANZA', 'FORMATO'].map(t => {
              const tSel: string[] = data.tiposSeleccionados || []
              const exists = tSel.includes(t)
              return (
                <label key={t} className="flex items-center gap-1.5 text-slate-300 text-[11px] cursor-pointer">
                  <input type="checkbox" checked={exists} onChange={() => {
                    const nextTipos = exists ? tSel.filter((x: string) => x !== t) : [...tSel, t];
                    onChange({ ...data, tiposSeleccionados: nextTipos });
                  }} /> {t}
                </label>
              )
            })}
          </div>
        </div>
        <div>
          <label className="label">Código Secuencial</label>
          <input className="input-field" placeholder="Calculado automáticamente o escribe uno..." value={data.codigo || ''} onChange={e => onChange({ ...data, codigo: e.target.value })} />
        </div>
        <div className="col-span-2"><label className="label">Nombre del Proyecto</label><input className="input-field" value={data.nombreProyecto || ''} onChange={e => onChange({ ...data, nombreProyecto: e.target.value })} /></div>
        <div className="col-span-2"><label className="label">Observaciones</label><textarea className="input-field resize-none" rows={2} value={data.observaciones || ''} onChange={e => onChange({ ...data, observaciones: e.target.value })} /></div>

        <div className="col-span-2 pt-2 border-t border-slate-700">
          <label className="label text-cyan-400">Editar Historial de Status</label>
          {data.historialStatus?.map((h: any, i: number) => (
            <div key={i} className="flex gap-2 mb-1.5">
              <input type="date" className="input-field w-32" value={h.fecha} onChange={e => handleHist(i, 'fecha', e.target.value)} />
              <input className="input-field flex-1" value={h.nota} onChange={e => handleHist(i, 'nota', e.target.value)} />
            </div>
          ))}
          <button type="button" onClick={() => onChange({...data, historialStatus: [...(data.historialStatus||[]), {fecha: hoy(), nota: ''}]})} className="text-blue-400 text-xs">+ Agregar Status desde Modal</button>
        </div>
      </div>
      <div className="flex gap-2 pt-3"><button onClick={() => onSave(isValid)} className="btn-primary text-xs w-full justify-center"><Check className="w-3.5 h-3.5" /> Guardar Todos Los Cambios</button>{onCancel && <button onClick={onCancel} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /></button>}</div>
    </div>
  )
}

function FormLicitacionVentas({ data, globalClientes, onChange, onSave, onCancel, router }: any) {
  const [isValid, setIsValid] = useState(globalClientes.some((c: any) => c.nombre === data.entidad))
  return (
    <div className="space-y-3 text-xs">
      <div className="grid grid-cols-2 gap-3">
        <AutocompleteCliente label="Entidad *" value={data.entidad} globalClientes={globalClientes} onChange={(val, valid) => { onChange({ ...data, entidad: val }); setIsValid(valid) }} router={router} />
        <div><label className="label">Empresa</label><select className="input-field" value={data.empresa || 'OKINAWATEC'} onChange={e => onChange({ ...data, empresa: e.target.value })}><option value="OKINAWATEC">OKINAWATEC</option><option value="TECHSI">TECHSI</option><option value="QUANTIC">QUANTIC</option></select></div>
        <div className="col-span-2"><label className="label">Proceso / Nombre</label><input className="input-field" value={data.proceso || ''} onChange={e => onChange({ ...data, proceso: e.target.value })} /></div>
        <div><label className="label">Bases Integradas</label><input type="date" className="input-field" value={data.basesIntegradas || ''} onChange={e => onChange({ ...data, basesIntegradas: e.target.value })} /></div>
        <div><label className="label">F. Presentación</label><input type="date" className="input-field" value={data.fechaPresentacion || ''} onChange={e => onChange({ ...data, fechaPresentacion: e.target.value })} /></div>
        <div><label className="label">F. Fin Evaluación</label><input type="date" className="input-field" value={data.fechaFinEvaluacion || ''} onChange={e => onChange({ ...data, fechaFinEvaluacion: e.target.value })} /></div>
        <div><label className="label">Buena Pro</label><input type="date" className="input-field" value={data.buenaPro || ''} onChange={e => onChange({ ...data, buenaPro: e.target.value })} /></div>
        <div><label className="label">Consentimiento</label><input type="date" className="input-field" value={data.consentimiento || ''} onChange={e => onChange({ ...data, consentimiento: e.target.value })} /></div>
        <div><label className="label">Firma Contrato</label><input type="date" className="input-field" value={data.fechaFirmaContrato || ''} onChange={e => onChange({ ...data, fechaFirmaContrato: e.target.value })} /></div>
        <div><label className="label">Resultado</label><select className="input-field" value={data.resultado || 'en_proceso'} onChange={e => onChange({ ...data, resultado: e.target.value })}><option value="en_proceso">En proceso</option><option value="ganamos">Ganamos</option><option value="perdimos">Perdimos</option><option value="suspendido">Suspendido</option></select></div>
        <div className="col-span-2"><label className="label">Observaciones / Detalle Fechas</label><textarea className="input-field resize-none" rows={2} value={data.observaciones || ''} onChange={e => onChange({ ...data, observaciones: e.target.value })} placeholder="Ej: Sin fecha definida para la firma..." /></div>
      </div>
      <div className="flex gap-2 pt-3"><button onClick={() => onSave(isValid)} className="btn-primary text-xs w-full justify-center"><Check className="w-3.5 h-3.5" /> Guardar</button>{onCancel && <button onClick={onCancel} className="btn-secondary text-xs"><X className="w-3.5 h-3.5" /></button>}</div>
    </div>
  )
}
