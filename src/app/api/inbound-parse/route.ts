import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { generarNumeroTicketOkinawa } from '@/lib/db'

// Forzamos a que sea dinámica para que Vercel no la congele en la compilación
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    // SendGrid (y otros) envían los correos entrantes como FormData (multipart/form-data)
    const formData = await req.formData()
    
    const fromRaw = (formData.get('from') as string) || ''
    const subject = (formData.get('subject') as string) || '(Sin Asunto)'
    const textBody = (formData.get('text') as string) || ''

    // 1. Extraer solo el correo limpio (Ej: de "Juan Perez <juan@empresa.com>" extraemos "juan@empresa.com")
    const emailMatch = fromRaw.match(/<([^>]+)>/)
    const correoCliente = emailMatch ? emailMatch[1].trim() : fromRaw.trim()

    if (!correoCliente) {
      return NextResponse.json({ success: true, msg: 'Sin remitente' })
    }

    // Limpiar firmas y correos anidados (opcional pero recomendado para el chat)
    // Cortamos el texto donde empiezan las respuestas típicas de Gmail/Outlook
    const textoLimpio = textBody.split(/El lun, \d+ de.*escribió:|On.*wrote:|From:/i)[0].trim()

    const nuevoMensaje = {
      id: Date.now().toString(),
      texto: textoLimpio,
      tipo: 'entrante',
      fecha: new Date().toISOString()
    }

    // 2. Buscar si es una respuesta a un ticket existente buscando el código en el asunto Ej: [OK2026HD0121]
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

    // 3. Guardar en Base de Datos
    if (ticketRefParaActualizar && ticketDataActual) {
      // ES UNA RESPUESTA: Agregar burbuja de chat al ticket existente
      const mensajes = ticketDataActual.mensajes || []
      mensajes.push(nuevoMensaje)
      
      await updateDoc(ticketRefParaActualizar, {
        mensajes,
        estado: ticketDataActual.estado === 'cerrado' ? 'abierto' : ticketDataActual.estado // Reabrir si estaba cerrado
      })
      console.log(`Mensaje agregado al ticket ${ticketDataActual.numeroTicket}`)
      
    } else {
      // ES UN CORREO NUEVO: Crear ticket desde cero
      const nuevoNumero = await generarNumeroTicketOkinawa()
      
      // Limpiar prefijos de respuesta/reenvío en el asunto inicial
      const asuntoLimpio = subject.replace(/^(Re:\s*|Fwd:\s*|Rv:\s*)+/i, '').trim()

      await addDoc(collection(db, 'tickets_okinawa'), {
        numeroTicket: nuevoNumero,
        correoCliente: correoCliente,
        asunto: asuntoLimpio,
        requerimiento: textoLimpio, // Se guarda el primer correo como el requerimiento base
        fechaEnvio: new Date().toLocaleDateString('es-PE'),
        sede: 'Por clasificar',
        marcaProducto: 'Por clasificar',
        estado: 'abierto',
        createdAt: new Date().toISOString(),
        mensajes: [nuevoMensaje]
      })
      console.log(`Nuevo ticket creado: ${nuevoNumero}`)
    }

    // Siempre retornar 200 OK para que SendGrid sepa que recibimos el paquete
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error en Inbound Parse:', error)
    // SendGrid reintentará si le mandamos error, útil si se cae la base de datos
    return NextResponse.json({ error: 'Fallo interno al procesar correo' }, { status: 500 })
  }
}
