'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { crearEntregable, obtenerSiguienteNumero, formatearNumeroDoc, obtenerHitosPorProyecto, hoy } from '@/lib/db'
import type { Cliente, Proyecto, Hito, Empresa, TipoEntregable } from '@/types'
import { X, FileText, Hash, AlertCircle } from 'lucide-react'
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

  // Preview del número automático
  useEffect(() => {
    if (modoManual) return
    let activo = true
    const calcular = async () => {
      setLoadingNum(true)
      try {
        // Solo preview, no incrementa
        const ref = await import('firebase/firestore').then(m =>
          m.doc(await import('@/lib/firebase').then(fb => fb.db), 'contadores', empresa)
        )
        const snap = await import('firebase/firestore').then(m => m.getDoc(ref))
        const actual = snap.exists() ? snap.data().ultimoNumero : 0
        const siguiente = actual + 1
        if (activo) {
          const { documento, cargo } = formatearNumeroDoc(empresa, siguiente)
          setPreviewDoc(documento)
          setPreviewCargo(cargo)
        }
      } catch {
        if (activo) {
          const { documento, cargo } = formatearNumeroDoc(empresa, 1)
          setPreviewDoc(documento)
          setPreviewCargo(cargo)
        }
      } finally {
        if (activo) setLoadingNum(false)
      }
    }
    calcular()
    return () => { activo = false }
  }, [empresa, modoManual])

  // Cargar hitos al cambiar proyecto
  useEffect(() => {
    if (!proyectoId) { setHitos([]); setHitoId(''); return }
    obtenerHitosPorProyecto(proyectoId).then(setHitos)
    const p = proyectos.find(p => p.id === proyectoId)
    if (p) setEmpresa(p.empresa)
  }, [proyectoId])

  // Filtrar proyectos por cliente
  const proyectosFiltrados = clienteId
    ? proyectos.filter(p => p.clienteId === clienteId)
    : proyectos

  const handleSubmit = async () => {
    if (!clienteId || !proyectoId || !asunto) {
      toast.error('Completa cliente, proyecto y asunto')
      return
    }
    setLoading(true)
    try {
      let numDoc = previewDoc
      let numCargo = previewCargo

      if (modoManual && numeroManual) {
        const parsed = parseInt(numeroManual)
        if (isNaN(parsed)) { toast.error('Número inválido'); setLoading(false); return }
        const f = formatearNumeroDoc(empresa, parsed)
        numDoc = f.documento
        numCargo = f.cargo
      } else {
        const num = await obtenerSiguienteNumero(empresa)
        const f = formatearNumeroDoc(empresa, num)
        numDoc = f.documento
        numCargo = f.cargo
      }

      const cliente = clientes.find(c => c.id === clienteId)
      const proyecto = proyectos.find(p => p.id === proyectoId)

      await crearEntregable({
        empresa,
        tipo,
        clienteId,
        clienteNombre: cliente?.nombre || '',
        proyectoId,
        proyectoNombre: proyecto?.nombre || '',
        hitoId: hitoId || undefined,
        fecha,
        asunto,
        responsableUid: usuario?.uid || '',
        responsableNombre: responsable,
        numeroDocumento: numDoc,
        numeroCargo: numCargo,
        estado: tipo === 'Reservar' ? 'reservado' : 'completo',
        descripcion,
        createdAt: new Date().toISOString(),
      })

      // Marcar hito si aplica
      if (hitoId) {
        const { marcarHitoRealizado } = await import('@/lib/db')
        await marcarHitoRealizado(hitoId, fecha)
      }

      toast.success('Entregable registrado correctamente')
      onSuccess()
    } catch (err) {
      console.error(err)
      toast.error('Error al registrar entregable')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a8a]/40">
          <h2 className="font-display font-semibold text-white text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Nuevo Entregable
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Empresa + Tipo */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Empresa *</label>
              <select className="input-field" value={empresa} onChange={e => setEmpresa(e.target.value as Empresa)}>
                {EMPRESAS.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Tipo *</label>
              <select className="input-field" value={tipo} onChange={e => setTipo(e.target.value as TipoEntregable)}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Cliente + Proyecto */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cliente *</label>
              <select className="input-field" value={clienteId} onChange={e => { setClienteId(e.target.value); setProyectoId('') }}>
                <option value="">Seleccionar cliente</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Proyecto *</label>
              <select className="input-field" value={proyectoId} onChange={e => setProyectoId(e.target.value)}>
                <option value="">Seleccionar proyecto</option>
                {proyectosFiltrados.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
          </div>

          {/* Hito vinculado (opcional) */}
          {hitos.length > 0 && (
            <div>
              <label className="label">Hito vinculado (opcional) — al guardar se marcará como realizado</label>
              <select className="input-field" value={hitoId} onChange={e => setHitoId(e.target.value)}>
                <option value="">Sin hito vinculado</option>
                {hitos.filter(h => h.estado === 'pendiente').map(h => (
                  <option key={h.id} value={h.id}>{h.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Fecha + Responsable */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Fecha *</label>
              <input type="date" className="input-field" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <label className="label">Responsable *</label>
              <input type="text" className="input-field" value={responsable} onChange={e => setResponsable(e.target.value)} />
            </div>
          </div>

          {/* Asunto */}
          <div>
            <label className="label">Asunto *</label>
            <input type="text" className="input-field" placeholder="Descripción del entregable..." value={asunto} onChange={e => setAsunto(e.target.value)} />
          </div>

          {/* Descripción */}
          <div>
            <label className="label">Descripción adicional</label>
            <textarea className="input-field resize-none" rows={2} placeholder="Notas adicionales..." value={descripcion} onChange={e => setDescripcion(e.target.value)} />
          </div>

          {/* Numeración */}
          <div className="bg-[#0d1526] border border-[#1e3a8a]/50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-white flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-400" /> Numeración automática
              </h4>
              <button
                type="button"
                onClick={() => setModoManual(!modoManual)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {modoManual ? 'Usar automático' : 'Ingresar manualmente'}
              </button>
            </div>

            {modoManual ? (
              <div>
                <label className="label">Número a asignar (para migración histórica)</label>
                <input type="number" className="input-field" placeholder="ej: 25041" value={numeroManual} onChange={e => setNumeroManual(e.target.value)} />
                {numeroManual && (() => {
                  const n = parseInt(numeroManual)
                  if (!isNaN(n)) {
                    const f = formatearNumeroDoc(empresa, n)
                    return (
                      <div className="flex gap-3 mt-2">
                        <code className="text-xs text-cyan-400 bg-cyan-900/20 px-2 py-1 rounded">{f.documento}</code>
                        <code className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded">{f.cargo}</code>
                      </div>
                    )
                  }
                  return null
                })()}
              </div>
            ) : (
              <div className="flex gap-3">
                {loadingNum ? (
                  <span className="text-xs text-slate-400">Calculando...</span>
                ) : (
                  <>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">N° Documento</p>
                      <code className="text-sm text-cyan-400 bg-cyan-900/20 px-2 py-1 rounded font-medium">{previewDoc}</code>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">N° Cargo</p>
                      <code className="text-sm text-blue-400 bg-blue-900/20 px-2 py-1 rounded font-medium">{previewCargo}</code>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {tipo === 'Reservar' && (
            <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/30 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">Este entregable quedará en estado <strong>Reservado</strong>. Podrás agregar el expediente después desde la lista.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1e3a8a]/40">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Registrar entregable'}
          </button>
        </div>
      </div>
    </div>
  )
}
