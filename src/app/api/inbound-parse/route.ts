import { NextRequest, NextResponse } from 'next/server'
import { collection, query, where, getDocs, addDoc, updateDoc, doc } from 'firebase/firestore'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db } from '@/lib/firebase' // Asegúrate de que esta ruta sea correcta para tu proyecto
import { generarNumeroTicketOkinawa } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    
    const fromRaw = (formData.get('from') as string) || ''
    const subject = (formData.get('subject') as string) || '(Sin Asunto)'
    const textBody = (formData.get('text') as string) || ''
    
    // Extraer el archivo adjunto (si existe)
    const archivoFisico = formData.get('adjunto') as File | null

    const emailMatch = fromRaw.match(/<([^>]+)>/)
    const correoCliente = emailMatch ? emailMatch[1].trim() : fromRaw.trim()

    if (!correoCliente) {
      return NextResponse.json({ success: true, msg: 'Sin remitente' })
    }

    const textoLimpio = textBody.split(/El lun, \d+ de.*escribió:|On.*wrote:|From:/i)[0].trim()

    // Lógica para subir el archivo a Firebase Storage
    let urlAdjunto = null
    let nombreAdjunto = null

    if (archivoFisico && archivoFisico.size > 0) {
      const storage = getStorage()
      nombreAdjunto = archivoFisico.name
      // Creamos una ruta única en Storage
      const storageRef = ref(storage, `tickets_adjuntos/${Date.now()}_${nombreAdjunto}`)
      
      const buffer = await archivoFisico.arrayBuffer()
      await uploadBytes(storageRef, buffer, { contentType: archivoFisico.type })
      urlAdjunto = await getDownloadURL(storageRef)
    }

    const nuevoMensaje: any = {
      id: Date.now().toString(),
      texto: textoLimpio,
      tipo: 'entrante',
      fecha: new Date().toISOString()
    }

    // Si hay archivo, lo agregamos al mensaje
    if (urlAdjunto) {
      nuevoMensaje.adjunto = {
        nombre: nombreAdjunto,
        url: urlAdjunto
      }
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
