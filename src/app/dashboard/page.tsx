'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { obtenerProyectos, obtenerHitos, obtenerClientes, obtenerTicketsOkinawa, formatearFecha, hoy } from '@/lib/db'
import type { Proyecto, Hito, Cliente, TicketOkinawa } from '@/types'
import { LayoutDashboard, Search, Calendar as CalIcon, ChevronLeft, ChevronRight, Clock, Building2, CheckCircle2, AlertCircle, FileText, BarChart3, ListTodo, Target, TrendingUp } from 'lucide-react'
import clsx from 'clsx'

// ─── COMPONENTE GALÁCTICO (ESTILO ORION) ──────────────────────────────────
const GalacticMetrics = ({ clientes, proyectos, hitos }: { clientes: Cliente[], proyectos: Proyecto[], hitos: Hito[] }) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const orbs = useMemo(() => {
    return clientes.map(c => {
      const proys = proyectos.filter(p => p.clienteId === c.id && p.estado === 'activo')
      const tasks = hitos.filter(h => proys.map(p => p.id).includes(h.proyectoId) && h.estado === 'pendiente')
      return { id: c.id, nombre: c.nombre, color: c.color || '#ff007f', proyectos: proys.length, tareas: tasks.length }
    }).filter(o => o.proyectos > 0 || o.tareas > 0)
  }, [clientes, proyectos, hitos])

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % (orbs.length || 1))
    }, 4000)
  }

  useEffect(() => {
    if (!isPaused && orbs.length > 0) startTimer()
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPaused, orbs.length])

  const handleOrbClick = (idx: number) => {
    setActiveIndex(idx)
    setIsPaused(true)
    if (timerRef.current) clearInterval(timerRef.current)
    setTimeout(() => setIsPaused(false), 10000)
  }

  const activosTotal = proyectos.filter(p => p.estado === 'activo').length
  const pendientesTotal = hitos.filter(h => h.estado === 'pendiente').length
  const vencidosTotal = hitos.filter(h => h.estado === 'vencido').length

  return (
    <div className="w-full bg-[#111322] border border-[#2a2d45] rounded-3xl p-6 shadow-2xl flex flex-col lg:flex-row gap-8 mb-6">
      
      {/* LEFT PANEL: Statistics */}
      <div className="lg:w-1/4 space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6">Statistics</h2>
        
        {/* Main Circle Stat */}
        <div className="bg-[#1a1d36] rounded-2xl p-6 border border-[#2a2d45] flex flex-col items-center justify-center relative overflow-hidden shadow-lg">
          <div className="w-24 h-24 rounded-full border-[6px] border-[#8b5cf6] border-t-[#0ea5e9] flex items-center justify-center mb-4">
            <Target className="w-6 h-6 text-[#8b5cf6]" />
          </div>
          <p className="text-slate-400 text-sm">Total Proyectos</p>
          <p className="text-2xl font-bold text-white">{activosTotal}</p>
          <div className="w-full mt-4 space-y-2">
            <div className="flex justify-between text-xs text-slate-400"><span>En Proceso</span><span className="text-white">{activosTotal}</span></div>
            <div className="flex justify-between text-xs text-slate-400"><span>Completados</span><span className="text-white">{proyectos.filter(p=>p.estado==='completado').length}</span></div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="bg-[#1a1d36] rounded-2xl p-6 border border-[#2a2d45] shadow-lg">
          <p className="text-slate-400 text-sm">Pendientes Globales</p>
          <p className="text-2xl font-bold text-white flex items-center gap-2">
            {pendientesTotal} <TrendingUp className="w-4 h-4 text-emerald-400"/>
          </p>
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-slate-400 text-sm">Hitos Vencidos</p>
            <p className="text-xl font-bold text-red-400">{vencidosTotal}</p>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL: Data Visualisation (The Orbs) */}
      <div className="lg:w-3/4 bg-[#14172b] rounded-2xl border border-[#2a2d45] relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
        {/* Timeline Header */}
        <div className="absolute top-6 w-full flex flex-col items-center z-20">
          <h3 className="text-2xl font-black text-white/10 uppercase tracking-widest absolute top-10">Data Visualisation</h3>
          <div className="flex gap-4 text-[10px] font-bold text-slate-500 uppercase">
            <span className="hover:text-white cursor-pointer transition">1W</span>
            <span className="hover:text-white cursor-pointer transition">1M</span>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]">3M</span>
            <span className="hover:text-white cursor-pointer transition">1Y</span>
            <span className="hover:text-white cursor-pointer transition">ALL</span>
          </div>
          {isPaused && <span className="text-amber-400 animate-pulse text-xs mt-2 font-medium">Pausado (10s)</span>}
        </div>

        {/* Concentric Rings */}
        <div className="absolute w-[300px] h-[300px] border border-white/5 rounded-full" />
        <div className="absolute w-[450px] h-[450px] border border-white/5 rounded-full" />
        <div className="absolute w-[600px] h-[600px] border border-white/5 rounded-full" />
        
        {/* The Orbs */}
        <div className="relative w-full h-full flex items-center justify-center z-10">
          {orbs.map((orb, i) => {
            const isActive = i === activeIndex
            const angle = ((i - activeIndex) / orbs.length) * Math.PI * 2
            const radius = isActive ? 0 : 180
            const scale = isActive ? 1.4 : 0.6
            const opacity = isActive ? 1 : 0.7
            const zIndex = isActive ? 50 : 10
            
            const x = Math.sin(angle) * radius
            const y = -Math.cos(angle) * (radius * 0.4) // Elipse plana
            
            // Neon Glow CSS
            const orbStyle = {
              transform: `translate(${x}px, ${y}px) scale(${scale})`,
              opacity, zIndex,
              width: isActive ? '160px' : '90px', 
              height: isActive ? '160px' : '90px',
              background: `radial-gradient(circle at 30% 30%, ${orb.color} 0%, #1a0b2e 100%)`,
              boxShadow: isActive 
                ? `0 0 40px ${orb.color}, inset -10px -10px 20px rgba(0,0,0,0.8)` 
                : `0 0 15px ${orb.color}80, inset -5px -5px 10px rgba(0,0,0,0.8)`
            }

            return (
              <div 
                key={orb.id} onClick={() => handleOrbClick(i)}
                className="absolute transition-all duration-1000 ease-in-out cursor-pointer flex flex-col items-center justify-center rounded-full"
                style={orbStyle}
              >
                <span className={clsx("font-bold text-white text-center drop-shadow-md px-2", isActive ? "text-lg leading-tight" : "text-[10px]")}>
                  {orb.nombre}
                </span>
                {isActive && (
                  <div className="mt-1 text-center animate-fade-in">
                    <p className="text-[10px] text-white/80"><strong className="text-white text-sm">{orb.tareas}</strong> Tareas</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Bottom Metrics (Like the image) */}
        <div className="absolute bottom-8 w-full flex justify-center gap-16 z-20">
          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Clientes</p>
            <p className="text-2xl font-black text-white">{clientes.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Volumen Tareas</p>
            <p className="text-3xl font-black text-white">{hitos.length}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Tickets Soporte</p>
            <p className="text-2xl font-black text-white">0</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD PRINCIPAL (TABS) ───────────────────────────────────────────────
type Tab = 'metricas' | 'pendientes' | 'calendario'

export default function DashboardPage() {
  const { usuario } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('metricas')
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
      setHitos(h) // AQUÍ RECUPERAMOS TUS HITOS ORIGINALES
      setClientes(c)
      setTickets(t)
      setLoading(false)
    }
    fetchData()
  }, [])

  // 1. Unir datos para métricas y calendario (Con Hitos Reales)
  const pendientesEnriquecidos = useMemo(() => {
    return hitos
      .filter(h => h.estado === 'pendiente' || h.estado === 'vencido')
      .map(h => {
        const p = proyectos.find(x => x.id === h.proyectoId)
        const c = clientes.find(x => x.id === p?.clienteId)
        return {
          ...h,
          proyectoNombre: p?.nombre || 'Desconocido',
          clienteNombre: c?.nombre || 'Desconocido',
          color: c?.color || '#8b5cf6',
          solucion: p?.solucion || '',
          numeroContrato: p?.numeroContrato || ''
        }
      })
  }, [hitos, proyectos, clientes])

  // 2. Lógica del Buscador en tiempo real
  const pendientesBuscador = useMemo(() => {
    if (!searchQuery) return pendientesEnriquecidos
    const q = searchQuery.toLowerCase()
    return pendientesEnriquecidos.filter(h => 
      h.nombre.toLowerCase().includes(q) || 
      h.proyectoNombre.toLowerCase().includes(q) || 
      h.clienteNombre.toLowerCase().includes(q) ||
      h.solucion.toLowerCase().includes(q) ||
      h.numeroContrato.toLowerCase().includes(q)
    )
  }, [pendientesEnriquecidos, searchQuery])

  // 3. Lógica del Calendario
  const diasMes = useMemo(() => {
    const year = fechaActual.getFullYear()
    const month = fechaActual.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    const days = []
    let startOffset = firstDay.getDay() - 1
    if (startOffset < 0) startOffset = 6
    
    for (let i = 0; i < startOffset; i++) {
      days.push({ date: null, events: [] })
    }
    
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const dString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      const events = pendientesEnriquecidos.filter(h => h.fechaLimite === dString)
      days.push({ date: i, fullDate: dString, events })
    }
    return days
  }, [fechaActual, pendientesEnriquecidos])

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
    <div className="space-y-6 animate-fade-in pb-10 min-h-screen bg-[#050b14]">
      
      {/* HEADER Y PESTAÑAS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1e3a8a]/30 pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <LayoutDashboard className="w-6 h-6 text-[#8b5cf6]" />
            Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">Gestión operativa y visión gerencial</p>
        </div>
        <div className="flex bg-[#0d1526] p-1 rounded-xl border border-[#1e3a8a]/40">
          <button onClick={() => setActiveTab('metricas')} className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'metricas' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>
            <BarChart3 className="w-4 h-4"/> Métricas
          </button>
          <button onClick={() => setActiveTab('pendientes')} className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'pendientes' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>
            <ListTodo className="w-4 h-4"/> Tareas
          </button>
          <button onClick={() => setActiveTab('calendario')} className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'calendario' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>
            <CalIcon className="w-4 h-4"/> Calendario
          </button>
        </div>
      </div>

      {/* 1. MÉTRICAS (ESTILO ORION) */}
      {activeTab === 'metricas' && (
        <div className="animate-fade-in">
          <GalacticMetrics clientes={clientes} proyectos={proyectos} hitos={hitos} />
        </div>
      )}

      {/* 2. LISTA DE TAREAS (RECUPERADAS) */}
      {activeTab === 'pendientes' && (
        <div className="animate-fade-in bg-[#0d1526] border border-[#1e3a8a]/40 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><FileText className="w-5 h-5 text-amber-400"/> Tareas y Pendientes</h2>
              <p className="text-xs text-slate-400 mt-1">Busca por nombre, cliente, solución o contrato en tiempo real.</p>
            </div>
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                className="w-full bg-[#111d35] border border-[#1e3a8a]/50 focus:border-blue-500 rounded-lg pl-9 pr-4 py-2.5 text-sm text-slate-200 outline-none transition-colors" 
                placeholder="Ej: SUNARP, Firewall, 026-2025..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#1e3a8a]/30 text-xs text-slate-400">
                  <th className="pb-3 font-medium">Tarea / Hito</th>
                  <th className="pb-3 font-medium">Cliente</th>
                  <th className="pb-3 font-medium">Proyecto y Solución</th>
                  <th className="pb-3 font-medium">Fecha Límite</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e3a8a]/20">
                {pendientesBuscador.map(h => (
                  <tr key={h.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 pr-4">
                      <p className="text-sm text-slate-200 font-medium">{h.nombre}</p>
                      <span className={clsx("text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block border", h.estado === 'vencido' ? "bg-red-900/30 text-red-400 border-red-700/50" : "bg-amber-900/30 text-amber-400 border-amber-700/50")}>
                        {h.estado.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-sm text-slate-300">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: h.color }}></span>
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
                  <tr><td colSpan={4} className="py-8 text-center text-slate-500">No hay tareas que coincidan con la búsqueda.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. CALENDARIO ESTILO GOOGLE CALENDAR */}
      {activeTab === 'calendario' && (
        <div className="animate-fade-in bg-[#0a0f1c] border border-[#1e3a8a]/40 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 bg-[#0d1526] border-b border-[#1e3a8a]/30 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <CalIcon className="w-5 h-5 text-[#8b5cf6]" />
              <h2 className="text-lg font-bold text-white capitalize">
                {vistaCal === 'mes' ? mesNombre : diaNombre}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {vistaCal === 'dia' && (
                <button onClick={() => setVistaCal('mes')} className="text-xs text-[#8b5cf6] hover:text-white bg-[#8b5cf6]/20 px-3 py-1.5 rounded-lg transition-colors border border-[#8b5cf6]/30">
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

          {vistaCal === 'mes' && (
            <div className="grid grid-cols-7 text-center">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                <div key={d} className="py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-800/50 bg-[#0d1526]/50">{d}</div>
              ))}
              
              {diasMes.map((dia, idx) => (
                <div 
                  key={idx} onClick={() => dia.date && verDia(dia.fullDate as string)}
                  className={clsx(
                    "min-h-[120px] p-1 border-b border-r border-slate-800/50 transition-colors relative cursor-pointer group",
                    dia.date ? "hover:bg-[#1e3a8a]/10" : "bg-[#05080f]",
                    dia.fullDate && esHoy(dia.fullDate) && "bg-blue-900/10"
                  )}
                >
                  {dia.date && (
                    <>
                      <div className="flex justify-center mb-1">
                        <span className={clsx("text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mt-1", dia.fullDate && esHoy(dia.fullDate) ? "bg-blue-600 text-white shadow-[0_0_10px_rgba(37,99,235,0.5)]" : "text-slate-400 group-hover:text-white transition-colors")}>
                          {dia.date}
                        </span>
                      </div>
                      <div className="space-y-1 overflow-y-auto max-h-[85px] no-scrollbar px-1">
                        {dia.events?.map(ev => (
                          <div 
                            key={ev.id} 
                            className="text-[9px] px-1.5 py-1 rounded truncate text-white shadow-sm"
                            style={{ backgroundColor: ev.color, borderLeft: '3px solid rgba(255,255,255,0.4)' }}
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

          {vistaCal === 'dia' && (
            <div className="flex flex-col bg-[#0a0f1c] min-h-[500px] overflow-y-auto">
              <div className="p-4 bg-blue-900/10 border-b border-blue-800/30 text-sm text-blue-300 flex items-center gap-2">
                <Clock className="w-4 h-4"/> Horario Laboral asignado para entregas y tareas del día.
              </div>
              <div className="flex flex-1 relative">
                <div className="w-16 border-r border-slate-800/50 flex flex-col pt-4">
                  {[9, 10, 11, 12, 1, 2, 3, 4, 5, 6].map((h, i) => (
                    <div key={h} className="h-24 text-[10px] text-slate-500 text-right pr-3 font-medium">
                      {h} {i < 3 ? 'AM' : (h === 12 ? 'PM' : 'PM')}
                    </div>
                  ))}
                </div>
                
                <div className="flex-1 relative bg-[linear-gradient(rgba(30,58,138,0.1)_1px,transparent_1px)] bg-[length:100%_96px] pt-4 pr-4">
                  {(() => {
                    const dString = `${fechaActual.getFullYear()}-${String(fechaActual.getMonth() + 1).padStart(2, '0')}-${String(fechaActual.getDate()).padStart(2, '0')}`
                    const tareasDelDia = pendientesEnriquecidos.filter(h => h.fechaLimite === dString)
                    
                    if (tareasDelDia.length === 0) return (
                      <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                        Día libre. No hay tareas programadas.
                      </div>
                    )

                    return (
                      <div className="flex flex-col gap-3 relative z-10 px-4">
                        {tareasDelDia.map(ev => (
                          <div 
                            key={ev.id} 
                            className="w-full rounded-xl p-4 shadow-[0_4px_15px_rgba(0,0,0,0.3)] border border-white/20 transition-transform hover:scale-[1.01]"
                            style={{ 
                              background: `linear-gradient(90deg, ${ev.color} 0%, rgba(30,41,59,0.95) 10%, rgba(15,23,42,0.95) 100%)` 
                            }}
                          >
                            <p className="text-white text-base font-bold truncate">{ev.nombre}</p>
                            <p className="text-slate-300 text-sm truncate mt-1 flex items-center gap-2">
                              <Building2 className="w-3 h-3"/> {ev.clienteNombre} — {ev.proyectoNombre}
                            </p>
                            <p className="text-slate-400 text-xs font-mono mt-2 bg-black/20 w-fit px-2 py-1 rounded">
                              {ev.solucion} {ev.numeroContrato ? `(${ev.numeroContrato})` : ''}
                            </p>
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
      )}
    </div>
  )
}
