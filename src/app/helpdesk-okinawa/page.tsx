'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { 
  obtenerTicketsOkinawa, crearTicketOkinawa, actualizarTicketOkinawa, eliminarTicketOkinawa, 
  generarNumeroTicketOkinawa, obtenerProyectos, hoy, formatearFecha
} from '@/lib/db'
import type { TicketOkinawa, Proyecto } from '@/types'
import { 
  Inbox, TableProperties, Plus, Search, Filter, Mail, Check, X, 
  Trash2, Link2, Building2, Send, Clock, AlertCircle
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

type Vista = 'bandeja' | 'tabla'

export default function HelpDeskOkinawaPage() {
  const { isAdmin } = useAuth()
  const [tickets, setTickets] = useState<TicketOkinawa[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [vista, setVista] = useState<Vista>('bandeja')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  
  // Selección en Bandeja
  const [ticketActivo, setTicketActivo] = useState<TicketOkinawa | null>(null)
  const [mostrandoRespuesta, setMostrandoRespuesta] = useState(false)

  // Modal Crear/Editar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [formData, setFormData] = useState<Partial<TicketOkinawa>>({})
  const [loadingForm, setLoadingForm] = useState(false)

  const cargar = async () => {
    setLoading(true)
    const [t, p] = await Promise.all([obtenerTicketsOkinawa(), obtenerProyectos()])
    setTickets(t)
    setProyectos(p.filter(x => x.estado === 'activo'))
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = tickets.filter(t => {
    const q = busqueda.toLowerCase()
    const coincide = !q || 
      t.numeroTicket.toLowerCase().includes(q) || 
      t.asunto.toLowerCase().includes(q) || 
      t.correoCliente.toLowerCase().includes(q) ||
      (t.proyectoNombre || '').toLowerCase().includes(q)
    return coincide && (!filtroEstado || t.estado === filtroEstado)
  })

  const abrirModalNuevo = () => {
    setFormData({
      correoCliente: '',
      asunto: '',
      requerimiento: '',
      sede: '',
      marcaProducto: '',
      estado: 'abierto',
      fechaEnvio: hoy(),
      proyectoId: ''
    })
    setModalAbierto(true)
  }

  const handleGuardarTicket = async () => {
    if (!formData.correoCliente || !formData.asunto || !formData.requerimiento) {
      toast.error('Completa los campos obligatorios (*)')
      return
    }
    setLoadingForm(true)
    try {
      const proyectoVinculado = proyectos.find(p => p.id === formData.proyectoId)
      const numeroTicket = await generarNumeroTicketOkinawa()

      await crearTicketOkinawa({
        numeroTicket,
        correoCliente: formData.correoCliente.trim(),
        asunto: formData.asunto.trim(),
        requerimiento: formData.requerimiento.trim(),
        fechaEnvio: formData.fechaEnvio || hoy(),
        sede: formData.sede?.trim() || '',
        marcaProducto: formData.marcaProducto?.trim() || '',
        estado: formData.estado as 'abierto' | 'en_proceso' | 'cerrado',
        proyectoId: proyectoVinculado?.id || '',
        proyectoNombre: proyectoVinculado?.nombre || '',
        createdAt: new Date().toISOString()
      })
      
      toast.success(`Ticket ${numeroTicket} registrado`)
      setModalAbierto(false)
      cargar()
    } catch {
      toast.error('Error al guardar el ticket')
    } finally {
      setLoadingForm(false)
    }
  }

  const handleEliminar = async (id: string, num: string) => {
    if(!confirm(`¿Eliminar el ticket ${num}?`)) return
    await eliminarTicketOkinawa(id)
    toast.success('Eliminado')
    if(ticketActivo?.id === id) setTicketActivo(null)
    cargar()
  }

  const cambiarEstado = async (id: string, nuevoEstado: 'abierto' | 'en_proceso' | 'cerrado') => {
    await actualizarTicketOkinawa(id, { 
      estado: nuevoEstado,
      fechaCierre: nuevoEstado === 'cerrado' ? hoy() : ''
    })
    toast.success('Estado actualizado')
    cargar()
    if(ticketActivo?.id === id) {
      setTicketActivo(prev => prev ? {...prev, estado: nuevoEstado} : null)
    }
  }

  const PlantillaRespuesta = () => {
    if (!ticketActivo) return null
    const textoPlantilla = `Hola, buenas días/tardes/noches.\n\nRespecto al requerimiento solicitado, se ha generado el ticket número #${ticketActivo.numeroTicket}.\n\nSe asignará a uno de nuestros especialistas para la atención respectiva y se pondrá en contacto con usted.\n\nAtentamente,\n\nMesa de Ayuda\nSoporte de TI\nhelpdesk@okinawatec.com\nTelefono: +51 908 847 705\nLima – Perú`
    
    return (
      <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-4 mt-4 animate-fade-in">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-medium text-white flex items-center gap-2"><Mail className="w-4 h-4 text-blue-400"/> Respuesta Rápida</p>
          <button onClick={() => setMostrandoRespuesta(false)} className="text-slate-500 hover:text-white"><X className="w-4 h-4"/></button>
        </div>
        <textarea 
          readOnly
          className="w-full bg-[#111d35] border border-[#1e3a8a]/30 rounded-lg p-3 text-sm text-slate-300 h-64 focus:outline-none resize-none font-sans"
          value={textoPlantilla}
        />
        <div className="flex justify-end gap-3 mt-3">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(textoPlantilla)
              toast.success('Plantilla copiada al portapapeles')
            }} 
            className="btn-secondary text-xs"
          >
            Copiar texto
          </button>
          <a 
            href={`mailto:${ticketActivo.correoCliente}?subject=Re: ${ticketActivo.asunto}&body=${encodeURIComponent(textoPlantilla)}`}
            className="btn-primary text-xs"
          >
            <Send className="w-3.5 h-3.5"/> Abrir en Correo
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5 animate-fade-in flex flex-col h-[calc(100vh-80px)]">
      {/* Header */}
      <div className="flex flex-shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <Mail className="w-6 h-6 text-emerald-400" /> Help Desk Okinawa
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Gestión de tickets de soporte y requerimientos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-[#0d1526] border border-[#1e3a8a]/50 rounded-xl p-1">
            <button onClick={() => setVista('bandeja')} className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all', vista === 'bandeja' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white')}>
              <Inbox className="w-4 h-4" /> Bandeja
            </button>
            <button onClick={() => setVista('tabla')} className={clsx('flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all', vista === 'tabla' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white')}>
              <TableProperties className="w-4 h-4" /> Tabla
            </button>
          </div>
          <button onClick={abrirModalNuevo} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo Ticket
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex-shrink-0 bg-[#0d1526] border border-[#1e3a8a]/40 rounded-xl p-2.5 flex gap-3">
        <div className="flex-1 max-w-sm flex items-center gap-2 bg-[#111d35] border border-slate-700/50 rounded-lg px-3 py-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400" />
          <input className="bg-transparent border-none outline-none text-xs text-slate-200 w-full" placeholder="Buscar ticket, asunto, correo..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="flex items-center bg-[#111d35] border border-slate-700/50 rounded-lg px-3 py-1">
          <Filter className="w-3.5 h-3.5 text-slate-400 mr-2" />
          <select className="bg-transparent text-xs text-slate-300 border-none outline-none cursor-pointer py-0.5 focus:ring-0 [&>option]:bg-[#111d35]" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="abierto">Abiertos</option>
            <option value="en_proceso">En Proceso</option>
            <option value="cerrado">Cerrados</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex justify-center items-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex-1 card flex flex-col justify-center items-center text-center">
          <Inbox className="w-12 h-12 text-slate-600 mb-3" />
          <p className="text-slate-400">No hay tickets que coincidan con la búsqueda.</p>
        </div>
      ) : vista === 'bandeja' ? (
        // VISTA BANDEJA (2 Columnas)
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Lista de Tickets */}
          <div className="w-1/3 flex flex-col gap-2 overflow-y-auto pr-1">
            {filtrados.map(t => (
              <button 
                key={t.id} 
                onClick={() => { setTicketActivo(t); setMostrandoRespuesta(false) }}
                className={clsx(
                  "w-full text-left p-4 rounded-xl border transition-all duration-200 flex flex-col gap-2",
                  ticketActivo?.id === t.id 
                    ? "bg-blue-900/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]" 
                    : "bg-[#0d1526] border-[#1e3a8a]/30 hover:border-blue-500/30 hover:bg-[#111d35]"
                )}
              >
                <div className="flex justify-between items-start">
                  <span className="font-mono text-xs font-medium text-emerald-400">{t.numeroTicket}</span>
                  <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border", 
                    t.estado === 'abierto' ? 'bg-amber-900/30 text-amber-300 border-amber-700/40' :
                    t.estado === 'en_proceso' ? 'bg-blue-900/30 text-blue-300 border-blue-700/40' :
                    'bg-slate-800 text-slate-400 border-slate-700'
                  )}>
                    {t.estado === 'en_proceso' ? 'en proceso' : t.estado}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-slate-200 text-sm line-clamp-1">{t.asunto}</p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">{t.correoCliente}</p>
                </div>
                {t.proyectoNombre && (
                  <div className="flex items-center gap-1.5 mt-1 text-[11px] text-blue-400 bg-blue-900/20 px-2 py-1 rounded w-fit max-w-full">
                    <Building2 className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{t.proyectoNombre}</span>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Detalle del Ticket Activo */}
          <div className="w-2/3 bg-[#0d1526] border border-[#1e3a8a]/40 rounded-xl flex flex-col overflow-hidden">
            {ticketActivo ? (
              <>
                <div className="p-6 border-b border-[#1e3a8a]/30 flex-shrink-0 bg-[#111d35]">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-white">{ticketActivo.asunto}</h2>
                      <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                        <span className="font-mono text-emerald-400">{ticketActivo.numeroTicket}</span>
                        <span>•</span>
                        <span>{formatearFecha(ticketActivo.fechaEnvio)}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select 
                        className={clsx("input-field text-xs py-1.5 w-auto", 
                          ticketActivo.estado === 'abierto' && "!text-amber-400 !border-amber-700/50",
                          ticketActivo.estado === 'en_proceso' && "!text-blue-400 !border-blue-700/50",
                          ticketActivo.estado === 'cerrado' && "!text-slate-400"
                        )}
                        value={ticketActivo.estado}
                        onChange={e => cambiarEstado(ticketActivo.id, e.target.value as any)}
                      >
                        <option value="abierto">Abierto</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="cerrado">Cerrado</option>
                      </select>
                      {isAdmin && (
                        <button onClick={() => handleEliminar(ticketActivo.id, ticketActivo.numeroTicket)} className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs">
                    <div className="bg-[#0d1526] px-3 py-2 rounded-lg border border-[#1e3a8a]/30 flex-1 min-w-[200px]">
                      <p className="text-slate-500 mb-0.5">Cliente (Correo)</p>
                      <p className="text-slate-200 font-medium">{ticketActivo.correoCliente}</p>
                    </div>
                    {(ticketActivo.sede || ticketActivo.marcaProducto) && (
                      <div className="bg-[#0d1526] px-3 py-2 rounded-lg border border-[#1e3a8a]/30 flex-1 min-w-[200px]">
                        <p className="text-slate-500 mb-0.5">Sede / Producto</p>
                        <p className="text-slate-200 font-medium">
                          {ticketActivo.sede} {ticketActivo.sede && ticketActivo.marcaProducto && '—'} {ticketActivo.marcaProducto}
                        </p>
                      </div>
                    )}
                    {ticketActivo.proyectoNombre && (
                      <div className="bg-blue-900/10 px-3 py-2 rounded-lg border border-blue-800/30 flex-1 min-w-[250px]">
                        <p className="text-blue-400/70 mb-0.5 flex items-center gap-1"><Link2 className="w-3 h-3"/> Proyecto Vinculado</p>
                        <p className="text-blue-300 font-medium truncate">{ticketActivo.proyectoNombre}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="bg-[#111d35] rounded-lg p-5 border border-[#1e3a8a]/20 text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {ticketActivo.requerimiento}
                  </div>
                  
                  {mostrandoRespuesta ? <PlantillaRespuesta /> : (
                    <button 
                      onClick={() => setMostrandoRespuesta(true)}
                      className="mt-6 flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm transition-colors border border-slate-600"
                    >
                      <Mail className="w-4 h-4"/> Redactar respuesta de ticket
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <Inbox className="w-16 h-16 mb-4 opacity-20" />
                <p>Selecciona un ticket para ver los detalles</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // VISTA TABLA
        <div className="flex-1 card p-0 overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto flex-1">
            <table className="w-full">
              <thead className="bg-[#0d1526] border-b border-[#1e3a8a]/50 sticky top-0 z-10">
                <tr>
                  <th className="tabla-header">N° Ticket</th>
                  <th className="tabla-header">Correo Cliente</th>
                  <th className="tabla-header">Asunto</th>
                  <th className="tabla-header">Proyecto Vinculado</th>
                  <th className="tabla-header">Envío</th>
                  <th className="tabla-header">Estado</th>
                  {isAdmin && <th className="tabla-header w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a8a]/20">
                {filtrados.map(t => (
                  <tr key={t.id} className="tabla-row hover:bg-white/5 cursor-pointer" onClick={() => { setTicketActivo(t); setVista('bandeja') }}>
                    <td className="tabla-cell font-mono text-emerald-400 text-xs">{t.numeroTicket}</td>
                    <td className="tabla-cell text-slate-300 text-xs">{t.correoCliente}</td>
                    <td className="tabla-cell text-slate-200 text-sm max-w-[250px] truncate">{t.asunto}</td>
                    <td className="tabla-cell text-xs text-blue-400 truncate max-w-[200px]">{t.proyectoNombre || '—'}</td>
                    <td className="tabla-cell text-xs text-slate-400">{formatearFecha(t.fechaEnvio)}</td>
                    <td className="tabla-cell">
                      <span className={clsx("text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap", 
                        t.estado === 'abierto' ? 'bg-amber-900/30 text-amber-300 border-amber-700/40' :
                        t.estado === 'en_proceso' ? 'bg-blue-900/30 text-blue-300 border-blue-700/40' :
                        'bg-slate-800 text-slate-400 border-slate-700'
                      )}>
                        {t.estado === 'en_proceso' ? 'en proceso' : t.estado}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="tabla-cell" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleEliminar(t.id, t.numeroTicket)} className="text-slate-500 hover:text-red-400">
                          <Trash2 className="w-4 h-4"/>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL CREAR TICKET MANUAL */}
      {modalAbierto && (
        <div className="modal-overlay z-50" onClick={e => e.target === e.currentTarget && setModalAbierto(false)}>
          <div className="modal-box shadow-2xl max-w-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[#1e3a8a]/40 bg-[#0d1526]">
              <h2 className="font-display font-semibold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400"/> Registrar Ticket Manual
              </h2>
              <button onClick={() => setModalAbierto(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="p-5 space-y-4 bg-[#111d35]">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Correo del Cliente *</label>
                  <input className="input-field" placeholder="ejemplo@cliente.gob.pe" value={formData.correoCliente} onChange={e => setFormData({...formData, correoCliente: e.target.value})} />
                </div>
                <div>
                  <label className="label flex items-center gap-1"><Link2 className="w-3.5 h-3.5"/> Proyecto Vinculado</label>
                  <select className="input-field" value={formData.proyectoId} onChange={e => setFormData({...formData, proyectoId: e.target.value})}>
                    <option value="">-- Sin vincular --</option>
                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.solucion || p.nombre} ({p.clienteNombre})</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Asunto del Ticket *</label>
                <input className="input-field" placeholder="Ej: Error en conexión VPN" value={formData.asunto} onChange={e => setFormData({...formData, asunto: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Sede / Ubicación</label>
                  <input className="input-field" placeholder="Ej: Zona Registral N° XIII" value={formData.sede} onChange={e => setFormData({...formData, sede: e.target.value})} />
                </div>
                <div>
                  <label className="label">Marca / Producto</label>
                  <input className="input-field" placeholder="Ej: Fortinet - Firewall" value={formData.marcaProducto} onChange={e => setFormData({...formData, marcaProducto: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="label">Requerimiento / Mensaje original *</label>
                <textarea className="input-field resize-none h-32" placeholder="Pega aquí el contenido del correo o la solicitud del cliente..." value={formData.requerimiento} onChange={e => setFormData({...formData, requerimiento: e.target.value})} />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 bg-[#0d1526] border-t border-[#1e3a8a]/40">
              <button onClick={() => setModalAbierto(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleGuardarTicket} disabled={loadingForm} className="btn-primary">
                {loadingForm ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> : <><Check className="w-4 h-4"/> Guardar Ticket</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
