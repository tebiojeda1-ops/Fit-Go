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
                const textMsg = message.text?.body || '';

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

// Fallback a index.html para soportar rutas dinámicas en el frontend estático
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/public/index.html'));
});

app.listen(port, () => {
    console.log(`🚀 Servidor Fit&Go consolidado corriendo en http://localhost:${port}`);
    console.log(`📡 URL del Webhook para Meta: http://localhost:${port}/webhook`);
});
