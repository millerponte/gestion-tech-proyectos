'use client'

import { useState } from 'react'
import { actualizarEntregable, obtenerTodosUsuarios, marcarHitoRealizado } from '@/lib/db'
import type { Entregable } from '@/types'
import { X, Paperclip, Mail } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'

interface Props {
  entregable: Entregable
  onClose: () => void
  onSuccess: () => void
}

export default function ModalExpediente({ entregable, onClose, onSuccess }: Props) {
  const [expediente, setExpediente] = useState(entregable.expediente || '')
  const [notificar, setNotificar] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleGuardar = async () => {
    if (!expediente.trim()) { toast.error('Ingresa el número de expediente'); return }
    setLoading(true)
    try {
      // 1. Actualizar entregable
      await actualizarEntregable(entregable.id, {
        expediente: expediente.trim(),
        estado: 'completo',
      })

      // 2. Marcar TODOS los hitos vinculados como realizados
const todosHitoIds = (entregable as any).hitoIds?.length > 0
  ? (entregable as any).hitoIds
  : entregable.hitoId ? [entregable.hitoId] : []

for (const hId of todosHitoIds) {
  await marcarHitoRealizado(hId, entregable.fecha)
}

      // 3. Notificar por correo si está marcado
      if (notificar) {
        try {
          const usuarios = await obtenerTodosUsuarios()
          const correos = usuarios.map(u => u.correo).filter(Boolean)
          if (correos.length > 0) {
            await fetch('/api/notificar-expediente', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                correos,
                numeroDocumento: entregable.numeroDocumento,
                asunto: entregable.asunto,
                cliente: entregable.clienteNombre,
                proyecto: entregable.proyectoNombre,
                expediente: expediente.trim(),
                responsable: entregable.responsableNombre,
                fecha: new Date().toLocaleDateString('es-PE', {
                  day: '2-digit', month: '2-digit', year: 'numeric'
                }),
              }),
            })
            toast.success(`Expediente agregado y notificación enviada a ${correos.length} usuario(s)`)
          } else {
            toast.success('Expediente agregado')
          }
        } catch {
          toast.success('Expediente agregado (correo no enviado)')
        }
      } else {
        toast.success('Expediente agregado sin notificación')
      }

      onSuccess()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a8a]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-600/20 rounded-lg flex items-center justify-center">
              <Paperclip className="w-4 h-4 text-amber-400" />
            </div>
            <h2 className="font-display font-semibold text-white">Agregar Expediente</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Info del entregable */}
          <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-3 text-xs space-y-1">
            <p className="text-slate-400">Documento: <span className="text-cyan-400 font-mono">{entregable.numeroDocumento}</span></p>
            <p className="text-slate-400">Asunto: <span className="text-slate-200">{entregable.asunto}</span></p>
            <p className="text-slate-400">Cliente: <span className="text-slate-200">{entregable.clienteNombre}</span></p>
            {entregable.hitoId && (
              <p className="text-slate-400">
                Hito vinculado: <span className="text-green-400">se marcará como realizado automáticamente ✓</span>
              </p>
            )}
          </div>

          {/* Campo expediente */}
          <div>
            <label className="label">Número / Referencia del expediente *</label>
            <input
              className="input-field"
              placeholder="Ej: EXP-2026-001234"
              value={expediente}
              onChange={e => setExpediente(e.target.value)}
              autoFocus
            />
          </div>

          {/* Casilla notificación */}
          <div
            onClick={() => setNotificar(!notificar)}
            className={clsx(
              'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
              notificar ? 'bg-blue-900/20 border-blue-700/50' : 'bg-[#0d1526] border-[#1e3a8a]/40'
            )}>
            <div className={clsx(
              'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all',
              notificar ? 'bg-blue-600 border-blue-500' : 'border-slate-600'
            )}>
              {notificar && <span className="text-white text-xs">✓</span>}
            </div>
            <div>
              <p className="text-sm text-slate-200 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                Notificar a todos los usuarios por correo
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Se enviará un correo automático a todos los registrados</p>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Al guardar, el entregable pasará de <span className="text-amber-400">Reservado</span> a <span className="text-green-400">Completo</span>.
          </p>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleGuardar} disabled={loading} className="btn-primary">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Paperclip className="w-4 h-4" /> {notificar ? 'Guardar y notificar' : 'Guardar sin notificar'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}
