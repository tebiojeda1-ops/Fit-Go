const axios = require('axios');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const { WHATSAPP_TOKEN, PHONE_NUMBER_ID, FIREBASE_DATABASE_URL } = process.env;

// Archivo local donde guardaremos el historial de chat (además del sync con la nube)
const HISTORY_FILE = path.join(__dirname, 'chat_history.json');
// Archivo local donde guardaremos los números pausados temporalmente
const PAUSED_FILE = path.join(__dirname, 'paused_clients.json');

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

    // A. DETECCIÓN DE COMANDOS DE PAUSA/ACTIVACIÓN
    if (textLower === '##pausa' || textLower === '/pausa') {
        pauseBot(phone, 24);
        replyText = `🔇 Bot de Fit&Go pausado por 24 horas para este número. Ya no responderé automáticamente en este chat.`;
        await sendMessage(phone, replyText);
        saveToHistory(phone, 'Fit&Go Bot', replyText, 'bot');
        return;
    }
    
    if (textLower === '##activar' || textLower === '/activar') {
        resumeBot(phone);
        replyText = `🔊 Bot de Fit&Go reactivado. Responderé automáticamente a partir de ahora en este chat.`;
        await sendMessage(phone, replyText);
        saveToHistory(phone, 'Fit&Go Bot', replyText, 'bot');
        return;
    }

    // B. VALIDAR SI EL BOT ESTÁ EN SILENCIO (PAUSADO) PARA ESTE CLIENTE
    if (isBotPaused(phone)) {
        console.log(`ℹ️ El bot está pausado para el teléfono ${phone}. No se enviará respuesta automática.`);
        return;
    }

    // 2. REGISTRAR COMO LEAD EN LA NUBE (FIREBASE)
    await saveLeadToFirebase(phone, name);

    // Identificación de opciones solicitadas por el usuario
    const isOption1 = textLower === '1' || textLower.includes('1️⃣') || textLower.includes('menu') || textLower.includes('menú');
    const isOption2 = textLower === '2' || textLower.includes('2️⃣') || textLower.includes('precio') || textLower.includes('costo') || textLower.includes('precios') || textLower.includes('costos');
    const isOption3 = textLower === '3' || textLower.includes('3️⃣') || textLower.includes('semanal') || textLower.includes('plan');
    const isOption4 = textLower === '4' || textLower.includes('4️⃣') || textLower.includes('personalizado') || textLower.includes('dieta');
    const isOption5 = textLower === '5' || textLower.includes('5️⃣') || textLower.includes('pedido') || textLower.includes('hacer pedido') || textLower.includes('comprar') || textLower.includes('ordenar');
    
    // Identificación de saludos comunes para reiniciar o mostrar el menú principal
    const isGreeting = textLower === 'hola' || textLower === 'buenos dias' || textLower === 'buenos días' || textLower === 'buenas tardes' || textLower === 'buenas noches' || textLower === 'empezar' || textLower === 'start';

    // 3. LÓGICA DE EVALUACIÓN (El "Cerebro")
    if (isOption1) {
        replyText = `🥑 Contamos con desayunos y comidas saludables disponibles en tamaños:

🥑 Déficit
🥗 Normal
💪 Bulk

Te compartimos nuestro menú base 👇`;

        await sendMessage(phone, replyText);
        saveToHistory(phone, 'Fit&Go Bot', replyText, 'bot');

        // Enviar el PDF del menú cargado en Render
        const basePdfUrl = process.env.PDF_URL || 'https://fit-go.onrender.com/menu.pdf';
        const pdfUrl = `${basePdfUrl}?v=${Date.now()}`;
        await sendDocument(phone, pdfUrl, 'menu_completo.pdf', 'Menú Fit & Go');
        saveToHistory(phone, 'Fit&Go Bot', `[Documento PDF: ${pdfUrl}]`, 'bot');

        // Delay de 5 segundos antes de enviar el mensaje 3 y 4
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Mensaje 3: Opciones semanales
        const text3 = `🔥 También contamos con opciones especiales que cambian cada semana. Pregúntanos cuáles son.`;
        await sendMessage(phone, text3);
        saveToHistory(phone, 'Fit&Go Bot', text3, 'bot');

        // Mensaje 4: Pregunta interactiva
        const text4 = `😋 ¿Qué platillo te llamó más la atención?`;
        await sendMessage(phone, text4);
        saveToHistory(phone, 'Fit&Go Bot', text4, 'bot');
        return;
    } 
    else if (isOption2) {
        replyText = `💰 Nuestros precios dependen del tamaño de la porción:

🥑 Déficit ($100 - $115)
Ideal para quienes buscan bajar grasa.
🍗 120 g de proteína pesado en crudo

🥗 Normal ($115 - $130)
Ideal para mantenimiento.
🍗 150 g de proteína pesado en crudo

💪 Bulk ($130 - $145)
Ideal para ganar masa muscular.
🍗 180 g de proteína pesado en crudo

😋 ¿Cuál de estos objetivos se parece más al tuyo?`;
    }
    else if (isOption3) {
        replyText = `📅 Contamos con plan semanal 😊

Puedes elegir tus platillos favoritos del menú y pedir desde 5 comidas en adelante.

✅ $10 de descuento por cada platillo
✅ Elige tamaños Déficit, Normal o Bulk
✅ Combina diferentes opciones según tus gustos y objetivos

🥑 Ideal para quienes buscan ahorrar tiempo y mantener una alimentación saludable durante la semana.

¿Buscas comidas para toda la semana o solo para algunos días? 😊`;
    }
    else if (isOption4) {
        replyText = `🥦 También contamos con servicio personalizado.

Solo envíanos:

📋 Tu dieta o plan alimenticio en foto o PDF

Y te cotizamos las comidas exactamente según los requerimientos de tu nutriólogo. 💪

Puedes enviarla por aquí cuando gustes.`;
    }
    else if (isOption5) {
        replyText = `¡Perfecto! 😋

Para continuar con tu pedido, por favor compártenos:

👤 Nombre y apellido
🚚 ¿Servicio a domicilio o Pick Up?
🍽️ ¿Cuál sería tu pedido?
⏰ ¿Para qué hora aproximadamente lo necesitas?

💳 Aceptamos transferencia y efectivo.

Nuestro equipo revisará tu pedido y te confirmará lo antes posible. 🥑`;
    }
    else if (isGreeting) {
        // Enviar saludo inicial / Menú Principal
        replyText = `¡Hola ${name}! 👋 Bienvenido a Fit&Go 🥑

Preparamos comida saludable en Mérida, Yucatán.

🔥 Puedes elegir una opción:

1️⃣ Ver Menú
2️⃣ Ver Precios
3️⃣ Plan Semanal
4️⃣ Servicio Personalizado
5️⃣ Hacer Pedido

💡 O si prefieres, escribe el número de la opción que desees.

Horario de atención del bot:
🕛 Horario de servicio: Lunes a Viernes
⏰ Cierre de pedidos: 1:30 pm`;
    }
    else {
        // Respuestas de seguimiento basadas en el contexto del último mensaje del bot
        const lastBotText = getLastBotResponse(phone) || '';

        if (lastBotText.includes('¿Qué platillo te llamó más la atención?')) {
            replyText = `Excelente elección 🔥

Los manejamos en tamaño Déficit, Normal y Bulk.

¿Cuál sería el que mejor se adapta a tu objetivo? si tienes el pedido listo escribe "5"`;
        }
        else if (lastBotText.includes('¿Cuál de estos objetivos se parece más al tuyo?')) {
            replyText = `Si gustas realizar un pedido escribe "5", si te gustaría ver el menú escribe "1"`;
        }
        else if (lastBotText.includes('¿Buscas comidas para toda la semana o solo para algunos días?')) {
            replyText = `En unos momentos uno de nuestros asesores continuará atendiéndote para ayudarte con tu pedido o resolver cualquier duda. 🥑`;
        }
        else if (lastBotText.includes('Puedes enviarla por aquí cuando gustes.')) {
            replyText = `En unos momentos uno de nuestros asesores continuará atendiéndote para ayudarte con tu pedido o resolver cualquier duda. 🥑`;
        }
        else {
            // Lógica por defecto basada en horario comercial (GMT-6 Mérida)
            if (isWithinBusinessHours()) {
                replyText = `En unos momentos uno de nuestros asesores continuará atendiéndote para ayudarte con tu pedido o resolver cualquier duda. 🥑`;
            } else {
                replyText = `🌙 Hemos recibido tu mensaje.

En este momento nuestros asesores se encuentran fuera de horario de atención.

🕐 Nuestro horario es de lunes a viernes de 7:00 am a 1:30 pm.

Tu solicitud ya quedó registrada y será atendida en cuanto nuestro equipo esté disponible. 🥑

¡Gracias por comunicarte con Fit&Go!`;
            }
        }
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

/**
 * Obtiene el último mensaje que el bot le envió a este número de teléfono
 */
function getLastBotResponse(phone) {
    if (!fs.existsSync(HISTORY_FILE)) return null;
    try {
        const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        const botMessages = history.filter(h => h.phone === phone && h.senderType === 'bot');
        if (botMessages.length === 0) return null;
        return botMessages[botMessages.length - 1].text;
    } catch (e) {
        console.error('❌ Error leyendo historial para contexto:', e.message);
        return null;
    }
}

/**
 * Obtiene el día de la semana y hora actual en la zona de Mérida (GMT-6)
 */
function getMerdiaDateTime() {
    const options = {
        timeZone: 'America/Merida',
        year: 'numeric', month: 'numeric', day: 'numeric',
        hour: 'numeric', minute: 'numeric', second: 'numeric',
        hour12: false
    };
    const formatter = new Intl.DateTimeFormat('es-MX', options);
    const parts = formatter.formatToParts(new Date());
    
    const dateMap = {};
    parts.forEach(p => { dateMap[p.type] = p.value; });
    
    const year = parseInt(dateMap.year);
    const month = parseInt(dateMap.month) - 1;
    const day = parseInt(dateMap.day);
    const hour = parseInt(dateMap.hour);
    const minute = parseInt(dateMap.minute);
    
    const tzDate = new Date(Date.UTC(year, month, day, hour, minute));
    const dayOfWeek = tzDate.getUTCDay();
    
    return { dayOfWeek, hour, minute };
}

/**
 * Determina si la hora de Mérida está dentro del horario comercial (Lun-Vie de 7:00 am a 1:30 pm)
 */
function isWithinBusinessHours() {
    try {
        const { dayOfWeek, hour, minute } = getMerdiaDateTime();
        
        // Lunes a Viernes
        if (dayOfWeek < 1 || dayOfWeek > 5) {
            return false;
        }
        
        const timeInMinutes = hour * 60 + minute;
        const startLimit = 7 * 60; // 07:00
        const endLimit = 13 * 60 + 30; // 13:30
        
        return timeInMinutes >= startLimit && timeInMinutes <= endLimit;
    } catch (error) {
        console.error('Error calculando horario comercial:', error.message);
        return true; // Fallback seguro
    }
}

/**
 * Verifica si el bot está pausado para un número telefónico específico
 */
function isBotPaused(phone) {
    if (!fs.existsSync(PAUSED_FILE)) return false;
    try {
        const pausedData = JSON.parse(fs.readFileSync(PAUSED_FILE, 'utf8'));
        const client = pausedData[phone];
        if (!client) return false;
        
        const now = Date.now();
        if (now > client.expiresAt) {
            delete pausedData[phone];
            fs.writeFileSync(PAUSED_FILE, JSON.stringify(pausedData, null, 2));
            return false;
        }
        return true;
    } catch (e) {
        console.error('❌ Error leyendo estado de pausa:', e.message);
        return false;
    }
}

/**
 * Pausa las respuestas automáticas para un número telefónico por un tiempo determinado (en horas)
 */
function pauseBot(phone, hours = 24) {
    let pausedData = {};
    if (fs.existsSync(PAUSED_FILE)) {
        try {
            pausedData = JSON.parse(fs.readFileSync(PAUSED_FILE, 'utf8'));
        } catch (e) {
            pausedData = {};
        }
    }
    
    const expiresAt = Date.now() + (hours * 60 * 60 * 1000);
    pausedData[phone] = {
        pausedAt: new Date().toISOString(),
        expiresAt: expiresAt
    };
    
    fs.writeFileSync(PAUSED_FILE, JSON.stringify(pausedData, null, 2));
    console.log(`🔇 Bot de Fit&Go pausado para ${phone} hasta ${new Date(expiresAt).toISOString()}`);
}

/**
 * Reanuda las respuestas automáticas del bot para un número telefónico específico
 */
function resumeBot(phone) {
    if (!fs.existsSync(PAUSED_FILE)) return;
    try {
        const pausedData = JSON.parse(fs.readFileSync(PAUSED_FILE, 'utf8'));
        if (pausedData[phone]) {
            delete pausedData[phone];
            fs.writeFileSync(PAUSED_FILE, JSON.stringify(pausedData, null, 2));
            console.log(`🔊 Bot de Fit&Go reactivado para ${phone}`);
        }
    } catch (e) {
        console.error('❌ Error al reanudar bot:', e.message);
    }
}

module.exports = {
    processMessage
};
