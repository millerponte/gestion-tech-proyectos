'use client'

import { useState } from 'react'
import { crearHito } from '@/lib/db'
import type { Proyecto } from '@/types'
import { X, Upload, FileSpreadsheet, Check, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'

interface Props {
  proyecto: Proyecto
  onClose: () => void
  onSuccess: () => void
}

interface FilaHito {
  numero: number
  nombre: string
  descripcion: string
  plazoContractual: string
  fechaInicio: string
  fechaLimite: string
  pago: string
  origen: string
}

function parsearFecha(valor: any): string {
  if (!valor || valor === '' || valor === null || valor === undefined) return 'por definir'
  if (typeof valor === 'number') {
    try {
      const fecha = XLSX.SSF.parse_date_code(valor)
      if (fecha) {
        const m = String(fecha.m).padStart(2, '0')
        const d = String(fecha.d).padStart(2, '0')
        return `${fecha.y}-${m}-${d}`
      }
    } catch { return 'por definir' }
  }
  const str = String(valor).trim()
  if (!str) return 'por definir'
  const ddmm = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (ddmm) return `${ddmm[3]}-${ddmm[2].padStart(2, '0')}-${ddmm[1].padStart(2, '0')}`
  const yyyymm = str.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (yyyymm) return str
  return 'por definir'
}

function limpiarTexto(valor: any): string {
  if (!valor || valor === null || valor === undefined) return 'por definir'
  const str = String(valor).trim()
  return str === '' ? 'por definir' : str
}

function parsearNumero(valor: any, indice: number): number {
  if (!valor && valor !== 0) return indice + 1
  const n = parseInt(String(valor).trim())
  return isNaN(n) ? indice + 1 : n
}

export default function ModalImportarHitos({ proyecto, onClose, onSuccess }: Props) {
  const ROLES_RESPONSABLE = ['INGENIERÍA', 'ADMINISTRACIÓN', 'LEGAL']

  const [filas, setFilas] = useState<FilaHito[]>([])
  const [archivo, setArchivo] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [paso, setPaso] = useState<'subir' | 'revisar'>('subir')
  const [responsable, setResponsable] = useState(ROLES_RESPONSABLE[0])

  const handleArchivo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setArchivo(file.name)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result
        const workbook = XLSX.read(data, { type: 'binary', cellDates: false })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        const filasDatos = rows.slice(1).filter(r =>
          r.some(c => c !== null && c !== undefined && c !== '')
        )

        const hitosParseados: FilaHito[] = filasDatos.map((r, i) => ({
          numero: parsearNumero(r[0], i),      // Col A: N°
          nombre: limpiarTexto(r[1]),          // Col B: Hito / Entregable
          descripcion: limpiarTexto(r[2]),     // Col C: Características
          plazoContractual: limpiarTexto(r[3]),// Col D: Plazo Contractual
          fechaInicio: parsearFecha(r[4]),     // Col E: Fecha Inicio
          fechaLimite: parsearFecha(r[5]),     // Col F: Fecha Límite
          pago: limpiarTexto(r[6]),            // Col G: Pago / Condición
          origen: limpiarTexto(r[7]),          // Col H: Origen
        })).filter(h => h.nombre !== 'por definir')

        setFilas(hitosParseados)
        setPaso('revisar')
      } catch {
        toast.error('Error al leer el archivo. Verifica que sea un Excel válido.')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleImportar = async () => {
    if (filas.length === 0) { toast.error('No hay hitos para importar'); return }
    setLoading(true)
    try {
      for (const fila of filas) {
        await crearHito({
          proyectoId: proyecto.id,
          numero: fila.numero,
          nombre: fila.nombre,
          descripcion: fila.descripcion,
          responsable,
          plazoContractual: fila.plazoContractual,
          fechaInicio: fila.fechaInicio,
          fechaLimite: fila.fechaLimite,
          pago: fila.pago,
          origen: fila.origen,
          estado: 'pendiente',
          esCritico: false,
        })
      }
      toast.success(`${filas.length} hitos importados correctamente`)
      onSuccess()
    } catch {
      toast.error('Error al importar hitos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-3xl">
        <div className="flex items-center justify-between p-6 border-b border-[#1e3a8a]/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-white">Importar Cronograma desde Excel</h2>
              <p className="text-xs text-slate-400">{proyecto.clienteNombre} — {proyecto.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          {paso === 'subir' && (
            <>
              <div className="bg-[#0d1526] border border-[#1e3a8a]/40 rounded-lg p-4 text-xs space-y-2">
                <p className="text-slate-300 font-medium">Formato requerido del Excel:</p>
                <p className="text-slate-400">Fila 1 = encabezados, fila 2 en adelante = hitos. Columnas en orden:</p>
                <div className="grid grid-cols-2 gap-1 mt-2">
                  {[
                    'A: N° (número del hito)',
                    'B: Hito / Entregable',
                    'C: Características / Especificaciones Técnicas',
                    'D: Plazo Contractual',
                    'E: Fecha Inicio',
                    'F: Fecha Límite',
                    'G: Pago / Condición',
                    'H: Origen (Documento)',
                  ].map(c => (
                    <p key={c} className="text-cyan-400 font-mono">{c}</p>
                  ))}
                </div>
                <p className="text-slate-500 mt-2">
                  Campos vacíos → <span className="text-amber-400">"por definir"</span>.
                  El responsable se asignará según tu selección abajo.
                </p>
              </div>

              <div>
                <label className="label">Responsable para todos los hitos importados</label>
                <select className="input-field" value={responsable} onChange={e => setResponsable(e.target.value)}>
                  {ROLES_RESPONSABLE.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#1e3a8a] rounded-xl cursor-pointer hover:border-blue-500 transition-colors bg-[#0d1526]/50">
                <Upload className="w-8 h-8 text-slate-400 mb-2" />
                <p className="text-slate-400 text-sm">Haz clic para seleccionar el archivo Excel</p>
                <p className="text-slate-600 text-xs">.xlsx, .xls</p>
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleArchivo} />
              </label>
            </>
          )}

          {paso === 'revisar' && (
            <>
              <div className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-medium">{filas.length} hitos encontrados</span>
                <span className="text-slate-500">en {archivo}</span>
                <button onClick={() => { setPaso('subir'); setFilas([]) }}
                  className="text-blue-400 underline text-xs ml-2">
                  Cambiar archivo
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto rounded-lg border border-[#1e3a8a]/40">
                <table className="w-full text-xs">
                  <thead className="bg-[#0d1526] sticky top-0">
                    <tr>
                      <th className="tabla-header">N°</th>
                      <th className="tabla-header">Hito / Entregable</th>
                      <th className="tabla-header">Fecha Inicio</th>
                      <th className="tabla-header">Fecha Límite</th>
                      <th className="tabla-header">Plazo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filas.map((f, i) => (
                      <tr key={i} className="border-b border-[#1e3a8a]/20">
                        <td className="tabla-cell text-slate-500">{f.numero}</td>
                        <td className="tabla-cell text-slate-200 max-w-xs truncate">{f.nombre}</td>
                        <td className="tabla-cell">
                          <span className={f.fechaInicio === 'por definir' ? 'text-amber-400' : 'text-slate-300'}>
                            {f.fechaInicio === 'por definir' ? 'por definir' : f.fechaInicio.split('-').reverse().join('/')}
                          </span>
                        </td>
                        <td className="tabla-cell">
                          <span className={f.fechaLimite === 'por definir' ? 'text-amber-400' : 'text-slate-300'}>
                            {f.fechaLimite === 'por definir' ? 'por definir' : f.fechaLimite.split('-').reverse().join('/')}
                          </span>
                        </td>
                        <td className="tabla-cell text-slate-400">{f.plazoContractual}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-700/30 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                Los campos en amarillo no tienen fecha — podrás editarlos después.
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3 px-6 pb-6">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          {paso === 'revisar' && (
            <button onClick={handleImportar} disabled={loading || filas.length === 0} className="btn-primary">
              {loading
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><Upload className="w-4 h-4" /> Importar {filas.length} hitos</>}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
