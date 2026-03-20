import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { correos, numeroDocumento, asunto, cliente, proyecto, expediente, responsable, fecha } = await req.json()

    if (!correos || correos.length === 0) {
      return NextResponse.json({ error: 'No hay correos' }, { status: 400 })
    }

    const { data, error } = await resend.emails.send({
      from: 'GestTech <onboarding@resend.dev>',
      to: correos,
      subject: `📎 Expediente agregado — ${numeroDocumento}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0d1526; color: #f0f6ff; padding: 32px; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="color: #38bdf8; font-size: 24px; margin: 0;">GestTech</h1>
            <p style="color: #94a3b8; margin: 4px 0 0;">Sistema de Gestión de Proyectos</p>
          </div>

          <div style="background: #111d35; border: 1px solid #1e3a8a; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
            <h2 style="color: #ffffff; font-size: 18px; margin: 0 0 16px;">📎 Expediente agregado a entregable</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="color: #94a3b8; padding: 6px 0; font-size: 13px; width: 140px;">N° Documento:</td>
                <td style="color: #38bdf8; font-family: monospace; font-size: 13px; font-weight: bold;">${numeroDocumento}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 6px 0; font-size: 13px;">Expediente:</td>
                <td style="color: #4ade80; font-family: monospace; font-size: 13px; font-weight: bold;">${expediente}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 6px 0; font-size: 13px;">Asunto:</td>
                <td style="color: #f0f6ff; font-size: 13px;">${asunto}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 6px 0; font-size: 13px;">Cliente:</td>
                <td style="color: #f0f6ff; font-size: 13px;">${cliente}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 6px 0; font-size: 13px;">Proyecto:</td>
                <td style="color: #f0f6ff; font-size: 13px;">${proyecto}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 6px 0; font-size: 13px;">Responsable:</td>
                <td style="color: #f0f6ff; font-size: 13px;">${responsable}</td>
              </tr>
              <tr>
                <td style="color: #94a3b8; padding: 6px 0; font-size: 13px;">Fecha:</td>
                <td style="color: #f0f6ff; font-size: 13px;">${fecha}</td>
              </tr>
            </table>
          </div>

          <div style="background: #0a3d1f; border: 1px solid #166534; border-radius: 8px; padding: 12px 16px;">
            <p style="color: #4ade80; margin: 0; font-size: 13px;">
              ✅ El entregable ha pasado de <strong>Reservado</strong> a <strong>Completo</strong>
            </p>
          </div>

          <p style="color: #475569; font-size: 11px; text-align: center; margin-top: 24px;">
            Este es un correo automático de GestTech — No responder
          </p>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return NextResponse.json({ error }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch (err) {
    console.error('API error:', err)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
