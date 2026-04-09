'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut, User
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { crearUsuarioDB, obtenerUsuario } from '@/lib/db'
import type { Usuario } from '@/types'

interface AuthContextType {
  user: User | null
  usuario: Usuario | null
  loading: boolean
  login: (correo: string, password: string) => Promise<void>
  register: (correo: string, password: string, nombre: string) => Promise<void>
  logout: () => Promise<void>
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const data = await obtenerUsuario(u.uid)
        setUsuario(data)
      } else {
        setUsuario(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const login = async (correo: string, password: string) => {
    await signInWithEmailAndPassword(auth, correo, password)
  }

  const register = async (correo: string, password: string, nombre: string) => {
    const cred = await createUserWithEmailAndPassword(auth, correo, password)
    const nuevoUsuario: Omit<Usuario, 'uid'> = {
      nombre,
      correo,
      rol: 'usuario',
      createdAt: new Date().toISOString(),
    }
    await crearUsuarioDB(cred.user.uid, nuevoUsuario)
    setUsuario({ uid: cred.user.uid, ...nuevoUsuario })
  }

  const logout = async () => {
    await signOut(auth)
    setUsuario(null)
  }

const isAdmin = usuario?.rol === 'admin'

  const tienePermiso = (permiso: keyof import('@/types').PermisoUsuario): boolean => {
    if (isAdmin) return true
    if (!usuario) return false
    if (usuario.permisos) return !!usuario.permisos[permiso]
    // Permisos por defecto según rol
    const rol = usuario.rol
    const defaults: Record<string, Partial<import('@/types').PermisoUsuario>> = {
      ingeniero: {
        proyectos_ver: true,
        cronogramas_ver: true, cronogramas_agregar: true, cronogramas_editar: true,
        entregables_ver: true, entregables_agregar: true, entregables_editar: true,
        comentarios: true,
      },
      administracion: {
        proyectos_ver: true, proyectos_agregar: true, proyectos_editar: true,
        cronogramas_ver: true, cronogramas_agregar: true, cronogramas_editar: true,
        entregables_ver: true,
        comentarios: true,
      },
      legal: {
        proyectos_ver: true,
        cronogramas_ver: true,
        entregables_ver: true,
        comentarios: true,
      },
      gerente: {
        proyectos_ver: true,
        cronogramas_ver: true,
        entregables_ver: true,
        comentarios: true,
      },
      usuario: {
        proyectos_ver: true,
        cronogramas_ver: true,
        entregables_ver: true,
        comentarios: true,
      },
    }
    return !!(defaults[rol]?.[permiso])
  }

  return (
    <AuthContext.Provider value={{ user, usuario, loading, login, register, logout, isAdmin, tienePermiso }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
