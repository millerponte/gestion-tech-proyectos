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
  Trash2, Link2, Building2, Send, Merge, AlertCircle, CornerDownRight
} from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'

type Vista = 'bandeja' | 'tabla'

// Interfaz temporal para los mensajes del chat (se guardarán como array en el ticket)
interface MensajeChat {
  id: string
  texto: string
  tipo: 'entrante' | 'saliente'
  fecha: string
}

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
  const [nuevoMensaje, setNuevoMensaje] = useState('')
  const [modalUnir, setModalUnir] = useState(false)
  const [ticketMergeId, setTicketMergeId] = useState('')

  // Modal Crear/Editar
  const [modalAbierto, setModalAbierto] = useState(false)
  const [formData, setFormData] = useState<Partial<TicketOkinawa>>({})
  const [loadingForm, setLoadingForm] = useState(false)
  const [enviandoMensaje, setEnviandoMensaje] = useState(false)

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

      // Convertimos el requerimiento inicial en el primer mensaje del chat (entrante)
      const mensajeInicial: MensajeChat = {
        id: Date.now().toString(),
        texto: formData.requerimiento.trim(),
        tipo: 'entrante',
        fecha: new Date().toISOString()
      }

      await crearTicketOkinawa({
        numeroTicket,
        correoCliente: formData.correoCliente.trim(),
        asunto: formData.asunto.trim(),
        requerimiento: formData.requerimiento.trim(), // Lo mantenemos por compatibilidad
        fechaEnvio: formData.fechaEnvio || hoy(),
        sede: formData.sede?.trim() || '',
        marcaProducto: formData.marcaProducto?.trim() || '',
        estado: formData.estado as 'abierto' | 'en_proceso' | 'cerrado',
        proyectoId: proyectoVinculado?.id || '',
        proyectoNombre: proyectoVinculado?.nombre || '',
        createdAt: new Date().toISOString(),
        mensajes: [mensajeInicial] // Guardamos como array
      } as any)
      
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
    if(!confirm(`¿Eliminar el ticket ${num} con todo su historial?`)) return
    await eliminarTicketOkinawa(id)
    toast.success('Ticket eliminado')
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

  const enviarRespuestaChat = async () => {
    if (!ticketActivo || !nuevoMensaje.trim()) return
    setEnviandoMensaje(true)
    try {
      const nuevoMsg: MensajeChat = {
        id: Date.now().toString(),
        texto: nuevoMensaje.trim(),
        tipo: 'saliente',
        fecha: new Date().toISOString()
      }
      
      const historialPrevio = (ticketActivo as any).mensajes || [
        { id: '0', texto: ticketActivo.requerimiento, tipo: 'entrante', fecha: ticketActivo.createdAt }
      ]
      
      const nuevoHistorial = [...historialPrevio, nuevoMsg]

      // Aquí luego agregaremos el fetch('/api/enviar-correo-helpdesk') para que le llegue al cliente
      
      await actualizarTicketOkinawa(ticketActivo.id, { 
        mensajes: nuevoHistorial,
        estado: 'en_proceso' // Automáticamente pasa a en proceso al responder
      } as any)

      setTicketActivo({ ...ticketActivo, mensajes: nuevoHistorial, estado: 'en_proceso' } as any)
      setNuevoMensaje('')
      toast.success('Respuesta enviada y registrada')
    } catch {
      toast.error('Error al enviar respuesta')
    } finally {
      setEnviandoMensaje(false)
    }
  }

  const usarPlantilla = () => {
    setNuevoMensaje(`Hola, buenas días/tardes/noches.\n\nRespecto al requerimiento solicitado, se ha generado el ticket número #${ticketActivo?.numeroTicket}.\n\nSe asignará a uno de nuestros especialistas para la atención respectiva y se pondrá en contacto con usted.\n\nAtentamente,\n\nMesa de Ayuda\nSoporte de TI\nhelpdesk@okinawatec.com\nTelefono: +51 908 847 705\nLima – Perú`)
  }

  const handleUnirTickets = async () => {
    if (!ticketMergeId || !ticketActivo) return
    const ticketSecundario = tickets.find(t => t.numeroTicket === ticketMergeId || t.id === ticketMergeId)
    if (!ticketSecundario) {
      toast.error('No se encontró el ticket especificado')
      return
    }
    if (ticketSecundario.id === ticketActivo.id) {
      toast.error('No puedes unir un ticket consigo mismo')
      return
    }

    try {
      // Combina los historiales
      const historialPrincipal = (ticketActivo as any).mensajes || [{ id: '1', texto: ticketActivo.requerimiento, tipo: 'entrante', fecha: ticketActivo.createdAt }]
      const historialSecundario = (ticketSecundario as any).mensajes || [{ id: '2', texto: ticketSecundario.requerimiento, tipo: 'entrante', fecha: ticketSecundario.createdAt }]
      
      const nuevoHistorial = [...historialPrincipal, ...historialSecundario].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())

      await actualizarTicketOkinawa(ticketActivo.id, { mensajes: nuevoHistorial } as any)
      await eliminarTicketOkinawa(ticketSecundario.id) // Elimina el redundante
      
      toast.success(`Tickets fusionados en ${ticketActivo.numeroTicket}`)
      setModalUnir(false)
      cargar()
      setTicketActivo({...ticketActivo, mensajes: nuevoHistorial} as any)
    } catch {
      toast.error('Error al unir tickets')
    }
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
        // VISTA BANDEJA CON CHAT (2 Columnas)
        <div className="flex-1 flex gap-4 min-h-0">
          {/* Lista de Tickets */}
          <div className="w-1/3 flex flex-col gap-2 overflow-y-auto pr-1">
            {filtrados.map(t => (
              <button 
                key={t.id} 
                onClick={() => setTicketActivo(t)}
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

          {/* CHAT DEL TICKET */}
          <div className="w-2/3 bg-[#0d1526] border border-[#1e3a8a]/40 rounded-xl flex flex-col overflow-hidden relative">
            {ticketActivo ? (
              <>
                {/* Header del Ticket */}
                <div className="p-4 border-b border-[#1e3a8a]/30 flex-shrink-0 bg-[#111d35] flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold text-white">{ticketActivo.asunto}</h2>
                    <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                      <span className="font-mono text-emerald-400">{ticketActivo.numeroTicket}</span>
                      <span>•</span>
                      <span>{ticketActivo.correoCliente}</span>
                    </p>
                    {ticketActivo.proyectoNombre && (
                      <p className="text-xs text-blue-400 mt-1.5 flex items-center gap-1"><Link2 className="w-3 h-3"/> {ticketActivo.proyectoNombre}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setModalUnir(true)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg border border-slate-600 flex items-center gap-1.5 transition-colors">
                      <Merge className="w-3.5 h-3.5"/> Unir Ticket
                    </button>
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

                {/* Historial de Chat */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#0a101f]">
                  {((ticketActivo as any).mensajes || [{ id: 'init', texto: ticketActivo.requerimiento, tipo: 'entrante', fecha: ticketActivo.createdAt }]).map((msg: MensajeChat) => (
                    <div key={msg.id} className={clsx("flex flex-col", msg.tipo === 'saliente' ? 'items-end' : 'items-start')}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-medium text-slate-500">{msg.tipo === 'entrante' ? ticketActivo.correoCliente : 'Soporte Okinawatec'}</span>
                      </div>
                      <div className={clsx(
                        "p-3 rounded-2xl max-w-[85%] text-sm whitespace-pre-wrap leading-relaxed",
                        msg.tipo === 'saliente' 
                          ? 'bg-blue-600/90 text-white rounded-tr-sm border border-blue-500/50' 
                          : 'bg-[#111d35] text-slate-200 rounded-tl-sm border border-[#1e3a8a]/30'
                      )}>
                        {msg.texto}
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1">{new Date(msg.fecha).toLocaleString('es-PE')}</span>
                    </div>
                  ))}
                </div>

                {/* Caja de Respuesta */}
                <div className="p-4 bg-[#111d35] border-t border-[#1e3a8a]/30 flex-shrink-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Responder a {ticketActivo.correoCliente}</span>
                    <button onClick={usarPlantilla} className="text-xs text-blue-400 hover:text-blue-300 underline">Cargar plantilla de recepción</button>
                  </div>
                  <div className="relative">
                    <textarea 
                      className="w-full bg-[#0d1526] border border-slate-700 rounded-xl p-3 text-sm text-slate-200 h-28 focus:border-blue-500 focus:outline-none resize-none"
                      placeholder="Escribe tu respuesta aquí..."
                      value={nuevoMensaje}
                      onChange={e => setNuevoMensaje(e.target.value)}
                    />
                    <button 
                      onClick={enviarRespuestaChat}
                      disabled={!nuevoMensaje.trim() || enviandoMensaje}
                      className="absolute bottom-3 right-3 p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {enviandoMensaje ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"/> : <Send className="w-4 h-4"/>}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                <Inbox className="w-16 h-16 mb-4 opacity-20" />
                <p>Selecciona un ticket para ver la conversación</p>
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
                  <th className="tabla-header">Sede / Equipo</th>
                  <th className="tabla-header">Fecha</th>
                  <th className="tabla-header">Estado</th>
                  {isAdmin && <th className="tabla-header w-10"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a8a]/20">
                {filtrados.map(t => (
                  <tr key={t.id} className="tabla-row hover:bg-white/5 cursor-pointer" onClick={() => { setTicketActivo(t); setVista('bandeja') }}>
                    <td className="tabla-cell font-mono text-emerald-400 text-xs">{t.numeroTicket}</td>
                    <td className="tabla-cell text-slate-300 text-xs">{t.correoCliente}</td>
                    <td className="tabla-cell text-slate-200 text-sm max-w-[200px] truncate">{t.asunto}</td>
                    <td className="tabla-cell text-xs text-blue-400 truncate max-w-[150px]">{t.proyectoNombre || '—'}</td>
                    <td className="tabla-cell text-xs text-slate-400 truncate max-w-[150px]">
                      {t.sede} {t.sede && t.marcaProducto && '—'} {t.marcaProducto}
                    </td>
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

      {/* MODAL UNIR TICKETS */}
      {modalUnir && (
        <div className="modal-overlay z-[60]" onClick={e => e.target === e.currentTarget && setModalUnir(false)}>
          <div className="modal-box max-w-sm shadow-2xl">
            <div className="p-5 border-b border-[#1e3a8a]/30 bg-[#0d1526]">
              <h2 className="font-semibold text-white flex items-center gap-2"><Merge className="w-4 h-4 text-blue-400"/> Unir Tickets</h2>
              <p className="text-xs text-slate-400 mt-1">El historial del ticket que elijas se moverá al ticket actual ({ticketActivo?.numeroTicket}).</p>
            </div>
            <div className="p-5 bg-[#111d35]">
              <label className="label">N° de Ticket a fusionar</label>
              <input className="input-field font-mono" placeholder="Ej: OK2026HD0005" value={ticketMergeId} onChange={e => setTicketMergeId(e.target.value)} />
            </div>
            <div className="flex justify-end gap-3 p-5 bg-[#0d1526] border-t border-[#1e3a8a]/40">
              <button onClick={() => setModalUnir(false)} className="btn-secondary text-xs">Cancelar</button>
              <button onClick={handleUnirTickets} className="btn-primary text-xs"><Check className="w-3.5 h-3.5"/> Fusionar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
