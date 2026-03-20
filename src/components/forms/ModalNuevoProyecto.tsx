'use client'

import { useState } from 'react'
import { crearProyecto, hoy } from '@/lib/db'
import type { Cliente, Proyecto } from '@/types'
import { X, FolderKanban, Save } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  clientes: Cliente[]
  proyectos: Proyecto[]
  onClose: () => void
  onSuccess: () => void
}

function sumarMeses(fechaStr: string, meses: number): string {
  const [y, m, d] = fechaStr.split('-').map(Number)
  const fecha = new Date(y, m - 1 + meses, d)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`
}

function formatDMY(fechaStr: string): string {
  if (!fechaStr) return ''
  const [y, m, d] = fechaStr.split('-')
  return `${d}/${m}/${y}`
}

export default function ModalNuevoProyecto({ clientes, proyectos, onClose, onSuccess }: Props) {
  const [nombre, setNombre] = useState('')
  const [clienteId, setClienteId] = useState('')
  const [contratista, setContratista] = useState('')
  const [numeroContrato, setNumeroContrato] = useState('')
  const [plazo, setPlazo] = useState(12)
  const [fechaInicio, setFechaInicio] = useState(hoy())
  const [solucion, setSolucion] = useState('')
  const [estado, setEstado] = useState<'activo' | 'completado' | 'suspendido'>('activo')
  const [loading, setLoading] = useState(false)

  const fechaFin = sumarMeses(fechaInicio, plazo)
  const clienteSeleccionado = clientes.find(c => c.id === clienteId)
  const empresa = contratista === 'TECH SOLUTIONS' ? 'TECH SOLUTIONS'
    : contratista === 'QUANTIC' ? 'QUANTIC'
    : 'OKINAWATEC'

  const handleGuardar = async () => {
    if (!nombre.trim() || !clienteId) {
      toast.error('Completa nombre y cliente')
      return
    }

    // Verificar duplicado: solo si coinciden los 3 campos a la vez
    const duplicado = proyectos.find(p =>
      p.solucion.toLowerCase().trim() === solucion.toLowerCase().trim() &&
      p.clienteId === clienteId &&
      p.nombre.toLowerCase().trim() === nombre.toLowerCase().trim()
    )
    if (duplicado) {
      toast.error('Ya existe un proyecto con la misma solución, cliente y nombre de contrato')
      return
    }

    setLoading(true)
    try {
      await crearProyecto({
        nombre: nombre.trim(),
        empresa,
        clienteId,
        clienteNombre: clienteSeleccionado?.nombre || '',
        contratista: contratista.trim(),
        numeroContrato: numeroContrato.trim(),
        plazo,
        fechaInicio,
        fechaFin,
        solucion: solucion.trim(),
        marca: '',
        estado,
        createdAt: new Date().toISOString(),
      })
      toast.success('Proyecto creado')
      onSuccess()
    } catch {
      toast.error('Error al crear proyecto')
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
              <FolderKanban className="w-4 h-4 text-blue-400" />
            </div>
            <h2 className="font-display font-semibold text-white">Nuevo Proyecto</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Nombre del proyecto *</label>
            <input
              className="input-field"
              placeholder="Ej: Renovación de licencias antivirus y Soporte Técnico"
              value={nombre}
              onChange={e => setNombre(e.target.value)}
            />
          </div>

          <div>
            <label className="label">Cliente *</label>
            <select className="input-field" value={clienteId} onChange={e => setClienteId(e.target.value)}>
              <option value="">Seleccionar cliente...</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Solución / Equipo (con marca)</label>
            <input
              className="input-field"
              placeholder="Ej: Trend Micro Vision One – Endpoint Security"
              value={solucion}
              onChange={e => setSolucion(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Contratista</label>
              <select className="input-field" value={contratista} onChange={e => setContratista(e.target.value)}>
                <option value="">Seleccionar...</option>
                <option value="GRUPO OKINAWATEC">GRUPO OKINAWATEC</option>
                <option value="TECH SOLUTIONS">TECH SOLUTIONS</option>
                <option value="QUANTIC">QUANTIC</option>
              </select>
            </div>
            <div>
              <label className="label">N° de contrato</label>
              <input
                className="input-field"
                placeholder="Ej: TECH_100425_B"
                value={numeroContrato}
                onChange={e => setNumeroContrato(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Fecha de inicio *</label>
              <input
                type="date"
                className="input-field"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Plazo</label>
              <select className="input-field" value={plazo} onChange={e => setPlazo(Number(e.target.value))}>
                {[1, 3, 6, 12, 24, 36].map(m =>
                  <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>
                )}
              </select>
            </div>
            <div>
              <label className="label">Estado</label>
              <select className="input-field" value={estado} onChange={e => setEstado(e.target.value as typeof estado)}>
                <option value="activo">Activo</option>
                <option value="completado">Completado</option>
                <option value="suspendido">Suspendido</option>
              </select>
            </div>
          </div>

          {fechaInicio && (
            <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm">
              <span className="text-slate-400">Fecha de fin calculada:</span>
              <span className="text-cyan-400 font-medium">{formatDMY(fechaFin)}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleGuardar} disabled={loading} className="btn-primary">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><Save className="w-4 h-4" /> Crear proyecto</>}
          </button>
        </div>
      </div>
    </div>
  )
}
