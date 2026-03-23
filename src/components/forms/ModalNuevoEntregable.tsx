'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { crearEntregable, obtenerSiguienteNumero, obtenerNumeroPreview, formatearNumeroDoc, obtenerHitosPorProyecto, hoy } from '@/lib/db'
import type { Cliente, Proyecto, Hito, Empresa, TipoEntregable } from '@/types'
import { X, FileText, Hash, Link2, Link2Off, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface Props {
  clientes: Cliente[]
  proyectos: Proyecto[]
  onClose: () => void
  onSuccess: () => void
}

const TIPOS: TipoEntregable[] = ['Reservar', 'Plan de Trabajo', 'Informe Técnico', 'Informe Mensual', 'Informe de Incidencia', 'Entregable', 'Otro']
const EMPRESAS: Empresa[] = ['OKINAWATEC', 'TECH SOLUTIONS', 'QUANTIC']

export default function ModalNuevoEntregable({ clientes, proyectos, onClose, onSuccess }: Props) {
  const { usuario } = useAuth()
  const [empresa, setEmpresa] = useState<Empresa>('OKINAWATEC')
  const [tipo, setTipo] = useState<TipoEntregable>('Informe Técnico')
  const [clienteId, setClienteId] = useState('')
  const [proyectoId, setProyectoId] = useState('')
  const [hitoIds, setHitoIds] = useState<string[]>([])
  const [vincularHito, setVincularHito] = useState<boolean | null>(null)
  const [fecha, setFecha] = useState(hoy())
  const [asunto, setAsunto] = useState('')
  const [responsable, setResponsable] = useState(usuario?.nombre || '')
  const [descripcion, setDescripcion] = useState('')
  const [hitos, setHitos] = useState<Hito[]>([])
  const [modoManual, setModoManual] = useState(false)
  const [numeroManual, setNumeroManual] = useState('')
  const [previewDoc, setPreviewDoc] = useState('')
  const [previewCargo, setPreviewCargo] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingNum, setLoadingNum] = useState(false)
  const [loadingHitos, setLoadingHitos] = useState(false)

  const esReserva = tipo === 'Reservar'

  useEffect(() => {
    if (esReserva) {
      setClienteId('RESERVADO')
      setProyectoId('RESERVADO')
      setAsunto('RESERVADO')
      setHitoIds([])
      setVincularHito(null)
    } else {
      if (clienteId === 'RESERVADO') setClienteId('')
      if (proyectoId === 'RESERVADO') setProyectoId('')
      if (asunto === 'RESERVADO') setAsunto('')
    }
  }, [tipo])

  useEffect(() => {
    if (modoManual) return
    let activo = true
    const calcular = async () => {
      setLoadingNum(true)
      try {
        const siguiente = await obtenerNumeroPreview()
        if (activo) {
          const { documento, cargo } = formatearNumeroDoc(empresa, siguiente)
          setPreviewDoc(documento)
          setPreviewCargo(cargo)
        }
      } catch {
        if (activo) { setPreviewDoc('—'); setPreviewCargo('—') }
      } finally {
        if (activo) setLoadingNum(false)
      }
    }
    calcular()
    return () => { activo = false }
  }, [empresa, modoManual])

  useEffect(() => {
    if (!proyectoId || proyectoId === 'RESERVADO' || !vincularHito) {
      setHitos([])
      setHitoIds([])
      return
    }
    setLoadingHitos(true)
    obtenerHitosPorProyecto(proyectoId)
      .then(h => {
        const ordenados = [...h].sort((a, b) => (a.numero || 0) - (b.numero || 0))
        setHitos(ordenados)
      })
      .finally(() => setLoadingHitos(false))
  }, [proyectoId, vincularHito])

  const toggleHito = (id: string) => {
    setHitoIds(prev =>
      prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id]
    )
  }

  const proyectosFiltrados = clienteId && clienteId !== 'RESERVADO'
    ? proyectos.filter(p => p.clienteId === clienteId)
    : proyectos
  const clienteSeleccionado = clientes.find(c => c.id === clienteId)
  const proyectoSeleccionado = proyectos.find(p => p.id === proyectoId)

  const handleGuardar = async () => {
    if (!esReserva && (!clienteId || !proyectoId || !asunto.trim())) {
      toast.error('Completa cliente, proyecto y asunto')
      return
    }
    if (vincularHito && hitoIds.length === 0) {
      toast.error('Selecciona al menos un hito o elige "No vincular"')
      return
    }
    setLoading(true)
    try {
      let numeroDoc = ''
      let numeroCargo = ''
      if (modoManual && numeroManual.trim()) {
        const match = numeroManual.trim().match(/(\d+)/)
        const numManual = match ? parseInt(match[1]) : 0
        const { documento, cargo } = formatearNumeroDoc(empresa, numManual)
        numeroDoc = documento
        numeroCargo = cargo
      } else {
        const siguiente = await obtenerSiguienteNumero()
        const { documento, cargo } = formatearNumeroDoc(empresa, siguiente)
        numeroDoc = documento
        numeroCargo = cargo
      }

      await crearEntregable({
        empresa, tipo,
        clienteId: esReserva ? '' : clienteId,
        clienteNombre: esReserva ? 'RESERVADO' : (clienteSeleccionado?.nombre || ''),
        proyectoId: esReserva ? '' : proyectoId,
        proyectoNombre: esReserva ? 'RESERVADO' : (proyectoSeleccionado?.nombre || ''),
        ...(hitoIds.length > 0 ? { hitoIds, hitoId: hitoIds[0] } : {}),
        fecha,
        asunto: esReserva ? 'RESERVADO' : asunto.trim(),
        responsableUid: usuario?.uid || '',
        responsableNombre: responsable,
        numeroDocumento: numeroDoc,
        numeroCargo,
        estado: 'reservado',
        ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
        createdAt: new Date().toISOString(),
      })

      toast.success(`Registrado: ${numeroDoc}`)
      onSuccess()
    } catch (err) {
      console.error(err)
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a8a]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-display font-semibold text-white">Nuevo Entregable</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Empresa */}
          <div>
            <label className="label">Empresa *</label>
            <div className="flex gap-2">
              {EMPRESAS.map(e => (
                <button key={e} onClick={() => setEmpresa(e)}
                  className={clsx('flex-1 py-2 px-2 rounded-lg text-xs font-medium border transition-all',
                    empresa === e
                      ? e === 'OKINAWATEC' ? 'bg-blue-600/30 border-blue-500 text-blue-300'
                        : e === 'TECH SOLUTIONS' ? 'bg-green-600/30 border-green-500 text-green-300'
                        : 'bg-purple-600/30 border-purple-500 text-purple-300'
                      : 'bg-[#0d1526] border-[#1e3a8a]/50 text-slate-400')}>
                  {e === 'TECH SOLUTIONS' ? 'TECH' : e === 'OKINAWATEC' ? 'OKINA' : 'QUANTIC'}
                </button>
              ))}
            </div>
          </div>

          {/* Tipo */}
          <div>
            <label className="label">Tipo *</label>
            <select className="input-field" value={tipo} onChange={e => setTipo(e.target.value as TipoEntregable)}>
              {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {esReserva && (
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-3 text-xs text-amber-300">
              🔒 Modo <strong>Reservar</strong> — se generará un número reservado. Completa los datos después al agregar el expediente.
            </div>
          )}

          {!esReserva && (
            <>
              {/* Cliente + Proyecto */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Cliente *</label>
                  <select className="input-field" value={clienteId} onChange={e => {
                    setClienteId(e.target.value)
                    setProyectoId('')
                    setVincularHito(null)
                    setHitoIds([])
                  }}>
                    <option value="">Seleccionar...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Proyecto *</label>
                  <select className="input-field" value={proyectoId} onChange={e => {
                    setProyectoId(e.target.value)
                    setVincularHito(null)
                    setHitoIds([])
                  }} disabled={!clienteId}>
                    <option value="">Seleccionar...</option>
                    {proyectosFiltrados.map(p => <option key={p.id} value={p.id}>{p.solucion || p.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Opción vincular hito */}
              {proyectoId && vincularHito === null && (
                <div>
                  <label className="label">¿Vincular a hitos del cronograma?</label>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setVincularHito(true)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-medium transition-all bg-[#0d1526] border-[#1e3a8a]/50 text-slate-300 hover:border-blue-500 hover:text-blue-300">
                      <Link2 className="w-3.5 h-3.5" /> Sí, vincular a hito(s)
                    </button>
                    <button onClick={() => setVincularHito(false)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs font-medium transition-all bg-[#0d1526] border-[#1e3a8a]/50 text-slate-300 hover:border-slate-500 hover:text-slate-200">
                      <Link2Off className="w-3.5 h-3.5" /> No vincular
                    </button>
                  </div>
                </div>
              )}

              {/* Selector de hitos — múltiple selección */}
              {proyectoId && vincularHito === true && (
                <div className="bg-[#0d1526] border border-blue-600/30 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="label mb-0">Seleccionar hito(s)</label>
                      <p className="text-xs text-slate-500 mt-0.5">Puedes seleccionar varios hitos</p>
                    </div>
                    <button onClick={() => { setVincularHito(null); setHitoIds([]) }}
                      className="text-xs text-slate-500 hover:text-slate-300 underline">
                      Cambiar opción
                    </button>
                  </div>
                  {loadingHitos ? (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                      <span className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
                      Cargando hitos...
                    </div>
                  ) : hitos.length === 0 ? (
                    <p className="text-xs text-amber-400 py-1">Este proyecto no tiene hitos aún.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {hitos.map(h => {
                        const seleccionado = hitoIds.includes(h.id)
                        return (
                          <button key={h.id} onClick={() => toggleHito(h.id)}
                            className={clsx(
                              'w-full text-left px-3 py-2 rounded-lg text-xs transition-all border flex items-center gap-2',
                              seleccionado
                                ? 'bg-blue-600/20 border-blue-500/60 text-blue-300'
                                : 'bg-[#111d35] border-[#1e3a8a]/30 text-slate-300 hover:border-blue-500/40'
                            )}>
                            <div className={clsx(
                              'w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center',
                              seleccionado ? 'bg-blue-600 border-blue-500' : 'border-slate-600'
                            )}>
                              {seleccionado && <Check className="w-2.5 h-2.5 text-white" />}
                            </div>
                            <span className="font-mono text-slate-500 mr-1">{h.numero || '—'}.</span>
                            <span className="flex-1 truncate">{h.nombre}</span>
                            {h.fechaLimite && h.fechaLimite !== 'por definir' && (
                              <span className="text-slate-500 flex-shrink-0">
                                {h.fechaLimite.split('-').reverse().join('/')}
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {hitoIds.length > 0 && (
                    <div className="bg-blue-900/20 border border-blue-700/30 rounded px-3 py-2 text-xs text-blue-300">
                      ✓ {hitoIds.length} hito(s) seleccionado(s)
                    </div>
                  )}
                </div>
              )}

              {/* Sin hito */}
              {proyectoId && vincularHito === false && (
                <div className="flex items-center justify-between bg-[#0d1526] border border-[#1e3a8a]/30 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-400 flex items-center gap-2">
                    <Link2Off className="w-3.5 h-3.5 text-slate-500" /> Sin hitos vinculados
                  </p>
                  <button onClick={() => setVincularHito(null)} className="text-xs text-slate-500 hover:text-slate-300 underline">
                    Cambiar
                  </button>
                </div>
              )}

              {/* Asunto */}
              <div>
                <label className="label">Asunto *</label>
                <input type="text" className="input-field" placeholder="Descripción del entregable..." value={asunto} onChange={e => setAsunto(e.target.value)} />
              </div>
            </>
          )}

          {/* Fecha + Responsable */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input-field" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <label className="label">Responsable</label>
              <input type="text" className="input-field" value={responsable} onChange={e => setResponsable(e.target.value)} />
            </div>
          </div>

          {!esReserva && (
            <div>
              <label className="label">Descripción adicional</label>
              <textarea className="input-field resize-none" rows={2} value={descripcion} onChange={e => setDescripcion(e.target.value)} />
            </div>
          )}

          {/* Numeración */}
          <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-medium text-slate-300">Numeración automática</span>
              </div>
              <button onClick={() => setModoManual(!modoManual)} className="text-xs text-blue-400 hover:text-blue-300 underline">
                {modoManual ? 'Usar automático' : 'Ingresar manual'}
              </button>
            </div>
            {modoManual ? (
              <input type="text" className="input-field text-xs" placeholder="Ej: 26050 (solo el número)" value={numeroManual} onChange={e => setNumeroManual(e.target.value)} />
            ) : (
              <div className="flex gap-4">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">N° Documento</p>
                  <p className="text-sm font-mono text-cyan-400">{loadingNum ? '...' : previewDoc}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">N° Cargo</p>
                  <p className="text-sm font-mono text-cyan-400">{loadingNum ? '...' : previewCargo}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleGuardar} disabled={loading} className="btn-primary">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><FileText className="w-4 h-4" /> {esReserva ? 'Reservar número' : 'Guardar'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
