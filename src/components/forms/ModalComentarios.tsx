'use client'

import { useState, useEffect } from 'react'
import { obtenerComentarios, crearComentario, eliminarComentario } from '@/lib/db'
import type { Comentario } from '@/lib/db'
import { useAuth } from '@/hooks/useAuth'
import type { Proyecto } from '@/types'
import { X, MessageSquare, Send, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Props {
  proyecto: Proyecto
  onClose: () => void
}

export default function ModalComentarios({ proyecto, onClose }: Props) {
  const { usuario, isAdmin } = useAuth()
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [texto, setTexto] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  const cargar = async () => {
    setLoading(true)
    try {
      const c = await obtenerComentarios(proyecto.id)
      setComentarios(c)
    } catch {
      // Si falta índice, mostrar vacío
      setComentarios([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [proyecto.id])

  const handleEnviar = async () => {
    if (!texto.trim()) return
    setEnviando(true)
    try {
      await crearComentario({
        proyectoId: proyecto.id,
        usuarioNombre: usuario?.nombre || 'Usuario',
        usuarioUid: usuario?.uid || '',
        texto: texto.trim(),
        createdAt: new Date().toISOString(),
      })
      setTexto('')
      cargar()
    } catch {
      toast.error('Error al enviar comentario')
    } finally {
      setEnviando(false)
    }
  }

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Eliminar este comentario?')) return
    await eliminarComentario(id)
    cargar()
  }

  const formatearFechaComentario = (iso: string) => {
    try {
      return format(new Date(iso), "d MMM yyyy, HH:mm", { locale: es })
    } catch { return iso }
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg flex flex-col" style={{ height: '80vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1e3a8a]/50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-white text-sm">Comentarios</h2>
              <p className="text-xs text-slate-400 truncate max-w-64">{proyecto.solucion || proyecto.nombre}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista de comentarios */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comentarios.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">No hay comentarios aún</p>
              <p className="text-slate-600 text-xs mt-1">Sé el primero en comentar</p>
            </div>
          ) : (
            comentarios.map(c => {
              const esMio = c.usuarioUid === usuario?.uid
              return (
                <div key={c.id} className={`flex gap-2 ${esMio ? 'flex-row-reverse' : ''}`}>
                  {/* Avatar */}
                  <div className="w-7 h-7 rounded-full bg-blue-600/30 flex items-center justify-center text-blue-300 text-xs font-bold flex-shrink-0 mt-0.5">
                    {c.usuarioNombre.charAt(0).toUpperCase()}
                  </div>
                  {/* Burbuja */}
                  <div className={`max-w-xs ${esMio ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                    <div className={`px-3 py-2 rounded-xl text-sm ${
                      esMio
                        ? 'bg-blue-600/30 border border-blue-500/40 text-blue-100 rounded-tr-sm'
                        : 'bg-[#111d35] border border-[#1e3a8a]/50 text-slate-200 rounded-tl-sm'
                    }`}>
                      {!esMio && (
                        <p className="text-xs font-medium text-blue-400 mb-1">{c.usuarioNombre}</p>
                      )}
                      <p className="leading-relaxed">{c.texto}</p>
                    </div>
                    <div className={`flex items-center gap-2 ${esMio ? 'flex-row-reverse' : ''}`}>
                      <p className="text-xs text-slate-500">{formatearFechaComentario(c.createdAt)}</p>
                      {(esMio || isAdmin) && (
                        <button onClick={() => handleEliminar(c.id)}
                          className="text-slate-600 hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Input de comentario */}
        <div className="p-4 border-t border-[#1e3a8a]/50 flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              className="input-field resize-none flex-1 text-sm"
              rows={2}
              placeholder="Escribe un comentario..."
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEnviar()
                }
              }}
            />
            <button
              onClick={handleEnviar}
              disabled={enviando || !texto.trim()}
              className="btn-primary flex-shrink-0 px-3 self-end">
              {enviando
                ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Send className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-xs text-slate-600 mt-1">Enter para enviar · Shift+Enter para nueva línea</p>
        </div>
      </div>
    </div>
  )
}
