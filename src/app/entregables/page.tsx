'use client'

import { useEffect, useState } from 'react'
import { obtenerEntregables, obtenerClientes, obtenerProyectos } from '@/lib/db'
import type { Entregable, Cliente, Proyecto } from '@/types'
import { useAuth } from '@/hooks/useAuth'
import { FileText, Plus, Search, Filter, Download } from 'lucide-react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { formatearFecha } from '@/lib/db'
import ModalNuevoEntregable from '@/components/forms/ModalNuevoEntregable'
import ModalExpediente from '@/components/forms/ModalExpediente'

const BADGE_EMPRESA: Record<string, string> = {
  'OKINAWATEC': 'badge-okinawatec',
  'TECH SOLUTIONS': 'badge-tech',
  'QUANTIC': 'badge-quantic',
}

export default function EntregablesPage() {
  const { isAdmin } = useAuth()
  const [entregables, setEntregables] = useState<Entregable[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [entregableExpediente, setEntregableExpediente] = useState<Entregable | null>(null)

  const cargar = async () => {
    setLoading(true)
    const [e, c, p] = await Promise.all([obtenerEntregables(), obtenerClientes(), obtenerProyectos()])
    setEntregables(e)
    setClientes(c)
    setProyectos(p)
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = entregables.filter(e => {
    const q = busqueda.toLowerCase()
    const coincideBusqueda = !q ||
      e.asunto.toLowerCase().includes(q) ||
      e.clienteNombre.toLowerCase().includes(q) ||
      e.numeroDocumento.toLowerCase().includes(q) ||
      e.responsableNombre.toLowerCase().includes(q)
    return coincideBusqueda &&
      (!filtroEmpresa || e.empresa === filtroEmpresa) &&
      (!filtroTipo || e.tipo === filtroTipo) &&
      (!filtroEstado || e.estado === filtroEstado)
  })

  const exportarExcel = () => {
    const headers = ['N° Documento', 'N° Cargo', 'Empresa', 'Tipo', 'Cliente', 'Proyecto', 'Fecha', 'Asunto', 'Responsable', 'Estado', 'Expediente']
    const filas = filtrados.map(e => [
      e.numeroDocumento, e.numeroCargo, e.empresa, e.tipo,
      e.clienteNombre, e.proyectoNombre, formatearFecha(e.fecha),
      e.asunto, e.responsableNombre, e.estado, e.expediente || ''
    ])
    const csv = [headers, ...filas].map(f => f.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url
    a.download = `entregables_${new Date().toISOString().split('T')[0]}.csv`
    a.click(); URL.revokeObjectURL(url)
    toast.success('Exportado correctamente')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-400" /> Entregables
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">{entregables.length} registros en total</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportarExcel} className="btn-secondary">
            <Download className="w-4 h-4" /> Exportar Excel
          </button>
          <button onClick={() => setModalNuevo(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nuevo entregable
          </button>
        </div>
      </div>

      <div className="card p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input-field pl-9" placeholder="Buscar por asunto, cliente, N° documento..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <select className="input-field w-auto min-w-36" value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
          <option value="">Todas las empresas</option>
          <option value="OKINAWATEC">Okinawatec</option>
          <option value="TECH SOLUTIONS">Tech Solutions</option>
          <option value="QUANTIC">Quantic</option>
        </select>
        <select className="input-field w-auto min-w-40" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {['Reservar','Plan de Trabajo','Informe Técnico','Informe Mensual','Informe de Incidencia','Entregable','Otro'].map(t =>
            <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="input-field w-auto min-w-32" value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}>
          <option value="">Todos</option>
          <option value="reservado">Reservado</option>
          <option value="completo">Completo</option>
        </select>
        {(busqueda || filtroEmpresa || filtroTipo || filtroEstado) && (
          <button onClick={() => { setBusqueda(''); setFiltroEmpresa(''); setFiltroTipo(''); setFiltroEstado('') }} className="btn-secondary text-xs">
            <Filter className="w-3 h-3" /> Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="card text-center py-16">
          <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">No se encontraron entregables</p>
          <button onClick={() => setModalNuevo(true)} className="btn-primary mx-auto mt-4">
            <Plus className="w-4 h-4" /> Registrar primero
          </button>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#0d1526] border-b border-[#1e3a8a]/50">
                <tr>
                  <th className="tabla-header">N° Documento</th>
                  <th className="tabla-header">Empresa</th>
                  <th className="tabla-header">Tipo</th>
                  <th className="tabla-header">Cliente</th>
                  <th className="tabla-header">Asunto</th>
                  <th className="tabla-header">Fecha</th>
                  <th className="tabla-header">Responsable</th>
                  <th className="tabla-header">Estado</th>
                  <th className="tabla-header"></th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map(e => (
                  <tr key={e.id} className="tabla-row">
                    <td className="tabla-cell">
                      <p className="font-mono text-cyan-400 text-xs">{e.numeroDocumento}</p>
                      <p className="font-mono text-slate-500 text-xs">{e.numeroCargo}</p>
                    </td>
                    <td className="tabla-cell">
                      <span className={BADGE_EMPRESA[e.empresa] || 'badge-okinawatec'}>
                        {e.empresa === 'TECH SOLUTIONS' ? 'TECH' : e.empresa === 'OKINAWATEC' ? 'OKINA' : 'QUANTIC'}
                      </span>
                    </td>
                    <td className="tabla-cell">
                      <span className="text-xs text-slate-300 bg-slate-800/50 px-2 py-0.5 rounded-full">{e.tipo}</span>
                    </td>
                    <td className="tabla-cell">
                      <p className="text-sm text-slate-200 max-w-32 truncate">{e.clienteNombre}</p>
                      <p className="text-xs text-slate-500 max-w-32 truncate">{e.proyectoNombre}</p>
                    </td>
                    <td className="tabla-cell">
                      <p className="text-sm text-slate-200 max-w-48 line-clamp-2">{e.asunto}</p>
                    </td>
                    <td className="tabla-cell whitespace-nowrap text-slate-400 text-xs">{formatearFecha(e.fecha)}</td>
                    <td className="tabla-cell text-slate-300 text-xs max-w-32 truncate">{e.responsableNombre}</td>
                    <td className="tabla-cell">
                      <span className={clsx('text-xs px-2 py-0.5 rounded-full border',
                        e.estado === 'reservado'
                          ? 'bg-amber-900/30 text-amber-300 border-amber-700/40'
                          : 'bg-green-900/30 text-green-300 border-green-700/40')}>
                        {e.estado}
                      </span>
                    </td>
                    <td className="tabla-cell">
                      {e.estado === 'reservado' && (
                        <button onClick={() => setEntregableExpediente(e)}
                          className="text-xs text-blue-400 hover:text-blue-300 underline whitespace-nowrap">
                          + Expediente
                        </button>
                      )}
                      {e.expediente && (
                        <p className="text-xs text-slate-400 max-w-24 truncate" title={e.expediente}>{e.expediente}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modalNuevo && (
        <ModalNuevoEntregable
          clientes={clientes} proyectos={proyectos}
          onClose={() => setModalNuevo(false)}
          onSuccess={() => { setModalNuevo(false); cargar() }}
        />
      )}
      {entregableExpediente && (
        <ModalExpediente
          entregable={entregableExpediente}
          onClose={() => setEntregableExpediente(null)}
          onSuccess={() => { setEntregableExpediente(null); cargar() }}
        />
      )}
    </div>
  )
}
