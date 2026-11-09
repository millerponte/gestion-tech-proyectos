'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { obtenerTodosHitos, obtenerProyectos, formatearFecha, esFechaVencida, eliminarHito, registrarLog, obtenerClientes } from '@/lib/db'
import type { Hito, Proyecto, Cliente } from '@/types'
import toast from 'react-hot-toast'
import {
  CalendarDays, AlertCircle, CheckCircle2, Clock,
  FolderKanban, ChevronLeft, ChevronRight, ArrowRight, X, Trash2,
  LayoutDashboard, BarChart3, ListTodo, Target, TrendingUp, Search
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
type Tab = 'metricas' | 'pendientes' | 'calendario'

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
      <div className="lg:w-1/4 space-y-6">
        <h2 className="text-2xl font-bold text-white mb-6">Métricas Globales</h2>
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
        <div className="bg-[#1a1d36] rounded-2xl p-6 border border-[#2a2d45] shadow-lg">
          <p className="text-slate-400 text-sm">Pendientes Activos</p>
          <p className="text-2xl font-bold text-white flex items-center gap-2">
            {pendientesTotal} <TrendingUp className="w-4 h-4 text-emerald-400"/>
          </p>
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <p className="text-slate-400 text-sm">Hitos Vencidos</p>
            <p className="text-xl font-bold text-red-400">{vencidosTotal}</p>
          </div>
        </div>
      </div>
      <div className="lg:w-3/4 bg-[#14172b] rounded-2xl border border-[#2a2d45] relative overflow-hidden flex flex-col items-center justify-center min-h-[500px]">
        <div className="absolute top-6 w-full flex flex-col items-center z-20">
          <h3 className="text-2xl font-black text-white/10 uppercase tracking-widest absolute top-10">Data Visualisation</h3>
          {isPaused && <span className="text-amber-400 animate-pulse text-xs mt-2 font-medium">Pausado (10s)</span>}
        </div>
        <div className="absolute w-[300px] h-[300px] border border-white/5 rounded-full" />
        <div className="absolute w-[450px] h-[450px] border border-white/5 rounded-full" />
        <div className="absolute w-[600px] h-[600px] border border-white/5 rounded-full" />
        <div className="relative w-full h-full flex items-center justify-center z-10">
          {orbs.map((orb, i) => {
            const isActive = i === activeIndex
            const angle = ((i - activeIndex) / orbs.length) * Math.PI * 2
            const radius = isActive ? 0 : 180
            const scale = isActive ? 1.4 : 0.6
            const opacity = isActive ? 1 : 0.7
            const zIndex = isActive ? 50 : 10
            const x = Math.sin(angle) * radius
            const y = -Math.cos(angle) * (radius * 0.4)
            const orbStyle = {
              transform: `translate(${x}px, ${y}px) scale(${scale})`, opacity, zIndex,
              width: isActive ? '160px' : '90px', height: isActive ? '160px' : '90px',
              background: `radial-gradient(circle at 30% 30%, ${orb.color} 0%, #1a0b2e 100%)`,
              boxShadow: isActive ? `0 0 40px ${orb.color}, inset -10px -10px 20px rgba(0,0,0,0.8)` : `0 0 15px ${orb.color}80, inset -5px -5px 10px rgba(0,0,0,0.8)`
            }
            return (
              <div key={orb.id} onClick={() => handleOrbClick(i)} className="absolute transition-all duration-1000 ease-in-out cursor-pointer flex flex-col items-center justify-center rounded-full" style={orbStyle}>
                <span className={clsx("font-bold text-white text-center drop-shadow-md px-2", isActive ? "text-lg leading-tight" : "text-[10px]")}>{orb.nombre}</span>
                {isActive && <div className="mt-1 text-center animate-fade-in"><p className="text-[10px] text-white/80"><strong className="text-white text-sm">{orb.tareas}</strong> Tareas</p></div>}
              </div>
            )
          })}
        </div>
        <div className="absolute bottom-8 w-full flex justify-center gap-16 z-20">
          <div className="text-center"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Total Clientes</p><p className="text-2xl font-black text-white">{clientes.length}</p></div>
          <div className="text-center"><p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Volumen Tareas</p><p className="text-3xl font-black text-white">{hitos.length}</p></div>
        </div>
      </div>
    </div>
  )
}

// ─── DASHBOARD PRINCIPAL ───────────────────────────────────────────────────
export default function DashboardPage() {
  const { usuario, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('metricas')
  
  // Variables del código original
  const [hitos, setHitos] = useState<Hito[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [mesActual, setMesActual] = useState(new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date>(new Date())
  const [hitoModal, setHitoModal] = useState<Hito | null>(null)
  const [vistaPendientes, setVistaPendientes] = useState<VistaPendientes>('mes')
  const [vistaRealizados, setVistaRealizados] = useState<VistaRealizados>('mes')
  
  // Para el Buscador
  const [searchQuery, setSearchQuery] = useState('')

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

  const hoyFecha = new Date()

  // ── Lógica de Eliminación Original ──
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

  // ── Stats Originales ──
  const proyectosActivos = proyectos.filter(p => p.estado === 'activo')
  const proyectosTerminados = proyectos.filter(p => p.estado === 'completado')
  const hitosPendientesAll = hitos.filter(h => h.estado !== 'realizado')
  const hitosRealizadosAll = hitos.filter(h => h.estado === 'realizado')
  const hitosVencidos = hitosPendientesAll.filter(h => h.fechaLimite !== 'por definir' && esFechaVencida(h.fechaLimite))
  const hitosHoy = hitosPendientesAll.filter(h => h.fechaLimite !== 'por definir' && isSameDay(parseISO(h.fechaLimite), hoyFecha))

  // ── Lógica Buscador Universal ──
  const pendientesBuscador = useMemo(() => {
    if (!searchQuery) return hitosPendientesAll
    const q = searchQuery.toLowerCase()
    return hitosPendientesAll.filter(h => {
      const p = proyectos.find(x => x.id === h.proyectoId)
      return (
        h.nombre.toLowerCase().includes(q) ||
        (p?.nombre || '').toLowerCase().includes(q) ||
        (p?.clienteNombre || '').toLowerCase().includes(q) ||
        (p?.solucion || '').toLowerCase().includes(q) ||
        (p?.numeroContrato || '').toLowerCase().includes(q)
      )
    })
  }, [hitosPendientesAll, proyectos, searchQuery])

  // ── Pendientes y Realizados filtrados por vista (Original) ──
  const pendientesFiltrados = (() => {
    const conFecha = hitosPendientesAll.filter(h => h.fechaLimite !== 'por definir')
    const sinFecha = hitosPendientesAll.filter(h => h.fechaLimite === 'por definir')
    if (vistaPendientes === 'sin_fecha') return sinFecha
    const base = [...conFecha].sort((a, b) => new Date(a.fechaLimite).getTime() - new Date(b.fechaLimite).getTime())
    if (vistaPendientes === 'todo') return base
    if (vistaPendientes === 'dia') return base.filter(h => { try { const ini = parseISO(h.fechaInicio); const fin = parseISO(h.fechaLimite); return isWithinInterval(hoyFecha, { start: ini, end: fin }) || isSameDay(hoyFecha, ini) || isSameDay(hoyFecha, fin) } catch { return false } })
    if (vistaPendientes === 'semana') { const ini = startOfWeek(hoyFecha, { weekStartsOn: 1 }); const fin = endOfWeek(hoyFecha, { weekStartsOn: 1 }); return base.filter(h => { try { const f = parseISO(h.fechaLimite); return f >= ini && f <= fin } catch { return false } }) }
    return base.filter(h => { try { const f = parseISO(h.fechaLimite); return isSameMonth(f, hoyFecha) } catch { return false } })
  })()

  const realizadosFiltrados = (() => {
    const base = [...hitosRealizadosAll].sort((a, b) => (b.fechaRealEnvio || b.fechaLimite).localeCompare(a.fechaRealEnvio || a.fechaLimite))
    if (vistaRealizados === 'todo') return base
    if (vistaRealizados === 'dia') return base.filter(h => { if (h.fechaRealEnvio === 'por definir' || (!h.fechaRealEnvio && h.fechaLimite === 'por definir')) return false; try { return isSameDay(parseISO(h.fechaRealEnvio || h.fechaLimite), hoyFecha) } catch { return false } })
    if (vistaRealizados === 'semana') { const ini = startOfWeek(hoyFecha, { weekStartsOn: 1 }); const fin = endOfWeek(hoyFecha, { weekStartsOn: 1 }); return base.filter(h => { if (h.fechaRealEnvio === 'por definir' || (!h.fechaRealEnvio && h.fechaLimite === 'por definir')) return false; try { const f = parseISO(h.fechaRealEnvio || h.fechaLimite); return f >= ini && f <= fin } catch { return false } }) }
    if (vistaRealizados === 'año') { const ini = startOfYear(hoyFecha); return base.filter(h => { if (h.fechaRealEnvio === 'por definir' || (!h.fechaRealEnvio && h.fechaLimite === 'por definir')) return false; try { return parseISO(h.fechaRealEnvio || h.fechaLimite) >= ini } catch { return false } }) }
    return base.filter(h => { if (h.fechaRealEnvio === 'por definir' || (!h.fechaRealEnvio && h.fechaLimite === 'por definir')) return false; try { return isSameMonth(parseISO(h.fechaRealEnvio || h.fechaLimite), hoyFecha) } catch { return false } })
  })()

  // ── Calendario Original ──
  const inicioMes = startOfMonth(mesActual)
  const finMes = endOfMonth(mesActual)
  const inicioCal = startOfWeek(inicioMes, { weekStartsOn: 1 })
  const finCal = endOfWeek(finMes, { weekStartsOn: 1 })
  const diasCal = eachDayOfInterval({ start: inicioCal, end: finCal })
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  const diasConHitos = (dia: Date) => hitosPendientesAll.filter(h => { if (h.fechaInicio === 'por definir' || h.fechaLimite === 'por definir') return false; try { const ini = parseISO(h.fechaInicio); const fin = parseISO(h.fechaLimite); return isWithinInterval(dia, { start: ini, end: fin }) || isSameDay(dia, ini) || isSameDay(dia, fin) } catch { return false } })
  const hitosDiaSeleccionado = hitosPendientesAll.filter(h => { if (h.fechaInicio === 'por definir' || h.fechaLimite === 'por definir') return false; try { const ini = parseISO(h.fechaInicio); const fin = parseISO(h.fechaLimite); return isWithinInterval(diaSeleccionado, { start: ini, end: fin }) || isSameDay(diaSeleccionado, ini) || isSameDay(diaSeleccionado, fin) } catch { return false } })

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* HEADER Y PESTAÑAS (Nuevo) */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#1e3a8a]/30 pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            Buen día, {usuario?.nombre?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            {format(hoyFecha, "EEEE d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
        <div className="flex bg-[#0d1526] p-1 rounded-xl border border-[#1e3a8a]/40">
          <button onClick={() => setActiveTab('metricas')} className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'metricas' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>
            <BarChart3 className="w-4 h-4"/> Métricas
          </button>
          <button onClick={() => setActiveTab('pendientes')} className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'pendientes' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>
            <ListTodo className="w-4 h-4"/> Tus Tareas
          </button>
          <button onClick={() => setActiveTab('calendario')} className={clsx("flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all", activeTab === 'calendario' ? "bg-blue-600 text-white shadow-lg" : "text-slate-400 hover:text-white")}>
            <CalendarDays className="w-4 h-4"/> Calendario
          </button>
        </div>
      </div>

      {/* TABS CONTENT */}

      {/* TAB 1: MÉTRICAS GERENCIALES Y STATS ORIGINALES */}
      {activeTab === 'metricas' && (
        <div className="space-y-6 animate-fade-in">
          <GalacticMetrics clientes={clientes} proyectos={proyectos} hitos={hitos} />
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <StatCard label="Proyectos activos" value={proyectosActivos.length} icon={<FolderKanban className="w-5 h-5" />} color="blue" />
            <StatCard label="Proyectos terminados" value={proyectosTerminados.length} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
            <StatCard label="Pendientes del mes" value={hitosPendientesAll.filter(h => { if (h.fechaLimite === 'por definir') return false; try { return isSameMonth(parseISO(h.fechaLimite), hoyFecha) } catch { return false } }).length} icon={<Clock className="w-5 h-5" />} color="cyan" />
            <StatCard label="Vencidos" value={hitosVencidos.length} icon={<AlertCircle className="w-5 h-5" />} color="red" />
            <StatCard label="Vencen hoy" value={hitosHoy.length} icon={<CalendarDays className="w-5 h-5" />} color="amber" />
            <StatCard label="Realizados del mes" value={realizadosFiltrados.length} icon={<CheckCircle2 className="w-5 h-5" />} color="purple" />
          </div>
        </div>
      )}

      {/* TAB 2: BUSCADOR Y LISTA ORIGINAL DE PENDIENTES / REALIZADOS */}
      {activeTab === 'pendientes' && (
        <div className="space-y-6 animate-fade-in">
          {/* BUSCADOR UNIVERSAL (Nuevo) */}
          <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2"><Search className="w-5 h-5 text-amber-400"/> Buscador de Pendientes</h2>
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
            
            {/* Resultados de búsqueda (Solo si hay texto) */}
            {searchQuery && (
              <div className="mt-6 border-t border-[#1e3a8a]/30 pt-6">
                <p className="text-xs text-blue-400 mb-3 font-medium">Resultados de búsqueda ({pendientesBuscador.length})</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-2">
                  {pendientesBuscador.map(h => {
                    const esHuerfano = !proyectos.some(p => p.id === h.proyectoId);
                    return <HitoItem key={h.id} hito={h} proyectos={proyectos} onClick={() => setHitoModal(h)} onDelete={(e) => handleEliminarPendiente(h.id, e, esHuerfano)} isAdmin={isAdmin} />
                  })}
                </div>
              </div>
            )}
          </div>

          {/* VISTAS ORIGINALES */}
          {!searchQuery && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {/* PENDIENTES */}
              <div className="card flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400" />
                    <h2 className="font-semibold text-white text-sm">Pendientes</h2>
                    <span className="text-xs text-slate-500">({pendientesFiltrados.length})</span>
                  </div>
                  <div className="flex bg-[#0d1526] border border-[#1e3a8a]/50 rounded-lg overflow-hidden text-xs">
                    {(['dia', 'semana', 'mes', 'todo', 'sin_fecha'] as VistaPendientes[]).map(v => (
                      <button key={v} onClick={() => setVistaPendientes(v)}
                        className={clsx('px-2.5 py-1.5 capitalize transition-colors', vistaPendientes === v ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white')}>
                        {v === 'todo' ? 'Todo' : v === 'dia' ? 'Hoy' : v === 'semana' ? 'Semana' : v === 'mes' ? 'Mes' : 'Sin fecha'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-80 pr-1">
                  {pendientesFiltrados.length === 0
                    ? <p className="text-slate-500 text-sm text-center py-8">¡Sin pendientes! 🎉</p>
                    : pendientesFiltrados.map(h => {
                        const esHuerfano = !proyectos.some(p => p.id === h.proyectoId);
                        return <HitoItem key={h.id} hito={h} proyectos={proyectos} onClick={() => setHitoModal(h)} onDelete={(e) => handleEliminarPendiente(h.id, e, esHuerfano)} isAdmin={isAdmin} />
                      })
                  }
                </div>
              </div>

              {/* REALIZADOS */}
              <div className="card flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <h2 className="font-semibold text-white text-sm">Realizados</h2>
                    <span className="text-xs text-slate-500">({realizadosFiltrados.length})</span>
                  </div>
                  <div className="flex bg-[#0d1526] border border-[#1e3a8a]/50 rounded-lg overflow-hidden text-xs">
                    {(['dia', 'semana', 'mes', 'año', 'todo'] as VistaRealizados[]).map(v => (
                      <button key={v} onClick={() => setVistaRealizados(v)}
                        className={clsx('px-2 py-1.5 capitalize transition-colors', vistaRealizados === v ? 'bg-green-700 text-white' : 'text-slate-400 hover:text-white')}>
                        {v === 'todo' ? 'Todo' : v === 'dia' ? 'Hoy' : v === 'semana' ? 'Sem' : v === 'mes' ? 'Mes' : 'Año'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 space-y-1.5 overflow-y-auto max-h-80 pr-1">
                  {realizadosFiltrados.length === 0
                    ? <p className="text-slate-500 text-sm text-center py-8">Sin realizados en este período</p>
                    : realizadosFiltrados.map(h => {
                        const esHuerfano = !proyectos.some(p => p.id === h.proyectoId);
                        return <HitoItemRealizado key={h.id} hito={h} proyectos={proyectos} onDelete={(e) => handleEliminarPendiente(h.id, e as unknown as React.MouseEvent, esHuerfano)} isAdmin={isAdmin} />
                      })
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: CALENDARIO ORIGINAL */}
      {activeTab === 'calendario' && (
        <div className="card animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-blue-400" />
              <h2 className="font-display font-semibold text-white capitalize">
                {format(mesActual, "MMMM yyyy", { locale: es })}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setMesActual(subMonths(mesActual, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1e3a8a] hover:bg-[#1e3a8a]/30 text-slate-400 hover:text-white transition-colors"><ChevronLeft className="w-4 h-4" /></button>
              <button onClick={() => setMesActual(new Date())} className="text-xs text-blue-400 hover:text-blue-300 px-2">Hoy</button>
              <button onClick={() => setMesActual(addMonths(mesActual, 1))} className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1e3a8a] hover:bg-[#1e3a8a]/30 text-slate-400 hover:text-white transition-colors"><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {diasSemana.map(d => <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {diasCal.map(dia => {
              const hitosDelDia = diasConHitos(dia)
              const estesMes = isSameMonth(dia, mesActual)
              const esHoy = isToday(dia)
              const esSeleccionado = isSameDay(dia, diaSeleccionado)
              const tieneVencidos = hitosDelDia.some(h => esFechaVencida(h.fechaLimite))
              return (
                <button key={dia.toISOString()} onClick={() => setDiaSeleccionado(dia)}
                  className={clsx('relative aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-xs transition-all', !estesMes && 'opacity-30', esSeleccionado && 'bg-blue-600/30 border border-blue-500', esHoy && !esSeleccionado && 'border border-blue-400/50', !esSeleccionado && !esHoy && hitosDelDia.length > 0 && 'bg-[#1e3a8a]/10', !esSeleccionado && !esHoy && 'hover:bg-white/5')}>
                  <span className={clsx('w-6 h-6 flex items-center justify-center rounded-full font-medium', esHoy && 'bg-blue-600 text-white', !esHoy && (estesMes ? 'text-slate-200' : 'text-slate-600'))}>{format(dia, 'd')}</span>
                  {hitosDelDia.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                      {hitosDelDia.slice(0, 3).map((_, i) => <span key={i} className={clsx('w-1.5 h-1.5 rounded-full', tieneVencidos ? 'bg-red-400' : 'bg-blue-400/60')} />)}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-[#1e3a8a]/30">
            <p className="text-xs text-slate-400 mb-2 font-medium">{format(diaSeleccionado, "d 'de' MMMM", { locale: es })} — {hitosDiaSeleccionado.length} hito(s)</p>
            {hitosDiaSeleccionado.length === 0
              ? <p className="text-slate-600 text-xs">Sin hitos este día</p>
              : <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {hitosDiaSeleccionado.map(h => {
                    const esHuerfano = !proyectos.some(p => p.id === h.proyectoId);
                    return <HitoItem key={h.id} hito={h} proyectos={proyectos} onClick={() => setHitoModal(h)} onDelete={(e) => handleEliminarPendiente(h.id, e, esHuerfano)} isAdmin={isAdmin} />
                  })}
                </div>
            }
          </div>
        </div>
      )}

      {/* Modal Original Intacto */}
      {hitoModal && <ModalHitoRango hito={hitoModal} proyectos={proyectos} onClose={() => setHitoModal(null)} />}
    </div>
  )
}

// ── Modal Original intacto ─────────────────────────────────────────────
function ModalHitoRango({ hito, proyectos, onClose }: { hito: Hito; proyectos: Proyecto[]; onClose: () => void }) {
  const proyecto = proyectos.find(p => p.id === hito.proyectoId)
  const hoy = new Date()
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

// ── Componentes Originales Intactos ──────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: 'blue' | 'cyan' | 'red' | 'amber' | 'green' | 'purple' }) {
  const colors = { blue: 'bg-blue-900/30 border-blue-700/40 text-blue-400', cyan: 'bg-cyan-900/30 border-cyan-700/40 text-cyan-400', red: 'bg-red-900/30 border-red-700/40 text-red-400', amber: 'bg-amber-900/30 border-amber-700/40 text-amber-400', green: 'bg-green-900/30 border-green-700/40 text-green-400', purple: 'bg-purple-900/30 border-purple-700/40 text-purple-400' }
  return <div className={clsx('border rounded-xl p-4 flex items-center gap-3', colors[color])}><div className="opacity-80">{icon}</div><div><p className="text-2xl font-display font-bold text-white">{value}</p><p className="text-xs text-slate-400">{label}</p></div></div>
}

function HitoItem({ hito, proyectos, onClick, onDelete, isAdmin }: { hito: Hito; proyectos: Proyecto[]; onClick: () => void; onDelete?: (e: React.MouseEvent) => void; isAdmin?: boolean }) {
  const vencido = hito.fechaLimite !== 'por definir' && esFechaVencida(hito.fechaLimite)
  const proyecto = proyectos.find(p => p.id === hito.proyectoId)
  return (
    <div className="flex items-center gap-2 group">
      <button onClick={onClick} className={clsx('flex-1 text-left flex items-start gap-2 p-2.5 rounded-lg border text-xs transition-all hover:border-blue-500/50', vencido ? 'bg-red-900/20 border-red-800/40' : 'bg-[#0d1526] border-[#1e3a8a]/30')}>
        <span className={clsx('w-2 h-2 rounded-full mt-0.5 flex-shrink-0', vencido ? 'bg-red-400' : 'bg-cyan-400')} />
        <div className="min-w-0 flex-1">
          <p className={clsx('font-medium truncate', vencido ? 'text-red-300' : 'text-slate-200')}>{hito.nombre}</p>
          <div className="flex gap-3 mt-0.5 text-slate-500">
            <span>Inicio: <span className="text-slate-400">{hito.fechaInicio === 'por definir' ? 'por definir' : formatearFecha(hito.fechaInicio)}</span></span>
            <span>Límite: <span className={vencido ? 'text-red-400' : 'text-slate-400'}>{hito.fechaLimite === 'por definir' ? 'por definir' : formatearFecha(hito.fechaLimite)}</span></span>
          </div>
          {hito.responsable && <p className="text-slate-600 mt-0.5">{hito.responsable}</p>}
          {proyecto ? <p className="text-slate-500 mt-0.5 truncate">{proyecto.clienteNombre}{proyecto.solucion && <span className="text-slate-600"> — {proyecto.solucion}</span>}</p> : <p className="text-red-500 mt-0.5 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Proyecto Eliminado (Huérfano)</p>}
        </div>
        <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" />
      </button>
      {isAdmin && onDelete && <button onClick={onDelete} title="Eliminar pendiente" className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>}
    </div>
  )
}

function HitoItemRealizado({ hito, proyectos, onDelete, isAdmin }: { hito: Hito; proyectos: Proyecto[]; onDelete?: (e: React.MouseEvent) => void; isAdmin?: boolean }) {
  const proyecto = proyectos.find(p => p.id === hito.proyectoId)
  const esHuerfano = !proyecto;
  return (
    <div className="flex items-center gap-2 group">
      <Link href={esHuerfano ? '#' : `/cronogramas?proyecto=${hito.proyectoId}&expandir=${hito.id}`} className={clsx("flex-1 flex items-start gap-2 p-2.5 rounded-lg border text-xs transition-all hover:border-green-500/50 bg-green-900/10 border-green-800/30", esHuerfano && "pointer-events-none opacity-70")}>
        <span className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0 bg-green-400" />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate text-green-300">{hito.nombre}</p>
          {hito.fechaRealEnvio && hito.fechaRealEnvio !== 'por definir' && <p className="text-slate-500 mt-0.5">Realizado: <span className="text-green-400">{formatearFecha(hito.fechaRealEnvio)}</span></p>}
          {hito.responsable && <p className="text-slate-600 mt-0.5">{hito.responsable}</p>}
          {proyecto ? <p className="text-slate-500 mt-0.5 truncate">{proyecto.clienteNombre}{proyecto.solucion && <span className="text-slate-600"> — {proyecto.solucion}</span>}</p> : <p className="text-red-500 mt-0.5 font-medium flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Proyecto Eliminado</p>}
        </div>
        {!esHuerfano && <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-green-400 flex-shrink-0 mt-0.5 transition-colors" />}
      </Link>
      {isAdmin && onDelete && <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(e); }} title="Eliminar registro" className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>}
    </div>
  )
}
