'use client'

import { useState } from 'react'
import { crearProyecto, hoy } from '@/lib/db'
import type { Cliente, Empresa } from '@/types'
import { X, FolderKanban } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { addMonths, format } from 'date-fns'

interface Props {
  clientes: Cliente[]
  onClose: () => void
  onSuccess: () => void
}

const EMPRESAS: Empresa[] = ['OKINAWATEC', 'TECH SOLUTIONS', 'QUANTIC']

export default function ModalNuevoProyecto({ clientes, onClose, onSuccess }: Props) {
  const [nombre, setNombre] = useState('')
  const [empresa, setEmpresa] = useState<Empresa>('OKINAWATEC')
  const [clienteId, setClienteId] = useState('')
  const [contratista, setContratista] = useState('')
  const [numeroContrato, setNumeroContrato] = useState('')
  const [plazo, setPlazo] = useState(12)
  const [fechaInicio, setFechaInicio] = useState(hoy())
  const [solucion, setSolucion] = useState('')
  const [marca, setMarca] = useState('')
  const [estado, setEstado] = useState<'activo' | 'completado' | 'suspendido'>('activo')
  const [loading, setLoading] = useState(false)

  const fechaFin = format(addMonths(new Date(fechaInicio + 'T00:00:00'), plazo), 'yyyy-MM-dd')
  const clienteSeleccionado = clientes.find(c => c.id === clienteId)

  const handleGuardar = async () => {
    if (!nombre.trim() || !clienteId) {
      toast.error('Completa nombre y cliente')
      return
    }
    setLoading(true)
    try {
      await crearProyecto({
        nombre: nombre.trim(),
        empresa, clienteId,
        clienteNombre: clienteSeleccionado?.nombre || '',
        contratista: contratista.trim(),
        numeroContrato: numeroContrato.trim(),
        plazo, fechaInicio, fechaFin,
        solucion: solucion.trim(),
        marca: marca.trim(),
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
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
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

          {/* Nombre */}
          <div>
            <label className="label">Nombre del proyecto *</label>
            <input className="input-field" placeholder="Ej: Renovación de licencias antivirus..." value={nombre} onChange={e => setNombre(e.target.value)} />
          </div>

          {/* Cliente + Contratista */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cliente *</label>
              <select className="input-field" value={clienteId} onChange={e => setClienteId(e.target.value)}>
                <option value="">Seleccionar...</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Contratista</label>
              <select className="input-field" value={contratista} onChange={e => setContratista(e.target.value)}>
                <option value="">Seleccionar...</option>
                <option value="GRUPO OKINAWATEC">GRUPO OKINAWATEC</option>
                <option value="TECH SOLUTIONS">TECH SOLUTIONS</option>
                <option value="QUANTIC">QUANTIC</option>
              </select>
            </div>
          </div>

          {/* Solución + Marca */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Solución / Equipo</label>
              <input className="input-field" placeholder="Ej: Trend Micro Vision One" value={solucion} onChange={e => setSolucion(e.target.value)} />
            </div>
            <div>
              <label className="label">Marca</label>
              <input className="input-field" placeholder="Ej: Fortinet, Trend Micro..." value={marca} onChange={e => setMarca(e.target.value)} />
            </div>
          </div>

          {/* N° Contrato + Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Número de contrato</label>
              <input className="input-field" placeholder="Ej: TECH_100425_B" value={numeroContrato} onChange={e => setNumeroContrato(e.target.value)} />
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

          {/* Fecha inicio + Plazo */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Fecha de inicio *</label>
              <input type="date" className="input-field" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
            </div>
            <div>
              <label className="label">Plazo (meses)</label>
              <select className="input-field" value={plazo} onChange={e => setPlazo(Number(e.target.value))}>
                {[1, 3, 6, 12, 24, 36].map(m => <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>)}
              </select>
            </div>
          </div>

          {/* Preview fecha fin */}
          <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg px-4 py-2.5 flex items-center gap-2 text-sm">
            <span className="text-slate-400">Fecha de fin calculada:</span>
            <span className="text-cyan-400 font-medium">{fechaFin.split('-').reverse().join('/')}</span>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleGuardar} disabled={loading} className="btn-primary">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : <><FolderKanban className="w-4 h-4" /> Crear proyecto</>}
          </button>
        </div>
      </div>
    </div>
  )
}
