'use client'

import { useState } from 'react'
import { crearEntregable, obtenerSiguienteNumero, formatearNumeroDoc } from '@/lib/db'
import type { Entregable } from '@/types'
import { X, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { hoy } from '@/lib/db'

interface Props {
  entregable: Entregable
  onClose: () => void
  onSuccess: (nuevoId?: string) => void
}

export default function ModalSubsanacion({ entregable, onClose, onSuccess }: Props) {
  const [asunto, setAsunto] = useState(`[SUBSANACIÓN] ${entregable.asunto}`)
  const [fecha, setFecha] = useState(hoy())
  const [responsable, setResponsable] = useState(entregable.responsableNombre)
  const [loading, setLoading] = useState(false)

  // Genera número de documento con "c": ITOK-26055 → ITOK-c26055
  const generarNumDoc = (original: string): string => {
    // Detecta el patrón: prefijo-número
    const match = original.match(/^([A-Z]+-?)(\d+)$/)
    if (match) return `${match[1]}c${match[2]}`
    return `c${original}`
  }

  const handleCrear = async () => {
    if (!asunto.trim()) { toast.error('Ingresa el asunto'); return }
    setLoading(true)
    try {
      // Nuevo número de cargo (correlativo nuevo)
      const siguiente = await obtenerSiguienteNumero()
      const { cargo } = formatearNumeroDoc(entregable.empresa, siguiente)
      const nuevoNumDoc = generarNumDoc(entregable.numeroDocumento)

      const id = await crearEntregable({
        empresa: entregable.empresa,
        tipo: entregable.tipo,
        clienteId: entregable.clienteId,
        clienteNombre: entregable.clienteNombre,
        proyectoId: entregable.proyectoId,
        proyectoNombre: entregable.proyectoNombre,
        hitoId: entregable.hitoId,
        hitoIds: (entregable as any).hitoIds || [],
        fecha,
        asunto: asunto.trim(),
        responsableUid: entregable.responsableUid,
        responsableNombre: responsable.trim(),
        numeroDocumento: nuevoNumDoc,
        numeroCargo: cargo,
        estado: 'reservado',
        expediente: '',
        descripcion: `Subsanación de ${entregable.numeroDocumento}`,
        createdAt: new Date().toISOString(),
      })

      toast.success('Subsanación creada correctamente')
      onSuccess(id)
    } catch {
      toast.error('Error al crear subsanación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a8a]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-600/20 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-white">Crear Subsanación</h2>
              <p className="text-xs text-slate-400">Basada en {entregable.numeroDocumento}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info del original */}
          <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3 text-xs space-y-1">
            <p className="text-slate-400">Original: <span className="text-cyan-400 font-mono">{entregable.numeroDocumento}</span></p>
            <p className="text-slate-400">Nuevo N° doc: <span className="text-amber-400 font-mono">{generarNumDoc(entregable.numeroDocumento)}</span></p>
            <p className="text-slate-400">N° cargo: <span className="text-slate-300">nuevo correlativo automático</span></p>
            <p className="text-slate-400">Empresa: <span className="text-slate-300">{entregable.empresa}</span></p>
            <p className="text-slate-400">Cliente: <span className="text-slate-300">{entregable.clienteNombre}</span></p>
            <p className="text-slate-400">Proyecto: <span className="text-slate-300">{entregable.proyectoNombre}</span></p>
          </div>

          <div>
            <label className="label">Asunto *</label>
            <input
              className="input-field"
              value={asunto}
              onChange={e => setAsunto(e.target.value)}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha</label>
              <input
                type="date"
                className="input-field"
                value={fecha}
                onChange={e => setFecha(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Responsable</label>
              <input
                className="input-field"
                value={responsable}
                onChange={e => setResponsable(e.target.value)}
              />
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Se creará como <span className="text-amber-400">Reservado</span>. El tipo, empresa, cliente y proyecto se copian del original.
          </p>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleCrear} disabled={loading} className="btn-primary">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><RefreshCw className="w-4 h-4" /> Crear subsanación</>}
          </button>
        </div>
      </div>
    </div>
  )
}
