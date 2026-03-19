import type { Metadata } from 'next'
import { Inter, Outfit } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'GestTech — Plataforma de Proyectos',
  description: 'Gestión de proyectos y entregables para Okinawatec, Tech Solutions y Quantic',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${outfit.variable} font-sans bg-dark-900 text-white`}>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: '#1e2e6e',
                color: '#fff',
                border: '1px solid #2563eb',
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  )
}
