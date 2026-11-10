import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { generarNumeroTicketOkinawa } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    
    const fromRaw = (formData.get('from') as string) || ''
    const subject = (formData.get('subject') as string) || '(Sin Asunto)'
    const textBody = (formData.get('text') as string) || ''

    const emailMatch = fromRaw.match(/<([^>]+)>/)
    const correoCliente = emailMatch ? emailMatch[1].trim() : fromRaw.trim()

    if (!correoCliente) {
      return NextResponse.json({ success: true, msg: 'Sin remitente' })
    }

    const textoLimpio = textBody.split(/El lun, \d+ de.*escribió:|On.*wrote:|From:/i)[0].trim()

    const nuevoMensaje: any = {
      id: Date.now().toString(),
      texto: textoLimpio,
      tipo: 'entrante',
      fecha: new Date().toISOString()
    }

    const ticketMatch = subject.match(/OK\d{4}HD\d{4}/)
    let ticketRefParaActualizar = null
    let ticketDataActual = null

    if (ticketMatch) {
      const numeroTicket = ticketMatch[0]
      const q = query(collection(db, 'tickets_okinawa'), where('numeroTicket', '==', numeroTicket))
      const snap = await getDocs(q)
      
      if (!snap.empty) {
        ticketDataActual = snap.docs[0].data()
        ticketRefParaActualizar = doc(db, 'tickets_okinawa', snap.docs[0].id)
      }
    }

    if (ticketRefParaActualizar && ticketDataActual) {
      const mensajes = ticketDataActual.mensajes || []
      mensajes.push(nuevoMensaje)
      
      await updateDoc(ticketRefParaActualizar, {
        mensajes,
        estado: ticketDataActual.estado === 'cerrado' ? 'abierto' : ticketDataActual.estado
      })
    } else {
      const nuevoNumero = await generarNumeroTicketOkinawa()
      const asuntoLimpio = subject.replace(/^(Re:\s*|Fwd:\s*|Rv:\s*)+/i, '').trim()

      await addDoc(collection(db, 'tickets_okinawa'), {
        numeroTicket: nuevoNumero,
        correoCliente: correoCliente,
        asunto: asuntoLimpio,
        requerimiento: textoLimpio,
        fechaEnvio: new Date().toLocaleDateString('es-PE'),
        sede: 'Por clasificar',
        marcaProducto: 'Por clasificar',
        estado: 'abierto',
        createdAt: new Date().toISOString(),
        mensajes: [nuevoMensaje]
      })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error en Inbound Parse:', error)
    return NextResponse.json({ error: 'Fallo interno al procesar correo' }, { status: 500 })
  }
}
