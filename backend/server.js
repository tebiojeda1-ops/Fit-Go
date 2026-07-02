const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { processMessage } = require('./botLogic');

// Cargar variables de entorno del archivo .env
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware para procesar cuerpos JSON (crucial para recibir Webhooks de Meta)
app.use(express.json());

// Servir archivos estáticos del frontend localmente
app.use(express.static(path.join(__dirname, '../frontend/public')));

// ==========================================
// 1. ENDPOINT GET: VERIFICACIÓN DEL WEBHOOK
// ==========================================
// Meta usa esta ruta una sola vez para asegurar que el servidor es tuyo.
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    const verifyTokenEnv = process.env.VERIFY_TOKEN || 'FitGoChatbot2026_Secreto';

    if (mode && token) {
        if (mode === 'subscribe' && token === verifyTokenEnv) {
            console.log('✅ WEBHOOK VERIFICADO CORRECTAMENTE POR META');
            res.status(200).send(challenge);
        } else {
            console.error('❌ FALLO LA VERIFICACIÓN DEL WEBHOOK: Token incorrecto');
            res.sendStatus(403);
        }
    } else {
        res.status(200).send('<html><body style="font-family:sans-serif;text-align:center;margin-top:50px;"><h2>🤖 Webhook de Fit&Go Activo</h2><p>El servidor está funcionando correctamente y esperando conexión con Meta.</p></body></html>');
    }
});

// ==========================================
// 2. ENDPOINT POST: RECEPCIÓN DE MENSAJES
// ==========================================
// Meta envía todos los mensajes de los clientes a esta ruta.
app.post('/webhook', async (req, res) => {
    // Siempre respondemos rápido con 200 OK a Meta
    res.sendStatus(200);

    const body = req.body;

    // Verificar si es un evento de WhatsApp válido
    if (body.object === 'whatsapp_business_account') {
        try {
            const entry = body.entry?.[0];
            const changes = entry?.changes?.[0]?.value;
            
            if (changes?.messages && changes.messages.length > 0) {
                const message = changes.messages[0];
                const contact = changes.contacts?.[0];
                
                const senderName = contact?.profile?.name || 'Cliente';
                const senderPhone = message.from; // Número con código de país
                
                // Extraer el texto ya sea de un mensaje normal o de un botón interactivo
                let textMsg = '';
                if (message.type === 'text') {
                    textMsg = message.text?.body || '';
                } else if (message.type === 'interactive' && message.interactive?.type === 'button_reply') {
                    // Si tocan un botón, usamos el ID oculto que le asignaremos
                    textMsg = message.interactive.button_reply.id || '';
                }

                console.log(`📩 MENSAJE RECIBIDO de ${senderName} (${senderPhone}): ${textMsg}`);

                // Pasar el mensaje a la lógica del bot para guardar lead en Firebase y responder
                await processMessage(senderPhone, senderName, textMsg);
            }
        } catch (error) {
            console.error('❌ Error procesando el webhook:', error);
        }
    } else {
        res.sendStatus(404);
    }
});
// ==========================================
// 3. ENDPOINT POST: ENVÍO MASIVO DE WHATSAPP (PLANTILLAS)
// ==========================================
app.post('/api/send-masivo', async (req, res) => {
    const { destinatarios } = req.body;

    if (!destinatarios || !Array.isArray(destinatarios) || destinatarios.length === 0) {
        return res.status(400).json({ error: 'Se requiere un array de destinatarios.' });
    }

    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

    if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        return res.status(500).json({ error: 'Faltan variables de entorno WHATSAPP_TOKEN o PHONE_NUMBER_ID.' });
    }

    const results = [];
    
    for (let i = 0; i < destinatarios.length; i++) {
        let phone = destinatarios[i].phone.replace(/\D/g, '');
        let name = destinatarios[i].name || 'Cliente';
        
        // Agregar prefijo 52 si no lo tiene
        if (phone.length === 10) {
            phone = '52' + phone;
        }
        // Fix México: quitar el '1' extra (521 -> 52)
        if (phone.startsWith('521') && phone.length === 13) {
            phone = '52' + phone.substring(3);
        }

        try {
            const axios = require('axios');
            await axios.post(
                `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
                {
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: phone,
                    type: "template",
                    template: {
                        name: "diario",
                        language: { code: "es_MX" },
                        components: [
                            {
                                type: "body",
                                parameters: [
                                    {
                                        type: "text",
                                        text: name
                                    }
                                ]
                            }
                        ]
                    }
                },
                {
                    headers: {
                        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            results.push({ phone, status: 'ok' });
            console.log(`📤 Plantilla MASIVA enviada a ${phone} (${name})`);
        } catch (error) {
            const errMsg = error.response?.data?.error?.message || error.message;
            results.push({ phone, status: 'error', error: errMsg });
            console.error(`❌ Plantilla MASIVA error a ${phone}: ${errMsg}`);
        }

        // Delay de 2 segundos entre mensajes para no saturar la API de Meta
        if (i < destinatarios.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    const sent = results.filter(r => r.status === 'ok').length;
    const failed = results.filter(r => r.status === 'error').length;
    res.json({ sent, failed, total: destinatarios.length, results });
});

// Fallback a index.html para soportar rutas dinámicas en el frontend estático
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.listen(port, () => {
    console.log(`🚀 Servidor Fit&Go consolidado corriendo en http://localhost:${port}`);
    console.log(`📡 URL del Webhook para Meta: http://localhost:${port}/webhook`);
});
