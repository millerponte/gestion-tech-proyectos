'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import {
  LayoutDashboard, FolderKanban, FileText, CalendarDays,
  Settings, LogOut, Shield, ChevronRight, Menu, X
} from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/proyectos', label: 'Proyectos', icon: FolderKanban },
  { href: '/entregables', label: 'Entregables', icon: FileText },
  { href: '/cronogramas', label: 'Cronogramas', icon: CalendarDays },
]

const EMPRESA_COLORS: Record<string, string> = {
  OKINAWATEC: 'bg-blue-600',
  'TECH SOLUTIONS': 'bg-green-600',
  QUANTIC: 'bg-purple-600',
}

export default function Sidebar() {
  const pathname = usePathname()
  const { usuario, isAdmin, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    toast.success('Sesión cerrada')
    router.push('/auth/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-[#1e3a8a]/50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="font-display font-bold text-white text-base leading-tight">GestTech</h1>
            <p className="text-slate-500 text-xs">Proyectos & Entregables</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                active
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-600/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
            </Link>
          )
        })}

        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className={clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 mt-2',
              pathname.startsWith('/admin')
                ? 'bg-amber-600/20 text-amber-300 border border-amber-600/40'
                : 'text-amber-500/70 hover:text-amber-400 hover:bg-amber-600/10'
            )}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            Panel Admin
            {pathname.startsWith('/admin') && <ChevronRight className="w-3 h-3 ml-auto text-amber-400" />}
          </Link>
        )}
      </nav>

      {/* Usuario */}
      <div className="px-3 py-4 border-t border-[#1e3a8a]/50">
        {usuario && (
          <div className="px-3 py-3 rounded-lg bg-[#0d1526] border border-[#1e3a8a]/30 mb-2">
            <div className="flex items-center gap-2.5">
              <div className={clsx(
                'w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0',
                EMPRESA_COLORS[usuario.empresa || 'OKINAWATEC'] || 'bg-blue-600'
              )}>
                {usuario.nombre.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{usuario.nombre}</p>
                <p className="text-slate-500 text-xs truncate">{usuario.correo}</p>
              </div>
            </div>
            {usuario && (
              <span className={clsx(
                'mt-2 inline-block text-xs rounded-full px-2 py-0.5 border',
                usuario.rol === 'admin'        && 'text-amber-400 bg-amber-900/30 border-amber-700/30',
                usuario.rol === 'ingeniero'    && 'text-blue-400 bg-blue-900/30 border-blue-700/30',
                usuario.rol === 'administracion' && 'text-green-400 bg-green-900/30 border-green-700/30',
                usuario.rol === 'legal'        && 'text-purple-400 bg-purple-900/30 border-purple-700/30',
                usuario.rol === 'gerente'      && 'text-cyan-400 bg-cyan-900/30 border-cyan-700/30',
                usuario.rol === 'usuario'      && 'text-slate-400 bg-slate-800/30 border-slate-600/30',
              )}>
                {{
                  admin: 'Admin',
                  ingeniero: 'Ingeniero',
                  administracion: 'Administración',
                  legal: 'Legal',
                  gerente: 'Gerente',
                  usuario: 'Usuario',
                }[usuario.rol] || usuario.rol}
              </span>
            )}
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm px-3 py-2 rounded-lg hover:bg-red-900/10 transition-all w-full"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 bg-[#111d35] border border-[#1e3a8a] rounded-lg flex items-center justify-center text-white"
      >
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={clsx(
        'lg:hidden fixed top-0 left-0 h-full w-64 bg-[#0d1526] border-r border-[#1e3a8a]/50 z-50 transform transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-60 xl:w-64 bg-[#0d1526] border-r border-[#1e3a8a]/50 h-screen sticky top-0 flex-shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}
