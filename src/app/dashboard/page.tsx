'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { obtenerProyectos, obtenerHitos, obtenerClientes, obtenerTicketsOkinawa, formatearFecha, hoy } from '@/lib/db'
import type { Proyecto, Hito, Cliente, TicketOkinawa } from '@/types'
import { LayoutDashboard, Search, Calendar as CalIcon, ChevronLeft, ChevronRight, Clock, Building2, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import clsx from 'clsx'

// ─── COMPONENTE GALÁCTICO (GERENCIA) ──────────────────────────────────────────
const GalacticMetrics = ({ clientes, proyectos, hitos }: { clientes: Cliente[], proyectos: Proyecto[], hitos: Hito[] }) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Preparamos los "Planetas" (Datos por Cliente)
  const orbs = useMemo(() => {
    return clientes.map(c => {
      const proys = proyectos.filter(p => p.clienteId === c.id && p.estado === 'activo')
      const pIds = proys.map(p => p.id)
      const tasks = hitos.filter(h => pIds.includes(h.proyectoId) && h.estado === 'pendiente')
      return { id: c.id, nombre: c.nombre, color: c.color || '#3b82f6', proyectos: proys.length, tareas: tasks.length }
    }).filter(o => o.proyectos > 0 || o.tareas > 0) // Solo mostramos los que tienen actividad
  }, [clientes, proyectos, hitos])

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % (orbs.length || 1))
    }, 4000) // Rota cada 4 segundos
  }

  useEffect(() => {
    if (!isPaused && orbs.length > 0) startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPaused, orbs.length])

  const handleOrbClick = (idx: number) => {
    setActiveIndex(idx)
    setIsPaused(true)
    if (timerRef.current) clearInterval(timerRef.current)
    // Se pausa por 10 segundos y luego continúa automáticamente
    setTimeout(() => {
      setIsPaused(false)
    }, 10000)
  }

  if (orbs.length === 0) return null

  return (
    <div className="relative w-full h-[400px] bg-[#050b14] border border-[#1e3a8a]/40 rounded-2xl overflow-hidden shadow-[inset_0_0_100px_rgba(30,58,138,0.2)] mb-6 flex items-center justify-center">
      {/* Background stars / grid */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a101f] pointer-events-none" />
      
      {/* Central Title */}
      <div className="absolute top-6 left-8 z-10">
        <h2 className="text-2xl font-display font-bold text-white tracking-wide">Visión Operativa</h2>
        <p className="text-slate-400 text-sm">Distribución de carga por cliente {isPaused && <span className="text-amber-400 animate-pulse text-xs ml-2">(Pausado 10s)</span>}</p>
      </div>

      <div className="relative w-full h-full max-w-4xl mx-auto flex items-center justify-center">
        {orbs.map((orb, i) => {
          const isActive = i === activeIndex
          // Lógica orbital: Calculamos la posición en un círculo
          const angle = ((i - activeIndex) / orbs.length) * Math.PI * 2
          const radius = isActive ? 0 : 200 // El activo va al centro (radio 0)
          const scale = isActive ? 1.5 : 0.6
          const opacity = isActive ? 1 : 0.4
          const zIndex = isActive ? 50 : 10
          
          const x = Math.sin(angle) * radius
          const y = -Math.cos(angle) * (radius * 0.3) // Órbita elíptica

          return (
            <div 
              key={orb.id}
              onClick={() => handleOrbClick(i)}
              className="absolute transition-all duration-1000 ease-in-out cursor-pointer flex flex-col items-center justify-center rounded-full"
              style={{
                transform: `translate(${x}px, ${y}px) scale(${scale})`,
                opacity,
                zIndex,
                width: isActive ? '180px' : '100px',
                height: isActive ? '180px' : '100px',
                background: `radial-gradient(circle at 30% 30%, ${orb.color} 0%, #000 100%)`,
                boxShadow: isActive ? `0 0 50px ${orb.color}80, inset 0 0 20px rgba(255,255,255,0.2)` : `0 0 15px ${orb.color}40`
              }}
            >
              <span className={clsx("font-bold text-white text-center drop-shadow-md px-4", isActive ? "text-lg leading-tight" : "text-[10px]")}>
                {orb.nombre}
              </span>
              {isActive && (
                <div className="mt-2 text-center animate-fade-in">
                  <p className="text-xs text-white/80"><strong className="text-white text-lg">{orb.proyectos}</strong> Proyectos</p>
                  <p className="text-xs text-white/80"><strong className="text-white text-lg">{orb.tareas}</strong> Tareas</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}


// ─── DASHBOARD PRINCIPAL ──────────────────────────────────────────────────────
export default function DashboardPage() {
  const { usuario } = useAuth()
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [hitos, setHitos] = useState<Hito[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tickets, setTickets] = useState<TicketOkinawa[]>([])
  const [loading, setLoading] = useState(true)

  // Buscador y Calendario
  const [searchQuery, setSearchQuery] = useState('')
  const [vistaCal, setVistaCal] = useState<'mes' | 'dia'>('mes')
  const [fechaActual, setFechaActual] = useState(new Date())

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const [p, h, c, t] = await Promise.all([obtenerProyectos(), obtenerHitos(), obtenerClientes(), obtenerTicketsOkinawa()])
      setProyectos(p)
      setHitos(h)
      setClientes(c)
      setTickets(t)
      setLoading(false)
    }
    fetchData()
  }, [])

  // 1. Unir datos para métricas y calendario
  const hitosEnriquecidos = useMemo(() => {
    return hitos.map(h => {
      const p = proyectos.find(x => x.id === h.proyectoId)
      const c = clientes.find(x => x.id === p?.clienteId)
      return {
        ...h,
        proyectoNombre: p?.nombre || 'Desconocido',
        clienteNombre: c?.nombre || 'Desconocido',
        color: c?.color || '#3b82f6',
        solucion: p?.solucion || '',
        numeroContrato: p?.numeroContrato || ''
      }
    })
  }, [hitos, proyectos, clientes])

  // 2. Lógica del Buscador en tiempo real
  const pendientesBuscador = useMemo(() => {
    const pendientes = hitosEnriquecidos.filter(h => h.estado === 'pendiente' || h.estado === 'vencido')
    if (!searchQuery) return pendientes
    const q = searchQuery.toLowerCase()
    return pendientes.filter(h => 
      h.nombre.toLowerCase().includes(q) || 
      h.proyectoNombre.toLowerCase().includes(q) || 
      h.clienteNombre.toLowerCase().includes(q) ||
      h.solucion.toLowerCase().includes(q) ||
      h.numeroContrato.toLowerCase().includes(q)
    )
  }, [hitosEnriquecidos, searchQuery])

  // 3. Lógica del Calendario
  const diasMes = useMemo(() => {
    const year = fechaActual.getFullYear()
    const month = fechaActual.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    // Rellenar espacios vacíos al inicio (lunes a domingo)
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6 // Si es domingo, el offset es 6
    
    for (let i = 0; i < startOffset; i++) {
      days.push({ date: null, events: [] })
    }
    
    // Rellenar los días reales
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const events = hitosEnriquecidos.filter(h => h.fechaLimite === dString)
      days.push({ date: i, fullDate: dString, events })
    }
    return days
  }, [fechaActual, hitosEnriquecidos])

  const mesNombre = fechaActual.toLocaleString('es-ES', { month: 'long', year: 'numeric' })
  const diaNombre = fechaActual.toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
  const esHoy = (dString: string) => dString === hoy()

  const cambiarMes = (dir: number) => {
    setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + dir, 1))
    setVistaCal('mes')
  }

  const verDia = (dayString: string) => {
    const [y, m, d] = dayString.split('-').map(Number)
    setFechaActual(new Date(y, m - 1, d))
    setVistaCal('dia')
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      
      {/* 1. SECCIÓN DIRECTIVA (GALÁCTICA Y MÉTRICAS) */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white mb-4">Dashboard Gerencial</h1>
        <GalacticMetrics clientes={clientes} proyectos={proyectos} hitos={hitos} />
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-[#0d1526] border border-[#1e3a8a]/40 p-4 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-900/30 flex items-center justify-center text-blue-400"><Building2 className="w-5 h-5"/></div>
            <div><p className="text-2xl font-bold text-white">{proyectos.filter(p=>p.estado==='activo').length}</p><p className="text-xs text-slate-400">Proyectos Activos</p></div>
          </div>
          <div className="bg-[#0d1526] border border-[#1e3a8a]/40 p-4 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-900/30 flex items-center justify-center text-amber-400"><Clock className="w-5 h-5"/></div>
            <div><p className="text-2xl font-bold text-white">{hitos.filter(h=>h.estado==='pendiente').length}</p><p className="text-xs text-slate-400">Tareas Pendientes</p></div>
          </div>
          <div className="bg-[#0d1526] border border-[#1e3a8a]/40 p-4 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-900/30 flex items-center justify-center text-red-400"><AlertCircle className="w-5 h-5"/></div>
            <div><p className="text-2xl font-bold text-white">{hitos.filter(h=>h.estado==='vencido').length}</p><p className="text-xs text-slate-400">Hitos Vencidos</p></div>
          </div>
          <div className="bg-[#0d1526] border border-[#1e3a8a]/40 p-4 rounded-xl flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-900/30 flex items-center justify-center text-emerald-400"><CheckCircle2 className="w-5 h-5"/></div>
            <div><p className="text-2xl font-bold text-white">{tickets.filter(t=>t.estado==='abierto').length}</p><p className="text-xs text-slate-400">Tickets de Soporte</p></div>
          </div>
        </div>
      </div>

      {/* 2. BUSCADOR DE PENDIENTES */}
      <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-amber-400"/> Tareas y Entregables Pendientes</h2>
            <p className="text-xs text-slate-400 mt-1">Busca por cliente, proyecto, contrato o entregable en tiempo real.</p>
          </div>
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              className="w-full bg-[#111d35] border border-slate-700 focus:border-blue-500 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 outline-none transition-colors" 
              placeholder="Ej: SUNARP, Firewall, OK2026..." 
              value={searchQuery} 
              onChange={e => setSearchQuery(e.target.value)} 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-700/50 text-xs text-slate-400">
                <th className="pb-3 font-medium">Entregable / Tarea</th>
                <th className="pb-3 font-medium">Cliente</th>
                <th className="pb-3 font-medium">Proyecto y Solución</th>
                <th className="pb-3 font-medium">Fecha Límite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pendientesBuscador.slice(0, 8).map(h => (
                <tr key={h.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 pr-4">
                    <p className="text-sm text-slate-200 font-medium">{h.nombre}</p>
                    <span className={clsx("text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block", h.estado === 'vencido' ? "bg-red-900/30 text-red-400" : "bg-amber-900/30 text-amber-400")}>
                      {h.estado.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: h.color }}></span>
                      {h.clienteNombre}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-sm text-blue-400">{h.proyectoNombre}</p>
                    <p className="text-xs text-slate-500">{h.solucion} {h.numeroContrato ? `(${h.numeroContrato})` : ''}</p>
                  </td>
                  <td className="py-3 text-sm text-slate-300 font-mono">
                    {h.fechaLimite !== 'por definir' ? formatearFecha(h.fechaLimite) : '—'}
                  </td>
                </tr>
              ))}
              {pendientesBuscador.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-slate-500">No se encontraron tareas con esa búsqueda.</td></tr>
              )}
            </tbody>
          </table>
          {pendientesBuscador.length > 8 && (
            <p className="text-center text-xs text-slate-500 mt-4">+ {pendientesBuscador.length - 8} resultados más (Usa el buscador para filtrar)</p>
          )}
        </div>
      </div>

      {/* 3. CALENDARIO ESTILO GOOGLE CALENDAR */}
      <div className="bg-[#0a0f1c] border border-[#1e3a8a]/40 rounded-2xl overflow-hidden shadow-lg">
        {/* Cabecera del Calendario */}
        <div className="p-4 bg-[#0d1526] border-b border-[#1e3a8a]/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <CalIcon className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-bold text-white capitalize">
              {vistaCal === 'mes' ? mesNombre : diaNombre}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {vistaCal === 'dia' && (
              <button onClick={() => setVistaCal('mes')} className="text-xs text-blue-400 hover:text-blue-300 bg-blue-900/20 px-3 py-1.5 rounded-lg transition-colors">
                Volver al Mes
              </button>
            )}
            <div className="flex items-center bg-[#111d35] rounded-lg border border-slate-700 overflow-hidden">
              <button onClick={() => vistaCal === 'mes' ? cambiarMes(-1) : setFechaActual(new Date(fechaActual.getTime() - 86400000))} className="p-1.5 hover:bg-slate-700 text-slate-300"><ChevronLeft className="w-4 h-4"/></button>
              <button onClick={() => setFechaActual(new Date())} className="px-3 py-1.5 text-xs font-medium text-slate-200 border-x border-slate-700 hover:bg-slate-700">Hoy</button>
              <button onClick={() => vistaCal === 'mes' ? cambiarMes(1) : setFechaActual(new Date(fechaActual.getTime() + 86400000))} className="p-1.5 hover:bg-slate-700 text-slate-300"><ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        </div>

        {/* VISTA DE MES */}
        {vistaCal === 'mes' && (
          <div className="grid grid-cols-7 text-center">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800/50 bg-[#0d1526]/50">{d}</div>
            ))}
            
            {diasMes.map((dia, idx) => (
              <div 
                key={idx} 
                onClick={() => dia.date && verDia(dia.fullDate as string)}
                className={clsx(
                  "min-h-[100px] p-1 border-b border-r border-slate-800/50 transition-colors relative cursor-pointer",
                  dia.date ? "hover:bg-[#1e3a8a]/10" : "bg-[#05080f]",
                  dia.fullDate && esHoy(dia.fullDate) && "bg-blue-900/10"
                )}
              >
                {dia.date && (
                  <>
                    <div className="flex justify-center mb-1">
                      <span className={clsx("text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full", dia.fullDate && esHoy(dia.fullDate) ? "bg-blue-600 text-white" : "text-slate-400")}>
                        {dia.date}
                      </span>
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[70px] no-scrollbar">
                      {dia.events?.map(ev => (
                        <div 
                          key={ev.id} 
                          className="text-[9px] px-1.5 py-0.5 rounded truncate text-white border border-black/20"
                          style={{ backgroundColor: ev.color }}
                          title={`${ev.clienteNombre} - ${ev.nombre}`}
                        >
                          {ev.nombre}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* VISTA DE DÍA (Agenda 9 AM - 6 PM) */}
        {vistaCal === 'dia' && (
          <div className="flex flex-col bg-[#0a0f1c] min-h-[500px] overflow-y-auto">
            <div className="p-4 bg-blue-900/10 border-b border-blue-800/30 text-sm text-blue-300">
              Horario Laboral asignado para entregas y tareas críticas del día.
            </div>
            <div className="flex flex-1 relative">
              {/* Columna de Horas */}
              <div className="w-16 border-r border-slate-800 flex flex-col pt-4">
                {[9, 10, 11, 12, 1, 2, 3, 4, 5, 6].map((h, i) => (
                  <div key={h} className="h-20 text-[10px] text-slate-500 text-right pr-2 font-medium">
                    {h} {i < 3 ? 'AM' : 'PM'}
                  </div>
                ))}
              </div>
              
              {/* Grid y Tareas */}
              <div className="flex-1 relative bg-[linear-gradient(rgba(30,41,59,0.2)_1px,transparent_1px)] bg-[length:100%_80px] pt-4 pr-4">
                {(() => {
                  const dString = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}-${String(fechaActual.getDate()).padStart(2, '0')}`
                  const tareasDelDia = hitosEnriquecidos.filter(h => h.fechaLimite === dString)
                  
                  if (tareasDelDia.length === 0) return (
                    <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                      No hay pendientes programados para este día.
                    </div>
                  )

                  return (
                    <div className="flex flex-col gap-2 relative z-10 px-2">
                      {tareasDelDia.map(ev => (
                        <div 
                          key={ev.id} 
                          className="w-full rounded-lg p-3 shadow-lg border border-white/10"
                          style={{ backgroundColor: ev.color, opacity: 0.9 }}
                        >
                          <p className="text-white text-sm font-bold truncate drop-shadow-md">{ev.nombre}</p>
                          <p className="text-white/80 text-xs truncate mt-0.5">{ev.clienteNombre} — {ev.proyectoNombre}</p>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
