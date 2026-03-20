'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { obtenerTodosHitos, obtenerProyectos, formatearFecha, esFechaVencida } from '@/lib/db'
import type { Hito, Proyecto } from '@/types'
import {
  CalendarDays, AlertCircle, CheckCircle2, Clock,
  FolderKanban, ChevronLeft, ChevronRight, ArrowRight
} from 'lucide-react'
import Link from 'next/link'
import clsx from 'clsx'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isSameMonth, addMonths, subMonths, isToday,
  startOfWeek, endOfWeek, parseISO, isWithinInterval
} from 'date-fns'
import { es } from 'date-fns/locale'

type Vista = 'mes' | 'semana' | 'lista'

export default function DashboardPage() {
  const { usuario } = useAuth()
  const [hitos, setHitos] = useState<Hito[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [mesActual, setMesActual] = useState(new Date())
  const [vista, setVista] = useState<Vista>('mes')
  const [diaSeleccionado, setDiaSeleccionado] = useState<Date>(new Date())

  useEffect(() => {
    const cargar = async () => {
      const [h, p] = await Promise.all([obtenerTodosHitos(), obtenerProyectos()])
      setHitos(h)
      setProyectos(p)
      setLoading(false)
    }
    cargar()
  }, [])

  const hitosPendientes = hitos.filter(h =>
    h.estado !== 'realizado' &&
    h.fechaInicio !== 'por definir' &&
    h.fechaLimite !== 'por definir'
  )
  const hitosVencidos = hitosPendientes.filter(h => esFechaVencida(h.fechaLimite))
  const hitosHoy = hitosPendientes.filter(h => isSameDay(parseISO(h.fechaLimite), new Date()))
  const proyectosActivos = proyectos.filter(p => p.estado === 'activo')

  // Días que tienen hitos activos (entre fechaInicio y fechaLimite)
  const diasConHitos = (dia: Date) =>
    hitosPendientes.filter(h => {
      try {
        const ini = parseISO(h.fechaInicio)
        const fin = parseISO(h.fechaLimite)
        return isWithinInterval(dia, { start: ini, end: fin }) ||
          isSameDay(dia, ini) || isSameDay(dia, fin)
      } catch { return false }
    })

  const hitosDiaSeleccionado = hitosPendientes.filter(h => {
    try {
      const ini = parseISO(h.fechaInicio)
      const fin = parseISO(h.fechaLimite)
      return isWithinInterval(diaSeleccionado, { start: ini, end: fin }) ||
        isSameDay(diaSeleccionado, ini) || isSameDay(diaSeleccionado, fin)
    } catch { return false }
  })

  const inicioMes = startOfMonth(mesActual)
  const finMes = endOfMonth(mesActual)
  const inicioCal = startOfWeek(inicioMes, { weekStartsOn: 1 })
  const finCal = endOfWeek(finMes, { weekStartsOn: 1 })
  const diasCal = eachDayOfInterval({ start: inicioCal, end: finCal })
  const diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  // Próximos 10 pendientes ordenados por fecha límite
  const proximosPendientes = [...hitosPendientes]
    .sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite))
    .slice(0, 10)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-white">
          Buen día, {usuario?.nombre?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Proyectos activos" value={proyectosActivos.length} icon={<FolderKanban className="w-5 h-5" />} color="blue" />
        <StatCard label="Pendientes" value={hitosPendientes.length} icon={<Clock className="w-5 h-5" />} color="cyan" />
        <StatCard label="Vencidos" value={hitosVencidos.length} icon={<AlertCircle className="w-5 h-5" />} color="red" />
        <StatCard label="Vencen hoy" value={hitosHoy.length} icon={<CheckCircle2 className="w-5 h-5" />} color="amber" />
      </div>

      {/* Calendario + Pendientes */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Calendario */}
        <div className="xl:col-span-2 card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-blue-400" />
              <h2 className="font-display font-semibold text-white capitalize">
                {format(mesActual, "MMMM yyyy", { locale: es })}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex bg-[#0d1526] border border-[#1e3a8a]/50 rounded-lg overflow-hidden text-xs">
                {(['mes', 'semana', 'lista'] as Vista[]).map(v => (
                  <button key={v} onClick={() => setVista(v)}
                    className={clsx('px-3 py-1.5 capitalize transition-colors',
                      vista === v ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white')}>
                    {v}
                  </button>
                ))}
              </div>
              <button onClick={() => setMesActual(subMonths(mesActual, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1e3a8a] hover:bg-[#1e3a8a]/30 text-slate-400 hover:text-white transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setMesActual(addMonths(mesActual, 1))}
                className="w-7 h-7 flex items-center justify-center rounded-lg border border-[#1e3a8a] hover:bg-[#1e3a8a]/30 text-slate-400 hover:text-white transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Vista Mes */}
          {vista === 'mes' && (
            <>
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
                  const esInicio = hitosDelDia.some(h => {
                    try { return isSameDay(parseISO(h.fechaInicio), dia) } catch { return false }
                  })
                  const esFin = hitosDelDia.some(h => {
                    try { return isSameDay(parseISO(h.fechaLimite), dia) } catch { return false }
                  })

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
                              tieneVencidos ? 'bg-red-400' : esInicio || esFin ? 'bg-cyan-400' : 'bg-blue-400/60'
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
                  : hitosDiaSeleccionado.map(h => <HitoItem key={h.id} hito={h} />)
                }
              </div>
            </>
          )}

          {/* Vista Lista */}
          {vista === 'lista' && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {hitosPendientes.length === 0
                ? <p className="text-slate-500 text-sm text-center py-8">No hay hitos pendientes</p>
                : [...hitosPendientes]
                    .sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite))
                    .map(h => <HitoItem key={h.id} hito={h} />)
              }
            </div>
          )}

          {/* Vista Semana */}
          {vista === 'semana' && (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {(() => {
                const hoy = new Date()
                const ini = startOfWeek(hoy, { weekStartsOn: 1 })
                const fin = endOfWeek(hoy, { weekStartsOn: 1 })
                const hitosSemana = hitosPendientes.filter(h => {
                  try {
                    const f = parseISO(h.fechaLimite)
                    return f >= ini && f <= fin
                  } catch { return false }
                })
                return hitosSemana.length === 0
                  ? <p className="text-slate-500 text-sm text-center py-8">No hay hitos esta semana</p>
                  : hitosSemana.map(h => <HitoItem key={h.id} hito={h} />)
              })()}
            </div>
          )}
        </div>

        {/* Panel de pendientes */}
        <div className="card flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <h2 className="font-semibold text-white text-sm">Próximos pendientes</h2>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-96 pr-1">
            {proximosPendientes.length === 0
              ? <p className="text-slate-500 text-sm text-center py-8">¡Todo al día! 🎉</p>
              : proximosPendientes.map(h => (
                <Link
                  key={h.id}
                  href={`/cronogramas?proyecto=${h.proyectoId}`}
                  className={clsx(
                    'block p-2.5 rounded-lg border text-xs transition-all hover:border-blue-500/50 hover:bg-[#1e3a8a]/10 group',
                    esFechaVencida(h.fechaLimite)
                      ? 'bg-red-900/20 border-red-800/40'
                      : 'bg-[#0d1526] border-[#1e3a8a]/40'
                  )}>
                  <div className="flex items-start justify-between gap-2">
                    <p className={clsx(
                      'font-medium truncate flex-1',
                      esFechaVencida(h.fechaLimite) ? 'text-red-300' : 'text-slate-200'
                    )}>
                      {h.nombre}
                    </p>
                    <ArrowRight className="w-3 h-3 text-slate-500 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" />
                  </div>
                  <div className="flex items-center gap-3 mt-1.5 text-slate-500">
                    <span>
                      Inicio: <span className="text-slate-400">{formatearFecha(h.fechaInicio)}</span>
                    </span>
                    <span>
                      Límite: <span className={esFechaVencida(h.fechaLimite) ? 'text-red-400' : 'text-slate-400'}>
                        {formatearFecha(h.fechaLimite)}
                      </span>
                    </span>
                  </div>
                  {h.responsable && (
                    <p className="text-slate-600 mt-0.5">{h.responsable}</p>
                  )}
                </Link>
              ))
            }
          </div>
          <Link href="/cronogramas" className="btn-secondary mt-4 justify-center text-xs">
            Ver todos los cronogramas
          </Link>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color }: {
  label: string; value: number; icon: React.ReactNode; color: 'blue' | 'cyan' | 'red' | 'amber'
}) {
  const colors = {
    blue: 'bg-blue-900/30 border-blue-700/40 text-blue-400',
    cyan: 'bg-cyan-900/30 border-cyan-700/40 text-cyan-400',
    red: 'bg-red-900/30 border-red-700/40 text-red-400',
    amber: 'bg-amber-900/30 border-amber-700/40 text-amber-400'
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

function HitoItem({ hito, proyectos }: { hito: Hito; proyectos: Proyecto[] }) {
  const vencido = esFechaVencida(hito.fechaLimite)
  const proyecto = proyectos.find(p => p.id === hito.proyectoId)
  return (
    <Link
      href={`/cronogramas?proyecto=${hito.proyectoId}`}
      className={clsx(
        'flex items-start gap-2 p-2.5 rounded-lg border text-xs mb-1 transition-all hover:border-blue-500/50 group',
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
        {hito.responsable && (
          <p className="text-slate-600 mt-0.5">{hito.responsable}</p>
        )}
        {proyecto && (
          <p className="text-slate-500 mt-0.5 truncate">
            {proyecto.clienteNombre}
            {proyecto.solucion && <span className="text-slate-600"> — {proyecto.solucion}</span>}
          </p>
        )}
      </div>
      <ArrowRight className="w-3 h-3 text-slate-600 group-hover:text-blue-400 flex-shrink-0 mt-0.5 transition-colors" />
    </Link>
  )
}
