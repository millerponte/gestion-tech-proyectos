'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { obtenerTodosHitos, obtenerProyectos, obtenerClientes, formatearFecha, esFechaVencida, eliminarHito, registrarLog } from '@/lib/db'
import type { Hito, Proyecto, Cliente } from '@/types'
import toast from 'react-hot-toast'
import {
  CalendarDays, AlertCircle, CheckCircle2, Clock,
  FolderKanban, ChevronLeft, ChevronRight, ArrowRight, X, Trash2,
  Search, Target, TrendingUp, Building2
} from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, isToday,
  startOfWeek, endOfWeek, parseISO, isWithinInterval,
  startOfYear
} from 'date-fns'
import { es } from 'date-fns/locale'

type VistaPendientes = 'mes' | 'semana' | 'dia' | 'todo' | 'sin_fecha'
type VistaRealizados = 'mes' | 'semana' | 'dia' | 'año' | 'todo'

// ─── COMPONENTE GALÁCTICO (GERENCIA) ──────────────────────────────────────
const GalacticMetrics = ({ clientes, proyectos, hitos }: { clientes: Cliente[], proyectos: Proyecto[], hitos: Hito[] }) => {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const orbs = useMemo(() => {
    return clientes.map(c => {
      const proys = proyectos.filter(p => p.clienteId === c.id && p.estado === 'activo')
      const pIds = proys.map(p => p.id)
      const tasks = hitos.filter(h => pIds.includes(h.proyectoId) && h.estado === 'pendiente')
      return { id: c.id, nombre: c.nombre, color: c.color || '#3b82f6', proyectos: proys.length, tareas: tasks.length }
    }).filter(o => o.proyectos > 0 || o.tareas > 0)
  }, [clientes, proyectos, hitos])

  useEffect(() => {
    if (!isPaused && orbs.length > 0) {
      timerRef.current = setInterval(() => setActiveIndex(p => (p + 1) % orbs.length), 4000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [isPaused, orbs.length])

  if (orbs.length === 0) return null

  return (
    <div className="relative w-full h-[350px] bg-[#050b14] border border-[#1e3a8a]/40 rounded-2xl overflow-hidden shadow-[inset_0_0_80px_rgba(30,58,138,0.2)] flex items-center justify-center">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#0a101f] pointer-events-none" />
      
      <div className="absolute top-6 left-8 z-10">
        <h2 className="text-2xl font-display font-bold text-white tracking-wide">Radar de Operaciones</h2>
        <p className="text-slate-400 text-sm">Carga por cliente {isPaused && <span className="text-amber-400 animate-pulse text-xs ml-2">(Pausado 10s)</span>}</p>
      </div>

      <div className="relative w-full h-full max-w-3xl mx-auto flex items-center justify-center">
        {orbs.map((orb, i) => {
          const isActive = i === activeIndex
          const angle = ((i - activeIndex) / orbs.length) * Math.PI * 2
          const radius = isActive ? 0 : 160
          const scale = isActive ? 1.4 : 0.6
          const opacity = isActive ? 1 : 0.4
          const x = Math.sin(angle) * radius
          const y = -Math.cos(angle) * (radius * 0.3)
          return (
            <div 
              key={orb.id}
              onClick={() => { setActiveIndex(i); setIsPaused(true); setTimeout(() => setIsPaused(false), 10000) }}
              className="absolute transition-all duration-1000 ease-in-out cursor-pointer flex flex-col items-center justify-center rounded-full"
              style={{
                transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity, zIndex: isActive ? 50 : 10,
                width: isActive ? '160px' : '90px', height: isActive ? '160px' : '90px',
                background: `radial-gradient(circle at 30% 30%, ${orb.color} 0%, #000 100%)`,
                boxShadow: isActive ? `0 0 40px ${orb.color}80, inset 0 0 20px rgba(255,255,255,0.2)` : `0 0 10px ${orb.color}40`
              }}
            >
              <span className={clsx("font-bold text-white text-center drop-shadow-md px-2", isActive ? "text-base" : "text-[9px]")}>{orb.nombre}</span>
              {isActive && (
                <div className="mt-1 text-center animate-fade-in">
                  <p className="text-[10px] text-white/80"><strong className="text-white text-sm">{orb.tareas}</strong> Tareas</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── DASHBOARD PRINCIPAL ──────────────────────────────────────────────────
export default function DashboardPage() {
  const { usuario, isAdmin } = useAuth()
  
  // Estados de datos
  const [hitos, setHitos] = useState<Hito[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  
  // Estados de UI
  const [searchQuery, setSearchQuery] = useState('')
  const [mesActual, setMesActual] = useState(new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date>(new Date())
  const [vistaCal, setVistaCal] = useState<'mes' | 'dia'>('mes')
  const [hitoModal, setHitoModal] = useState<Hito | null>(null)
  const [vistaPendientes, setVistaPendientes] = useState<VistaPendientes>('mes')
  const [vistaRealizados, setVistaRealizados] = useState<VistaRealizados>('mes')

  useEffect(() => {
    const cargar = async () => {
      const [h, p, c] = await Promise.all([obtenerTodosHitos(), obtenerProyectos(), obtenerClientes()])
      setHitos(h)
      setProyectos(p)
      setClientes(c)
      setLoading(false)
    }
    cargar()
  }, [])

  const hoy = new Date()

  // ── Lógica Original de Eliminación ──
  const handleEliminarPendiente = async (id: string, e: React.MouseEvent, esHuerfano: boolean) => {
    e.stopPropagation()
    if (!esHuerfano) {
      if (!confirm('Este pendiente pertenece a un cronograma activo. ¿Estás seguro de eliminarlo permanentemente?')) return
    } else {
      if (!confirm('Este es un registro huérfano (su proyecto ya fue eliminado). ¿Limpiar pendiente?')) return
    }
    try {
      await eliminarHito(id)
      if (usuario) await registrarLog(usuario.uid, usuario.nombre, 'Dashboard', 'Eliminó un pendiente/hito del sistema')
      setHitos(prev => prev.filter(h => h.id !== id))
      if (hitoModal?.id === id) setHitoModal(null)
      toast.success('Pendiente eliminado exitosamente')
    } catch (error) { toast.error('Ocurrió un error al eliminar') }
  }

  // ── Enriquecer Hitos (Colores de Cliente) ──
  const hitosEnriquecidos = useMemo(() => {
    return hitos.map(h => {
      const p = proyectos.find(x => x.id === h.proyectoId)
      const c = clientes.find(x => x.id === p?.clienteId)
      return {
        ...h,
        proyectoNombre: p?.nombre || 'Desconocido',
        clienteNombre: c?.nombre || 'Desconocido',
        clienteColor: c?.color || '#3b82f6',
        solucion: p?.solucion || '',
        numeroContrato: p?.numeroContrato || ''
      }
    })
  }, [hitos, proyectos, clientes])

  // ── Listas Base ──
  const hitosPendientesAll = hitosEnriquecidos.filter(h => h.estado !== 'realizado')
  const hitosRealizadosAll = hitosEnriquecidos.filter(h => h.estado === 'realizado')

  // ── Filtrado por Buscador + Vistas ──
  const pendientesFiltrados = (() => {
    let base = hitosPendientesAll
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return base.filter(h => h.nombre.toLowerCase().includes(q) || h.proyectoNombre.toLowerCase().includes(q) || h.clienteNombre.toLowerCase().includes(q) || h.solucion.toLowerCase().includes(q) || h.numeroContrato.toLowerCase().includes(q))
    }
    const conFecha = base.filter(h => h.fechaLimite !== 'por definir')
    const sinFecha = base.filter(h => h.fechaLimite === 'por definir')
    if (vistaPendientes === 'sin_fecha') return sinFecha
    const ordenados = [...conFecha].sort((a, b) => new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime())
    if (vistaPendientes === 'todo') return ordenados
    if (vistaPendientes === 'dia') return ordenados.filter(h => { try { const ini = parseISO(h.fechaInicio); const fin = parseISO(h.fechaLimite); return isWithinInterval(hoy, { start: ini, end: fin }) || isSameDay(hoy, ini) || isSameDay(hoy, fin) } catch { return false } })
    if (vistaPendientes === 'semana') { const ini = startOfWeek(hoy, { weekStartsOn: 1 }); const fin = endOfWeek(hoy, { weekStartsOn: 1 }); return ordenados.filter(h => { try { const f = parseISO(h.fechaLimite); return f >= ini && f <= fin } catch { return false } }) }
    return ordenados.filter(h => { try { const f = parseISO(h.fechaLimite); return isSameMonth(f, hoy) } catch { return false } })
  })()

  const realizadosFiltrados = (() => {
    let base = hitosRealizadosAll
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return base.filter(h => h.nombre.toLowerCase().includes(q) || h.proyectoNombre.toLowerCase().includes(q) || h.clienteNombre.toLowerCase().includes(q) || h.solucion.toLowerCase().includes(q) || h.numeroContrato.toLowerCase().includes(q))
    }
    const ordenados = [...base].sort((a, b) => (b.fechaRealEnvio || b.fechaLimite).localeCompare(a.fechaRealEnvio || a.fechaLimite))
    if (vistaRealizados === 'todo') return ordenados
    if (vistaRealizados === 'dia') return ordenados.filter(h => { if (h.fechaRealEnvio === 'por definir' || (!h.fechaRealEnvio && h.fechaLimite === 'por definir')) return false; try { return isSameDay(parseISO(h.fechaRealEnvio || h.fechaLimite), hoy) } catch { return false } })
    if (vistaRealizados === 'semana') { const ini = startOfWeek(hoy, { weekStartsOn: 1 }); const fin = endOfWeek(hoy, { weekStartsOn: 1 }); return ordenados.filter(h => { if (h.fechaRealEnvio === 'por definir' || (!h.fechaRealEnvio && h.fechaLimite === 'por definir')) return false; try { const f = parseISO(h.fechaRealEnvio || h.fechaLimite); return f >= ini && f <= fin } catch { return false } }) }
    if (vistaRealizados === 'año') { const ini = startOfYear(hoy); return ordenados.filter(h => { if (h.fechaRealEnvio === 'por definir' || (!h.fechaRealEnvio && h.fechaLimite === 'por definir')) return false; try { return parseISO(h.fechaRealEnvio || h.fechaLimite) >= ini } catch { return false } }) }
    return ordenados.filter(h => { if (h.fechaRealEnvio === 'por definir' || (!h.fechaRealEnvio && h.fechaLimite === 'por definir')) return false; try { return isSameMonth(parseISO(h.fechaRealEnvio || h.fechaLimite), hoy) } catch { return false } })
  })()

  // ── Lógica Calendario Estilo Google ──
  const inicioMes = startOfMonth(mesActual)
  const finMes = endOfMonth(mesActual)
  const inicioCal = startOfWeek(inicioMes, { weekStartsOn: 1 })
  const finCal = endOfWeek(finMes, { weekStartsOn: 1 })
  const diasCal = eachDayOfInterval({ start: inicioCal, end: finCal })
  
  const diasConHitos = (dia: Date) => hitosPendientesAll.filter(h => { 
    if (h.fechaInicio === 'por definir' || h.fechaLimite === 'por definir') return false; 
    try { 
      const ini = parseISO(h.fechaInicio); const fin = parseISO(h.fechaLimite); 
      return isWithinInterval(dia, { start: ini, end: fin }) || isSameDay(dia, ini) || isSameDay(dia, fin) 
    } catch { return false } 
  })

  const verDia = (dia: Date) => {
    setDiaSeleccionado(dia)
    setVistaCal('dia')
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-8 animate-fade-in pb-12 max-w-screen-2xl mx-auto">
      
      {/* 1. SECCIÓN SUPERIOR: Saludo y Buscador */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-[#1e3a8a]/40 pb-6">
        <div>
          <h1 className="text-3xl font-display font-bold text-white tracking-tight">
            Buen día, {usuario?.nombre?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1 font-medium">
            {format(hoy, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        
        <div className="w-full xl:w-[500px] bg-[#0d1526] border border-[#1e3a8a]/60 rounded-xl p-2 shadow-lg focus-within:border-blue-500 transition-colors">
          <div className="flex items-center gap-2 px-2">
            <Search className="w-5 h-5 text-blue-400" />
            <input 
              type="text"
              placeholder="Buscar pendientes por nombre, cliente, contrato..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-slate-200 text-sm py-2 placeholder:text-slate-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="p-1 text-slate-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. TABLEROS DE TAREAS (Pendientes y Realizados) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* PENDIENTES */}
        <div className="bg-[#0b101e] border border-[#1e3a8a]/40 rounded-2xl shadow-xl flex flex-col h-full">
          <div className="p-4 border-b border-[#1e3a8a]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-400" />
              <h2 className="font-bold text-white text-lg">Pendientes</h2>
              <span className="text-xs font-mono bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded-full">{pendientesFiltrados.length}</span>
            </div>
            {!searchQuery && (
              <div className="flex bg-[#0d1526] border border-[#1e3a8a]/50 rounded-lg overflow-hidden text-xs shadow-inner">
                {(['dia', 'semana', 'mes', 'todo', 'sin_fecha'] as VistaPendientes[]).map(v => (
                  <button key={v} onClick={() => setVistaPendientes(v)} className={clsx('px-3 py-1.5 capitalize transition-colors', vistaPendientes === v ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5')}>
                    {v === 'todo' ? 'Todo' : v === 'dia' ? 'Hoy' : v === 'semana' ? 'Semana' : v === 'mes' ? 'Mes' : 'Sin Fecha'}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* El contenedor ahora es flexible. Si hay búsqueda o muchos datos, se expande hasta 600px */}
          <div className={clsx("p-4 space-y-2 overflow-y-auto custom-scrollbar", searchQuery ? "max-h-[600px]" : "max-h-[400px]")}>
            {pendientesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <CheckCircle2 className="w-12 h-12 mb-3 text-slate-700" />
                <p>¡Todo limpio en esta vista!</p>
              </div>
            ) : pendientesFiltrados.map(h => (
              <HitoItem key={h.id} hito={h} proyectos={proyectos} onClick={() => setHitoModal(h)} onDelete={(e) => handleEliminarPendiente(h.id, e, !proyectos.some(p => p.id === h.proyectoId))} isAdmin={isAdmin} />
            ))}
          </div>
        </div>

        {/* REALIZADOS */}
        <div className="bg-[#0b101e] border border-[#1e3a8a]/40 rounded-2xl shadow-xl flex flex-col h-full">
          <div className="p-4 border-b border-[#1e3a8a]/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-400" />
              <h2 className="font-bold text-white text-lg">Realizados</h2>
              <span className="text-xs font-mono bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">{realizadosFiltrados.length}</span>
            </div>
            {!searchQuery && (
              <div className="flex bg-[#0d1526] border border-[#1e3a8a]/50 rounded-lg overflow-hidden text-xs shadow-inner">
                {(['dia', 'semana', 'mes', 'año', 'todo'] as VistaRealizados[]).map(v => (
                  <button key={v} onClick={() => setVistaRealizados(v)} className={clsx('px-3 py-1.5 capitalize transition-colors', vistaRealizados === v ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5')}>
                    {v === 'todo' ? 'Todo' : v === 'dia' ? 'Hoy' : v === 'semana' ? 'Sem' : v === 'mes' ? 'Mes' : 'Año'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className={clsx("p-4 space-y-2 overflow-y-auto custom-scrollbar", searchQuery ? "max-h-[600px]" : "max-h-[400px]")}>
            {realizadosFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                <Clock className="w-12 h-12 mb-3 text-slate-700" />
                <p>Sin tareas finalizadas aquí.</p>
              </div>
            ) : realizadosFiltrados.map(h => (
              <HitoItemRealizado key={h.id} hito={h} proyectos={proyectos} onDelete={(e) => handleEliminarPendiente(h.id, e as unknown as React.MouseEvent, !proyectos.some(p => p.id === h.proyectoId))} isAdmin={isAdmin} />
            ))}
          </div>
        </div>
      </div>

      {/* 3. CALENDARIO ESTILO GOOGLE CALENDAR */}
      <div className="bg-[#0a0f1c] border border-[#1e3a8a]/40 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-4 bg-[#0d1526] border-b border-[#1e3a8a]/30 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <CalendarDays className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white capitalize">
              {vistaCal === 'mes' ? format(mesActual, "MMMM yyyy", { locale: es }) : format(diaSeleccionado, "EEEE d 'de' MMMM", { locale: es })}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {vistaCal === 'dia' && (
              <button onClick={() => setVistaCal('mes')} className="text-xs font-medium text-blue-400 hover:text-white bg-blue-900/20 px-4 py-2 rounded-lg transition-colors border border-blue-500/30">
                Volver a Vista Mensual
              </button>
            )}
            <div className="flex items-center bg-[#111d35] rounded-lg border border-slate-700 overflow-hidden shadow-inner">
              <button onClick={() => vistaCal === 'mes' ? setMesActual(subMonths(mesActual, 1)) : verDia(new Date(diaSeleccionado.getTime() - 86400000))} className="p-2 hover:bg-slate-700 text-slate-300 transition-colors"><ChevronLeft className="w-4 h-4"/></button>
              <button onClick={() => { setMesActual(hoy); if(vistaCal === 'dia') verDia(hoy) }} className="px-4 py-2 text-xs font-semibold text-slate-200 border-x border-slate-700 hover:bg-slate-700 transition-colors">Hoy</button>
              <button onClick={() => vistaCal === 'mes' ? setMesActual(addMonths(mesActual, 1)) : verDia(new Date(diaSeleccionado.getTime() + 86400000))} className="p-2 hover:bg-slate-700 text-slate-300 transition-colors"><ChevronRight className="w-4 h-4"/></button>
            </div>
          </div>
        </div>

        {/* Vista Mes */}
        {vistaCal === 'mes' && (
          <div className="flex flex-col">
            <div className="grid grid-cols-7 text-center bg-[#0d1526]/50">
              {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => (
                <div key={d} className="py-3 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-r border-slate-800/50">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 bg-[#05080f]">
              {diasCal.map((dia, idx) => {
                const hitosDelDia = diasConHitos(dia)
                const estesMes = isSameMonth(dia, mesActual)
                const esHoyDia = isToday(dia)
                return (
                  <div key={idx} onClick={() => verDia(dia)}
                    className={clsx(
                      "min-h-[140px] p-1.5 border-b border-r border-slate-800/50 transition-all cursor-pointer group hover:bg-[#1e3a8a]/10",
                      !estesMes && 'opacity-40 bg-[#0a0f1c]',
                      esHoyDia && "bg-blue-900/10"
                    )}
                  >
                    <div className="flex justify-center mb-1.5">
                      <span className={clsx(
                        "text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors", 
                        esHoyDia ? "bg-blue-600 text-white shadow-[0_0_12px_rgba(37,99,235,0.6)]" : "text-slate-400 group-hover:text-white"
                      )}>
                        {format(dia, 'd')}
                      </span>
                    </div>
                    <div className="space-y-1 overflow-y-auto max-h-[95px] custom-scrollbar px-0.5">
                      {hitosDelDia.map(ev => {
                        const clienteColor = (ev as any).clienteColor || '#3b82f6'
                        return (
                          <div 
                            key={ev.id} 
                            className="text-[10px] font-medium px-1.5 py-1 rounded truncate text-white shadow-sm border border-black/20"
                            style={{ backgroundColor: clienteColor }}
                            title={`${(ev as any).clienteNombre || ''} - ${ev.nombre}`}
                          >
                            {ev.nombre}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Vista Día (Agenda) */}
        {vistaCal === 'dia' && (
          <div className="flex flex-col bg-[#0a0f1c] min-h-[500px] overflow-y-auto custom-scrollbar">
            <div className="p-3 bg-blue-900/20 border-b border-blue-800/40 text-xs text-blue-300 flex items-center gap-2 font-medium">
              <Clock className="w-4 h-4"/> Bloques de tiempo laboral sugerido (9:00 AM - 6:00 PM) para resolver los pendientes de este día.
            </div>
            <div className="flex flex-1 relative">
              <div className="w-20 border-r border-slate-800/50 flex flex-col pt-4 bg-[#0d1526]">
                {[9, 10, 11, 12, 1, 2, 3, 4, 5, 6].map((h, i) => (
                  <div key={h} className="h-28 text-[11px] text-slate-500 text-right pr-3 font-semibold pt-1">
                    {h}:00 {i < 3 ? 'AM' : (h === 12 ? 'PM' : 'PM')}
                  </div>
                ))}
              </div>
              <div className="flex-1 relative bg-[linear-gradient(rgba(30,58,138,0.1)_1px,transparent_1px)] bg-[length:100%_112px] p-4">
                {(() => {
                  const hitosDelDia = diasConHitos(diaSeleccionado)
                  if (hitosDelDia.length === 0) return (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                      <CheckCircle2 className="w-12 h-12 mb-3 text-slate-700" />
                      <p>Día libre. No hay tareas programadas.</p>
                    </div>
                  )
                  return (
                    <div className="flex flex-col gap-4 relative z-10">
                      {hitosDelDia.map(ev => {
                        const cColor = (ev as any).clienteColor || '#3b82f6'
                        return (
                          <div 
                            key={ev.id} 
                            onClick={() => setHitoModal(ev)}
                            className="w-full rounded-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] border border-white/10 cursor-pointer transition-transform hover:scale-[1.01]"
                            style={{ background: `linear-gradient(90deg, ${cColor} 0%, rgba(30,41,59,0.95) 5%, rgba(15,23,42,0.98) 100%)` }}
                          >
                            <p className="text-white text-lg font-bold truncate drop-shadow-md">{ev.nombre}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Building2 className="w-4 h-4 text-slate-400" />
                              <p className="text-slate-300 text-sm truncate font-medium">{(ev as any).clienteNombre}</p>
                            </div>
                            <p className="text-slate-400 text-xs font-mono mt-3 bg-black/40 w-fit px-3 py-1.5 rounded border border-white/5">
                              {(ev as any).proyectoNombre} {(ev as any).solucion ? `— ${(ev as any).solucion}` : ''}
                            </p>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. MÉTRICAS Y VISUALIZACIÓN GALÁCTICA (Abajo del todo) */}
      <div className="border-t border-[#1e3a8a]/40 pt-8 mt-8">
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          <StatCard label="Proyectos activos" value={proyectos.filter(p => p.estado === 'activo').length} icon={<FolderKanban className="w-5 h-5" />} color="blue" />
          <StatCard label="Proyectos terminados" value={proyectos.filter(p => p.estado === 'completado').length} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
          <StatCard label="Pendientes Globales" value={hitosPendientesAll.length} icon={<ListTodo className="w-5 h-5" />} color="cyan" />
          <StatCard label="Hitos Vencidos" value={hitosPendientesAll.filter(h => h.fechaLimite !== 'por definir' && esFechaVencida(h.fechaLimite)).length} icon={<AlertCircle className="w-5 h-5" />} color="red" />
          <StatCard label="Vencen hoy" value={hitosPendientesAll.filter(h => h.fechaLimite !== 'por definir' && isSameDay(parseISO(h.fechaLimite), hoy)).length} icon={<CalendarDays className="w-5 h-5" />} color="amber" />
          <StatCard label="Total Realizados" value={hitosRealizadosAll.length} icon={<Target className="w-5 h-5" />} color="purple" />
        </div>
        <GalacticMetrics clientes={clientes} proyectos={proyectos} hitos={hitos} />
      </div>

      {/* Modal Original Intacto */}
      {hitoModal && <ModalHitoRango hito={hitoModal} proyectos={proyectos} onClose={() => setHitoModal(null)} />}
    </div>
  )
}

// ── Modales y Componentes de UI Originales ────────────────────────────────

function ModalHitoRango({ hito, proyectos, onClose }: { hito: Hito; proyectos: Proyecto[]; onClose: () => void }) {
  const proyecto = proyectos.find(p => p.id === hito.proyectoId)
  const vencido = hito.fechaLimite !== 'por definir' && esFechaVencida(hito.fechaLimite)
  let diasRango: Date[] = []
  if (hito.fechaInicio !== 'por definir' && hito.fechaLimite !== 'por definir') { try { const inicio = parseISO(hito.fechaInicio); const fin = parseISO(hito.fechaLimite); diasRango = eachDayOfInterval({ start: inicio, end: fin }) } catch { diasRango = [] } }
  const primerDia = diasRango[0] || new Date()
  const diaSemanaInicio = (primerDia.getDay() + 6) % 7
  const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div className="modal-overlay z-50" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md shadow-2xl border border-slate-600">
        <div className="flex items-center justify-between p-5 border-b border-[#1e3a8a]/50 bg-[#0d1526]">
          <div className="flex items-center gap-3">
            <div className={clsx('w-3 h-3 rounded-full', vencido ? 'bg-red-400' : 'bg-cyan-400')} />
            <div>
              <h2 className="font-semibold text-white text-sm">{hito.nombre}</h2>
              {proyecto && <p className="text-xs text-slate-400 mt-0.5">{proyecto.clienteNombre}{proyecto.solucion && ` — ${proyecto.solucion}`}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 bg-[#111d35]">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3">
              <p className="text-slate-500 mb-1">Fecha inicio</p>
              <p className={clsx('font-medium', hito.fechaInicio === 'por definir' ? 'text-amber-400' : 'text-cyan-400')}>{hito.fechaInicio === 'por definir' ? 'por definir' : formatearFecha(hito.fechaInicio)}</p>
            </div>
            <div className={clsx('border rounded-lg p-3', vencido ? 'bg-red-900/20 border-red-700/40' : 'bg-[#0d1526] border-[#1e3a8a]/40')}>
              <p className="text-slate-500 mb-1">Fecha límite</p>
              <p className={clsx('font-medium', hito.fechaLimite === 'por definir' ? 'text-amber-400' : vencido ? 'text-red-400' : 'text-slate-200')}>{hito.fechaLimite === 'por definir' ? 'por definir' : formatearFecha(hito.fechaLimite)}</p>
            </div>
            {hito.responsable && <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3"><p className="text-slate-500 mb-1">Responsable</p><p className="text-slate-200">{hito.responsable}</p></div>}
            <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3"><p className="text-slate-500 mb-1">Duración</p><p className="text-slate-200">{diasRango.length > 0 ? `${diasRango.length} día(s)` : 'por definir'}</p></div>
          </div>
          {diasRango.length > 0 && diasRango.length <= 60 && (
            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium">Rango del hito</p>
              <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3">
                <div className="grid grid-cols-7 mb-1">{diasSemana.map(d => <div key={d} className="text-center text-xs text-slate-600 py-1">{d}</div>)}</div>
                <div className="grid grid-cols-7 gap-0.5">
                  {Array.from({ length: diaSemanaInicio }).map((_, i) => <div key={`pad-${i}`} />)}
                  {diasRango.map(dia => {
                    const esHoyDia = isToday(dia); const esIni = isSameDay(dia, parseISO(hito.fechaInicio)); const esFin = isSameDay(dia, parseISO(hito.fechaLimite))
                    return <div key={dia.toISOString()} className={clsx('aspect-square flex items-center justify-center text-xs rounded-md font-medium', esHoyDia && 'bg-blue-600 text-white ring-2 ring-blue-400', !esHoyDia && esIni && 'bg-cyan-700/60 text-cyan-300', !esHoyDia && esFin && (vencido ? 'bg-red-700/60 text-red-300' : 'bg-green-700/60 text-green-300'), !esHoyDia && !esIni && !esFin && 'bg-[#1e3a8a]/30 text-slate-400')}>{format(dia, 'd')}</div>
                  })}
                </div>
                <div className="flex gap-3 mt-3 text-xs text-slate-500"><span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Hoy</span><span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-cyan-700/60 inline-block" /> Inicio</span><span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-700/60 inline-block" /> Fin</span></div>
              </div>
            </div>
          )}
          {diasRango.length > 60 && <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3 text-xs text-slate-400 text-center">Rango de {diasRango.length} días — muy extenso para mostrar en calendario</div>}
          {hito.descripcion && <div><p className="text-xs text-slate-500 mb-1">Descripción</p><p className="text-xs text-slate-300">{hito.descripcion}</p></div>}
        </div>
        <div className="flex justify-end gap-3 px-5 pb-5 bg-[#111d35]">
          <button onClick={onClose} className="btn-secondary text-xs">Cerrar</button>
          {!proyecto ? <button disabled className="btn-primary opacity-50 cursor-not-allowed text-xs">Proyecto Eliminado</button> : <Link href={`/cronogramas?proyecto=${hito.proyectoId}&expandir=${hito.id}`} className="btn-primary text-xs" onClick={onClose}>Ver en cronograma <ArrowRight className="w-3 h-3" /></Link>}
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: 'blue' | 'cyan' | 'red' | 'amber' | 'green' | 'purple' }) {
  const colors = { blue: 'bg-blue-900/20 border-blue-700/40 text-blue-400', cyan: 'bg-cyan-900/20 border-cyan-700/40 text-cyan-400', red: 'bg-red-900/20 border-red-700/40 text-red-400', amber: 'bg-amber-900/20 border-amber-700/40 text-amber-400', green: 'bg-green-900/20 border-green-700/40 text-green-400', purple: 'bg-purple-900/20 border-purple-700/40 text-purple-400' }
  return <div className={clsx('border rounded-xl p-5 flex items-center gap-4 bg-[#0d1526]', colors[color])}><div className="opacity-80 p-3 rounded-lg bg-black/20">{icon}</div><div><p className="text-2xl font-display font-bold text-white">{value}</p><p className="text-xs text-slate-400 font-medium">{label}</p></div></div>
}

function HitoItem({ hito, proyectos, onClick, onDelete, isAdmin }: { hito: Hito; proyectos: Proyecto[]; onClick: () => void; onDelete?: (e: React.MouseEvent) => void; isAdmin?: boolean }) {
  const vencido = hito.fechaLimite !== 'por definir' && esFechaVencida(hito.fechaLimite)
  const proyecto = proyectos.find(p => p.id === hito.proyectoId)
  const cColor = (hito as any).clienteColor || (vencido ? '#ef4444' : '#22d3ee')
  
  return (
    <div className="flex items-center gap-2 group">
      <button onClick={onClick} className={clsx('flex-1 text-left flex items-start gap-3 p-3.5 rounded-xl border text-xs transition-all', vencido ? 'bg-red-950/30 border-red-900/50 hover:bg-red-900/20' : 'bg-[#0d1526] border-[#1e3a8a]/40 hover:bg-[#111d35]')}>
        <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 shadow-sm" style={{ backgroundColor: cColor }} />
        <div className="min-w-0 flex-1">
          <p className={clsx('font-bold text-sm truncate', vencido ? 'text-red-300' : 'text-slate-200')}>{hito.nombre}</p>
          <div className="flex gap-4 mt-1.5 text-slate-400 font-medium">
            <span>Inicio: <span className="text-slate-300">{hito.fechaInicio === 'por definir' ? 'por definir' : formatearFecha(hito.fechaInicio)}</span></span>
            <span>Límite: <span className={vencido ? 'text-red-400 font-bold' : 'text-slate-300'}>{hito.fechaLimite === 'por definir' ? 'por definir' : formatearFecha(hito.fechaLimite)}</span></span>
          </div>
          {proyecto ? <p className="text-slate-500 mt-2 truncate bg-black/20 w-fit px-2 py-1 rounded font-mono text-[11px] border border-white/5">{proyecto.clienteNombre}{proyecto.solucion && <span className="text-slate-400"> — {proyecto.solucion}</span>}</p> : <p className="text-red-500 mt-1 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Proyecto Eliminado (Huérfano)</p>}
        </div>
        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-blue-400 flex-shrink-0 mt-1 transition-colors" />
      </button>
      {isAdmin && onDelete && <button onClick={onDelete} className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>}
    </div>
  )
}

function HitoItemRealizado({ hito, proyectos, onDelete, isAdmin }: { hito: Hito; proyectos: Proyecto[]; onDelete?: (e: React.MouseEvent) => void; isAdmin?: boolean }) {
  const proyecto = proyectos.find(p => p.id === hito.proyectoId)
  const esHuerfano = !proyecto;
  const cColor = (hito as any).clienteColor || '#4ade80'

  return (
    <div className="flex items-center gap-2 group">
      <Link href={esHuerfano ? '#' : `/cronogramas?proyecto=${hito.proyectoId}&expandir=${hito.id}`} className={clsx("flex-1 flex items-start gap-3 p-3.5 rounded-xl border text-xs transition-all hover:bg-green-900/20 bg-green-950/20 border-green-900/40", esHuerfano && "pointer-events-none opacity-70")}>
        <span className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 shadow-sm" style={{ backgroundColor: cColor }} />
        <div className="min-w-0 flex-1">
          <p className="font-bold text-sm truncate text-green-400">{hito.nombre}</p>
          {hito.fechaRealEnvio && hito.fechaRealEnvio !== 'por definir' && <p className="text-slate-400 mt-1.5 font-medium">Completado el: <span className="text-green-400 font-bold">{formatearFecha(hito.fechaRealEnvio)}</span></p>}
          {proyecto ? <p className="text-slate-500 mt-2 truncate bg-black/20 w-fit px-2 py-1 rounded font-mono text-[11px] border border-white/5">{proyecto.clienteNombre}{proyecto.solucion && <span className="text-slate-400"> — {proyecto.solucion}</span>}</p> : <p className="text-red-500 mt-1 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Proyecto Eliminado</p>}
        </div>
        {!esHuerfano && <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-green-400 flex-shrink-0 mt-1 transition-colors" />}
      </Link>
      {isAdmin && onDelete && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(e); }} className="p-3 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>}
    </div>
  )
}
