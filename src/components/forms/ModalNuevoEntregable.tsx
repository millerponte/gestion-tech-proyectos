'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { crearEntregable, obtenerSiguienteNumero, obtenerNumeroPreview, formatearNumeroDoc, obtenerHitosPorProyecto, hoy, marcarHitoRealizado } from '@/lib/db'
import type { Cliente, Proyecto, Hito, Empresa, TipoEntregable } from '@/types'
import { X, FileText, Hash } from 'lucide-react'
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
  const [hitoId, setHitoId] = useState('')
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

  const esReserva = tipo === 'Reservar'

  // Cuando cambia a tipo Reservar, llenar campos automáticamente
  useEffect(() => {
    if (esReserva) {
      setClienteId('RESERVADO')
      setProyectoId('RESERVADO')
      setAsunto('RESERVADO')
      setHitoId('')
    } else {
      // Al cambiar de Reservar a otro tipo, limpiar los campos
      if (clienteId === 'RESERVADO') setClienteId('')
      if (proyectoId === 'RESERVADO') setProyectoId('')
      if (asunto === 'RESERVADO') setAsunto('')
    }
  }, [tipo])

  // Preview del número siguiente
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
    if (!proyectoId || proyectoId === 'RESERVADO') { setHitos([]); return }
    obtenerHitosPorProyecto(proyectoId).then(setHitos)
  }, [proyectoId])

  const proyectosFiltrados = clienteId && clienteId !== 'RESERVADO'
    ? proyectos.filter(p => p.clienteId === clienteId)
    : proyectos
  const clienteSeleccionado = clientes.find(c => c.id === clienteId)
  const proyectoSeleccionado = proyectos.find(p => p.id === proyectoId)

  const handleGuardar = async () => {
    // Para tipo Reservar no se requieren cliente ni proyecto reales
    if (!esReserva && (!clienteId || !proyectoId || !asunto.trim())) {
      toast.error('Completa cliente, proyecto y asunto')
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
        empresa,
        tipo,
        clienteId: esReserva ? '' : clienteId,
        clienteNombre: esReserva ? 'RESERVADO' : (clienteSeleccionado?.nombre || ''),
        proyectoId: esReserva ? '' : proyectoId,
        proyectoNombre: esReserva ? 'RESERVADO' : (proyectoSeleccionado?.nombre || ''),
        ...(hitoId ? { hitoId } : {}),
        fecha,
        asunto: esReserva ? 'RESERVADO' : asunto.trim(),
        responsableUid: usuario?.uid || '',
        responsableNombre: responsable,
        numeroDocumento: numeroDoc,
        numeroCargo,
        estado: 'reservado', // SIEMPRE inicia como reservado
        ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
        createdAt: new Date().toISOString(),
      })

      if (hitoId && !esReserva) {
        await marcarHitoRealizado(hitoId, fecha)
      }

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

          {/* Aviso si es Reservar */}
          {esReserva && (
            <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg px-4 py-3 text-xs text-amber-300">
              🔒 Modo <strong>Reservar</strong> — se generará un número de documento reservado. 
              Podrás completar los datos del cliente, proyecto y asunto después al agregar el expediente.
            </div>
          )}

          {/* Cliente + Proyecto — ocultos en modo Reservar */}
          {!esReserva && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Cliente *</label>
                  <select className="input-field" value={clienteId} onChange={e => { setClienteId(e.target.value); setProyectoId('') }}>
                    <option value="">Seleccionar...</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Proyecto *</label>
                  <select className="input-field" value={proyectoId} onChange={e => setProyectoId(e.target.value)} disabled={!clienteId}>
                    <option value="">Seleccionar...</option>
                    {proyectosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
              </div>

              {/* Hito vinculado */}
              {hitos.length > 0 && (
                <div>
                  <label className="label">Hito vinculado (opcional)</label>
                  <select className="input-field" value={hitoId} onChange={e => setHitoId(e.target.value)}>
                    <option value="">Sin hito vinculado</option>
                    {hitos.filter(h => h.estado === 'pendiente').map(h => (
                      <option key={h.id} value={h.id}>{h.nombre}</option>
                    ))}
                  </select>
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

          {/* Descripción — solo si no es Reservar */}
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
