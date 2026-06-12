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
 * Procesa el texto recibido y decide qué responder
 */
async function processMessage(phone, name, text) {
    const textLower = text.toLowerCase().trim();
    let replyText = '';

    // 1. GUARDAR EN EL HISTORIAL LOCAL
    saveToHistory(phone, name, text, 'user');

    // 2. REGISTRAR COMO LEAD EN LA NUBE (FIREBASE)
    await saveLeadToFirebase(phone, name);

    // 3. LÓGICA DE EVALUACIÓN (El "Cerebro")
    if (textLower.includes('menu') || textLower.includes('menú')) {
        replyText = `¡Hola ${name}! 🥗 Nuestro menú de esta semana incluye:\n\n1. Pechuga al Grill con ensalada fresca.\n2. Bowl de Salmón teriyaki.\n3. Wrap integral de pollo.\n\n¿Te gustaría ordenar alguno? Responde con "Pedido".`;
    } 
    else if (textLower.includes('precio') || textLower.includes('costo')) {
        replyText = `💸 En Fit&Go manejamos estos planes:\n\n- Paquete de 5 comidas: $800 MXN\n- Paquete de 10 comidas: $1500 MXN\n- Menú Personalizado: ¡Cotizamos según tus macros!\n\n¿Quieres agendar un plan?`;
    }
    else if (textLower.includes('pedido') || textLower.includes('comprar')) {
        replyText = `¡Perfecto! 🛍️ Por favor envíame tu nombre completo, dirección de entrega y qué plan deseas. Nuestro equipo procesará tu pedido de inmediato.`;
    }
    else {
        // Mensaje de saludo genérico / Default
        replyText = `¡Hola ${name}! 👋 Bienvenido a Fit&Go.\nSoy tu asistente virtual. Puedes preguntarme por nuestro "Menú", "Precios" o hacer un "Pedido".`;
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
        const url = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;
        
        const data = {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to: toPhone,
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
