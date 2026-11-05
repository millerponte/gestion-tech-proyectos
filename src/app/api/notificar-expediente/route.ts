import nodemailer from 'nodemailer'
import { NextRequest, NextResponse } from 'next/server'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
})

export async function POST(req: NextRequest) {
  try {
    const {
      correos, numeroDocumento, asunto, cliente,
      proyecto, solucion, empresa, expediente, responsable, fecha, esReenvio, numeroContrato
    } = await req.json()

    if (!correos || correos.length === 0) {
      return NextResponse.json({ error: 'No hay correos' }, { status: 400 })
    }

    const subject = esReenvio
      ? `📎 [Reenvío] Expediente — ${numeroDocumento}`
      : `📎 Expediente agregado — ${numeroDocumento}`

    const estadoBadge = esReenvio
      ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;"><tr><td style="background-color:#1e3a5f; border:1px solid #1e3a8a; border-radius:8px; padding:12px 16px; text-align:center;"><p style="color:#60a5fa; margin:0; font-size:13px; font-family:Arial,sans-serif;">🔁 Este es un <strong>reenvío</strong> de notificación</p></td></tr></table>`
      : `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;"><tr><td style="background-color:#0a3d1f; border:1px solid #166534; border-radius:8px; padding:12px 16px; text-align:center;"><p style="color:#4ade80; margin:0; font-size:13px; font-family:Arial,sans-serif;">✅ El entregable ha pasado de <strong>Reservado</strong> a <strong>Completo</strong></p></td></tr></table>`

    // Diseño en tablas a prueba de balas para Outlook, Roundcube y Gmail
    const html = `
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f1f5f9; padding:20px 0;">
        <tr>
          <td align="center">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; background-color:#0d1526; border-radius:12px; border:1px solid #1e3a8a; overflow:hidden;">
              <tr>
                <td style="padding:32px;">
                  <div style="text-align:center; margin-bottom:32px;">
                    <h1 style="color:#38bdf8; font-size:24px; margin:0; font-family:Arial,sans-serif;">GestTech</h1>
                    <p style="color:#94a3b8; margin:4px 0 0; font-size:14px; font-family:Arial,sans-serif;">Sistema de Gestión de Proyectos</p>
                  </div>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#111d35; border:1px solid #1e3a8a; border-radius:8px;">
                    <tr>
                      <td style="padding:24px;">
                        <h2 style="color:#ffffff; font-size:18px; margin:0 0 16px; font-family:Arial,sans-serif;">📎 Expediente agregado a entregable</h2>
                        
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr><td style="color:#94a3b8; padding:8px 0; font-size:13px; font-family:Arial,sans-serif; width:130px; border-bottom:1px solid #1e3a8a;">N° Documento:</td><td style="color:#38bdf8; font-family:monospace; font-size:14px; font-weight:bold; border-bottom:1px solid #1e3a8a;">${numeroDocumento}</td></tr>
                          <tr><td style="color:#94a3b8; padding:8px 0; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">Expediente:</td><td style="color:#4ade80; font-family:monospace; font-size:14px; font-weight:bold; border-bottom:1px solid #1e3a8a;">${expediente}</td></tr>
                          <tr><td style="color:#94a3b8; padding:8px 0; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">Asunto:</td><td style="color:#f0f6ff; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">${asunto}</td></tr>
                          <tr><td style="color:#94a3b8; padding:8px 0; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">Cliente:</td><td style="color:#f0f6ff; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">${cliente}</td></tr>
                          <tr><td style="color:#94a3b8; padding:8px 0; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">Empresa:</td><td style="color:#f0f6ff; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">${empresa || 'OKINAWATEC'}</td></tr>
                          <tr><td style="color:#94a3b8; padding:8px 0; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">Proyecto:</td><td style="color:#f0f6ff; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">${proyecto}</td></tr>
                          <tr><td style="color:#94a3b8; padding:8px 0; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">Solución:</td><td style="color:#f0f6ff; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">${solucion || '—'}</td></tr>
                          <tr><td style="color:#94a3b8; padding:8px 0; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">N° Contrato:</td><td style="color:#f0f6ff; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">${numeroContrato || '—'}</td></tr>
                          <tr><td style="color:#94a3b8; padding:8px 0; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">Responsable:</td><td style="color:#f0f6ff; font-size:13px; font-family:Arial,sans-serif; border-bottom:1px solid #1e3a8a;">${responsable}</td></tr>
                          <tr><td style="color:#94a3b8; padding:8px 0; font-size:13px; font-family:Arial,sans-serif;">Fecha Real Envío:</td><td style="color:#f0f6ff; font-size:13px; font-family:Arial,sans-serif;">${fecha}</td></tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  ${estadoBadge}
                  
                  <p style="color:#475569; font-size:11px; text-align:center; margin-top:24px; font-family:Arial,sans-serif;">
                    Este es un correo automático de GestTech — No responder
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `

    const resultados = await Promise.allSettled(
      correos.map((correo: string) =>
        transporter.sendMail({
          from: `"GestTech" <${process.env.GMAIL_USER}>`,
          to: correo,
          subject,
          html,
        })
      )
    )

    const enviados = resultados.filter(r => r.status === 'fulfilled').length
    const fallidos = resultados.filter(r => r.status === 'rejected').length

    return NextResponse.json({ success: true, enviados, fallidos })

  } catch (err) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
