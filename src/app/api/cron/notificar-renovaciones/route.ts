import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { getDocs, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Proyecto, Usuario } from '@/types'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

// Funciones para comparar fechas sin importar la hora local
function diferenciaEnDias(fechaFin: string): number {
  const fin = new Date(fechaFin)
  const hoy = new Date()
  fin.setHours(0, 0, 0, 0)
  hoy.setHours(0, 0, 0, 0)
  return Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

export async function GET() {
  try {
    // 1. Obtener proyectos y usuarios
    const [proyectosSnap, usuariosSnap] = await Promise.all([
      getDocs(collection(db, 'proyectos')),
      getDocs(collection(db, 'usuarios'))
    ])

    const proyectos = proyectosSnap.docs.map(d => ({ id: d.id, ...d.data() } as Proyecto)).filter(p => p.estado === 'activo')
    const usuarios = usuariosSnap.docs.map(d => d.data() as Usuario)

    // Agrupar correos por rol
    const correosPreVenta = usuarios.filter(u => u.rol === 'preventa').map(u => u.correo)
    const correosResto = usuarios.filter(u => ['admin', 'gerente', 'administracion', 'legal', 'soc'].includes(u.rol)).map(u => u.correo)

    let notificacionesEnviadas = 0

    // 2. Evaluar cada proyecto activo
    for (const p of proyectos) {
      if (!p.fechaFin) continue;
      
      const diasRestantes = diferenciaEnDias(p.fechaFin)

      // ALERTA 3 MESES ANTES (~90 días) -> Solo Pre Venta
      if (diasRestantes === 90 && correosPreVenta.length > 0) {
        await enviarCorreo(
          correosPreVenta, 
          `🚨 Renovación en 3 meses: ${p.solucion || p.nombre} — ${p.clienteNombre}`, 
          p, 
          '3 Meses', 
          '#f59e0b'
        )
        notificacionesEnviadas++
      }

      // ALERTA 1 SEMANA ANTES (7 días) -> Resto de Roles
      if (diasRestantes === 7 && correosResto.length > 0) {
        await enviarCorreo(
          correosResto, 
          `⚠️ Proyecto por Vencer en 7 días: ${p.solucion || p.nombre} — ${p.clienteNombre}`, 
          p, 
          '1 Semana', 
          '#ef4444'
        )
        notificacionesEnviadas++
      }
    }

    return NextResponse.json({ success: true, notificacionesEnviadas, mensaje: 'Cron ejecutado correctamente' })

  } catch (err) {
    console.error('CRON ERROR:', err)
    return NextResponse.json({ error: 'Fallo al ejecutar cron job' }, { status: 500 })
  }
}

async function enviarCorreo(destinatarios: string[], asunto: string, p: Proyecto, tiempo: string, colorAlert: string) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0d1526;color:#f0f6ff;padding:32px;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <h1 style="color:#38bdf8;font-size:24px;margin:0;">GestTech Alertas</h1>
      </div>
      <div style="background:#111d35;border:1px solid #1e3a8a;border-radius:8px;padding:24px;">
        <h2 style="color:${colorAlert};font-size:18px;margin:0 0 16px;">Vencimiento en ${tiempo}</h2>
        <p style="color:#94a3b8;font-size:14px;">El siguiente proyecto está próximo a finalizar su vigencia:</p>
        <table style="width:100%;border-collapse:collapse;margin-top:16px;">
          <tr><td style="color:#94a3b8;padding:6px 0;font-size:13px;width:120px;">Proyecto:</td><td style="color:#f0f6ff;font-size:13px;font-weight:bold;">${p.nombre}</td></tr>
          <tr><td style="color:#94a3b8;padding:6px 0;font-size:13px;">Solución:</td><td style="color:#f0f6ff;font-size:13px;">${p.solucion || '—'}</td></tr>
          <tr><td style="color:#94a3b8;padding:6px 0;font-size:13px;">Cliente:</td><td style="color:#f0f6ff;font-size:13px;">${p.clienteNombre}</td></tr>
          <tr><td style="color:#94a3b8;padding:6px 0;font-size:13px;">Contrato:</td><td style="color:#f0f6ff;font-size:13px;">${p.numeroContrato || '—'}</td></tr>
          <tr><td style="color:#94a3b8;padding:6px 0;font-size:13px;">Plazo Total:</td><td style="color:#f0f6ff;font-size:13px;">${p.plazo} meses</td></tr>
          <tr><td style="color:#94a3b8;padding:6px 0;font-size:13px;">Fecha Inicio:</td><td style="color:#38bdf8;font-size:13px;">${p.fechaInicio}</td></tr>
          <tr><td style="color:#94a3b8;padding:6px 0;font-size:13px;">Fecha Fin:</td><td style="color:${colorAlert};font-size:13px;font-weight:bold;">${p.fechaFin}</td></tr>
        </table>
      </div>
    </div>
  `

  await Promise.allSettled(
    destinatarios.map(correo =>
      transporter.sendMail({
        from: `"GestTech Alertas" <${process.env.GMAIL_USER}>`,
        to: correo,
        subject: asunto,
        html,
      })
    )
  )
}
