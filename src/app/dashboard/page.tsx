'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { obtenerTodosHitos, obtenerProyectos, formatearFecha, esFechaVencida, eliminarHito } from '@/lib/db'
import type { Hito, Proyecto } from '@/types'
import toast from 'react-hot-toast'
import {
  CalendarDays, AlertCircle, CheckCircle2, Clock,
  FolderKanban, ChevronLeft, ChevronRight, ArrowRight, X, Trash2
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

type VistaPendientes = 'mes' | 'semana' | 'dia' | 'todo'
type VistaRealizados = 'mes' | 'semana' | 'dia' | 'año' | 'todo'

export default function DashboardPage() {
  const { usuario, isAdmin } = useAuth()
  const [hitos, setHitos] = useState<Hito[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [mesActual, setMesActual] = useState(new Date())
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date>(new Date())
  const [hitoModal, setHitoModal] = useState<Hito | null>(null)
  const [vistaPendientes, setVistaPendientes] = useState<VistaPendientes>('mes')
  const [vistaRealizados, setVistaRealizados] = useState<VistaRealizados>('mes')

  useEffect(() => {
    const cargar = async () => {
      const [h, p] = await Promise.all([obtenerTodosHitos(), obtenerProyectos()])
      setHitos(h)
      setProyectos(p)
      setLoading(false)
    }
    cargar()
  }, [])

  const hoy = new Date()

  const handleEliminarPendiente = async (id: string, e: React.MouseEvent, esHuerfano: boolean) => {
    e.stopPropagation()
    if (!esHuerfano) {
      if (!confirm('Este pendiente pertenece a un cronograma activo. ¿Estás seguro de eliminarlo permanentemente?')) return
    } else {
      if (!confirm('Este es un registro huérfano (su proyecto ya fue eliminado). ¿Limpiar pendiente?')) return
    }
    
    try {
      await eliminarHito(id)
      setHitos(prev => prev.filter(h => h.id !== id))
      if (hitoModal?.id === id) setHitoModal(null)
      toast.success('Pendiente eliminado exitosamente')
    } catch (error) {
      toast.error('Ocurrió un error al eliminar')
    }
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const proyectosActivos = proyectos.filter(p => p.estado === 'activo')
  const proyectosTerminados = proyectos.filter(p => p.estado === 'completado')

  const hitosPendientesAll = hitos.filter(h =>
    h.estado !== 'realizado' &&
    h.fechaInicio !== 'por definir' &&
    h.fechaLimite !== 'por definir'
  )
  const hitosRealizadosAll = hitos.filter(h => h.estado === 'realizado')
  const hitosVencidos = hitosPendientesAll.filter(h => esFechaVencida(h.fechaLimite))
  const hitosHoy = hitosPendientesAll.filter(h => isSameDay(parseISO(h.fechaLimite), hoy))

  // ── Pendientes filtrados por vista ───────────────────────────────────────
  const pendientesFiltrados = (() => {
    const base = [...hitosPendientesAll].sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite))
    if (vistaPendientes === 'todo') return base
    if (vistaPendientes === 'dia') {
      return base.filter(h => {
        try {
          const ini = parseISO(h.fechaInicio)
          const fin = parseISO(h.fechaLimite)
          return isWithinInterval(hoy, { start: ini, end: fin }) || isSameDay(hoy, ini) || isSameDay(hoy, fin)
        } catch { return false }
      })
    }
    if (vistaPendientes === 'semana') {
      const ini = startOfWeek(hoy, { weekStartsOn: 1 })
      const fin = endOfWeek(hoy, { weekStartsOn: 1 })
      return base.filter(h => {
        try { const f = parseISO(h.fechaLimite); return f >= ini && f <= fin } catch { return false }
      })
    }
    // mes
    return base.filter(h => {
      try { const f = parseISO(h.fechaLimite); return isSameMonth(f, hoy) } catch { return false }
    })
  })()

  // ── Realizados filtrados por vista ───────────────────────────────────────
  const realizadosFiltrados = (() => {
    const base = [...hitosRealizadosAll].sort((a, b) =>
      (b.fechaRealEnvio || b.fechaLimite).localeCompare(a.fechaRealEnvio || a.fechaLimite)
    )
    if (vistaRealizados === 'todo') return base
    if (vistaRealizados === 'dia') {
      return base.filter(h => {
        try { return isSameDay(parseISO(h.fechaRealEnvio || h.fechaLimite), hoy) } catch { return false }
      })
    }
    if (vistaRealizados === 'semana') {
      const ini = startOfWeek(hoy, { weekStartsOn: 1 })
      const fin = endOfWeek(hoy, { weekStartsOn: 1 })
      return base.filter(h => {
        try { const f = parseISO(h.fechaRealEnvio || h.fechaLimite); return f >= ini && f <= fin } catch { return false }
      })
    }
    if (vistaRealizados === 'año') {
      const ini = startOfYear(hoy)
      return base.filter(h => {
        try { return parseISO(h.fechaRealEnvio || h.fechaLimite) >= ini } catch { return false }
      })
    }
    // mes
    return base.filter(h => {
      try { return isSameMonth(parseISO(h.fechaRealEnvio || h.fechaLimite), hoy) } catch { return false }
    })
  })()

  // ── Calendario ───────────────────────────────────────────────────────────
  const inicioMes = startOfMonth(mesActual)
  const finMes = endOfMonth(mesActual)
  const inicioCal = startOfWeek(inicioMes, { weekStartsOn: 1 })
  const finCal = endOfWeek(finMes, { weekStartsOn: 1 })
  const diasCal = eachDayOfInterval({ start: inicioCal, end: finCal })
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  const diasConHitos = (dia: Date) =>
    hitosPendientesAll.filter(h => {
      try {
        const ini = parseISO(h.fechaInicio)
        const fin = parseISO(h.fechaLimite)
        return isWithinInterval(dia, { start: ini, end: fin }) || isSameDay(dia, ini) || isSameDay(dia, fin)
      } catch { return false }
    })

  const hitosDiaSeleccionado = hitosPendientesAll.filter(h => {
    try {
      const ini = parseISO(h.fechaInicio)
      const fin = parseISO(h.fechaLimite)
      return isWithinInterval(diaSeleccionado, { start: ini, end: fin }) ||
        isSameDay(diaSeleccionado, ini) || isSameDay(diaSeleccionado, fin)
    } catch { return false }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Saludo */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          Buen día, {usuario?.nombre?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {format(hoy, "EEEE d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <StatCard label="Proyectos activos" value={proyectosActivos.length} icon={<FolderKanban className="w-5 h-5" />} color="blue" />
        <StatCard label="Proyectos terminados" value={proyectosTerminados.length} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
        <StatCard label="Pendientes del mes" value={hitosPendientesAll.filter(h => { try { return isSameMonth(parseISO(h.fechaLimite), hoy) } catch { return false } }).length} icon={<Clock className="w-5 h-5" />} color="cyan" />
        <StatCard label="Vencidos" value={hitosVencidos.length} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        <StatCard label="Vencen hoy" value={hitosHoy.length} icon={<CalendarDays className="w-5 h-5" />} color="amber" />
        <StatCard label="Realizados del mes" value={realizadosFiltrados.length} icon={<CheckCircle2 className="w-5 h-5" />} color="purple" />
      </div>

      {/* Pendientes + Realizados */}
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
              {(['dia', 'semana', 'mes', 'todo'] as VistaPendientes[]).map(v => (
                <button key={v} onClick={() => setVistaPendientes(v)}
                  className={clsx('px-2.5 py-1.5 capitalize transition-colors',
                    vistaPendientes === v ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white')}>
                  {v === 'todo' ? 'Todo' : v === 'dia' ? 'Hoy' : v === 'semana' ? 'Semana' : 'Mes'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-80 pr-1">
            {pendientesFiltrados.length === 0
              ? <p className="text-slate-500 text-sm text-center py-8">¡Sin pendientes! 🎉</p>
              : pendientesFiltrados.map(h => {
                  const esHuerfano = !proyectos.some(p => p.id === h.proyectoId);
                  return (
                    <HitoItem 
                      key={h.id} 
                      hito={h} 
                      proyectos={proyectos} 
                      onClick={() => setHitoModal(h)} 
                      onDelete={(e) => handleEliminarPendiente(h.id, e, esHuerfano)}
                      isAdmin={isAdmin}
                    />
                  )
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
                  className={clsx('px-2 py-1.5 capitalize transition-colors',
                    vistaRealizados === v ? 'bg-green-700 text-white' : 'text-slate-400 hover:text-white')}>
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
                  return (
                    <HitoItemRealizado 
                      key={h.id} 
                      hito={h} 
                      proyectos={proyectos} 
                      onDelete={(e) => handleEliminarPendiente(h.id, e as unknown as React.MouseEvent, esHuerfano)}
                      isAdmin={isAdmin}
                    />
                  )
                })
            }
          </div>
        </div>
      </div>

      {/* Calendario */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CalendarDays className="w-5 h-5 text-blue-400" />
            <h2 className="font-display font-semibold text-white capitalize">
              {format(mesActual, "MMMM yyyy", { locale: es })}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setMesActual(subMonths(mesActual, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1e3a8a] hover:bg-[#1e3a8a]/30 text-slate-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setMesActual(new Date())}
              className="text-xs text-blue-400 hover:text-blue-300 px-2">Hoy</button>
            <button onClick={() => setMesActual(addMonths(mesActual, 1))}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1e3a8a] hover:bg-[#1e3a8a]/30 text-slate-400 hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 mb-1">
          {diasSemana.map(d => (
            <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">{d}</div>
          ))}
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
                className={clsx(
                  'relative aspect-square flex flex-col items-center justify-start pt-1 rounded-lg text-xs transition-all',
                  !estesMes && 'opacity-30',
                  esSeleccionado && 'bg-blue-600/30 border border-blue-500',
                  esHoy && !esSeleccionado && 'border border-blue-400/50',
                  !esSeleccionado && !esHoy && hitosDelDia.length > 0 && 'bg-[#1e3a8a]/10',
                  !esSeleccionado && !esHoy && 'hover:bg-white/5'
                )}>
                <span className={clsx(
                  'w-6 h-6 flex items-center justify-center rounded-full font-medium',
                  esHoy && 'bg-blue-600 text-white',
                  !esHoy && (estesMes ? 'text-slate-200' : 'text-slate-600')
                )}>
                  {format(dia, 'd')}
                </span>
                {hitosDelDia.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                    {hitosDelDia.slice(0, 3).map((_, i) => (
                      <span key={i} className={clsx(
                        'w-1.5 h-1.5 rounded-full',
                        tieneVencidos ? 'bg-red-400' : 'bg-blue-400/60'
                      )} />
                    ))}
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* Hitos del día seleccionado */}
        <div className="mt-4 pt-4 border-t border-[#1e3a8a]/30">
          <p className="text-xs text-slate-400 mb-2 font-medium">
            {format(diaSeleccionado, "d 'de' MMMM", { locale: es })} — {hitosDiaSeleccionado.length} hito(s)
          </p>
          {hitosDiaSeleccionado.length === 0
            ? <p className="text-slate-600 text-xs">Sin hitos este día</p>
            : <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {hitosDiaSeleccionado.map(h => {
                  const esHuerfano = !proyectos.some(p => p.id === h.proyectoId);
                  return (
                    <HitoItem 
                      key={h.id} 
                      hito={h} 
                      proyectos={proyectos} 
                      onClick={() => setHitoModal(h)} 
                      onDelete={(e) => handleEliminarPendiente(h.id, e, esHuerfano)}
                      isAdmin={isAdmin}
                    />
                  )
                })}
              </div>
          }
        </div>
      </div>

      {/* Modal de hito con mini-calendario de rango */}
      {hitoModal && (
        <ModalHitoRango
          hito={hitoModal}
          proyectos={proyectos}
          onClose={() => setHitoModal(null)}
        />
      )}
    </div>
  )
}

// ── Modal con rango de fechas ─────────────────────────────────────────────

function ModalHitoRango({ hito, proyectos, onClose }: { hito: Hito; proyectos: Proyecto[]; onClose: () => void }) {
  const proyecto = proyectos.find(p => p.id === hito.proyectoId)
  const hoy = new Date()
  const inicio = parseISO(hito.fechaInicio)
  const fin = parseISO(hito.fechaLimite)
  const vencido = esFechaVencida(hito.fechaLimite)

  // Construir rango de días
  let diasRango: Date[] = []
  try {
    diasRango = eachDayOfInterval({ start: inicio, end: fin })
  } catch { diasRango = [] }

  // Semanas del rango (con padding al inicio para alinear con día de semana)
  const primerDia = diasRango[0] || inicio
  const diaSemanaInicio = (primerDia.getDay() + 6) % 7 // 0=Lun
  const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

  return (
    <div className="modal-overlay z-50" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md shadow-2xl border border-slate-600">
        <div className="flex items-center justify-between p-5 border-b border-[#1e3a8a]/50 bg-[#0d1526]">
          <div className="flex items-center gap-3">
            <div className={clsx('w-3 h-3 rounded-full', vencido ? 'bg-red-400' : 'bg-cyan-400')} />
            <div>
              <h2 className="font-semibold text-white text-sm">{hito.nombre}</h2>
              {proyecto && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {proyecto.clienteNombre}{proyecto.solucion && ` — ${proyecto.solucion}`}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 bg-[#111d35]">
          {/* Info rápida */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3">
              <p className="text-slate-500 mb-1">Fecha inicio</p>
              <p className="text-cyan-400 font-medium">{formatearFecha(hito.fechaInicio)}</p>
            </div>
            <div className={clsx('border rounded-lg p-3', vencido ? 'bg-red-900/20 border-red-700/40' : 'bg-[#0d1526] border-[#1e3a8a]/40')}>
              <p className="text-slate-500 mb-1">Fecha límite</p>
              <p className={clsx('font-medium', vencido ? 'text-red-400' : 'text-slate-200')}>{formatearFecha(hito.fechaLimite)}</p>
            </div>
            {hito.responsable && (
              <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3">
                <p className="text-slate-500 mb-1">Responsable</p>
                <p className="text-slate-200">{hito.responsable}</p>
              </div>
            )}
            <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3">
              <p className="text-slate-500 mb-1">Duración</p>
              <p className="text-slate-200">{diasRango.length} día(s)</p>
            </div>
          </div>

          {/* Mini calendario del rango */}
          {diasRango.length > 0 && diasRango.length <= 60 && (
            <div>
              <p className="text-xs text-slate-400 mb-2 font-medium">Rango del hito</p>
              <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3">
                <div className="grid grid-cols-7 mb-1">
                  {diasSemana.map(d => (
                    <div key={d} className="text-center text-xs text-slate-600 py-1">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {/* Padding inicial */}
                  {Array.from({ length: diaSemanaInicio }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {diasRango.map(dia => {
                    const esHoyDia = isToday(dia)
                    const esIni = isSameDay(dia, inicio)
                    const esFin = isSameDay(dia, fin)
                    return (
                      <div key={dia.toISOString()}
                        className={clsx(
                          'aspect-square flex items-center justify-center text-xs rounded-md font-medium',
                          esHoyDia && 'bg-blue-600 text-white ring-2 ring-blue-400',
                          !esHoyDia && esIni && 'bg-cyan-700/60 text-cyan-300',
                          !esHoyDia && esFin && (vencido ? 'bg-red-700/60 text-red-300' : 'bg-green-700/60 text-green-300'),
                          !esHoyDia && !esIni && !esFin && 'bg-[#1e3a8a]/30 text-slate-400',
                        )}>
                        {format(dia, 'd')}
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-3 mt-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-600 inline-block" /> Hoy</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-cyan-700/60 inline-block" /> Inicio</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-700/60 inline-block" /> Fin</span>
                </div>
              </div>
            </div>
          )}

          {diasRango.length > 60 && (
            <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3 text-xs text-slate-400 text-center">
              Rango de {diasRango.length} días — muy extenso para mostrar en calendario
            </div>
          )}

          {hito.descripcion && (
            <div>
              <p className="text-xs text-slate-500 mb-1">Descripción</p>
              <p className="text-xs text-slate-300">{hito.descripcion}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-5 pb-5 bg-[#111d35]">
          <button onClick={onClose} className="btn-secondary text-xs">Cerrar</button>
          {!proyecto ? (
             <button disabled className="btn-primary opacity-50 cursor-not-allowed text-xs">Proyecto Eliminado</button>
          ) : (
            <Link
              href={`/cronogramas?proyecto=${hito.proyectoId}&expandir=${hito.id}`}
              className="btn-primary text-xs"
              onClick={onClose}
            >
              Ver en cronograma <ArrowRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componentes ───────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode
  color: 'blue' | 'cyan' | 'red' | 'amber' | 'green' | 'purple'
}) {
  const colors = {
    blue:   'bg-blue-900/30 border-blue-700/40 text-blue-400',
    cyan:   'bg-cyan-900/30 border-cyan-700/40 text-cyan-400',
    red:    'bg-red-900/30 border-red-700/40 text-red-400',
    amber:  'bg-amber-900/30 border-amber-700/40 text-amber-400',
    green:  'bg-green-900/30 border-green-700/40 text-green-400',
    purple: 'bg-purple-900/30 border-purple-700/40 text-purple-400',
  }
  return (
    <div className={clsx('border rounded-xl p-4 flex items-center gap-3', colors[color])}>
      <div className="opacity-80">{icon}</div>
      <div>
        <p className="text-2xl font-display font-bold text-white">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  )
}

function HitoItem({ hito, proyectos, onClick, onDelete, isAdmin }: { hito: Hito; proyectos: Proyecto[]; onClick: () => void; onDelete?: (e: React.MouseEvent) => void; isAdmin?: boolean }) {
  const vencido = esFechaVencida(hito.fechaLimite)
  const proyecto = proyectos.find(p => p.id === hito.proyectoId)
  const esHuerfano = !proyecto;

  return (
    <div className="flex items-center gap-2 group">
      <button onClick={onClick}
        className={clsx(
          'flex-1 text-left flex items-start gap-2 p-2.5 rounded-lg border text-xs transition-all hover:border-blue-500/50',
          vencido ? 'bg-red-900/20 border-red-800/40' : 'bg-[#0d1526] border-[#1e3a8a]/30'
        )}>
        <span className={clsx('w-2 h-2 rounded-full mt-0.5 flex-shrink-0', vencido ? 'bg-red-400' : 'bg-cyan-400')} />
        <div className="min-w-0 flex-1">
          <p className={clsx('font-medium truncate', vencido ? 'text-red-300' : 'text-slate-200')}>
            {hito.nombre}
          </p>
          <div className="flex gap-3 mt-0.5 text-slate-500">
            <span>Inicio: <span className="text-slate-400">{formatearFecha(hito.fechaInicio)}</span></span>
            <span>Límite: <span className={vencido ? 'text-red-400' : 'text-slate-400'}>{formatearFecha(hito.fechaLimite)}</span></span>
          </div>
          {hito.responsable && <p className="text-slate-600 mt-0.5">{hito.responsable}</p>}
          {proyecto ? (
            <p className="text-slate-500 mt-0.5 truncate">
              {proyecto.clienteNombre}
              {proyecto.solucion && <span className="text-slate-600"> — {proyecto.solucion}</span>}
            </p>
          ) : (
            <p className="text-red-500 mt-0.5 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Proyecto Eliminado (Huérfano)
            </p>
          )}
        </div>
        <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" />
      </button>
      
      {isAdmin && onDelete && (
        <button 
          onClick={onDelete}
          title="Eliminar pendiente"
          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}

function HitoItemRealizado({ hito, proyectos, onDelete, isAdmin }: { hito: Hito; proyectos: Proyecto[]; onDelete?: (e: React.MouseEvent) => void; isAdmin?: boolean }) {
  const proyecto = proyectos.find(p => p.id === hito.proyectoId)
  const esHuerfano = !proyecto;

  return (
    <div className="flex items-center gap-2 group">
      <Link
        href={esHuerfano ? '#' : `/cronogramas?proyecto=${hito.proyectoId}&expandir=${hito.id}`}
        className={clsx("flex-1 flex items-start gap-2 p-2.5 rounded-lg border text-xs transition-all hover:border-green-500/50 bg-green-900/10 border-green-800/30", esHuerfano && "pointer-events-none opacity-70")}
      >
        <span className="w-2 h-2 rounded-full mt-0.5 flex-shrink-0 bg-green-400" />
        <div className="min-w-0 flex-1">
          <p className="font-medium truncate text-green-300">{hito.nombre}</p>
          {hito.fechaRealEnvio && (
            <p className="text-slate-500 mt-0.5">Realizado: <span className="text-green-400">{formatearFecha(hito.fechaRealEnvio)}</span></p>
          )}
          {hito.responsable && <p className="text-slate-600 mt-0.5">{hito.responsable}</p>}
          {proyecto ? (
            <p className="text-slate-500 mt-0.5 truncate">
              {proyecto.clienteNombre}
              {proyecto.solucion && <span className="text-slate-600"> — {proyecto.solucion}</span>}
            </p>
          ) : (
            <p className="text-red-500 mt-0.5 font-medium flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Proyecto Eliminado
            </p>
          )}
        </div>
        {!esHuerfano && <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-green-400 flex-shrink-0 mt-0.5 transition-colors" />}
      </Link>

      {isAdmin && onDelete && (
        <button 
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(e);
          }}
          title="Eliminar registro"
          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100 flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
