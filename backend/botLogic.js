const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const { WHATSAPP_TOKEN, PHONE_NUMBER_ID, FIREBASE_DATABASE_URL } = process.env;

// Archivo local donde guardaremos el historial de chat (además del sync con la nube)
const HISTORY_FILE = path.join(__dirname, 'chat_history.json');

/**
 * Normaliza un número telefónico para quedarse con los últimos 10 dígitos (estilo México)
 */
function normalizeTo10Digits(tel) {
    if (!tel) return '';
    const cleaned = tel.replace(/\D/g, '');
    return cleaned.slice(-10);
}

/**
 * Guarda el nuevo cliente en Firebase Realtime Database si no existe
 */
async function saveLeadToFirebase(phone, name) {
    const dbUrl = FIREBASE_DATABASE_URL || "https://fitngo-erp-default-rtdb.firebaseio.com";
    const targetUrl = `${dbUrl}/fitgo_erp/clientes.json`;

    try {
        console.log(`☁️ Consultando clientes en Firebase para verificar duplicados...`);
        const response = await axios.get(targetUrl);
        let clientes = response.data || [];

        // Si Firebase lo devuelve como un objeto asociativo en vez de array
        if (clientes && typeof clientes === 'object' && !Array.isArray(clientes)) {
            clientes = Object.values(clientes);
        }

        const incoming10 = normalizeTo10Digits(phone);
        if (!incoming10) return;

        // Comprobar si ya existe
        const exists = clientes.some(c => {
            const client10 = normalizeTo10Digits(c.tel);
            return client10 === incoming10;
        });

        if (exists) {
            console.log(`ℹ️ El lead con teléfono ${phone} ya existe en Firebase. No se duplicará.`);
            return;
        }

        // Crear el nuevo lead siguiendo exactamente el formato de base de datos del ERP
        const nuevoCliente = {
            id: 'id_' + Date.now().toString(36),
            nombre: name,
            tel: phone,
            canal: 'WhatsApp',
            tieneDieta: false,
            pedidos: 0,
            ultimoPedido: null,
            notas: '',
            crm_estado: 'Nuevo Lead',
            enCRM: false,
            ticketProm: 0,
            valorTotal: 0
        };

        clientes.push(nuevoCliente);

        // Guardar el array completo actualizado en Firebase
        await axios.put(targetUrl, clientes);
        console.log(`✅ ¡Éxito! Nuevo Lead registrado en la nube de Firebase: ${name} (${phone})`);

    } catch (error) {
        console.error('❌ Error sincronizando el Lead con Firebase:', error.message);
    }
}

/**
 * Envía un archivo PDF (u otro tipo de documento) a través de la API de WhatsApp
 */
async function sendDocument(toPhone, url, filename, caption) {
    try {
        // FIX: Quitar el '1' a los números de México (521...) para que Meta los acepte
        let fixedPhone = toPhone;
        if (fixedPhone.startsWith('521') && fixedPhone.length === 13) {
            fixedPhone = '52' + fixedPhone.substring(3);
        }

        const endpoint = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
        
        const data = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: fixedPhone,
            type: "document",
            document: {
                link: url,
                filename: filename,
                caption: caption
            }
        };

        const config = {
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        await axios.post(endpoint, data, config);
        console.log(`📤 DOCUMENTO ENVIADO A ${toPhone}: ${filename} (${url})`);

    } catch (error) {
        console.error(`❌ Error enviando documento a ${toPhone}:`, error.response?.data || error.message);
    }
}

/**
 * Procesa el texto recibido y decide qué responder
 */
async function processMessage(phone, name, text) {
    const textLower = text.toLowerCase().trim();
    let replyText = '';

    // 1. GUARDAR EN EL HISTORIAL LOCAL
    saveToHistory(phone, name, text, 'user');

    // 2. REGISTRAR COMO LEAD EN LA NUBE (FIREBASE)
    await saveLeadToFirebase(phone, name);

    // Identificación de opciones solicitadas por el usuario
    const isOption1 = textLower === '1' || textLower.includes('1️⃣') || textLower.includes('menu') || textLower.includes('menú');
    const isOption2 = textLower === '2' || textLower.includes('2️⃣') || textLower.includes('precio') || textLower.includes('costo') || textLower.includes('precios') || textLower.includes('costos');
    const isOption3 = textLower === '3' || textLower.includes('3️⃣') || textLower.includes('semanal') || textLower.includes('plan');
    const isOption4 = textLower === '4' || textLower.includes('4️⃣') || textLower.includes('personalizado') || textLower.includes('dieta');
    const isOption5 = textLower === '5' || textLower.includes('5️⃣') || textLower.includes('pedido') || textLower.includes('hacer pedido') || textLower.includes('comprar') || textLower.includes('ordenar');

    // 3. LÓGICA DE EVALUACIÓN (El "Cerebro")
    if (isOption1) {
        replyText = `🥗 Este es nuestro menú base:

🍳 DESAYUNOS
• Hotcakes Fit
• Huevos con Jamón
• Huevos a la Mexicana
• Sándwich Fitavo
• Waffles Fit

🍽️ COMIDAS
• Yakimeshi de Pollo
• Ensalada César
• Carne Molida
• Chilaquiles
• Pechuga de Pollo
• Nachos Fit
• Spaghetti con Carne Molida

📋 Todos nuestros platillos están disponibles en tamaños:
🥑 Déficit
🥗 Normal
💪 Bulk

Te comparto el menú completo 👇`;

        await sendMessage(phone, replyText);
        saveToHistory(phone, 'Fit&Go Bot', replyText, 'bot');

        // Enviar el PDF del menú cargado en Render
        const pdfUrl = process.env.PDF_URL || 'https://fit-go.onrender.com/menu.pdf';
        await sendDocument(phone, pdfUrl, 'menu_completo.pdf', 'Menú Fit & Go');
        saveToHistory(phone, 'Fit&Go Bot', `[Documento PDF: ${pdfUrl}]`, 'bot');

        // Enviar el mensaje de seguimiento de objetivos
        const followUpText = `¿Te gustaría que te recomendara una opción según tu objetivo?
• Bajar grasa
• Mantener peso
• Ganar masa muscular

Pregunta por nuestros platillos de la semana!`;

        await sendMessage(phone, followUpText);
        saveToHistory(phone, 'Fit&Go Bot', followUpText, 'bot');
        return;
    } 
    else if (isOption2) {
        replyText = `💰 Nuestros precios dependen del tamaño de la porción:

🥑 Déficit
💲 $100 - $115

🥗 Normal
💲 $115 - $130

💪 Bulk
💲 $130 - $145

🎉 A partir de 5 comidas obtienes $10 de descuento por cada platillo.

¿Buscas comidas individuales o un plan semanal?`;
    }
    else if (isOption3) {
        replyText = `📅 Contamos con un plan semanal para ti 😊.

Puedes elegir los platillos que prefieras del menú y pedir desde 5 comidas en adelante.

✅ Recibes $10 de descuento por cada platillo.
✅ Tú eliges los tamaños (Déficit, Normal o Bulk).
✅ Puedes combinar diferentes comidas.

¿Cuántas comidas te gustaría pedir para la semana?`;
    }
    else if (isOption4) {
        replyText = `🥦 También manejamos servicio personalizado.

Solo envíanos:

📋 Tu dieta o plan alimenticio en foto o PDF

Y te cotizamos las comidas exactamente según los requerimientos de tu nutriólogo. Cabe destacar que nosotros cocinamos lo que el nutriólogo te recete, nosotros no hacemos dietas sin embargo te podemos recomendar a un nutriólogo.

¿Te gustaría enviarnos tu dieta para cotizarla?`;
    }
    else if (isOption5) {
        replyText = `¡Perfecto! 😋
Para comenzar, ¿me compartes tu nombre y apellido?
¿Sería para servicio a domicilio o Pick Up? (en caso de ser servicio a domicilio, mandar dirección, ubicación y referencias para entrega).
¿Cuál sería su pedido?
¿Para qué hora sería aproximadamente?

💳 Aceptamos transferencia y efectivo.
Nuestro equipo validará tu pedido y te confirmará lo antes posible.

¡Gracias por elegir Fit&Go! 🥑`;
    }
    else {
        // Mensaje de saludo genérico / Default
        replyText = `¡Hola ${name}! 👋 Bienvenido a Fit&Go 🥑

Preparamos comida saludable en Mérida, Yucatán.

🔥 Puedes elegir una opción:

1️⃣ Ver Menú
2️⃣ Ver Precios
3️⃣ Plan Semanal
4️⃣ Servicio Personalizado
5️⃣ Hacer Pedido

🕛Horario de servicio: Lunes a Viernes
⏰ Cierre de pedidos: 1:30 pm`;
    }

    // 4. ENVIAR RESPUESTA A LA API DE WHATSAPP
    await sendMessage(phone, replyText);
    
    // Guardar respuesta del bot en el historial local
    saveToHistory(phone, 'Fit&Go Bot', replyText, 'bot');
}

/**
 * Envía la petición HTTP a los servidores de Meta
 */
async function sendMessage(toPhone, text) {
    try {
        // FIX: Quitar el '1' a los números de México (521...) para que Meta los acepte
        let fixedPhone = toPhone;
        if (fixedPhone.startsWith('521') && fixedPhone.length === 13) {
            fixedPhone = '52' + fixedPhone.substring(3);
        }

        const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
        
        const data = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: fixedPhone,
            type: "text",
            text: {
                preview_url: false,
                body: text
            }
        };

        const config = {
            headers: {
                'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                'Content-Type': 'application/json'
            }
        };

        await axios.post(url, data, config);
        console.log(`📤 MENSAJE ENVIADO A ${toPhone}: ${text}`);

    } catch (error) {
        console.error(`❌ Error enviando mensaje a ${toPhone}:`, error.response?.data || error.message);
    }
}

/**
 * Guarda los mensajes en un archivo JSON local
 */
function saveToHistory(phone, name, text, senderType) {
    let history = [];
    if (fs.existsSync(HISTORY_FILE)) {
        try {
            history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        } catch (e) {
            history = [];
        }
    }

    history.push({
        date: new Date().toISOString(),
        phone,
        name,
        senderType, // 'user' o 'bot'
        text
    });

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

module.exports = {
    processMessage
};
