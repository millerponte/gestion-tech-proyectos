'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'
import { 
  obtenerClientes, obtenerClientesVentas, crearClienteVentas, actualizarClienteVentas, 
  eliminarClienteVentas, obtenerCitasVentas, crearCitaVentas, actualizarCitaVentas, 
  eliminarCitaVentas, obtenerFirmasVentas, crearFirmaVentas, actualizarFirmaVentas, 
  eliminarFirmaVentas, obtenerLicitacionesVentas, crearLicitacionVentas, 
  actualizarLicitacionVentas, eliminarLicitacionVentas, registrarLog 
} from '@/lib/db'
import type { Cliente, ClienteVentas, CitaVentas, FirmaVentas, LicitacionVentas, StatusPipeline, SectorCita, ResultadoLicitacion } from '@/types'
import { TrendingUp, Users, Calendar, FileSignature, Trophy, Plus, Search, Check, X, Pencil, Trash2, ArrowRight, AlertCircle, Clock } from 'lucide-react'
import { isToday, isThisWeek, isThisMonth, isThisYear, parseISO } from 'date-fns'

type Tab = 'pipeline' | 'citas' | 'firmas' | 'licitaciones'
type RangoFiltro = 'hoy' | 'semana' | 'mes' | 'año' | 'todo'

const PREFIJOS_DOCUMENTO: Record<string, string> = {
  'ANEXOS': 'ANX', 'FILE': 'FLE', 'ADENDA': 'ADD', 'CARTA': 'CAR', 
  'APELACIÓN': 'APE', 'CARTAFIANZA': 'CARFZ', 'FORMATO': 'FMT'
}

export default function VentasPage() {
  const { usuario, isAdmin } = useAuth()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('pipeline')
  const [globalClientes, setGlobalClientes] = useState<Cliente[]>([])
  const [rangoDashboard, setRangoDashboard] = useState<RangoFiltro>('mes')

  // Listas de datos
  const [pipeline, setPipeline] = useState<ClienteVentas[]>([])
  const [citas, setCitas] = useState<CitaVentas[]>([])
  const [firmas, setFirmas] = useState<FirmaVentas[]>([])
  const [licitaciones, setLicitaciones] = useState<LicitacionVentas[]>([])

  // Modales de creación
  const [modalPipeline, setModalPipeline] = useState(false)
  const [modalCitas, setModalCitas] = useState(false)
  const [modalFirmas, setModalFirmas] = useState(false)
  const [modalLicitaciones, setModalLicitaciones] = useState(false)

  // Estados de formularios
  const [formP, setFormP] = useState<Partial<ClienteVentas>>({ status: 'nuevo', año: '2026' })
  const [formC, setFormC] = useState<Partial<CitaVentas>>({ sector: 'gobierno', status: 'pendiente' })
  const [formF, setFormF] = useState<Partial<FirmaVentas>>({ autorizadoPor: 'Luis Matienzo', firmadoPor: 'Treyci Benavides', tiposSeleccionados: [] } as any)
  const [formL, setFormL] = useState<Partial<LicitacionVentas>>({ resultado: 'en_proceso', año: '2026' })

  // Autocomplete y validación estricta de clientes
  const [queryCliente, setQueryCliente] = useState('')
  const [sugerenciasClientes, setSugerenciasClientes] = useState<Cliente[]>([])
  const [clienteValido, setClienteValido] = useState(false)

  useEffect(() => {
    initMódulo()
  }, [])

  const initMódulo = async () => {
    const gc = await obtenerClientes()
    setGlobalClientes(gc)
    const p = await obtenerClientesVentas()
    setPipeline(p)
    const c = await obtenerCitasVentas()
    setCitas(c)
    const f = await obtenerFirmasVentas()
    setFirmas(f)
    const l = await obtenerLicitacionesVentas()
    setLicitaciones(l)
  }

  // Lógica de Autocontrol del Input Cliente Unificado
  const handleInputClienteChange = (val: string) => {
    setQueryCliente(val)
    if (!val.trim()) {
      setSugerenciasClientes([])
      setClienteValido(false)
      return
    }
    const filtered = globalClientes.filter(c => c.nombre.toLowerCase().includes(val.toLowerCase()))
    setSugerenciasClientes(filtered)
    
    const matchPerfecto = globalClientes.some(c => c.nombre.toLowerCase() === val.toLowerCase().trim())
    setClienteValido(matchPerfecto)
  }

  // Filtrado temporal dinámico para los bloques del Dashboard
  const evaluarFecha = (fechaStr: string, rango: RangoFiltro): boolean => {
    if (!fechaStr || rango === 'todo') return true
    try {
      const date = parseISO(fechaStr)
      if (rango === 'hoy') return isToday(date)
      if (rango === 'semana') return isThisWeek(date, { weekStartsOn: 1 })
      if (rango === 'mes') return isThisMonth(date)
      if (rango === 'año') return isThisYear(date)
    } catch { return false }
    return false
  }

  // Guardar Pipeline
  const handleGuardarPipeline = async () => {
    if (!clienteValido) { toast.error('Debes seleccionar un cliente válido del directorio'); return }
    await crearClienteVentas({ ...formP, nombre: queryCliente.trim(), createdAt: new Date().toISOString() } as any)
    if (usuario) await registrarLog(usuario.uid, usuario.nombre, 'Ventas', `Agregó cliente al pipeline: ${queryCliente}`)
    toast.success('Registro completado en Pipeline')
    setModalPipeline(false)
    initMódulo()
  }

  // Guardar Citas
  const handleGuardarCita = async () => {
    if (!clienteValido) { toast.error('Cliente no válido'); return }
    await crearCitaVentas({ ...formC, cliente: queryCliente.trim(), createdAt: new Date().toISOString() } as any)
    if (usuario) await registrarLog(usuario.uid, usuario.nombre, 'Ventas', `Registró cita con: ${queryCliente}`)
    toast.success('Cita agendada')
    setModalCitas(false)
    initMódulo()
  }

  // Guardar Firmas con Lógica del Prefijo Automático
  const handleGuardarFirma = async () => {
    if (!clienteValido) { toast.error('Cliente no válido'); return }
    const tipos: string[] = (formF as any).tiposSeleccionados || []
    if (tipos.length === 0) { toast.error('Elige al menos un tipo de documento'); return }
    
    const primerTipo = tipos[0]
    const prefijo = PREFIJOS_DOCUMENTO[primerTipo] || 'DOC'
    const codigoFinal = `${prefijo}-${(formF.codigo || '')}`

    await crearFirmaVentas({
      ...formF,
      cliente: queryCliente.trim(),
      documento: tipos.join(' + '),
      codigo: codigoFinal,
      createdAt: new Date().toISOString()
    } as any)
    
    if (usuario) await registrarLog(usuario.uid, usuario.nombre, 'Ventas', `Registró firma de documento para: ${queryCliente}`)
    toast.success('Firma registrada con código ' + codigoFinal)
    setModalFirmas(false)
    initMódulo()
  }

  // Citas categorizadas para el Dashboard de Ventas Superior
  const citasPendientes = citas.filter(c => c.status === 'pendiente' && evaluarFecha(c.fechaReunion, rangoDashboard))
  const citasRealizadas = citas.filter(c => c.status === 'realizado' && evaluarFecha(c.fechaReunion, rangoDashboard))

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Cabecera */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-emerald-400" /> Inteligencia Comercial & Ventas
          </h1>
          <p className="text-slate-400 text-sm">Pipeline unificado y flujo de prospección estructurado</p>
        </div>

        {/* Selector del Dashboard Superior */}
        <div className="flex bg-dark-800 border border-slate-700 rounded-lg p-0.5 text-xs">
          {(['hoy', 'semana', 'mes', 'año', 'todo'] as RangoFiltro[]).map(r => (
            <button key={r} onClick={() => setRangoDashboard(r)} className={clsx("px-3 py-1.5 rounded capitalize", rangoDashboard === r ? "bg-blue-600 text-white" : "text-slate-400")}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* BLOQUES DE MONITOREO SUPERIOR (PENDIENTES Y REALIZADOS) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Bloque Pendientes */}
        <div className="card border-amber-500/30 bg-amber-950/5 p-4 space-y-3">
          <h3 className="text-amber-400 font-semibold text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" /> Citas y Pendientes del Período ({citasPendientes.length})
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {citasPendientes.map(c => (
              <div key={c.id} className="bg-dark-800 p-2.5 rounded border border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-white">{c.cliente}</p>
                  <p className="text-slate-400">{c.solucion} — 📅 {c.fechaReunion} ({c.horario})</p>
                </div>
                <span className="bg-amber-900/40 text-amber-300 border border-amber-800 px-2 py-0.5 rounded-full scale-90">Pendiente</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bloque Realizados */}
        <div className="card border-green-500/30 bg-green-950/5 p-4 space-y-3">
          <h3 className="text-green-400 font-semibold text-sm flex items-center gap-2">
            <Check className="w-4 h-4" /> Gestiones Realizadas / Cierres ({citasRealizadas.length})
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {citasRealizadas.map(c => (
              <div key={c.id} className="bg-dark-800 p-2.5 rounded border border-slate-700 flex justify-between items-center text-xs">
                <div>
                  <p className="font-bold text-white">{c.cliente}</p>
                  <p className="text-slate-400">Reunión finalizada con éxito el {c.fechaReunion}</p>
                </div>
                <span className="bg-green-900/40 text-green-300 border border-green-800 px-2 py-0.5 rounded-full scale-90">Realizado</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs Internas */}
      <div className="flex gap-1 bg-[#0d1526] border border-[#1e3a8a]/50 rounded-xl p-1 w-fit">
        {([['pipeline', 'Pipeline Comercial'], ['citas', 'Gestión de Citas'], ['firmas', 'Firmas de Contratos'], ['licitaciones', 'Licitaciones']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-all', tab === id ? 'bg-blue-600 text-white' : 'text-slate-400')}>
            {label}
          </button>
        ))}
      </div>

      {/* CONTENIDO DE TABS */}
      {tab === 'pipeline' && (
        <div className="space-y-3">
          <div className="flex justify-end"><button onClick={() => { setFormP({ status: 'nuevo', año: '2026' }); setQueryCliente(''); setClienteValido(false); setModalPipeline(true) }} className="btn-primary text-xs"><Plus className="w-4 h-4"/> Nuevo Registro</button></div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d1526] text-slate-400 border-b border-slate-700">
                <tr><th className="p-3">Cliente</th><th className="p-3">Proyecto / Solución</th><th className="p-3">Mayorista</th><th className="p-3">Fecha</th><th className="p-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {pipeline.map(p => (
                  <tr key={p.id} className="hover:bg-white/5"><td className="p-3 font-medium text-white">{p.nombre}</td><td className="p-3">{p.proyecto} ({p.solucion})</td><td className="p-3">{p.mayorista}</td><td className="p-3 font-mono">{p.fechaCotizacion}</td><td className="p-3"><span className="bg-blue-900/30 text-blue-300 px-2 py-0.5 rounded border border-blue-800">{p.status}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'citas' && (
        <div className="space-y-3) ">
          <div className="flex justify-end"><button onClick={() => { setFormC({ sector: 'gobierno', status: 'pendiente' }); setQueryCliente(''); setClienteValido(false); setModalCitas(true) }} className="btn-primary text-xs"><Plus className="w-4 h-4"/> Agendar Cita</button></div>
          <div className="card p-0 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0d1526] text-slate-400 border-b border-slate-700">
                <tr><th className="p-3">Cliente</th><th className="p-3">Contacto</th><th className="p-3">Fecha / Horario</th><th className="p-3">Sector</th><th className="p-3">Estado</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {citas.map(c => (
                  <tr key={c.id} className="hover:bg-white/5"><td className="p-3 font-medium text-white">{c.cliente}</td><td className="p-3">{c.contacto} ({c.correo})</td><td className="p-3 font-mono text-cyan-400">{c.fechaReunion} — {c.horario}</td><td className="p-3 uppercase">{c.sector}</td><td className="p-3"><span className={clsx("px-2 py-0.5 rounded border text-xs font-medium", c.status === 'realizado' ? "bg-green-900/40 text-green-300 border-green-800" : c.status === 'cancelado' ? "bg-red-900/40 text-red-300 border-red-800" : "bg-amber-900/40 text-amber-300 border-amber-800")}>{c.status}</span></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTINUACIÓN ASINCRONA DE COMPONENTES DE CREACIÓN Y MODALES ESPECÍFICOS */}
      {/* MODAL PIPELINE */}
      {modalPipeline && (
        <ModalVentas title="Registrar Cliente en Pipeline" onClose={() => setModalPipeline(false)}>
          <div className="space-y-4 text-xs">
            {/* Input de Control de Cliente Unificado Integrado */}
            <div className="relative">
              <label className="label">Cliente * (Debe estar registrado en el Directorio)</label>
              <input className={clsx("input-field", clienteValido ? "border-green-500" : "border-amber-500")} placeholder="Escribe el nombre del cliente..." value={queryCliente} onChange={e => handleInputClienteChange(e.target.value)} />
              {sugerenciasClientes.length > 0 && !clienteValido && (
                <div className="absolute left-0 right-0 bg-dark-800 border border-slate-700 rounded-md p-1 mt-1 max-h-24 overflow-y-auto z-50">
                  {sugerenciasClientes.map(s => (
                    <button key={s.id} onClick={() => { setQueryCliente(s.nombre); setSugerenciasClientes([]); setClienteValido(true) }} className="w-full text-left p-1 hover:bg-blue-600 rounded text-white text-xs">
                      {s.nombre}
                    </button>
                  ))}
                </div>
              )}
              {!clienteValido && queryCliente.trim() && (
                <div className="p-2 bg-amber-900/20 border border-amber-500/40 rounded mt-1 text-amber-400 flex flex-col gap-1">
                  <span className="flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5"/> Este cliente no está en la base unificada.</span>
                  <button onClick={() => router.push('/clientes')} className="text-blue-400 underline font-semibold flex items-center gap-1 self-start mt-1">Ir a registrar cliente en Directorio <ArrowRight className="w-3 h-3"/></button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Contacto</label><input className="input-field" onChange={e => setFormP({ ...formP, contacto: e.target.value })} /></div>
              <div><label className="label">Correo</label><input className="input-field" onChange={e => setFormP({ ...formP, correo: e.target.value })} /></div>
              <div><label className="label">Proyecto</label><input className="input-field" onChange={e => setFormP({ ...formP, proyecto: e.target.value })} /></div>
              <div><label className="label">Solución Propuesta</label><input className="input-field" onChange={e => setFormP({ ...formP, solucion: e.target.value })} /></div>
              <div><label className="label">Mayorista</label><input className="input-field" onChange={e => setFormP({ ...formP, mayorista: e.target.value })} /></div>
              <div><label className="label">Fecha Cotización</label><input type="date" className="input-field" onChange={e => setFormP({ ...formP, fechaCotizacion: e.target.value })} /></div>
            </div>
            <button onClick={handleGuardarPipeline} className="btn-primary w-full justify-center">Guardar en Pipeline</button>
          </div>
        </ModalVentas>
      )}

      {/* MODAL CITAS */}
      {modalCitas && (
        <ModalVentas title="Agendar Nueva Cita" onClose={() => setModalCitas(false)}>
          <div className="space-y-4 text-xs">
            {/* Control cliente */}
            <div className="relative">
              <label className="label">Cliente *</label>
              <input className="input-field" placeholder="Escribe el nombre del cliente..." value={queryCliente} onChange={e => handleInputClienteChange(e.target.value)} />
              {sugerenciasClientes.length > 0 && !clienteValido && (
                <div className="absolute left-0 right-0 bg-dark-800 border border-slate-700 rounded-md p-1 mt-1 max-h-24 overflow-y-auto z-50">
                  {sugerenciasClientes.map(s => (
                    <button key={s.id} onClick={() => { setQueryCliente(s.nombre); setSugerenciasClientes([]); setClienteValido(true) }} className="w-full text-left p-1 hover:bg-blue-600 rounded text-white">{s.nombre}</button>
                  ))}
                </div>
              )}
              {!clienteValido && queryCliente.trim() && (
                <div className="p-2 bg-amber-900/20 border border-amber-500/40 rounded mt-1 text-amber-400"><button onClick={() => router.push('/clientes')} className="text-blue-400 underline font-semibold">Ir a registrar cliente en Directorio →</button></div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Fecha Reunión *</label><input type="date" className="input-field" onChange={e => setFormC({ ...formC, fechaReunion: e.target.value })} /></div>
              <div><label className="label">Horario (Hora) *</label><input type="time" className="input-field" onChange={e => setFormC({ ...formC, horario: e.target.value })} /></div>
              <div><label className="label">Contacto</label><input className="input-field" onChange={e => setFormC({ ...formC, contacto: e.target.value })} /></div>
              <div><label className="label">Cargo</label><input className="input-field" onChange={e => setFormC({ ...formC, cargo: e.target.value })} /></div>
              <div>
                <label className="label">Estado de Cita</label>
                <select className="input-field" value={formC.status} onChange={e => setFormC({ ...formC, status: e.target.value as any })}>
                  <option value="pendiente">Pendiente</option>
                  <option value="realizado">Realizado</option>
                  <option value="cancelado">Se canceló</option>
                </select>
              </div>
            </div>
            <button onClick={handleGuardarCita} className="btn-primary w-full justify-center">Agendar Cita</button>
          </div>
        </ModalVentas>
      )}

      {/* MODAL FIRMAS */}
      {modalFirmas && (
        <ModalVentas title="Registrar Firma de Contrato" onClose={() => setModalFirmas(false)}>
          <div className="space-y-4 text-xs">
            {/* Control cliente */}
            <div className="relative">
              <label className="label">Cliente *</label>
              <input className="input-field" value={queryCliente} onChange={e => handleInputClienteChange(e.target.value)} />
              {sugerenciasClientes.length > 0 && (
                <div className="absolute left-0 right-0 bg-dark-800 border border-slate-700 p-1 rounded z-50">
                  {sugerenciasClientes.map(s => <button key={s.id} onClick={() => { setQueryCliente(s.nombre); setClienteValido(true); setSugerenciasClientes([]) }} className="w-full text-left p-1 text-white hover:bg-blue-600 rounded">{s.nombre}</button>)}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Autorizado Por (Estricto)</label>
                <select className="input-field" onChange={e => setFormF({ ...formF, autorizadoPor: e.target.value })}>
                  <option value="Luis Matienzo">Luis Matienzo</option>
                  <option value="Karen Hiraoka">Karen Hiraoka</option>
                </select>
              </div>
              <div>
                <label className="label">Firmado Por (Estricto)</label>
                <select className="input-field" onChange={e => setFormF({ ...formF, firmadoPor: e.target.value })}>
                  {['Treyci Benavides', 'Yuriko garcia', 'Jose Luis', 'Jean Gutiérrez', 'Christian Gutiérrez', 'Miller ponte', 'Erick Espinoza'].map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Tipo de Documento (Selección Múltiple)</label>
                <div className="grid grid-cols-3 gap-2 p-2 bg-dark-800 border border-slate-700 rounded-lg">
                  {['ANEXOS', 'FILE', 'ADENDA', 'CARTA', 'APELACIÓN', 'CARTAFIANZA', 'FORMATO'].map(t => {
                    const tSel: string[] = (formF as any).tiposSeleccionados || []
                    const exists = tSel.includes(t)
                    return (
                      <label key={t} className="flex items-center gap-1.5 text-slate-300 text-[11px] cursor-pointer">
                        <input type="checkbox" checked={exists} onChange={() => {
                          const next = exists ? tSel.filter(x => x !== t) : [...tSel, t]
                          setFormF({ ...formF, tiposSeleccionados: next } as any)
                        }} />
                        {t}
                      </label>
                    )
                  })}
                </div>
              </div>
              <div>
                <label className="label">Fecha</label>
                <input type="date" className="input-field" onChange={e => setFormF({ ...formF, fecha: e.target.value })} />
              </div>
              <div>
                <label className="label">Código (Número identificador secuencial)</label>
                <input className="input-field" placeholder="Ej: 001" onChange={e => setFormF({ ...formF, codigo: e.target.value })} />
              </div>
            </div>
            <button onClick={handleGuardarFirma} className="btn-primary w-full justify-center">Registrar Firma</button>
          </div>
        </ModalVentas>
      )}
    </div>
  )
}

// Sub-Componente de interfaz interna estricta
function ModalVentas({ title, children, onClose }: { title: string, children: React.ReactNode, onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="font-semibold text-white text-sm">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  )
}
